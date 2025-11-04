import { HelloWorldComponent } from './components/hello-world.component';
import { ExpensesPageComponent } from './components/app/expenses/expenses-page.component';
import { MainShellComponent } from './components/app/main-shell.component';

// This file is used by Angular CLI for build configuration
// In Astro + Angular setup, components are loaded individually
export { HelloWorldComponent, ExpensesPageComponent, MainShellComponent };
export { appRoutes } from './components/app/app.routes';
