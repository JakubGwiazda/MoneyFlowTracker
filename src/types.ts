import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./db/database.types"

/** Utility alias for ISO-8601 formatted date-time strings exposed via the API. */
export type IsoDateString = string

/** Common pagination query parameters shared by list endpoints. */
export type PageQueryParams = {
  page?: number
  per_page?: number
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

/**
 * Minimal representation of the authenticated Supabase user profile.
 * The `id` field is typed via `expenses.user_id` to stay aligned with
 * foreign-key constraints in the database schema.
 */
export type UserProfileDto = {
  id: Tables<"expenses">["user_id"]
  email: string
  created_at: IsoDateString
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

type CategoryRow = Tables<"categories">

/** Category payload returned by the API. */
export type CategoryDto = Pick<
  CategoryRow,
  "id" | "name" | "parent_id" | "is_active" | "created_at"
>

/** Query-string contract for listing categories. */
export type CategoryListQueryDto = PageQueryParams & {
  active?: CategoryRow["is_active"]
  parent_id?: CategoryRow["parent_id"]
}

/** Request body structure for creating categories. */
export type CreateCategoryCommand = Pick<
  TablesInsert<"categories">,
  "name" | "parent_id" | "is_active"
>

/** Partial update payload for categories. */
export type UpdateCategoryCommand = Pick<
  TablesUpdate<"categories">,
  "name" | "parent_id" | "is_active"
>

/** Route parameter contract for soft-deleting a category. */
export type SoftDeleteCategoryCommand = {
  id: CategoryRow["id"]
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

type ExpenseRow = Tables<"expenses">
export type ClassificationStatus = Enums<"classification_status">

/** Expense payload mirroring the database row exposed to clients. */
export type ExpenseDto = Pick<
  ExpenseRow,
  | "id"
  | "user_id"
  | "name"
  | "amount"
  | "expense_date"
  | "category_id"
  | "predicted_category_id"
  | "prediction_confidence"
  | "classification_status"
  | "corrected_category_id"
  | "created_at"
  | "updated_at"
>

export type ExpenseSortableField = "expense_date" | "amount" | "created_at"

/**
 * Recognised sort parameter values (`field` or `field:desc`).
 * The API plan only specifies `:desc`, so asc is assumed by omission.
 */
export type ExpenseSortParam =
  | ExpenseSortableField
  | `${ExpenseSortableField}:desc`

/** Query-string contract for listing expenses. */
export type ExpenseListQueryDto = PageQueryParams & {
  date_from?: ExpenseRow["expense_date"]
  date_to?: ExpenseRow["expense_date"]
  classification_status?: ClassificationStatus
  category_id?: ExpenseRow["category_id"]
  sort?: ExpenseSortParam
}

/** Request body structure for creating expenses. */
export type CreateExpenseCommand = Pick<
  TablesInsert<"expenses">,
  "name" | "amount" | "expense_date" | "category_id"
>

/** Partial update payload for expenses. */
export type UpdateExpenseCommand = Pick<
  TablesUpdate<"expenses">,
  "name" | "amount" | "expense_date" | "category_id" | "classification_status"
>

/** Route parameter contract for deleting an expense. */
export type DeleteExpenseCommand = {
  id: ExpenseRow["id"]
}

/** Command payload for triggering AI re-classification of an expense. */
export type ClassifyExpenseCommand = {
  id: ExpenseRow["id"]
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

type LogRow = Tables<"logs">
type LogAction = Enums<"log_action">

/** Log entry payload surfaced by the API. */
export type LogEntryDto = Pick<
  LogRow,
  "id" | "user_id" | "expense_id" | "log_action" | "payload" | "created_at"
>

/** Query-string contract for listing logs. */
export type LogListQueryDto = PageQueryParams & {
  expense_id?: LogRow["expense_id"]
  action?: LogAction
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export type AnalyticsGroupBy = "category" | "month" | "day"

/** Shared date range structure used in analytics responses. */
export type AnalyticsDateRangeDto = {
  from: ExpenseRow["expense_date"]
  to: ExpenseRow["expense_date"]
}

/** Query-string contract for expense analytics endpoint. */
export type AnalyticsExpensesQueryDto = {
  group_by?: AnalyticsGroupBy
  date_from?: ExpenseRow["expense_date"]
  date_to?: ExpenseRow["expense_date"]
  category_id?: ExpenseRow["category_id"]
}

/**
 * Response structure for the expense analytics endpoint, keeping the result
 * bucket shape aligned with the selected grouping dimension.
 */
export type AnalyticsExpensesResponseDto =
  | {
      group_by: "category"
      date_range: AnalyticsDateRangeDto
      results: Array<{
        category: CategoryRow["name"]
        total: number
      }>
    }
  | {
      group_by: "month"
      date_range: AnalyticsDateRangeDto
      results: Array<{
        month: string
        total: number
      }>
    }
  | {
      group_by: "day"
      date_range: AnalyticsDateRangeDto
      results: Array<{
        day: string
        total: number
      }>
    }


