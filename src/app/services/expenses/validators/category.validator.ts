import { Injectable } from '@angular/core';
import type { Database } from '../../../../db/database.types';
import { supabaseClient } from '../../../../db/supabase.client';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validator for category-related operations.
 * Implements Specification pattern for composable validation.
 */
@Injectable({ providedIn: 'root' })
export class CategoryValidator {
  private readonly supabase = supabaseClient;

  /**
   * Validates if a category exists and is active
   */
  async validate(categoryId: string | null | undefined): Promise<ValidationResult> {
    // Skip validation if no category provided
    if (!categoryId) {
      return { isValid: true, errors: [] };
    }

    const errors: string[] = [];

    try {
      const { data: category, error } = await this.supabase
        .from('categories')
        .select('id, is_active')
        .eq('id', categoryId)
        .eq('is_active', true)
        .single();

      if (error || !category) {
        errors.push('CATEGORY_NOT_FOUND');
        return { isValid: false, errors };
      }

      if (!category.is_active) {
        errors.push('CATEGORY_INACTIVE');
        return { isValid: false, errors };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      errors.push('CATEGORY_VALIDATION_FAILED');
      return { isValid: false, errors };
    }
  }

  /**
   * Validates multiple categories at once
   */
  async validateMany(categoryIds: string[]): Promise<Map<string, ValidationResult>> {
    const results = new Map<string, ValidationResult>();

    await Promise.all(
      categoryIds.map(async id => {
        const result = await this.validate(id);
        results.set(id, result);
      })
    );

    return results;
  }
}
