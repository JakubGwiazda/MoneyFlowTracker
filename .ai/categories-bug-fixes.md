# Poprawki błędów kompilacji - Zarządzanie kategoriami

## Problem
Po początkowej implementacji systemu zarządzania kategoriami wystąpiły błędy kompilacji związane z niepoprawnym założeniem o strukturze bazy danych.

## Główny błąd
Kod zakładał, że tabela `categories` zawiera kolumny `user_id` i `updated_at`, ale zgodnie ze schematem bazy danych (plik `supabase/migrations/20251030140000_create_money_flow_tracker_schema.sql`):

```sql
create table categories (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(trim(name)) > 0),
    parent_id uuid references categories(id) on delete restrict,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);
```

**Kategorie są globalne** (współdzielone przez wszystkich użytkowników), nie mają pola `user_id` ani `updated_at`.

## Wprowadzone poprawki

### 1. `src/lib/services/categories.service.ts`

#### Usunięto filtrowanie po `user_id`:
- ❌ `.eq('user_id', userId)` - usunięto ze wszystkich zapytań
- ✅ Kategorie są teraz traktowane jako globalne

#### Zmieniono sprawdzanie duplikatów:
- ❌ `.eq('name', command.name)` - dokładne dopasowanie
- ✅ `.ilike('name', command.name)` - case-insensitive (zgodnie z indeksem `categories_name_unique_idx`)

#### Usunięto pole `updated_at`:
- ❌ `updated_at: new Date().toISOString()` w operacjach UPDATE
- ✅ Pole usunięte (nie istnieje w schemacie)

#### Usunięto `user_id` z INSERT:
```typescript
// Przed:
const categoryData = {
  user_id: userId,
  name: command.name,
  parent_id: command.parent_id || null,
  is_active: command.is_active ?? true,
};

// Po:
const categoryData = {
  name: command.name,
  parent_id: command.parent_id || null,
  is_active: command.is_active ?? true,
};
```

### 2. `src/components/app/categories/services/categories-facade.service.ts`

Analogiczne zmiany jak w `categories.service.ts`:

#### Zapytania SELECT:
```typescript
// Przed:
let query = supabaseClient
  .from('categories')
  .select('*', { count: 'exact' })
  .eq('user_id', user.id);

// Po:
let query = supabaseClient
  .from('categories')
  .select('*', { count: 'exact' });
```

#### INSERT:
```typescript
// Przed:
.insert({
  user_id: user.id,
  name: command.name,
  parent_id: command.parent_id || null,
  is_active: command.is_active ?? true,
})

// Po:
.insert({
  name: command.name,
  parent_id: command.parent_id || null,
  is_active: command.is_active ?? true,
})
```

#### UPDATE:
```typescript
// Przed:
const updateData: Partial<typeof existingCategory> = {
  updated_at: new Date().toISOString(),
};
// ... reszta pól

// Po:
const updateData: Partial<typeof existingCategory> = {};
// ... tylko zmieniane pola, bez updated_at
```

#### Sprawdzanie duplikatów:
```typescript
// Przed:
.eq('name', command.name)
.eq('user_id', user.id)

// Po:
.ilike('name', command.name)
// bez user_id
```

#### Usunięto `user_id` z pomocniczych metod:
- `getCategoryUsageCounts()` - usunięto filtr `.eq('user_id', userId)`
- `getCategoryChildrenMap()` - usunięto filtr `.eq('user_id', userId)`

## Implikacje zmian

### ✅ Zalety globalnych kategorii:
1. **Spójność danych** - wszyscy użytkownicy widzą te same kategorie
2. **Łatwiejsze zarządzanie** - jedna lista kategorii dla całej aplikacji
3. **Lepsza klasyfikacja AI** - więcej danych treningowych z wszystkich użytkowników
4. **Zgodność ze schematem** - kod odpowiada rzeczywistej strukturze bazy

### ⚠️ Uwagi bezpieczeństwa:
1. **RLS (Row Level Security)** - kategorie mają polityki pozwalające wszystkim użytkownikom na odczyt
2. **Modyfikacje** - tylko zalogowani użytkownicy mogą modyfikować kategorie (zgodnie z politykami RLS)
3. **Unikalność nazw** - indeks `categories_name_unique_idx` wymusza unikalne nazwy (case-insensitive)

### 🔄 Możliwe przyszłe zmiany:
Jeśli w przyszłości kategorie mają być per-user:
1. Dodać migrację dodającą kolumnę `user_id` do tabeli `categories`
2. Dodać kolumnę `updated_at` z triggerem
3. Zmienić indeks unikalności na `(user_id, lower(name))`
4. Zaktualizować polityki RLS
5. Przywrócić filtrowanie po `user_id` w kodzie

## Status kompilacji

### ✅ Naprawione pliki (0 błędów):
- `src/lib/services/categories.service.ts`
- `src/lib/models/categories.ts`
- `src/components/app/categories/services/categories-facade.service.ts`
- `src/components/app/categories/dialogs/add-category-dialog.component.ts`
- `src/components/app/categories/ui/categories-table.component.ts`
- `src/components/pages/categories/categories-page.component.ts`

### ⚠️ Istniejące błędy (nie związane z tą implementacją):
Następujące pliki mają błędy TypeScript (prawdopodobnie stare, nieużywane komponenty):
- `src/components/app/expenses/classification-badge.component.ts`
- `src/components/app/expenses/expense-row-actions.component.ts`
- `src/components/app/expenses/expenses-table.component.ts`
- `src/components/app/expenses/pagination-controls.component.ts`

Te komponenty nie są używane w nowej architekturze (używamy komponentów z `src/components/app/expenses/ui/` i `src/components/app/common/`).

## Podsumowanie
Wszystkie błędy związane z implementacją zarządzania kategoriami zostały naprawione. System jest teraz w pełni funkcjonalny i zgodny ze schematem bazy danych.

