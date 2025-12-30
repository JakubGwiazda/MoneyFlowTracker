import { Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { PwaUpdateService } from '../../../../services/pwa-update/pwa-update.service';

/**
 * Dialog informujący użytkownika o dostępnej aktualizacji PWA
 */
@Component({
  selector: 'app-pwa-update-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './pwa-update-dialog.component.html',
  styleUrls: ['./pwa-update-dialog.component.scss'],
})
export class PwaUpdateDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PwaUpdateDialogComponent>);
  private readonly pwaUpdateService = inject(PwaUpdateService);

  isUpdating = false;
  updateError = false;

  /**
   * Aktualizuje aplikację do najnowszej wersji
   */
  async updateNow(): Promise<void> {
    this.isUpdating = true;
    this.updateError = false;

    try {
      await this.pwaUpdateService.activateUpdate();
      // Aplikacja zostanie przeładowana automatycznie
    } catch (error) {
      console.error('Błąd podczas aktualizacji:', error);
      this.updateError = true;
      this.isUpdating = false;
    }
  }

  /**
   * Zamyka dialog bez aktualizacji
   */
  updateLater(): void {
    this.dialogRef.close(false);
  }

  /**
   * Ponawia próbę aktualizacji po błędzie
   */
  retryUpdate(): void {
    this.updateError = false;
    this.updateNow();
  }
}
