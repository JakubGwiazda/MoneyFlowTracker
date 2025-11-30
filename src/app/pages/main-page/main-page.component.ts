import { Component } from '@angular/core';
import { ExpensesPageComponent } from '../expenses/expenses-page.component';
import { ChartsPageComponent } from '../charts/charts-page.component';
import { MatTabGroup, MatTab } from '@angular/material/tabs';
import { CategoriesPageComponent } from '../categories/categories-page.component';

@Component({
  selector: 'app-main_page',
  standalone: true,
  imports: [
    ExpensesPageComponent,
    ChartsPageComponent,
    MatTabGroup,
    MatTab,
    CategoriesPageComponent,
  ],
  templateUrl: './main-page.component.html',
  styleUrl: './main-page.scss',
})
export class MainPageComponent {}
