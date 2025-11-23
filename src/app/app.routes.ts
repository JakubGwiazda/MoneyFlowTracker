import { Routes } from '@angular/router';

import { authGuard } from '../lib/guards/auth.guard';
import { guestGuard } from '../lib/guards/guest.guard';
import { MainLayoutComponent } from './layout/main-layout.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { MainPageComponent } from './pages/main-page/main-page.component';


const loadExpensesPage = () =>
  import('./pages/expenses/expenses-page.component').then((m) => m.ExpensesPageComponent);

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
    component: MainPageComponent,
  },
  {
    path: 'app',
    component: MainLayoutComponent,
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

