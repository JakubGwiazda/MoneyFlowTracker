import { Injectable, computed, signal, inject } from '@angular/core';
import { supabaseClient } from '../../../../db/supabase.client';
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDto } from '../../../../types';
import {
  type CategoriesFilterState,
  type CategoryListViewModel,
  type PaginationState,
  type PaginationLink,
  type CategoryOptionViewModel,
  type CategoryOperationResult,
  CategoryOption,
} from '../../../models/categories';
import { AuthService } from '../../../services/authorization/auth.service';

const DEFAULT_PER_PAGE = 25;
const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;

type SupabaseQuery = ReturnType<typeof supabaseClient.from>;

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
  private readonly authService = inject(AuthService);

  private readonly filtersSignal = signal<CategoriesFilterState>(createDefaultFilters());
  private readonly categoriesSignal = signal<CategoryListViewModel[]>([]);
  private readonly paginationSignal = signal<PaginationState>(EMPTY_PAGINATION);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);
  private readonly allCategoriesSignal = signal<CategoryOption[]>([]);
  private readonly categoriesLoaded = signal<boolean>(false);

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
    this.filtersSignal.update(current => ({ ...current, ...update, page: 1 }));
    void this.refresh();
  }

  setPage(page: number): void {
    if (page < 1) {
      return;
    }

    this.filtersSignal.update(current => ({ ...current, page }));
    void this.refresh();
  }

  setPerPage(perPage: number): void {
    if (!PER_PAGE_OPTIONS.includes(perPage as (typeof PER_PAGE_OPTIONS)[number])) {
      return;
    }

    this.filtersSignal.update(current => ({ ...current, per_page: perPage, page: 1 }));
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
      const userId = await this.ensureAuthenticatedUser();

      // Step 1: Build query for parent categories only (with pagination)
      const parentQuery = this.buildParentCategoriesQuery(filters);

      if (controller.signal.aborted) {
        return;
      }

      // Step 2: Execute query to get parent categories and total count
      const {
        data: parentData,
        error: parentError,
        count,
      } = await this.executeCategoriesQuery(parentQuery);

      if (controller.signal.aborted) {
        return;
      }

      if (parentError) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      // Map parent categories to CategoryDto format
      const parentCategories: CategoryDto[] = (parentData || []).map(row => ({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id,
        is_active: row.is_active,
        created_at: row.created_at,
        user_id: row.user_id,
      }));

      // Step 3: Fetch all children for the parent categories (no pagination)
      let childCategories: CategoryDto[] = [];
      if (parentCategories.length > 0) {
        const parentIds = parentCategories.map(c => c.id);
        const childQuery = this.buildChildCategoriesQuery(parentIds, filters);

        if (controller.signal.aborted) {
          return;
        }

        const { data: childData, error: childError } = await childQuery;

        if (childError) {
          throw new Error('Nie udało się pobrać podkategorii.');
        }

        childCategories = (childData || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          parent_id: row.parent_id,
          is_active: row.is_active,
          created_at: row.created_at,
          user_id: row.user_id,
        }));
      }

      if (controller.signal.aborted) {
        return;
      }

      // Step 4: Combine parent and child categories
      const allCategories = [...parentCategories, ...childCategories];

      const { usageCounts, childrenMap } = await this.enrichCategoriesData(
        allCategories,
        userId,
        controller
      );

      if (controller.signal.aborted) {
        return;
      }

      const viewModels = this.mapToViewModels(allCategories, usageCounts, childrenMap);

      this.categoriesSignal.set(viewModels);
      // Use count of parent categories only for pagination
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
      await this.ensureAuthenticatedUser();

      const { data: categories, error } = await supabaseClient
        .from('categories')
        .select('id, name, parent_id, is_active, user_id')
        .or(`user_id.is.null,user_id.eq.${this.authService.authState().user?.id}`)
        .order('parent_id', { ascending: true, nullsFirst: true })
        .order('name');

      if (error) {
        throw new Error('Nie udało się pobrać listy kategorii.');
      }

      let parents = categories?.filter(category => category.parent_id === null);

      const options = parents.map(
        category =>
          ({
            id: category.id,
            label: category.name,
            parentId: category.parent_id,
            isActive: category.is_active,
            isSystem: category.user_id === null,
            children: categories
              ?.filter(c => c.parent_id === category.id)
              .map(
                c =>
                  ({
                    id: c.id,
                    label: c.name,
                    parentId: c.parent_id,
                    isActive: c.is_active,
                    isSystem: c.user_id === null,
                  }) satisfies CategoryOptionViewModel
              ),
          }) satisfies CategoryOption
      );
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
      const userId = await this.ensureAuthenticatedUser();

      await this.validateCategoryName(command.name, userId);
      await this.validateParent(command.parent_id || null, userId);

      // Insert category with user_id (users can only create their own categories)
      const { data: category, error: insertError } = await supabaseClient
        .from('categories')
        .insert({
          name: command.name,
          parent_id: command.parent_id || null,
          is_active: command.is_active ?? true,
          user_id: userId,
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

  async updateCategory(
    categoryId: string,
    command: UpdateCategoryCommand
  ): Promise<CategoryOperationResult> {
    try {
      const userId = await this.ensureAuthenticatedUser();

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
      // if (existingCategory.user_id !== userId) {
      //   throw new Error('Nie możesz edytować tej kategorii.');
      // }

      // Check for duplicate name if name is being changed
      if (command.name && command.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
        await this.validateCategoryName(command.name, userId, categoryId);
      }

      // Validate parent_id if provided
      if (command.parent_id !== undefined) {
        await this.validateParent(command.parent_id, userId, categoryId);
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
      const userId = await this.ensureAuthenticatedUser();

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
      if (existingCategory.user_id !== userId) {
        throw new Error('Nie możesz usunąć tej kategorii.');
      }

      await this.validateDeletable(categoryId, userId);

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

  private async getCategoryUsageCounts(
    categoryIds: string[],
    userId: string
  ): Promise<Map<string, number>> {
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

  private async getCategoryChildrenMap(
    categoryIds: string[],
    userId: string
  ): Promise<Map<string, boolean>> {
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

  private async ensureAuthenticatedUser(): Promise<string> {
    await this.authService.waitForInitialization();
    const user = this.authService.authState().user;

    if (!user) {
      throw new Error('Nie jesteś zalogowany.');
    }

    return user.id;
  }

  /**
   * Builds query for parent categories only (with pagination and count).
   * RLS automatically filters to show: system categories (user_id IS NULL) + own categories (user_id = auth.uid())
   */
  private buildParentCategoriesQuery(filters: CategoriesFilterState): SupabaseQuery {
    let query = supabaseClient.from('categories').select('*', { count: 'exact' });

    // Filter to parent categories only
    query = query.is('parent_id', null);

    // Apply filters
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }

    // Sort by name
    query = query.order('name', { ascending: true });

    // Apply pagination
    const from = (filters.page - 1) * filters.per_page;
    const to = from + filters.per_page - 1;
    query = query.range(from, to);

    return query;
  }

  /**
   * Builds query for child categories of specific parents (no pagination).
   * RLS automatically filters to show: system categories (user_id IS NULL) + own categories (user_id = auth.uid())
   */
  private buildChildCategoriesQuery(
    parentIds: string[],
    filters: CategoriesFilterState
  ): SupabaseQuery {
    let query = supabaseClient.from('categories').select('*');

    // Filter to children of specific parents
    query = query.in('parent_id', parentIds);

    // Apply same filters as parent categories
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    if (filters.active !== undefined) {
      query = query.eq('is_active', filters.active);
    }

    // Sort by name
    query = query.order('name', { ascending: true });

    return query;
  }

  private async executeCategoriesQuery(
    query: SupabaseQuery
  ): Promise<{ data: any[]; count: number | null; error: any }> {
    const { data, error, count } = await query;
    return { data, error, count };
  }

  private async enrichCategoriesData(
    categories: CategoryDto[],
    userId: string,
    controller: AbortController
  ): Promise<{ usageCounts: Map<string, number>; childrenMap: Map<string, boolean> }> {
    if (controller.signal.aborted) {
      throw new Error('Aborted');
    }

    // Load all categories for parent name lookup if not loaded
    if (!this.categoriesLoaded()) {
      await this.loadAllCategories();
      this.categoriesLoaded.set(true);
    }

    // Get usage counts
    const categoryIds = categories.map(c => c.id);
    const usageCounts = await this.getCategoryUsageCounts(categoryIds, userId);

    // Check for children
    const childrenMap = await this.getCategoryChildrenMap(categoryIds, userId);

    return { usageCounts, childrenMap };
  }

  private mapToViewModels(
    categories: CategoryDto[],
    usageCounts: Map<string, number>,
    childrenMap: Map<string, boolean>
  ): CategoryListViewModel[] {
    return categories.map(category =>
      this.mapCategoryToViewModel(
        category,
        usageCounts.get(category.id) || 0,
        childrenMap.get(category.id) || false
      )
    );
  }

  private buildPaginationState(filters: CategoriesFilterState, total: number): PaginationState {
    const page = filters.page;
    const perPage = filters.per_page;
    const totalPages = Math.ceil(total / perPage);

    const links: PaginationLink[] = [
      ...(page > 1
        ? [{ href: `?page=1&per_page=${perPage}`, rel: 'first' as const, page: 1, perPage }]
        : []),
      ...(page > 1
        ? [
            {
              href: `?page=${page - 1}&per_page=${perPage}`,
              rel: 'prev' as const,
              page: page - 1,
              perPage,
            },
          ]
        : []),
      ...(page < totalPages
        ? [
            {
              href: `?page=${page + 1}&per_page=${perPage}`,
              rel: 'next' as const,
              page: page + 1,
              perPage,
            },
          ]
        : []),
      ...(page < totalPages
        ? [
            {
              href: `?page=${totalPages}&per_page=${perPage}`,
              rel: 'last' as const,
              page: totalPages,
              perPage,
            },
          ]
        : []),
    ];

    return {
      page,
      perPage,
      total,
      links,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    } satisfies PaginationState;
  }

  private async validateCategoryName(
    name: string,
    userId: string,
    excludeId?: string
  ): Promise<void> {
    const query = supabaseClient
      .from('categories')
      .select('id')
      .ilike('name', name)
      .eq('user_id', userId);

    if (excludeId) {
      query.neq('id', excludeId);
    }

    const { data: existingCategory } = await query.maybeSingle();

    if (existingCategory) {
      throw new Error('Kategoria o tej nazwie już istnieje w Twoich kategoriach.');
    }
  }

  private async validateParent(
    parentId: string | null,
    userId: string,
    currentId?: string
  ): Promise<void> {
    if (!parentId) {
      return;
    }

    const { data: parent, error: parentError } = await supabaseClient
      .from('categories')
      .select('id, user_id, parent_id')
      .eq('id', parentId)
      .single();

    if (parentError || !parent) {
      throw new Error('Kategoria nadrzędna nie została znaleziona.');
    }

    // Validate that parent belongs to the same user
    if (parent.user_id !== userId) {
      throw new Error('Nie możesz używać kategorii systemowych jako kategorii nadrzędnej.');
    }

    // Check for circular reference
    if (currentId && parentId === currentId) {
      throw new Error('Kategoria nie może być swoim własnym rodzicem.');
    }

    // Check if parent has this category as parent (for update)
    if (currentId && parent.parent_id === currentId) {
      throw new Error('Wybrana kategoria nadrzędna tworzy cykl.');
    }
  }

  private async validateDeletable(categoryId: string, userId: string): Promise<void> {
    // Check if category is being used
    const { data: expenses } = await supabaseClient
      .from('expenses')
      .select('id')
      .eq('user_id', userId)
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
  }

  private mapCategoryToViewModel(
    category: CategoryDto,
    usageCount: number,
    hasChildren: boolean
  ): CategoryListViewModel {
    const { is_active, parent_id, user_id } = category;
    const statusLabel = is_active ? 'Aktywna' : 'Nieaktywna';
    const statusTone = is_active ? 'success' : 'error';
    const parentName = parent_id ? this.categoryNameMap.get(parent_id) : undefined;

    return {
      ...category,
      parentName,
      usageCount,
      hasChildren,
      statusLabel,
      statusTone,
      isSystem: user_id === null,
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
