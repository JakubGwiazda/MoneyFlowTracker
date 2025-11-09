import { Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { BadgeComponent } from '../../common/badge.component';
import type { CategoryListViewModel } from '../../../../lib/models/categories';

type CategoryTreeNode = CategoryListViewModel & {
  level: number;
  isExpanded: boolean;
  children: CategoryTreeNode[];
};

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
          <table mat-table [dataSource]="visibleRows()" class="categories-table">
            <!-- Name Column with Tree Structure -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nazwa</th>
              <td mat-cell *matCellDef="let node" [class.child-row]="node.level > 0">
                <div class="category-name" [style.padding-left.px]="node.level * 24">
                  @if (node.hasChildren) {
                    <button 
                      mat-icon-button 
                      class="expand-button d-flex justify-content-center align-items-center"
                      (click)="toggleExpand(node.id)"
                    >
                      <mat-icon>
                        @if (node.isExpanded) {
                          expand_more
                        } @else {
                          chevron_right
                        }
                      </mat-icon>
                    </button>
                  } @else {
                    <span class="expand-placeholder"></span>
                  }
                  <strong>{{ node.name }}</strong>         
                </div>
              </td>
            </ng-container>

            <!-- Level indicator (hidden column for tree structure) -->
            <ng-container matColumnDef="level">
              <th mat-header-cell *matHeaderCellDef>Poziom</th>
              <td mat-cell *matCellDef="let node">
                @if (node.level === 0) {
                  <span class="text-muted">Główna</span>
                } @else {
                  <span class="text-muted">Poziom {{ node.level }}</span>
                }
              </td>
            </ng-container>

            <!-- Status Column -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let node">
                <app-badge 
                  [label]="node.statusLabel"
                  [tone]="node.statusTone"
                />
              </td>
            </ng-container>

            <!-- Usage Column -->
            <ng-container matColumnDef="usage">
              <th mat-header-cell *matHeaderCellDef>Użycie</th>
              <td mat-cell *matCellDef="let node">
                <div class="usage-cell">
                  @if (node.usageCount && node.usageCount > 0) {
                    <span class="usage-count">{{ node.usageCount }}</span>
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
              <td mat-cell *matCellDef="let node">
                {{ node.created_at | date: 'dd.MM.yyyy' }}
              </td>
            </ng-container>

            <!-- Actions Column -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="actions-header">Akcje</th>
              <td mat-cell *matCellDef="let node" class="actions-cell">
                <button 
                  mat-icon-button 
                  [matMenuTriggerFor]="menu"
                  aria-label="Więcej akcji"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="editCategory.emit(node.id)">
                    <mat-icon>edit</mat-icon>
                    <span>Edytuj</span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="toggleActive.emit(node.id)"
                    [disabled]="node.usageCount > 0 || node.hasChildren"
                  >
                    <mat-icon>
                      @if (node.is_active) {
                        visibility_off
                      } @else {
                        visibility
                      }
                    </mat-icon>
                    <span>
                      @if (node.is_active) {
                        Dezaktywuj
                      } @else {
                        Aktywuj
                      }
                    </span>
                  </button>
                  <button 
                    mat-menu-item 
                    (click)="deleteCategory.emit(node.id)"
                    [disabled]="node.usageCount > 0 || node.hasChildren"
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
      display: flex;
      flex-direction: column;
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
      overflow-y: auto;
      overflow-x: auto;
      flex: 1;
      max-height: 600px;
    }

    .categories-table {
      width: 100%;
      background: white;
    }

    .category-name {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .expand-button {
      width: 32px;
      height: 32px;
      line-height: 32px;
      margin-right: 0.25rem;
    }

    .expand-button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      line-height: 20px;
    }

    .expand-placeholder {
      display: inline-block;
      width: 40px;
    }

    .child-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: rgba(0, 0, 0, 0.54);
      margin-left: 0.25rem;
    }

    .child-row {
      background-color: rgba(0, 0, 0, 0.02);
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
      background: white;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    td.mat-cell {
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }

    tr.mat-row:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }

    tr.mat-row.child-row:hover {
      background-color: rgba(0, 0, 0, 0.06);
    }
  `],
})
export class CategoriesTableComponent {
  readonly data = input.required<CategoryListViewModel[]>();
  readonly loading = input<boolean>(false);

  readonly editCategory = output<string>();
  readonly deleteCategory = output<string>();
  readonly toggleActive = output<string>();

  private readonly expandedIds = signal<Set<string>>(new Set());

  // Build tree structure from flat list
  private readonly treeData = computed(() => {
    const categories = this.data();
    const categoryMap = new Map<string, CategoryTreeNode>();
    const rootNodes: CategoryTreeNode[] = [];

    // First pass: create all nodes
    for (const category of categories) {
      const node: CategoryTreeNode = {
        ...category,
        level: 0,
        isExpanded: this.expandedIds().has(category.id),
        children: [],
      };
      categoryMap.set(category.id, node);
    }

    // Second pass: build tree structure
    for (const category of categories) {
      const node = categoryMap.get(category.id)!;
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id);
        if (parent) {
          node.level = parent.level + 1;
          parent.children.push(node);
        } else {
          // Parent not found in current list, treat as root
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    }

    return { roots: rootNodes, map: categoryMap };
  });

  // Flatten tree to visible rows based on expanded state
  readonly visibleRows = computed(() => {
    const { roots } = this.treeData();
    const visible: CategoryTreeNode[] = [];

    const addNode = (node: CategoryTreeNode) => {
      visible.push(node);
      if (node.isExpanded && node.children.length > 0) {
        // Sort children by name
        const sortedChildren = [...node.children].sort((a, b) => 
          a.name.localeCompare(b.name)
        );
        for (const child of sortedChildren) {
          addNode(child);
        }
      }
    };

    // Sort root nodes by name
    const sortedRoots = [...roots].sort((a, b) => a.name.localeCompare(b.name));
    for (const root of sortedRoots) {
      addNode(root);
    }

    return visible;
  });

  readonly displayedColumns = ['name', 'level', 'status', 'usage', 'created_at', 'actions'];

  toggleExpand(categoryId: string): void {
    const expanded = this.expandedIds();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    
    this.expandedIds.set(newExpanded);
  }
}

