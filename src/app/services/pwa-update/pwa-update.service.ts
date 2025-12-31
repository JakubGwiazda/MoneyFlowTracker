import { Injectable, ApplicationRef, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, interval, concat } from 'rxjs';

/**
 * Serwis zarządzający aktualizacjami PWA
 * Sprawdza dostępność nowych wersji i zarządza procesem aktualizacji
 */
@Injectable({
  providedIn: 'root',
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly appRef = inject(ApplicationRef);

  /**
   * Inicjalizuje sprawdzanie aktualizacji
   * - Sprawdza przy starcie aplikacji
   * - Sprawdza co 6 godzin
   * - Nasłuchuje na nowe wersje
   */
  initializeUpdateChecks(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker nie jest włączony');
      return;
    }

    // Sprawdź aktualizację gdy aplikacja się ustabilizuje
    this.checkForUpdateOnAppStable();

    // Sprawdzaj aktualizacje co 6 godzin
    this.schedulePeriodicUpdateChecks();
  }

  /**
   * Sprawdza aktualizację gdy aplikacja się ustabilizuje (po załadowaniu)
   */
  private checkForUpdateOnAppStable(): void {
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));

    appIsStable$.subscribe(() => {
      console.log('Aplikacja stabilna, sprawdzam aktualizacje...');
      this.checkForUpdate();
    });
  }

  /**
   * Planuje okresowe sprawdzanie aktualizacji (co 6 godzin)
   */
  private schedulePeriodicUpdateChecks(): void {
    const appIsStable$ = this.appRef.isStable.pipe(first(isStable => isStable === true));

    const everySixHours$ = interval(6 * 60 * 60 * 1000); // 6 godzin
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(() => {
      console.log('Okresowe sprawdzanie aktualizacji...');
      this.checkForUpdate();
    });
  }


  /**
   * Sprawdza czy jest dostępna nowa wersja
   * @returns Promise<boolean> - true jeśli jest dostępna aktualizacja
   */
  async checkForUpdate(): Promise<boolean> {
    try {
      const updateAvailable = await this.swUpdate.checkForUpdate();
      if (updateAvailable) {
        console.log('Dostępna nowa wersja aplikacji');
      } else {
        console.log('Aplikacja jest aktualna');
      }
      return updateAvailable;
    } catch (error) {
      console.error('Błąd podczas sprawdzania aktualizacji:', error);
      return false;
    }
  }

  /**
   * Aktywuje nową wersję i przeładowuje aplikację
   */
  async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      console.log('Aktualizacja aktywowana, przeładowywanie aplikacji...');
      window.location.reload();
    } catch (error) {
      console.error('Błąd podczas aktywacji aktualizacji:', error);
      throw error;
    }
  }

  /**
   * Zwraca Observable z zdarzeniami nowych wersji
   */
  getVersionUpdates() {
    return this.swUpdate.versionUpdates.pipe(
      filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY')
    );
  }

  /**
   * Sprawdza czy Service Worker jest włączony
   */
  isEnabled(): boolean {
    return this.swUpdate.isEnabled;
  }
}
