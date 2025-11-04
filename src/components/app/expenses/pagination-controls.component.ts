import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import type { PaginationState } from '../../../lib/models/expenses';

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

@Component({
  selector: 'app-pagination-controls',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatSelectModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <span>Strona {{ state().page }}</span>
        <span>·</span>
        <span *ngIf="totalItems() !== null">
          Łącznie {{ totalItems() }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-2 md:justify-end">
        <mat-select
          [value]="state().perPage"
          (valueChange)="onPerPageChange($event)"
          [disabled]="disabled()"
          aria-label="Elementów na stronę"
        >
          @for (option of perPageOptions; track option) {
            <mat-option [value]="option">{{ option }} / stronę</mat-option>
          }
        </mat-select>

        <div class="flex items-center gap-2">
          <button mat-stroked-button type="button" (click)="onPrev()" [disabled]="disabled() || !state().hasPrev">
            <mat-icon>chevron_left</mat-icon>
            Poprzednia
          </button>
          <button mat-stroked-button type="button" (click)="onNext()" [disabled]="disabled() || !state().hasNext">
            Następna
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
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

