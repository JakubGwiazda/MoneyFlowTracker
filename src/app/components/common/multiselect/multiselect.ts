import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelect } from '@angular/material/select';

@Component({
  selector: 'app-multiselect',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatSelect,
  ],
  standalone: true,
  template: `<mat-form-field>
    <mat-label>{{ label() }}</mat-label>
    <mat-select [value]="selectedValues()" (selectionChange)="onSelectionChange($event)" multiple>
      @for (option of options(); track option) {
        <mat-option [value]="option">{{ option }}</mat-option>
      }
    </mat-select>
  </mat-form-field> `,
  styleUrl: './multiselect.scss',
})
export class Multiselect {
  readonly options = input.required<string[]>();
  readonly label = input.required<string>();
  readonly selectedValues = input<string[]>([]);

  readonly selectionChange = output<string[]>();
  readonly selectAllValues = input<boolean>(false);

  constructor() {
    effect(() => {
      const currentOptions = this.options(); // Always read the signal
      if (currentOptions.length > 0 && this.selectAllValues()) {
        this.selectionChange.emit(currentOptions);
      }
    });
  }
  protected onSelectionChange(event: MatSelectChange): void {
    this.selectionChange.emit(event.value);
  }
}
