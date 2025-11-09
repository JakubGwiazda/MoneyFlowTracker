# MoneyFlowTracker – Database Schema (PostgreSQL)

## 1. Tables, Columns & Constraints

### 1.1 users

This table is managed by Supabase Auth

| Column | Type | Constraints/Default | Description |
|--------|------|---------------------|-------------|
| id | uuid | PRIMARY KEY, `DEFAULT gen_random_uuid()` | Internal user identifier |
| email | text | NOT NULL, UNIQUE | Login / contact e-mail |
| password | text | NOT NULL | Login / encrypted password |
| created_at | timestamptz | NOT NULL, `DEFAULT now()` | Row creation timestamp |

---

### 1.2 categories
| Column | Type | Constraints/Default | Description |
|--------|------|---------------------|-------------|
| id | uuid | PRIMARY KEY, `DEFAULT gen_random_uuid()` | Category identifier |
| name | text | NOT NULL, `CHECK (char_length(trim(name)) > 0)` | Display name (case-insensitive unique) |
| parent_id | uuid | REFERENCES categories(id) ON DELETE RESTRICT | Self-reference for hierarchy | 
| is_active | boolean | NOT NULL, `DEFAULT TRUE` | Soft-delete flag |
| created_at | timestamptz | NOT NULL, `DEFAULT now()` | Creation timestamp |

**Additional constraints**:  
`UNIQUE (LOWER(name))` – guarantees global uniqueness ignoring case.

---

### 1.3 expenses
| Column | Type | Constraints/Default | Description |
|--------|------|---------------------|-------------|
| id | uuid | PRIMARY KEY, `DEFAULT gen_random_uuid()` | Expense identifier |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Owner of the expense |
| category_id | uuid | REFERENCES categories(id) ON DELETE RESTRICT | Category selected by user/AI |
| amount | numeric(12,2) | NOT NULL, `CHECK (amount > 0)` | Monetary value |
| name | text | NOT NULL, `CHECK (char_length(trim(name)) > 0)` | Short description |
| expense_date | date | NOT NULL | When the expense occurred |
| predicted_category_id | uuid | REFERENCES categories(id) ON DELETE RESTRICT | AI suggestion |
| corrected_category_id | uuid | REFERENCES categories(id) ON DELETE RESTRICT | User correction |
| prediction_confidence | numeric(5,4) | CHECK (prediction_confidence BETWEEN 0 AND 1) | AI confidence (0–1) |
| classification_status | classification_status | NOT NULL, `DEFAULT 'pending'` | Tracking enum |
| created_at | timestamptz | NOT NULL, `DEFAULT now()` | Creation timestamp |
| updated_at | timestamptz | NOT NULL, `DEFAULT now()` | Last modification |

---

### 1.4 logs
| Column | Type | Constraints/Default | Description |
|--------|------|---------------------|-------------|
| id | uuid | PRIMARY KEY, `DEFAULT gen_random_uuid()` | Log entry id |
| user_id | uuid | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | Actor |
| expense_id | uuid | REFERENCES expenses(id) ON DELETE SET NULL | Affected expense (if any) |
| log_action | log_action | NOT NULL | Action enum (insert/update/classify) |
| payload | jsonb | NOT NULL | Diff or metadata |
| created_at | timestamptz | NOT NULL, `DEFAULT now()` | Timestamp |

---

### 1.5 Enumerated Types
```sql
CREATE TYPE classification_status AS ENUM ('pending', 'predicted', 'corrected', 'failed');
CREATE TYPE log_action           AS ENUM ('insert', 'update', 'classify');
```

## 2. Table Relationships
* **users (1) ⟶ (∞) expenses** — `expenses.user_id`
* **categories (1) ⟶ (∞) categories** — self-referencing hierarchy via `parent_id`
* **categories (1) ⟶ (∞) expenses** — `expenses.category_id`
* **users (1) ⟶ (∞) logs** — `logs.user_id`
* **expenses (1) ⟶ (∞) logs** — `logs.expense_id` (nullable)

## 3. Indexes
```sql
-- Frequently queried filters
CREATE INDEX expenses_user_date_idx  ON expenses (user_id, expense_date);

-- Case-insensitive unique already enforced, add lookup acceleration
CREATE INDEX categories_name_ci_idx  ON categories (LOWER(name));

-- Optional trigram index for LIKE / ILIKE searches (requires pg_trgm extension)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX expenses_name_trgm_idx  ON expenses USING gin (name gin_trgm_ops);

-- Supporting indexes
CREATE INDEX categories_parent_idx   ON categories (parent_id);
CREATE INDEX logs_user_idx           ON logs (user_id);
```

## 4. Row-Level Security (future-proof template – disabled by default)
```sql
-- RLS prepared but NOT enabled during MVP
-- Example policy for expenses:
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY expenses_isolation ON expenses
--   USING (user_id = auth.uid());
```

## 5. Additional Notes
1. **UUID v4** keys via `gen_random_uuid()` (requires `pgcrypto` extension).
2. Monetary amounts stored as `numeric(12,2)` (supports up to 999 999 999.99 PLN).
3. Soft-delete for categories through `is_active`; alternatively, ON DELETE RESTRICT prevents removal when referenced.
4. All timestamps use **UTC** (`timestamptz`).
5. Retention/archiving strategy for `logs` can be added in later iterations (partitioning or TTL job).
6. Reports & aggregations are calculated in the application layer, keeping schema normalized (3NF).
