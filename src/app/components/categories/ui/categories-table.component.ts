import { Component, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { BadgeComponent } from '../../common/badge/badge.component';
import type { CategoryListViewModel } from '../../../../lib/models/categories';
import { CategoriesTableService } from './categories-table.service';

@Component({
  selector: 'app-categories-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    BadgeComponent,
  ],
  providers: [CategoriesTableService],
  templateUrl: './categories-table.html',
  styleUrl: './categories-table.scss'
})
export class CategoriesTableComponent {
  readonly data = input.required<readonly CategoryListViewModel[]>();
  readonly loading = input<boolean>(false);

  readonly editCategory = output<string>();
  readonly deleteCategory = output<string>();
  readonly toggleActive = output<string>();

  readonly displayedColumns = ['name', 'level', 'status', 'usage', 'created_at', 'actions'];

  private readonly tableService = inject(CategoriesTableService);

  // Connect input data to service
  constructor() {
    effect(() => {
      this.tableService.setData(this.data());
    });
  }

  // Delegate to service for computed values
  readonly visibleRows = this.tableService.visibleRows;

  toggleExpand(categoryId: string): void {
    this.tableService.toggleExpand(categoryId);
  }
}

