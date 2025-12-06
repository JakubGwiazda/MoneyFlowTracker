import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import type { PaginationState } from '../../../models/expenses';

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatSelectModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column align-items-end">
      <div>
        <span>Strona {{ state().page }}</span>
        @if (totalItems() !== null) {
          <span> z {{ totalItems() }} </span>
        }
      </div>
      <div class="d-flex justify-content-end align-items-center gap-2" style="width: 20%;">
        <mat-form-field class="records_number">
          <mat-select
            [value]="state().perPage"
            (valueChange)="onPerPageChange($event)"
            [disabled]="disabled()"
            aria-label="Elementów na stronę">
            @for (option of perPageOptions; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="d-flex justify-content-between align-items-center gap-2 mb-3">
          <button
            mat-stroked-button
            type="button"
            (click)="onPrev()"
            [disabled]="disabled() || !state().hasPrev"
            data-testid="pagination-previous-button">
            <mat-icon>chevron_left</mat-icon>
            Poprzednia
          </button>
          <button
            mat-stroked-button
            type="button"
            (click)="onNext()"
            [disabled]="disabled() || !state().hasNext"
            data-testid="pagination-next-button">
            Następna
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pagination {
        width: 20%;
      }

      .records_number {
        min-width: 80px;
      }
    `,
  ],
})
export class PaginationControlsComponent {
  readonly state = input.required<PaginationState>();
  readonly disabled = input<boolean>(false);

  readonly pageChange = output<number>();
  readonly perPageChange = output<number>();

  readonly perPageOptions = PER_PAGE_OPTIONS;

  readonly totalItems = computed(() => this.state().total ?? null);

  onPrev(): void {
    if (!this.state().hasPrev) {
      return;
    }

    this.pageChange.emit(this.state().page - 1);
  }

  onNext(): void {
    if (!this.state().hasNext) {
      return;
    }

    this.pageChange.emit(this.state().page + 1);
  }

  onPerPageChange(perPage: number): void {
    this.perPageChange.emit(perPage);
  }
}
