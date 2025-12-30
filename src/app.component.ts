import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PwaUpdateService } from './app/services/pwa-update/pwa-update.service';
import { PwaUpdateDialogComponent } from './app/components/shared/dialogs/pwa-update-dialog/pwa-update-dialog.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent implements OnInit {
  title = 'MoneyFlowTracker';

  private readonly pwaUpdateService = inject(PwaUpdateService);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    // Inicjalizuj sprawdzanie aktualizacji PWA
    this.initializePwaUpdates();
  }

  /**
   * Inicjalizuje mechanizm sprawdzania i aktualizacji PWA
   */
  private initializePwaUpdates(): void {
    if (!this.pwaUpdateService.isEnabled()) {
      console.log('PWA: Service Worker nie jest włączony');
      return;
    }

    // Uruchom automatyczne sprawdzanie aktualizacji
    this.pwaUpdateService.initializeUpdateChecks();

    // Nasłuchuj na dostępne aktualizacje i wyświetl dialog
    this.pwaUpdateService.getVersionUpdates().subscribe(() => {
      this.showUpdateDialog();
    });
  }

  /**
   * Wyświetla dialog z informacją o dostępnej aktualizacji
   */
  private showUpdateDialog(): void {
    // Sprawdź czy dialog nie jest już otwarty
    if (this.dialog.openDialogs.length > 0) {
      return;
    }

    this.dialog.open(PwaUpdateDialogComponent, {
      width: '400px',
      disableClose: false,
      panelClass: 'pwa-update-dialog-container',
      autoFocus: true
    });
  }
}
