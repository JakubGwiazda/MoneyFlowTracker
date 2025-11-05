import { Routes } from '@angular/router';

import { authGuard } from '../../lib/guards/auth.guard';
import { MainShellComponent } from './main-shell.component';
import { WelcomeComponent } from '../pages/welcome.component';
import { PurchaseComponent } from '../pages/purchase.component';

const loadExpensesPage = () =>
  import('./expenses/expenses-page.component').then((m) => m.ExpensesPageComponent);

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: WelcomeComponent,
  },
  {
    path: 'purchase',
    component: PurchaseComponent,
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

