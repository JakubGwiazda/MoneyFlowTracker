# Struktura Komponentów i Zależności - MoneyFlowTracker

```
components/
│
├── pages/
│   │
│   ├── login.component.ts
│   │   ├── AuthService (lib/services)
│   │   ├── Router (Angular)
│   │   ├── FormBuilder (Angular)
│   │   └── Angular Material
│   │       ├── MatCardModule
│   │       ├── MatFormFieldModule
│   │       ├── MatInputModule
│   │       ├── MatButtonModule
│   │       ├── MatProgressSpinnerModule
│   │       └── MatIconModule
│   │
│   ├── register.component.ts
│   │   ├── AuthService (lib/services)
│   │   ├── Router (Angular)
│   │   ├── FormBuilder (Angular)
│   │   └── Angular Material
│   │       ├── MatCardModule
│   │       ├── MatFormFieldModule
│   │       ├── MatInputModule
│   │       ├── MatButtonModule
│   │       ├── MatProgressSpinnerModule
│   │       └── MatIconModule
│   │
│   ├── welcome.component.ts
│   │   └── ExpensesPageComponent
│   │
│   ├── purchase.component.ts
│   │   └── ExpensesPageComponent
│   │
│   ├── expenses/
│   │   └── expenses-page.component.ts
│   │       ├── ExpensesFacadeService (app/expenses/services)
│   │       ├── MatDialog (Angular Material)
│   │       ├── MatSnackBar (Angular Material)
│   │       ├── ExpensesFilterComponent (app/expenses/ui)
│   │       ├── ExpensesTableComponent (app/expenses/ui)
│   │       ├── ExpensesChartsComponent (app/expenses/ui)
│   │       ├── PaginationControlsComponent (app/common)
│   │       ├── CategoriesPageComponent
│   │       ├── AddExpenseDialogComponent (app/expenses/dialogs)
│   │       ├── EditExpenseDialogComponent (app/expenses/dialogs)
│   │       └── ConfirmDialogComponent (app/expenses/dialogs)
│   │
│   └── categories/
│       └── categories-page.component.ts
│           ├── CategoriesFacadeService (app/categories/services)
│           ├── MatDialog (Angular Material)
│           ├── MatSnackBar (Angular Material)
│           ├── CategoriesTableComponent (app/categories/ui)
│           ├── PaginationControlsComponent (app/common)
│           ├── AddCategoryDialogComponent (app/categories/dialogs)
│           └── ConfirmDialogComponent (app/expenses/dialogs)
│
└── app/
    │
    ├── main-layout.component.ts
    │   ├── AuthService (lib/services)
    │   ├── RouterOutlet (Angular)
    │   └── Angular Material
    │       ├── MatButtonModule
    │       ├── MatIconModule
    │       └── MatMenuModule
    │
    ├── expenses/
    │   │
    │   ├── services/
    │   │   └── expenses-facade.service.ts
    │   │
    │   ├── ui/
    │   │   ├── expenses-table.component.ts
    │   │   │   ├── MatTableModule (Angular Material)
    │   │   │   ├── MatSortModule (Angular Material)
    │   │   │   ├── MatProgressSpinnerModule (Angular Material)
    │   │   │   ├── BadgeComponent (app/common)
    │   │   │   └── RowActionsComponent (app/common)
    │   │   │
    │   │   ├── expenses-filters.component.ts
    │   │   │   ├── FormBuilder (Angular)
    │   │   │   ├── MatFormFieldModule (Angular Material)
    │   │   │   ├── MatInputModule (Angular Material)
    │   │   │   ├── MatButtonModule (Angular Material)
    │   │   │   ├── ChipsComponent (app/common)
    │   │   │   ├── SelectAutocompleteComponent (app/common)
    │   │   │   └── DateFilterComponent (app/common)
    │   │   │
    │   │   └── expenses-charts.component.ts
    │   │       ├── MatButtonToggleModule (Angular Material)
    │   │       ├── MatCardModule (Angular Material)
    │   │       ├── MatExpansionModule (Angular Material)
    │   │       ├── BarChartModule (@swimlane/ngx-charts)
    │   │       ├── PieChartModule (@swimlane/ngx-charts)
    │   │       └── DateFilterComponent (app/common)
    │   │
    │   └── dialogs/
    │       ├── add-expense-dialog.component.ts
    │       │   ├── ExpensesFacadeService (app/expenses/services)
    │       │   ├── MatDialogRef (Angular Material)
    │       │   ├── FormBuilder (Angular)
    │       │   └── Angular Material
    │       │       ├── MatFormFieldModule
    │       │       ├── MatInputModule
    │       │       ├── MatDatepickerModule
    │       │       ├── MatButtonModule
    │       │       ├── MatProgressSpinnerModule
    │       │       └── MatTableModule
    │       │
    │       ├── edit-expense-dialog.component.ts
    │       │   ├── MatDialogRef (Angular Material)
    │       │   ├── MAT_DIALOG_DATA (Angular Material)
    │       │   ├── FormBuilder (Angular)
    │       │   ├── SelectAutocompleteComponent (app/common)
    │       │   └── Angular Material
    │       │       ├── MatFormFieldModule
    │       │       ├── MatInputModule
    │       │       ├── MatDatepickerModule
    │       │       └── MatButtonModule
    │       │
    │       └── confirm-dialog.component.ts
    │           ├── MatDialogRef (Angular Material)
    │           ├── MAT_DIALOG_DATA (Angular Material)
    │           └── MatButtonModule (Angular Material)
    │
    ├── categories/
    │   │
    │   ├── services/
    │   │   └── categories-facade.service.ts
    │   │
    │   ├── ui/
    │   │   └── categories-table.component.ts
    │   │
    │   └── dialogs/
    │       └── add-category-dialog.component.ts
    │
    └── common/
        ├── badge.component.ts
        │   └── Angular Material
        │       ├── MatChipsModule
        │       └── MatTooltipModule
        │
        ├── row-actions.component.ts
        │   └── Angular Material
        │       ├── MatMenuModule
        │       ├── MatIconModule
        │       ├── MatButtonModule
        │       └── MatDividerModule
        │
        ├── pagination-controls.component.ts
        │   └── Angular Material
        │       ├── MatButtonModule
        │       ├── MatSelectModule
        │       └── MatIconModule
        │
        ├── chips.component.ts
        │
        ├── select-autocomplete.component.ts
        │
        ├── date-filter.component.ts
        │
        └── date-quick-filter.component.ts


lib/
└── services/
    ├── auth.service.ts
    │   ├── Router (Angular)
    │   └── supabaseClient (db)
    │
    ├── expenses.service.ts
    │
    ├── categories.service.ts
    │
    ├── classification.service.ts
    │
    └── rate-limiter.service.ts
```

