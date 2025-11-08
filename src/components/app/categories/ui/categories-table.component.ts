import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { BadgeComponent } from '../../common/badge.component';
import type { CategoryListViewModel } from '../../../../lib/models/categories';

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
  template: `
    <div class="table-wrapper">
      @if (loading()) {
        <div class="loading-overlay">
          <mat-spinner diameter="48"></mat-spinner>
          <p>Ładowanie kategorii...</p>
        </div>
      }

      @if (!loading() && data().length === 0) {
        <div class="empty-state">
          <mat-icon class="empty-icon">category</mat-icon>
          <h3>Brak kategorii</h3>
          <p>Dodaj pierwszą kategorię, aby móc klasyfikować wydatki.</p>
        </div>
      }

      @if (data().length > 0) {
        <div class="table-container">
          <table mat-table [dataSource]="data()" class="categories-table">
            <!-- Name Column -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nazwa</th>
              <td mat-cell *matCellDef="let category">
                <div class="category-name">
                  <strong>{{ category.name }}</strong>
                  @if (category.hasChildren) {
                    <mat-icon 
                      class="children-icon" 
                      matTooltip="Kategoria zawiera podkategorie"
                    >
                      subdirectory_arrow_right
                    </mat-icon>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Parent Column -->
            <ng-container matColumnDef="parent">
              <th mat-header-cell *matHeaderCellDef>Kategoria nadrzędna</th>
              <td mat-cell *matCellDef="let category">
                @if (category.parentName) {
                  <span class="parent-name">{{ category.parentName }}</span>
                } @else {
                  <span class="text-muted">—</span>
                }
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let category">
                <app-badge 
                  [label]="category.statusLabel"
                  [tone]="category.statusTone"
                />
              </td>
            </ng-container>

            <!-- Usage Column -->
            <ng-container matColumnDef="usage">
              <th mat-header-cell *matHeaderCellDef>Użycie</th>
              <td mat-cell *matCellDef="let category">
                <div class="usage-cell">
                  @if (category.usageCount && category.usageCount > 0) {
                    <span class="usage-count">{{ category.usageCount }}</span>
                    <span class="text-muted">wydatków</span>
                  } @else {
                    <span class="text-muted">Nieużywana</span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- Created At Column -->
            <ng-container matColumnDef="created_at">
              <th mat-header-cell *matHeaderCellDef>Data utworzenia</th>
              <td mat-cell *matCellDef="let category">
                {{ category.created_at | date: 'dd.MM.yyyy' }}
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header">Akcje</th>
              <td mat-cell *matCellDef="let category" class="actions-cell">
                <button 
                  mat-icon-button 
                  [matMenuTriggerFor]="menu"
                  aria-label="Więcej akcji"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editCategory.emit(category.id)">
                    <mat-icon>edit</mat-icon>
                    <span>Edytuj</span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="toggleActive.emit(category.id)"
                  >
                    <mat-icon>
                      @if (category.is_active) {
                        visibility_off
                      } @else {
                        visibility
                      }
                    </mat-icon>
                    <span>
                      @if (category.is_active) {
                        Dezaktywuj
                      } @else {
                        Aktywuj
                      }
                    </span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="deleteCategory.emit(category.id)"
                    [disabled]="category.usageCount > 0 || category.hasChildren"
                  >
                    <mat-icon>delete</mat-icon>
                    <span>Usuń</span>
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }

    .loading-overlay p {
      margin: 0;
      color: rgba(0, 0, 0, 0.6);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: rgba(0, 0, 0, 0.6);
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: rgba(0, 0, 0, 0.3);
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      margin: 0.5rem 0;
      font-size: 1.25rem;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .empty-state p {
      margin: 0.5rem 0;
      font-size: 0.875rem;
    }

    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    .categories-table {
      width: 100%;
      background: white;
    }

    .category-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .children-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: rgba(0, 0, 0, 0.54);
    }

    .parent-name {
      color: rgba(0, 0, 0, 0.6);
      font-size: 0.875rem;
    }

    .text-muted {
      color: rgba(0, 0, 0, 0.38);
    }

    .usage-cell {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .usage-count {
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }

    .actions-header {
      text-align: right;
    }

    .actions-cell {
      text-align: right;
    }

    th.mat-header-cell {
      font-weight: 600;
      color: rgba(0, 0, 0, 0.87);
    }

    td.mat-cell {
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }

    tr.mat-row:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }
  `],
})
export class CategoriesTableComponent {
  readonly data = input.required<CategoryListViewModel[]>();
  readonly loading = input<boolean>(false);

  readonly editCategory = output<string>();
  readonly deleteCategory = output<string>();
  readonly toggleActive = output<string>();

  readonly displayedColumns = ['name', 'parent', 'status', 'usage', 'created_at', 'actions'];
}

