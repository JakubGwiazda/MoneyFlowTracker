# REST API Plan

## 1. Resources
| Resource | DB Table | Description |
|----------|----------|-------------|
| User Profile | users (Supabase Auth) | Authenticated user data, email, id |
| Category | categories | Expense categories with optional hierarchy (parent_id) |
| Expense | expenses | Monetary outflow records owned by users |
| Log Entry | logs | Audit trail of user actions |
| Analytics | (derived) | Aggregated views on expenses for charts |

## 2. Endpoints

### 2.1 Authentication (handled by Supabase)
Supabase provides `/auth/v1/...` endpoints for sign-up, sign-in, refresh and sign-out. API clients must include the returned JWT in the `Authorization: Bearer <token>` header for every call below.

### 2.2 User Profile
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users/me` | Return authenticated user profile |

Response
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "created_at": "2025-11-02T12:34:56Z"
}
```

---

### 2.3 Categories
| Method | Path | Description | Auth | Notes |
|--------|------|-------------|------|-------|
| GET | `/api/v1/categories` | List categories (with optional `active=true/false`, `parent_id`) | public | Pagination supported |
| POST | `/api/v1/categories` | Create new category | user | Validate name unique (case-insensitive) |
| GET | `/api/v1/categories/{id}` | Retrieve category by id | public |  |
| PATCH | `/api/v1/categories/{id}` | Update name / parent / active | user | Reject cycles in hierarchy |
| DELETE | `/api/v1/categories/{id}` | Soft-delete (set `is_active=false`) | user | Reject when referenced |

Request : Create / Update
```json
{
  "name": "Groceries",
  "parent_id": "uuid|null",
  "is_active": true
}
```

Errors
- 400 `VALIDATION_ERROR` – name empty or duplicate
- 404 `NOT_FOUND`

---

### 2.4 Expenses
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/expenses` | List expenses of current user | user |
| POST | `/api/v1/expenses` | Create expense (triggers auto-classification) | user |
| GET | `/api/v1/expenses/{id}` | Retrieve single expense | user |
| PATCH | `/api/v1/expenses/{id}` | Update expense (name, amount, category, date) | user |
| DELETE | `/api/v1/expenses/{id}` | Delete expense | user |
| POST | `/api/v1/expenses/{id}/classify` | Force re-classification using AI | user |

Query params for list:
- `date_from`, `date_to` (ISO-8601)
- `classification_status`
- `category_id`
- `page` (default 1), `per_page` (max 100)
- `sort` (`expense_date`, `amount`, `created_at` + optional `:desc`)

Create Request
```json
{
  "name": "Coffee",
  "amount": 12.50,
  "expense_date": "2025-11-02",
  "category_id": "uuid?" // optional, else AI decides
}
```
Response (201)
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Coffee",
  "amount": 12.5,
  "expense_date": "2025-11-02",
  "category_id": "uuid|null",
  "predicted_category_id": "uuid|null",
  "prediction_confidence": 0.83,
  "classification_status": "predicted",
  "created_at": "2025-11-02T12:35:00Z",
  "updated_at": "2025-11-02T12:35:00Z"
}
```
Validation
- `amount > 0`
- `name` trimmed length > 0

Errors
- 400 `VALIDATION_ERROR`
- 403 `FORBIDDEN` (other user’s record)
- 500 `CLASSIFICATION_FAILED`

---

### 2.5 Logs (read-only)
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/logs` | List current user’s logs | user |
| GET | `/api/v1/logs/{id}` | Get single log entry | user |

Query params: `page`, `per_page`, `expense_id`, `action`.

---

### 2.6 Analytics
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/analytics/expenses` | Aggregated sums for charts | user |

Query params:
- `group_by` (`category`, `month`, `day`)
- `date_from`, `date_to`
- `category_id` (filter subset)

Sample Response
```json
{
  "group_by": "category",
  "date_range": {
    "from": "2025-11-01",
    "to": "2025-11-30"
  },
  "results": [
    { "category": "Groceries", "total": 320.40 },
    { "category": "Transport", "total": 120.00 }
  ]
}
```

## 3. Authentication & Authorization
- **Scheme**: Supabase JWT via `Authorization: Bearer <token>` header.
- **Public endpoints**: Category listing, health check.
- **User-scoped data**: Expenses and Logs filtered by `user_id = auth.uid()` in queries.
- **Row-level security**: Prepared in DB (see schema) but disabled for MVP; API layer enforces ownership instead.
- **Rate limiting**: 60 requests/min/user via middleware (e.g., `express-rate-limit`).

## 4. Validation & Business Logic
### Validation Rules
- Category `name` unique (case-insensitive); enforce in API before insert.
- Category hierarchy cannot contain cycles; check when updating `parent_id`.
- Expense `amount` numeric(12,2) > 0.
- Expense / Category `name` trimmed length > 0.
- Classification confidence must be 0–1.

### Business Logic
- **Auto-classification**: After creating an expense, server asynchronously calls external AI (Openrouter.ai) to predict category. Response updates `predicted_category_id`, `prediction_confidence`, `classification_status`.
- **Manual correction**: Updating `category_id` sets `corrected_category_id` and flips status to `corrected`.
- **Logging**: All create/update/classify operations insert into `logs` with diff payload.
- **Soft-delete categories**: Setting `is_active=false` hides from default queries.
- **Analytics**: Aggregation SQL leveraging `expenses_user_date_idx` for performance.

---

## 5. Error Handling
| Code | Example Message | Notes |
|------|-----------------|-------|
| 400 | `VALIDATION_ERROR` | Invalid input fields |
| 401 | `UNAUTHORIZED` | Missing/invalid JWT |
| 403 | `FORBIDDEN` | Accessing resources of other user |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE_RESOURCE` | Name conflicts |
| 422 | `CLASSIFICATION_FAILED` | AI service failure |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `SERVER_ERROR` | Unhandled exception |

## 6. Pagination, Filtering, Sorting
- Standard `page` and `per_page` query params; `Link` header for navigation.
- Filtering via explicit query params (see endpoints).
- Sorting via `sort` param with `:desc` suffix.

## 7. Versioning & Format
- All routes prefixed with `/api/v1`.
- JSON only, UTF-8.
- Future breaking changes → increment version number.

## 8. Security Measures
- HTTPS only.
- Rate limiting as above.
- Input sanitization & prepared statements (Supabase client).
- Audit logging in `logs`.
- Optional RLS enablement in future.

## 9. Assumptions
- Supabase Auth handles password hashing & email verification.
- MVP skips RLS; implemented later.
- AI classification is eventually consistent; client may refresh.
- UI consumes analytics endpoints for charts instead of client-side aggregation.
