# Plan Migracji: Powiązanie Kategorii z Użytkownikami

## 1. Cel Migracji

Rozszerzenie modelu bazodanowego o możliwość rozróżnienia dwóch typów kategorii:
- **Kategorie systemowe** - dostępne dla wszystkich użytkowników, zarządzane przez administratorów
- **Kategorie użytkownika** - tworzone i zarządzane przez konkretnego użytkownika, widoczne tylko dla niego

## 2. Analiza Obecnej Struktury

### 2.1 Obecna Tabela `categories`
```sql
CREATE TABLE categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (char_length(trim(name)) > 0),
    parent_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
    is_active boolean NOT NULL DEFAULT TRUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (LOWER(name))  -- Globalna unikalność
);
```

### 2.2 Identyfikowane Problemy
1. Brak powiązania z użytkownikiem
2. Globalna unikalność nazw uniemożliwi różnym użytkownikom tworzenie kategorii o tych samych nazwach
3. Brak mechanizmu kontroli dostępu (RLS)
4. Relacja `parent_id` nie uwzględnia typu kategorii

## 3. Proponowane Zmiany

### 3.1 Rozszerzenie Tabeli `categories`

#### Nowe kolumny:
```sql
ALTER TABLE categories ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
```

**Semantyka pola `user_id`:**
- `NULL` → kategoria systemowa (dostępna dla wszystkich)
- `uuid` → kategoria użytkownika (dostępna tylko dla właściciela)

#### Indeksy:
```sql
-- Indeks dla filtrowania kategorii użytkownika
CREATE INDEX categories_user_id_idx ON categories (user_id);

-- Indeks dla kombinowanego zapytania (user + aktywne)
CREATE INDEX categories_user_active_idx ON categories (user_id, is_active);
```

### 3.2 Modyfikacja Constraint Unikalności

**Problem:** Obecnie `UNIQUE (LOWER(name))` jest globalne.

**Rozwiązanie:** Unikalność per użytkownik + osobna unikalność dla kategorii systemowych.

```sql
-- Usunięcie starego constraintu
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_lower_idx;

-- Nowy constraint: unikalność dla kategorii systemowych
CREATE UNIQUE INDEX categories_system_name_unique_idx 
    ON categories (LOWER(name)) 
    WHERE user_id IS NULL;

-- Nowy constraint: unikalność dla kategorii użytkownika
CREATE UNIQUE INDEX categories_user_name_unique_idx 
    ON categories (user_id, LOWER(name)) 
    WHERE user_id IS NOT NULL;
```

### 3.3 Constraint dla Hierarchii Kategorii

Aby uniknąć mieszania kategorii systemowych z użytkownikowymi w hierarchii:

```sql
-- Funkcja walidująca zgodność parent_id
CREATE OR REPLACE FUNCTION validate_category_parent()
RETURNS TRIGGER AS $$
BEGIN
    -- Jeśli nie ma parent_id, wszystko OK
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Sprawdź czy parent istnieje
    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id) THEN
        RAISE EXCEPTION 'Parent category does not exist';
    END IF;
    
    -- Sprawdź zgodność typów kategorii (systemowa/użytkownika)
    IF NOT EXISTS (
        SELECT 1 FROM categories 
        WHERE id = NEW.parent_id 
        AND (
            -- Oba systemowe (NULL = NULL nie działa w SQL, więc sprawdzamy osobno)
            (user_id IS NULL AND NEW.user_id IS NULL) 
            OR 
            -- Oba tego samego użytkownika
            (user_id = NEW.user_id)
        )
    ) THEN
        RAISE EXCEPTION 'Category can only reference parent of the same type (system or same user)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger walidujący
CREATE TRIGGER category_parent_validation
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_parent();
```

### 3.4 Row-Level Security (RLS)

```sql
-- Włączenie RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Polityka: Użytkownicy widzą kategorie systemowe + swoje własne
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    USING (
        user_id IS NULL                    -- Kategorie systemowe
        OR 
        user_id = auth.uid()              -- Własne kategorie
    );

-- Polityka: Użytkownicy mogą tworzyć tylko swoje kategorie
CREATE POLICY categories_insert_policy ON categories
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()              -- Tylko własne kategorie
    );

-- Polityka: Użytkownicy mogą modyfikować tylko swoje kategorie
CREATE POLICY categories_update_policy ON categories
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Polityka: Użytkownicy mogą usuwać tylko swoje kategorie
CREATE POLICY categories_delete_policy ON categories
    FOR DELETE
    USING (user_id = auth.uid());

-- Polityka dla service_role: Pełen dostęp do kategorii systemowych
CREATE POLICY categories_admin_policy ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
```

## 4. Migracja Istniejących Danych

### 4.1 Strategia Migracji Danych

```sql
-- Wszystkie istniejące kategorie stają się kategoriami systemowymi
-- Pole user_id będzie NULL (domyślnie przy ADD COLUMN)

-- Weryfikacja
SELECT 
    COUNT(*) as total_categories,
    COUNT(user_id) as user_categories,
    COUNT(*) - COUNT(user_id) as system_categories
FROM categories;
```

### 4.2 Opcjonalnie: Duplikacja kategorii dla użytkowników

Jeśli chcemy, aby istniejące kategorie były dostępne jako szablony:

```sql
-- Ten krok jest opcjonalny i zależy od wymagań biznesowych
-- Kategorii NIE duplikujemy - użytkownicy mogą korzystać z systemowych
-- lub tworzyć własne w razie potrzeby
```

## 5. Wpływ na Istniejący Kod

### 5.1 Modele TypeScript (`database.types.ts`)

Zaktualizowany typ dla tabeli `categories`:

```typescript
categories: {
  Row: {
    created_at: string
    id: string
    is_active: boolean
    name: string
    parent_id: string | null
    user_id: string | null  // NOWE POLE
  }
  Insert: {
    created_at?: string
    id?: string
    is_active?: boolean
    name: string
    parent_id?: string | null
    user_id?: string | null  // NOWE POLE
  }
  Update: {
    created_at?: string
    id?: string
    is_active?: boolean
    name?: string
    parent_id?: string | null
    user_id?: string | null  // NOWE POLE
  }
  Relationships: [
    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
      isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "categories_user_id_fkey"  // NOWA RELACJA
      columns: ["user_id"]
      isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    },
  ]
}
```

### 5.2 Serwisy do Aktualizacji

**Pliki wymagające modyfikacji:**
1. `src/lib/services/categories.service.ts`
2. `src/components/app/categories/services/categories-facade.service.ts`
3. `src/components/app/categories/dialogs/add-category-dialog.component.ts`
4. `src/lib/models/categories.ts`

**Wymagane zmiany:**
- Dodanie logiki filtrowania kategorii (systemowe + własne)
- Automatyczne ustawianie `user_id` przy tworzeniu nowych kategorii
- Rozróżnienie w UI między kategoriami systemowymi a użytkownika
- Walidacja parent_id (tylko kategorie tego samego typu)

### 5.3 Queries Supabase

**Obecne query (przykład):**
```typescript
const { data } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true);
```

**Po migracji z RLS:**
```typescript
// RLS automatycznie filtruje - nie trzeba dodawać warunków
const { data } = await supabase
  .from('categories')
  .select('*')
  .eq('is_active', true);
// Zwróci: kategorie systemowe (user_id IS NULL) + własne (user_id = auth.uid())
```

**Tworzenie nowych kategorii:**
```typescript
// Automatycznie przypisze auth.uid() do user_id
const { data } = await supabase
  .from('categories')
  .insert({
    name: 'Moja Kategoria',
    user_id: currentUserId, // Pobrane z sesji
    is_active: true
  });
```

## 6. Plan Implementacji

### Faza 1: Migracja Bazy Danych
1. ✅ Utworzenie nowego pliku migracji
2. ✅ Dodanie kolumny `user_id`
3. ✅ Modyfikacja constraintów unikalności
4. ✅ Dodanie indeksów
5. ✅ Implementacja funkcji walidacyjnej dla parent_id
6. ✅ Konfiguracja RLS

### Faza 2: Aktualizacja Typów
1. ⏳ Aktualizacja `database.types.ts` (Supabase CLI)
2. ⏳ Aktualizacja modeli w `src/lib/models/categories.ts`
3. ⏳ Weryfikacja kompatybilności typów

### Faza 3: Aktualizacja Logiki Biznesowej
1. ⏳ Modyfikacja `categories.service.ts`
2. ⏳ Aktualizacja `categories-facade.service.ts`
3. ⏳ Rozszerzenie dialogów dodawania/edycji
4. ⏳ Dodanie filtrowania w widokach


## 7. Skrypt Migracji

### Plik: `supabase/migrations/20251113_add_user_categories.sql`

```sql
-- Migration: Add User Categories Support
-- Description: Allow categories to be either system-wide (user_id IS NULL) 
--              or user-specific (user_id IS NOT NULL)

-- ========================================
-- 1. Add user_id column
-- ========================================
ALTER TABLE categories 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

COMMENT ON COLUMN categories.user_id IS 
'NULL = system category (shared), UUID = user category (private)';

-- ========================================
-- 2. Create indexes
-- ========================================
CREATE INDEX categories_user_id_idx ON categories (user_id);
CREATE INDEX categories_user_active_idx ON categories (user_id, is_active);

-- ========================================
-- 3. Update uniqueness constraints
-- ========================================

-- Drop old global uniqueness constraint
DROP INDEX IF EXISTS categories_lower_idx;

-- System categories: unique name globally
CREATE UNIQUE INDEX categories_system_name_unique_idx 
    ON categories (LOWER(name)) 
    WHERE user_id IS NULL;

-- User categories: unique name per user
CREATE UNIQUE INDEX categories_user_name_unique_idx 
    ON categories (user_id, LOWER(name)) 
    WHERE user_id IS NOT NULL;

-- ========================================
-- 4. Category hierarchy validation
-- ========================================

CREATE OR REPLACE FUNCTION validate_category_parent()
RETURNS TRIGGER AS $$
BEGIN
    -- No parent_id means top-level category - OK
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id) THEN
        RAISE EXCEPTION 'Parent category does not exist';
    END IF;
    
    -- Validate category type consistency
    -- System categories can only have system parents
    -- User categories can only have parents from the same user
    IF NOT EXISTS (
        SELECT 1 FROM categories 
        WHERE id = NEW.parent_id 
        AND (
            -- Both system categories
            (user_id IS NULL AND NEW.user_id IS NULL) 
            OR 
            -- Both belong to the same user
            (user_id IS NOT NULL AND user_id = NEW.user_id)
        )
    ) THEN
        RAISE EXCEPTION 'Category can only reference parent of the same type (system or same user)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER category_parent_validation
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_parent();

-- ========================================
-- 5. Row-Level Security (RLS)
-- ========================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Users can see system categories + their own
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    USING (
        user_id IS NULL                -- System categories
        OR 
        user_id = auth.uid()          -- Own categories
    );

-- Users can only create their own categories
CREATE POLICY categories_insert_policy ON categories
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can only update their own categories
CREATE POLICY categories_update_policy ON categories
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own categories
CREATE POLICY categories_delete_policy ON categories
    FOR DELETE
    USING (user_id = auth.uid());

-- Service role has full access (for admin operations)
CREATE POLICY categories_service_role_policy ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ========================================
-- 6. Data migration
-- ========================================

-- All existing categories become system categories (user_id stays NULL)
-- No data migration needed - default NULL value is correct

-- Optional: Verify migration
DO $$
DECLARE
    total_count integer;
    system_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count FROM categories;
    SELECT COUNT(*) INTO system_count FROM categories WHERE user_id IS NULL;
    
    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  Total categories: %', total_count;
    RAISE NOTICE '  System categories: %', system_count;
    RAISE NOTICE '  User categories: %', total_count - system_count;
END $$;
```

## 8. Rollback Plan

W przypadku problemów:

```sql
-- Rollback migration
BEGIN;

-- Drop RLS policies
DROP POLICY IF EXISTS categories_select_policy ON categories;
DROP POLICY IF EXISTS categories_insert_policy ON categories;
DROP POLICY IF EXISTS categories_update_policy ON categories;
DROP POLICY IF EXISTS categories_delete_policy ON categories;
DROP POLICY IF EXISTS categories_service_role_policy ON categories;

-- Disable RLS
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Drop trigger and function
DROP TRIGGER IF EXISTS category_parent_validation ON categories;
DROP FUNCTION IF EXISTS validate_category_parent();

-- Drop indexes
DROP INDEX IF EXISTS categories_user_id_idx;
DROP INDEX IF EXISTS categories_user_active_idx;
DROP INDEX IF EXISTS categories_system_name_unique_idx;
DROP INDEX IF EXISTS categories_user_name_unique_idx;

-- Restore old uniqueness constraint
CREATE UNIQUE INDEX categories_lower_idx ON categories (LOWER(name));

-- Remove column
ALTER TABLE categories DROP COLUMN IF EXISTS user_id;

COMMIT;
```

## 9. Testy Manualne po Migracji

### 9.1 Testy Podstawowe
```sql
-- Test 1: Tworzenie kategorii systemowej (jako service_role)
INSERT INTO categories (name, user_id) VALUES ('Transport', NULL);

-- Test 2: Sprawdzenie widoczności dla użytkownika
-- (wykonać jako authenticated user)
SELECT * FROM categories; -- Powinien widzieć systemowe

-- Test 3: Tworzenie własnej kategorii
INSERT INTO categories (name, user_id) 
VALUES ('Moja Kategoria', auth.uid());

-- Test 4: Unikalność - próba duplikacji (powinno się nie udać)
INSERT INTO categories (name, user_id) 
VALUES ('Moja Kategoria', auth.uid()); -- ERROR

-- Test 5: Różni użytkownicy mogą mieć te same nazwy
-- User A tworzy "Sport"
-- User B tworzy "Sport" -- OK

-- Test 6: Hierarchia - system pod system (OK)
INSERT INTO categories (name, parent_id, user_id)
SELECT 'Transport Publiczny', id, NULL 
FROM categories WHERE name = 'Transport';

-- Test 7: Hierarchia - user pod system (ERROR)
INSERT INTO categories (name, parent_id, user_id)
SELECT 'Moje Auto', id, auth.uid() 
FROM categories WHERE name = 'Transport'; -- Should fail

-- Test 8: Soft delete
UPDATE categories SET is_active = false WHERE name = 'Moja Kategoria';
```

## 10. Dokumentacja dla Zespołu

### 10.1 Nowe Zasady
1. **Kategorie systemowe** tworzone są tylko przez service_role (admin panel)
2. **Kategorie użytkownika** tworzone są automatycznie z `user_id` z sesji
3. W UI należy **oznaczać** kategorie systemowe (np. ikona, badge)
4. **Parent** kategoria musi być tego samego typu (system/user)
5. **Unikalność** nazw działa per użytkownik + osobno dla systemu

### 10.2 Best Practices
- Nie zakładaj, że wszystkie kategorie mają user_id (sprawdzaj NULL)
- Przy wyświetlaniu listy kategorii grupuj/oznaczaj typ
- W formularzu tworzenia kategorii filtruj dostępne parenty według typu
- Loguj operacje na kategoriach w tabeli `logs`

## 11. Metryki i Monitoring

Po wdrożeniu monitoruj:
1. Liczba tworzonych kategorii użytkownika vs systemowych
2. Częstość używania kategorii systemowych vs własnych
3. Błędy związane z RLS (access denied)
4. Performance zapytań z nowymi indeksami


---

## Podsumowanie

Migracja wprowadza minimalne zmiany w strukturze bazy, zachowując backward compatibility poprzez:
- Nullable `user_id` (istniejące dane = NULL = system)
- RLS automatycznie filtruje widoczność
- Walidacja zapobiega błędom hierarchii


