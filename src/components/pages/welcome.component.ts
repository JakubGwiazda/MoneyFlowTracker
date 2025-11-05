import { Component } from '@angular/core';
import { ExpensesPageComponent } from '../app/expenses/expenses-page.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [ExpensesPageComponent],
  template: `
    <section class="welcome">
      <div class="welcome__intro container">
        <div class="welcome__content">
          <h1 class="welcome__title">MoneyFlowTracker</h1>
          <p class="welcome__subtitle">
            W jednym miejscu zbierzesz wszystkie wydatki, porównasz je między okresami i szybko
            zareagujesz na przekroczony budżet.
          </p>
          <div class="welcome__highlights">
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

      <div class="welcome__preview">
        <div class="welcome__preview-frame">
          <app-expenses-page />
        </div>
      </div>
    </section>
  `,
  styles: [`
    .welcome {
      display: flex;
      flex-direction: column;
      gap: 48px;
      padding: 64px 0;
    }

    .welcome__intro {
      display: flex;
      justify-content: center;
    }

    .welcome__content {
      max-width: 720px;
      text-align: center;
    }

    .welcome__title {
      margin: 0;
      font-size: 48px;
      letter-spacing: -0.02em;
      color: #1f2937;
    }

    .welcome__subtitle {
      margin: 16px auto 0;
      font-size: 18px;
      color: #4b5563;
      max-width: 560px;
    }

    .welcome__highlights {
      margin-top: 40px;
      display: grid;
      gap: 24px;
    }

    .welcome__highlights h2 {
      margin: 0 0 8px;
      font-size: 18px;
      color: #1f2937;
    }

    .welcome__highlights p {
      margin: 0;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.5;
    }

    .welcome__preview {
      background: rgba(255, 255, 255, 0.82);
      border-top: 1px solid rgba(15, 23, 42, 0.08);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      padding: 48px 0;
    }

    .welcome__preview-frame {
      margin: 0 auto;
      max-width: 1180px;
      border-radius: 20px;
      box-shadow:
        0 40px 80px rgba(15, 23, 42, 0.1),
        0 1px 0 rgba(148, 163, 184, 0.25);
      background: white;
      padding: 32px;
    }

    @media (min-width: 768px) {
      .welcome__highlights {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .welcome {
        padding: 32px 0;
        gap: 32px;
      }

      .welcome__title {
        font-size: 36px;
      }

      .welcome__preview-frame {
        padding: 16px;
      }
    }
  `]
})
export class WelcomeComponent {}
