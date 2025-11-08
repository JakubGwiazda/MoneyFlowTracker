import { Routes } from '@angular/router';

import { authGuard } from '../../lib/guards/auth.guard';
import { guestGuard } from '../../lib/guards/guest.guard';
import { MainShellComponent } from './main-shell.component';
import { LoginComponent } from '../pages/login.component';
import { RegisterComponent } from '../pages/register.component';
import { WelcomeComponent } from '../pages/welcome.component';
import { PurchaseComponent } from '../pages/purchase.component';

const loadExpensesPage = () =>
  import('../pages/expenses/expenses-page.component').then((m) => m.ExpensesPageComponent);

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'welcome',
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

