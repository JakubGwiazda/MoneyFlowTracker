import { Routes } from '@angular/router';

import { authGuard } from '../../lib/guards/auth.guard';
import { MainShellComponent } from './main-shell.component';

const loadExpensesPage = () =>
  import('./expenses/expenses-page.component').then((m) => m.ExpensesPageComponent);

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app/expenses',
  },
  {
    path: 'app',
    component: MainShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'expenses',
        loadComponent: loadExpensesPage,
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'expenses',
      },
    ],
  },
];

