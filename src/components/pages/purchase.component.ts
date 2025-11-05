import { Component } from '@angular/core';
import { ExpensesPageComponent } from '../app/expenses/expenses-page.component';

@Component({
  selector: 'app-purchase',
  standalone: true,
  imports: [ExpensesPageComponent],
  template: `
    <section class="page-intro">
      <h1>Podgląd modułu wydatków</h1>
      <p>
        Ta strona udostępnia wersję demonstracyjną nowego interfejsu MoneyFlowTracker. To dokładnie ten sam
        widok, który znajdziesz na stronie głównej – możesz tu swobodnie sprawdzić filtrowanie, paginację,
        dialogi CRUD oraz układ komponentów.
      </p>
    </section>

    <div class="demo-wrapper">
      <app-expenses-page />
    </div>
  `,
  styles: [`
    .page-intro {
      max-width: 760px;
      margin: 0 auto 32px;
      text-align: center;
      padding: 0 16px;
    }

    .page-intro h1 {
      margin: 0 0 12px;
      font-size: 32px;
      color: #1f2937;
    }

    .page-intro p {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
    }

    .demo-wrapper {
      max-width: 1180px;
      margin: 0 auto;
      padding: 32px;
      background: white;
      border-radius: 20px;
      box-shadow:
        0 24px 48px rgba(15, 23, 42, 0.08),
        0 1px 0 rgba(148, 163, 184, 0.2);
    }

    @media (max-width: 640px) {
      .demo-wrapper {
        padding: 16px;
        border-radius: 14px;
      }
    }
  `]
})
export class PurchaseComponent {}
