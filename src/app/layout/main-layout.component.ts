import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from 'src/lib/services/auth.service';


@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <div class="main-layout">
      <header class="main-header d-flex align-items-center px-6 py-4">
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
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .main-layout {
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    .main-header {
      flex-shrink: 0;
      background-color: white;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .main-content {
      flex: 1;
      overflow: hidden;
      padding: 16px;
    }
    
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

