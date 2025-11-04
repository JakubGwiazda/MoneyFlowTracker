import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-main-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gray-50">
      <header class="border-b bg-white/80 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div class="text-lg font-semibold tracking-tight text-gray-900">
            MoneyFlowTracker
          </div>
          <nav class="flex items-center gap-4 text-sm font-medium text-gray-600">
            <a
              routerLink="/app/expenses"
              routerLinkActive="text-blue-600"
              class="transition hover:text-blue-500"
            >
              Wydatki
            </a>
          </nav>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-6 py-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class MainShellComponent {}

