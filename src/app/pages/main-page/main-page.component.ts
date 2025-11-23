import { Component } from '@angular/core';
import { ExpensesPageComponent } from '../expenses/expenses-page.component';

@Component({
  selector: 'app-main_page',
  standalone: true,
  imports: [ExpensesPageComponent],
  template: `
    <section class="main_page">
      <div class="main_page__intro container">
        <div class="main_page__content">
          <h1 class="main_page__title">MoneyFlowTracker</h1>
          <p class="main_page__subtitle">
            W jednym miejscu zbierzesz wszystkie wydatki, porównasz je między okresami i szybko
            zareagujesz na przekroczony budżet.
          </p>
          <div class="main_page__highlights">
            <div>
              <h2>Zautomatyzowana klasyfikacja</h2>
              <p>Każdy nowy wydatek trafia do klasyfikatora AI. Jeśli model się pomyli – poprawisz go jednym kliknięciem.</p>
            </div>
            <div>
              <h2>Filtry i sortowanie</h2>
              <p>Przefiltruj listę po statusie, dacie, kategorii, a dzięki paginacji i sortowaniu szybko znajdziesz to, czego potrzebujesz.</p>
            </div>
            <div>
              <h2>Pełne CRUD</h2>
              <p>Dodawaj, edytuj, usuwaj i reklasyfikuj wpisy, korzystając z nowego, modularnego interfejsu.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="main_page__preview">
        <div class="main_page__preview-frame">
          <app-expenses-page />
        </div>
      </div>
    </section>
  `,
  styleUrl: './main-page.scss',
})
export class MainPageComponent {}
