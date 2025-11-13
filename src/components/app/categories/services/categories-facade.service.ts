import { Injectable, computed, signal } from '@angular/core';
import { supabaseClient } from '../../../../db/supabase.client';
import type {
  CreateCategoryCommand,
  UpdateCategoryCommand,
  CategoryDto,
} from '../../../../types';
import {
  type CategoriesFilterState,
  type CategoryListViewModel,
  type PaginationState,
  type PaginationLink,
  type CategoryOptionViewModel,
  type CategoryOperationResult,
} from '../../../../lib/models/categories';

const DEFAULT_PER_PAGE = 25;
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

function createDefaultFilters(): CategoriesFilterState {
  return {
    search: '',
    active: true,
    page: 1,
    per_page: DEFAULT_PER_PAGE,
  } satisfies CategoriesFilterState;
}

const EMPTY_PAGINATION: PaginationState = {
  page: 1,
  perPage: DEFAULT_PER_PAGE,
  links: [],
  hasNext: false,
  hasPrev: false,
};

@Injectable({ providedIn: 'root' })
export class CategoriesFacadeService {
  private currentRequest: AbortController | null = null;
  private readonly categoryNameMap = new Map<string, string>();

  private readonly filtersSignal = signal<CategoriesFilterState>(createDefaultFilters());
  private readonly categoriesSignal = signal<CategoryListViewModel[]>([]);
  private readonly paginationSignal = signal<PaginationState>(EMPTY_PAGINATION);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly allCategoriesSignal = signal<CategoryOptionViewModel[]>([]);

  readonly filters = this.filtersSignal.asReadonly();
  readonly categories = this.categoriesSignal.asReadonly();
  readonly pagination = this.paginationSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly allCategories = this.allCategoriesSignal.asReadonly();

  readonly viewModel = computed(() => ({
    filters: this.filtersSignal(),
    categories: this.categoriesSignal(),
    pagination: this.paginationSignal(),
    loading: this.loadingSignal(),
    error: this.errorSignal(),
  }));

  setFilters(update: Partial<CategoriesFilterState>): void {
    this.filtersSignal.update((current) => ({ ...current, ...update, page: 1 }));
    void this.refresh();
  }

  setPage(page: number): void {
    if (page < 1) {
      return;
    }

    this.filtersSignal.update((current) => ({ ...current, page }));
    void this.refresh();
  }

  setPerPage(perPage: number): void {
    if (!PER_PAGE_OPTIONS.includes(perPage as (typeof PER_PAGE_OPTIONS)[number])) {
      return;
    }

    this.filtersSignal.update((current) => ({ ...current, per_page: perPage, page: 1 }));
    void this.refresh();
  }

  async refresh(): Promise<void> {
    const filters = this.filtersSignal();

    this.abortActiveRequest();
    const controller = new AbortController();
    this.currentRequest = controller;

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Build Supabase query
      // RLS automatically filters to show: system categories (user_id IS NULL) + own categories (user_id = auth.uid())
      let query = supabaseClient
        .from('categories')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      if (filters.active !== undefined) {
        query = query.eq('is_active', filters.active);
      }

      if (filters.parent_id !== undefined) {
        if (filters.parent_id === null) {
          query = query.is('parent_id', null);
        } else {
          query = query.eq('parent_id', filters.parent_id);
        }
      }

      // Apply sorting
      query = query.order('name', { ascending: true });

      // Apply pagination
      const from = (filters.page - 1) * filters.per_page;
      const to = from + filters.per_page - 1;
      query = query.range(from, to);

      // Execute query
      const { data, error, count } = await query;

      if (controller.signal.aborted) {
        return;
      }

      if (error) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      // Load all categories for parent name lookup
      await this.loadAllCategories();

      // Get usage counts
      const categoryIds = (data || []).map(c => c.id);
      const usageCounts = await this.getCategoryUsageCounts(categoryIds, user.id);

      // Check for children
      const childrenMap = await this.getCategoryChildrenMap(categoryIds, user.id);

      // Map to CategoryDto format
      const categories: CategoryDto[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        is_active: row.is_active,
        created_at: row.created_at,
        user_id: row.user_id,
      }));

      this.categoriesSignal.set(
        categories.map((category) => 
          this.mapCategoryToViewModel(
            category, 
            usageCounts.get(category.id) || 0,
            childrenMap.get(category.id) || false
          )
        )
      );
      this.paginationSignal.set(this.buildPaginationState(filters, count || 0));
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      this.errorSignal.set(this.resolveErrorMessage(error));
    } finally {
      if (this.currentRequest === controller) {
        this.loadingSignal.set(false);
        this.currentRequest = null;
      }
    }
  }

  async loadAllCategories(): Promise<void> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      const { data: categories, error } = await supabaseClient
        .from('categories')
        .select('id, name, parent_id, is_active, user_id')
        .order('name');

      if (error) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      const options = (categories || []).map((category) => ({
        id: category.id,
        label: category.name,
        parentId: category.parent_id,
        isActive: category.is_active,
        isSystem: category.user_id === null,
      } satisfies CategoryOptionViewModel));

      for (const option of options) {
        this.categoryNameMap.set(option.id, option.label);
      }

      this.allCategoriesSignal.set(options);
    } catch (error) {
      this.errorSignal.set(this.resolveErrorMessage(error));
    }
  }

  async createCategory(command: CreateCategoryCommand): Promise<CategoryOperationResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Check for duplicate name (case-insensitive, within user's scope)
      // Users can only create their own categories, not system categories
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('id')
        .ilike('name', command.name)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingCategory) {
        throw new Error('Kategoria o tej nazwie już istnieje w Twoich kategoriach.');
      }

      // Validate parent if provided
      if (command.parent_id) {
        const { data: parent, error: parentError } = await supabaseClient
          .from('categories')
          .select('id, user_id')
          .eq('id', command.parent_id)
          .single();

        if (parentError || !parent) {
          throw new Error('Kategoria nadrzędna nie została znaleziona.');
        }

        // Validate that parent belongs to the same user (users can't use system categories as parents)
        if (parent.user_id !== user.id) {
          throw new Error('Nie możesz używać kategorii systemowych jako kategorii nadrzędnej.');
        }
      }

      // Insert category with user_id (users can only create their own categories)
      const { data: category, error: insertError } = await supabaseClient
        .from('categories')
        .insert({
          name: command.name,
          parent_id: command.parent_id || null,
          is_active: command.is_active ?? true,
          user_id: user.id,
        })
        .select()
        .single();

      if (insertError || !category) {
        throw new Error('Nie udało się utworzyć kategorii.');
      }

      await this.refresh();
      return 'created';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async updateCategory(categoryId: string, command: UpdateCategoryCommand): Promise<CategoryOperationResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Check if category exists and belongs to user (RLS will filter, but we check explicitly)
      const { data: existingCategory, error: fetchError } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

      if (fetchError || !existingCategory) {
        throw new Error('Kategoria nie została znaleziona.');
      }

      // Users can only update their own categories (not system categories)
      if (existingCategory.user_id !== user.id) {
        throw new Error('Nie możesz edytować tej kategorii.');
      }

      // Check for duplicate name if name is being changed (case-insensitive, within user's scope)
      if (command.name && command.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
        const { data: duplicateCategory } = await supabaseClient
          .from('categories')
          .select('id')
          .ilike('name', command.name)
          .eq('user_id', user.id)
          .neq('id', categoryId)
          .maybeSingle();

        if (duplicateCategory) {
          throw new Error('Kategoria o tej nazwie już istnieje w Twoich kategoriach.');
        }
      }

      // Validate parent_id if provided
      if (command.parent_id !== undefined && command.parent_id !== null) {
        // Check for circular reference
        if (command.parent_id === categoryId) {
          throw new Error('Kategoria nie może być swoim własnym rodzicem.');
        }

        const { data: parent, error: parentError } = await supabaseClient
          .from('categories')
          .select('id, parent_id, user_id')
          .eq('id', command.parent_id)
          .single();

        if (parentError || !parent) {
          throw new Error('Kategoria nadrzędna nie została znaleziona.');
        }

        // Validate that parent belongs to the same user
        if (parent.user_id !== user.id) {
          throw new Error('Nie możesz używać kategorii systemowych jako kategorii nadrzędnej.');
        }

        // Check if parent has this category as parent
        if (parent.parent_id === categoryId) {
          throw new Error('Wybrana kategoria nadrzędna tworzy cykl.');
        }
      }

      // Update category (no updated_at in categories table)
      const updateData: Partial<typeof existingCategory> = {};

      if (command.name !== undefined) {
        updateData.name = command.name;
      }

      if (command.parent_id !== undefined) {
        updateData.parent_id = command.parent_id;
      }

      if (command.is_active !== undefined) {
        updateData.is_active = command.is_active;
      }

      const { error: updateError } = await supabaseClient
        .from('categories')
        .update(updateData)
        .eq('id', categoryId);

      if (updateError) {
        throw new Error('Nie udało się zaktualizować kategorii.');
      }

      await this.refresh();
      return 'updated';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  async deleteCategory(categoryId: string): Promise<CategoryOperationResult> {
    try {
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Nie jesteś zalogowany.');
      }

      // Check if category exists and belongs to user
      const { data: existingCategory } = await supabaseClient
        .from('categories')
        .select('user_id')
        .eq('id', categoryId)
        .single();

      if (!existingCategory) {
        throw new Error('Kategoria nie została znaleziona.');
      }

      // Users can only delete their own categories (not system categories)
      if (existingCategory.user_id !== user.id) {
        throw new Error('Nie możesz usunąć tej kategorii.');
      }

      // Check if category is being used
      const { data: expenses } = await supabaseClient
        .from('expenses')
        .select('id')
        .eq('user_id', user.id)
        .or(`category_id.eq.${categoryId},predicted_category_id.eq.${categoryId}`)
        .limit(1);

      if (expenses && expenses.length > 0) {
        throw new Error('Nie można usunąć kategorii używanej w wydatkach.');
      }

      // Check if category has children
      const { data: children } = await supabaseClient
        .from('categories')
        .select('id')
        .eq('parent_id', categoryId)
        .limit(1);

      if (children && children.length > 0) {
        throw new Error('Nie można usunąć kategorii zawierającej podkategorie.');
      }

      // Soft delete
      const { error: deleteError } = await supabaseClient
        .from('categories')
        .update({ 
          is_active: false,
        })
        .eq('id', categoryId);

      if (deleteError) {
        throw new Error('Nie udało się usunąć kategorii.');
      }

      await this.refresh();
      return 'deleted';
    } catch (error) {
      throw new Error(this.resolveErrorMessage(error));
    }
  }

  private async getCategoryUsageCounts(categoryIds: string[], userId: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    if (categoryIds.length === 0) {
      return map;
    }

    try {
      const { data, error } = await supabaseClient
        .from('expenses')
        .select('category_id')
        .in('category_id', categoryIds);

      if (error || !data) {
        return map;
      }

      for (const expense of data) {
        if (expense.category_id) {
          map.set(expense.category_id, (map.get(expense.category_id) || 0) + 1);
        }
      }
    } catch (error) {
      console.error('Failed to get category usage counts:', error);
    }

    return map;
  }

  private async getCategoryChildrenMap(categoryIds: string[], userId: string): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();

    if (categoryIds.length === 0) {
      return map;
    }

    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('parent_id')
        .in('parent_id', categoryIds);

      if (error || !data) {
        return map;
      }

      for (const category of data) {
        if (category.parent_id) {
          map.set(category.parent_id, true);
        }
      }
    } catch (error) {
      console.error('Failed to check category children:', error);
    }

    return map;
  }

  private abortActiveRequest(): void {
    if (this.currentRequest) {
      this.currentRequest.abort();
      this.currentRequest = null;
    }
  }

  private buildPaginationState(filters: CategoriesFilterState, total: number): PaginationState {
    const page = filters.page;
    const perPage = filters.per_page;
    const totalPages = Math.ceil(total / perPage);

    const links: PaginationLink[] = [];

    // Add first page link
    if (page > 1) {
      links.push({
        href: `?page=1&per_page=${perPage}`,
        rel: 'first',
        page: 1,
        perPage,
      });
    }

    // Add previous page link
    if (page > 1) {
      links.push({
        href: `?page=${page - 1}&per_page=${perPage}`,
        rel: 'prev',
        page: page - 1,
        perPage,
      });
    }

    // Add next page link
    if (page < totalPages) {
      links.push({
        href: `?page=${page + 1}&per_page=${perPage}`,
        rel: 'next',
        page: page + 1,
        perPage,
      });
    }

    // Add last page link
    if (page < totalPages) {
      links.push({
        href: `?page=${totalPages}&per_page=${perPage}`,
        rel: 'last',
        page: totalPages,
        perPage,
      });
    }

    return {
      page,
      perPage,
      total,
      links,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    } satisfies PaginationState;
  }

  private mapCategoryToViewModel(
    category: CategoryDto,
    usageCount: number,
    hasChildren: boolean
  ): CategoryListViewModel {
    const statusLabel = category.is_active ? 'Aktywna' : 'Nieaktywna';
    const statusTone = category.is_active ? 'success' : 'error';
    const parentName = category.parent_id 
      ? this.categoryNameMap.get(category.parent_id) 
      : undefined;

    return {
      ...category,
      parentName,
      usageCount,
      hasChildren,
      statusLabel,
      statusTone,
      isSystem: category.user_id === null,
    } satisfies CategoryListViewModel;
  }

  private resolveErrorMessage(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Żądanie zostało przerwane.';
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: string }).message ?? 'Wystąpił błąd.');
    }

    return 'Wystąpił nieoczekiwany błąd.';
  }
}

