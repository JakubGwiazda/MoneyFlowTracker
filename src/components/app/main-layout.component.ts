import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';

import { AuthService } from '../../lib/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="">
      <header class="d-flex align-items-center px-6 py-4">
        <div class="flex-fill"></div>
        <div class="text-lg font-semibold text-center">
          MoneyFlowTracker
        </div>
        <div class="d-flex justify-content-end flex-fill">
          <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-button">
            <mat-icon>account_circle</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="px-4 py-2 text-sm text-gray-700">
              <div class="font-medium">{{ userEmail() }}</div>
            </div>
            <button mat-menu-item (click)="onLogout()">
              <mat-icon>logout</mat-icon>
              <span>Wyloguj się</span>
            </button>
          </mat-menu>
        </div>
      </header>
      <main>
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .user-menu-button {
      color: #4b5563;
    }
    
    .user-menu-button:hover {
      color: #1f2937;
    }
  `],
})
export class MainLayoutComponent {
  userEmail = computed(() => this.authService.authState().user?.email || 'Użytkownik');

  constructor(private authService: AuthService) { }

  async onLogout(): Promise<void> {
    await this.authService.signOut();
  }
}

