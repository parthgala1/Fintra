const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface User {
  id: string;
  email: string;
  name: string;
  date_of_birth: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  date_of_birth: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  new_password: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  category_name?: string;
  category_type?: Category["category_type"];
  bank_account_id: string | null;
  bank_account_name?: string;
  notes: string | null;
  is_manual: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TransactionParams {
  page?: number;
  page_size?: number;
  search?: string;
  bank_account_id?: string;
  category_id?: string;
  category_type?: string;
  start_date?: string;
  end_date?: string;
  type?: "income" | "expense";
  sort_by?: "date" | "amount";
  sort_order?: "asc" | "desc";
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CreateTransactionData {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id?: string;
  bank_account_id?: string;
  notes?: string;
}

export interface UpdateTransactionData {
  date?: string;
  description?: string;
  amount?: number;
  type?: "income" | "expense";
  category_id?: string | null;
  bank_account_id?: string | null;
  notes?: string | null;
}

export interface BulkUpdateTransactionsData {
  transaction_ids: string[];
  category_id: string;
}

// Upload Types
export interface Upload {
  id: string;
  source: string;
  file_name: string;
  status: "pending" | "processing" | "completed" | "failed";
  total_transactions: number;
  imported_transactions: number;
  duplicate_transactions: number;
  failed_transactions: number;
  // Reconciliation fields
  statement_balance_extracted?: number | null;
  statement_date_extracted?: string | null;
  reconciliation_status?: string | null;
  balance_discrepancy?: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface InitiateUploadData {
  source: string;
}

export interface ProcessUploadData {
  file: File;
}

export interface UploadHistoryResponse {
  uploads: Upload[];
  total: number;
}

// Category Types
export interface Category {
  id: string;
  name: string;
  category_type:
    | "income"
    | "expense"
    | "needs"
    | "wants"
    | "savings"
    | "transfer"
    | "both";
  is_system: boolean;
  is_active?: boolean;
  icon: string | null;
  color: string | null;
  description?: string;
  user_id?: string;
  transaction_count?: number;
  created_at: string;
  updated_at: string | null;
  // Legacy field name for compatibility
  type?: "income" | "expense" | "both";
}

export interface CreateCategoryData {
  name: string;
  category_type?:
    | "income"
    | "expense"
    | "needs"
    | "wants"
    | "savings"
    | "transfer"
    | "both";
  type?: "income" | "expense" | "both";
  icon?: string;
  color?: string;
  description?: string;
}

export interface UpdateCategoryData {
  name?: string;
  category_type?:
    | "income"
    | "expense"
    | "needs"
    | "wants"
    | "savings"
    | "transfer"
    | "both";
  type?: "income" | "expense" | "both";
  icon?: string;
  color?: string;
  description?: string;
}

// Category Mapping Types
export interface CategoryMapping {
  id: string;
  keyword: string;
  category_id: string;
  category_name?: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateCategoryMappingData {
  keyword: string;
  category_id: string;
  priority?: number;
}

export interface UpdateCategoryMappingData {
  keyword?: string;
  category_id?: string;
  priority?: number;
  is_active?: boolean;
}

export interface CategoryMappingListResponse {
  mappings: CategoryMapping[];
  total: number;
}

export interface TestCategoryMappingData {
  description: string;
}

// Bank Account Types
export interface BankAccount {
  id: string;
  account_name: string;
  account_type: string;
  institution_name: string | null;
  institution_id?: string | null;
  account_number_last4?: string | null;
  current_balance: number;
  available_balance?: number | null;
  credit_limit?: number | null;
  is_active: boolean;
  is_connected?: boolean;
  currency?: string;
  // Reconciliation fields
  statement_balance?: number | null;
  statement_date?: string | null;
  last_reconciled_at?: string | null;
  reconciliation_status?: string | null;
  balance_discrepancy_amount?: number | null;
  last_statement_document_id?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBankAccountData {
  account_name: string;
  account_type: string;
  institution_name?: string;
  institution_id?: string;
  account_number_last4?: string;
  routing_number?: string;
  current_balance?: number;
  available_balance?: number;
  credit_limit?: number;
}

export interface UpdateBankAccountData {
  account_name?: string;
  account_type?: string;
  institution_name?: string;
  institution_id?: string;
  account_number_last4?: string;
  routing_number?: string;
  current_balance?: number;
  available_balance?: number;
  credit_limit?: number;
  is_active?: boolean;
  is_connected?: boolean;
}

export interface BankAccountListResponse {
  accounts: BankAccount[];
  total: number;
}

// Budget Types
export interface Budget {
  id: string;
  name: string;
  type: "50/30/20" | "custom";
  period: "weekly" | "biweekly" | "monthly" | "yearly";
  total_amount: number;
  needs_amount: number;
  needs_percentage: number;
  wants_amount: number;
  wants_percentage: number;
  savings_amount: number;
  savings_percentage: number;
  start_date: string;
  end_date: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CreateBudgetData {
  name: string;
  type: "50/30/20" | "custom";
  period: "weekly" | "biweekly" | "monthly" | "yearly";
  total_amount: number;
  needs_percentage?: number;
  wants_percentage?: number;
  savings_percentage?: number;
  start_date: string;
  end_date?: string;
  is_default?: boolean;
}

export interface UpdateBudgetData {
  name?: string;
  type?: "50/30/20" | "custom";
  period?: "weekly" | "biweekly" | "monthly" | "yearly";
  total_amount?: number;
  needs_percentage?: number;
  wants_percentage?: number;
  savings_percentage?: number;
  start_date?: string;
  end_date?: string;
  is_default?: boolean;
}

export interface AnalysisCategoryItem {
  amount: number;
  percentage: number;
  icon?: string | null;
  color?: string | null;
  transaction_count: number;
}

export interface BudgetAnalysisBreakdown {
  Needs: Record<string, AnalysisCategoryItem>;
  Wants: Record<string, AnalysisCategoryItem>;
  Savings: Record<string, AnalysisCategoryItem>;
}

export interface BudgetAnalysisResponse {
  analysis_id: string;
  budget_name: string;
  analysis_start_date: string;
  analysis_end_date: string;
  total_spending: number;
  needs_total: number;
  wants_total: number;
  savings_total: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  category_breakdown: BudgetAnalysisBreakdown;
  total_transactions: number;
  data_quality: string;
  validation_warnings: string[];
}

export interface BudgetAnalyzeRequest {
  name: string;
  budget_start_date: string;
  income?: number;
}

export interface CreateBudgetWithAnalysisRequest {
  name: string;
  budget_start_date: string;
  analysis_id: string;
  income?: number;
  confirmed: boolean;
  rule_type: "fifty_thirty_twenty" | "custom" | "manual_custom";
  /** Only required when rule_type is "manual_custom" */
  custom_needs_percentage?: number;
  custom_wants_percentage?: number;
  custom_savings_percentage?: number;
}

// Budget Generation Types
export interface CategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_type: string;
  total: number;
  transaction_count: number;
}

export interface BudgetGenerateResponse {
  period_start: string;
  period_end: string;
  total_income: number;
  needs_total: number;
  wants_total: number;
  savings_total: number;
  total_expenses: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  transaction_count: number;
  category_breakdown: CategoryBreakdownItem[];
  data_quality: "high" | "moderate" | "low" | "insufficient";
}

// Budget Report Types
export interface BudgetReport {
  id: string;
  budget_id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  period_type?: string;
  total_income: number;
  total_expenses?: number;
  total_needs?: number;
  total_wants?: number;
  total_savings?: number;
  needs_budget?: number;
  wants_budget?: number;
  savings_budget?: number;
  savings_rate?: number;
  // Additional fields from backend
  total_budgeted: number;
  total_spent: number;
  budgeted_needs?: number;
  budgeted_wants?: number;
  budgeted_savings?: number;
  actual_needs?: number;
  actual_wants?: number;
  actual_savings?: number;
  needs_deviation?: number;
  wants_deviation?: number;
  savings_deviation?: number;
  needs_percentage_used?: number;
  wants_percentage_used?: number;
  savings_percentage_used?: number;
  overall_deviation?: number;
  remaining_budget?: number;
  last_calculated_at?: string;
  is_over_budget?: boolean;
  // Legacy field names for compatibility
  start_date?: string;
  end_date?: string;
  // Additional fields used in UI
  category_breakdown?: Array<{
    category_id: string;
    category_name: string;
    budgeted: number;
    spent: number;
    deviation: number;
  }>;
  summary?: string;
  created_at: string;
}

export interface GenerateBudgetReportData {
  period_type?: "weekly" | "biweekly" | "monthly" | "yearly";
  period_start?: string;
  period_end?: string;
}

export interface BudgetCategoryAllocation {
  id: string;
  budget_id: string;
  category_id: string;
  category_type: "needs" | "wants" | "savings";
  budgeted_amount: number;
  sort_order: number;
  created_at: string;
  updated_at?: string | null;
}

export interface BudgetCategoryAllocationInput {
  category_id: string;
  budgeted_amount: number;
  sort_order?: number;
}

// Scenario Types
export interface Scenario {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  original_income: number;
  new_income: number;
  income_change_percentage: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  calculated_needs: number;
  calculated_wants: number;
  calculated_savings: number;
  is_applied: boolean;
  // Additional UI fields
  impact?: string;
  created_at: string;
  updated_at: string | null;
}

export interface CreateScenarioData {
  name: string;
  description?: string;
  new_income?: number;
  needs_percentage?: number;
  wants_percentage?: number;
  savings_percentage?: number;
  // Legacy/UI fields that get mapped to backend fields
  adjustments?: Record<string, number>;
  income_change?: number;
}

export interface UpdateScenarioData {
  name?: string;
  description?: string;
  new_income?: number;
  needs_percentage?: number;
  wants_percentage?: number;
  savings_percentage?: number;
  income_change?: number;
}

export interface CalculateScenarioData {
  income_change?: number;
  new_income?: number;
  needs_percentage?: number;
  wants_percentage?: number;
  savings_percentage?: number;
  // UI-only fields (not sent to backend)
  expense_changes?: Record<string, number>;
}

export interface ScenarioCalculation {
  original_income: number;
  new_income: number;
  income_change_percentage: number;
  needs_percentage: number;
  wants_percentage: number;
  savings_percentage: number;
  calculated_needs: number;
  calculated_wants: number;
  calculated_savings: number;
  // Additional fields used in UI
  new_total_budget?: number;
  projected_spending?: number;
  difference?: number;
}

// Alert Types
export interface Alert {
  id: string;
  budget_id: string;
  budget_name?: string;
  type: "overspent" | "warning" | "goal_achieved" | "budget_created";
  severity: "info" | "warning" | "critical" | "high" | "medium" | "low";
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

// User Preferences Types
export interface UserPreferences {
  id: string;
  user_id: string;
  currency: string;
  currency_symbol: string;
  date_format: string;
  timezone: string;
  theme: string;
  auto_categorize: boolean;
  categorize_on_import: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  weekly_summary: boolean;
  show_amounts: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface UpdateUserPreferencesData {
  theme?: string;
  currency?: string;
  currency_symbol?: string;
  date_format?: string;
  timezone?: string;
  auto_categorize?: boolean;
  categorize_on_import?: boolean;
  email_notifications?: boolean;
  push_notifications?: boolean;
  weekly_summary?: boolean;
  monthly_report?: boolean;
  show_amounts?: boolean;
}

// Goal Types
export interface Goal {
  id: string;
  name: string;
  description?: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  target_date?: string;
  monthly_contribution?: number;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GoalCreate {
  name: string;
  description?: string;
  goal_type: string;
  target_amount: number;
  current_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  priority?: string;
}

export interface GoalUpdate {
  name?: string;
  description?: string;
  goal_type?: string;
  target_amount?: number;
  current_amount?: number;
  target_date?: string;
  monthly_contribution?: number;
  priority?: string;
  status?: string;
}

export interface GoalAnalysis {
  goal_id: string;
  required_monthly: number;
  current_contribution: number;
  gap: number;
  feasibility_percentage: number;
  is_on_track: boolean;
  months_remaining: number;
  projected_completion_date?: string;
  shortfall_amount: number;
  risk_level: string;
  progress_percentage: number;
}

export interface GoalMilestone {
  id: string;
  goal_id: string;
  name: string;
  description?: string;
  target_amount: number;
  current_amount: number;
  target_date?: string;
  is_completed: boolean;
  created_at: string;
}

export interface GoalMilestoneCreate {
  name: string;
  description?: string;
  target_amount: number;
  target_date?: string;
}

// Recommendation Types
export interface Recommendation {
  id: string;
  user_id: string;
  category: string;
  impact: string;
  status: string;
  title: string;
  description: string;
  short_summary?: string;
  potential_savings?: number;
  potential_earnings?: number;
  estimated_time_to_impact?: string;
  action_steps?: string; // JSON string
  external_resources?: string; // JSON string
  trigger_type?: string;
  trigger_data?: string; // JSON string
  dismissal_reason?: string;
  snoozed_until?: string;
  implemented_at?: string;
  view_count?: number;
  dismiss_count?: number;
  created_at: string;
  updated_at: string;
}

export interface RecommendationGenerateRequest {
  type?: string; // "budget", "goal", "savings", or null for all
}

export interface RecommendationDismissRequest {
  reason?: string;
}

export interface RecommendationSnoozeRequest {
  days?: number; // Default 7 days
}

export interface AlertConfig {
  // Backend field names
  warning_threshold: number;
  critical_threshold: number;
  overspend_alert: boolean;
  notifications_enabled: boolean;
  // UI field names for compatibility
  overspent_threshold?: number;
  enable_email_notifications?: boolean;
  enable_push_notifications?: boolean;
  enabled?: boolean;
  budget_overrun_threshold?: number;
  email_notifications?: boolean;
  push_notifications?: boolean;
}

export interface UpdateAlertConfigData {
  // Backend field names
  warning_threshold?: number;
  critical_threshold?: number;
  overspend_alert?: boolean;
  notifications_enabled?: boolean;
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function notifyAuthFailure() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("fintra:auth-failed"));
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "An error occurred" }));
    if (response.status === 401) {
      notifyAuthFailure();
    }
    throw new ApiError(response.status, error.detail || "An error occurred");
  }

  // Handle empty responses (204 No Content, or empty body)
  const contentLength = response.headers.get("content-length");
  const contentType = response.headers.get("content-type");

  // If no content-length or content-length is 0, or status is 204, return empty object
  if (
    response.status === 204 ||
    contentLength === "0" ||
    !contentType?.includes("application/json")
  ) {
    return {} as T;
  }

  // Try to parse JSON, return empty object if parsing fails
  const text = await response.text();
  if (!text || text.trim() === "") {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

// Helper function to get token from localStorage
function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("fintra_token");
  }
  return null;
}

// Helper function for authenticated requests
async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  return handleResponse<T>(response);
}

// Helper function for multipart form data requests
async function fetchFormWithAuth<T>(
  url: string,
  formData: FormData,
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    method: "POST",
    headers,
    body: formData,
  });

  return handleResponse<T>(response);
}

// Helper functions to transform budget data between backend and frontend schemas
function transformBackendBudget(backendBudget: any): Budget {
  const transformed = {
    ...backendBudget,
    type:
      backendBudget.budget_type === "fifty_thirty_twenty"
        ? "50/30/20"
        : "custom",
    total_amount: backendBudget.total_budget,
  };
  return normalizeBudget(transformed);
}

function transformBackendBudgets(response: any): Budget[] {
  return response.budgets.map((b: any) => transformBackendBudget(b));
}

// Helper function to parse number values (defensive parsing for Decimal serialization)
function parseNumber(value: any): number {
  /**
   * Ensures a value is a number, not a string or null/undefined.
   *
   * Background: The backend uses Python Decimal for precision, which could get
   * serialized as a string in JSON. This normalizes it back to a number.
   *
   * This is a defensive measure and also handles the backend fix where we now
   * properly serialize Decimal to float. This function ensures robustness.
   */
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  return 0;
}

// Helper function to normalize transaction amount (defensive parsing for Decimal serialization)
function normalizeTransaction(transaction: any): Transaction {
  /**
   * Ensures amount is a number, not a string.
   *
   * Background: The backend uses Python Decimal for precision, which gets
   * serialized as a string in JSON by Pydantic. This normalizes it back to a number.
   *
   * This is a defensive measure and also handles the backend fix where we now
   * properly serialize Decimal to float. This function ensures robustness.
   */
  return {
    ...transaction,
    amount: parseNumber(transaction.amount),
  };
}

function normalizeTransactions(transactions: any[]): Transaction[] {
  return transactions.map(normalizeTransaction);
}

// Helper function to normalize budget data (defensive parsing for Decimal serialization)
function normalizeBudget(budget: any): Budget {
  /**
   * Ensures all numeric fields are numbers, not strings.
   *
   * This prevents NaN errors when doing calculations or calling .toLocaleString()
   * on the frontend.
   */
  return {
    ...budget,
    total_amount: parseNumber(budget.total_amount),
    needs_amount: parseNumber(budget.needs_amount),
    needs_percentage: parseNumber(budget.needs_percentage),
    wants_amount: parseNumber(budget.wants_amount),
    wants_percentage: parseNumber(budget.wants_percentage),
    savings_amount: parseNumber(budget.savings_amount),
    savings_percentage: parseNumber(budget.savings_percentage),
  };
}

// Helper function to normalize budget report data (defensive parsing for Decimal serialization)
function normalizeBudgetReport(report: any): BudgetReport {
  /**
   * Ensures all numeric fields in budget reports are numbers, not strings.
   *
   * This prevents NaN errors when doing calculations or displaying amounts.
   */
  const totalBudgeted = parseNumber(report.total_budgeted);
  const totalSpent = parseNumber(report.total_spent);
  const overallDeviation =
    totalBudgeted > 0 ? ((totalSpent - totalBudgeted) / totalBudgeted) * 100 : 0;

  return {
    ...report,
    total_income: parseNumber(report.total_income),
    budgeted_needs: parseNumber(report.budgeted_needs),
    budgeted_wants: parseNumber(report.budgeted_wants),
    budgeted_savings: parseNumber(report.budgeted_savings),
    total_budgeted: totalBudgeted,
    actual_needs: parseNumber(report.actual_needs),
    actual_wants: parseNumber(report.actual_wants),
    actual_savings: parseNumber(report.actual_savings),
    total_spent: totalSpent,
    needs_deviation: parseNumber(report.needs_deviation),
    wants_deviation: parseNumber(report.wants_deviation),
    savings_deviation: parseNumber(report.savings_deviation),
    needs_percentage_used: parseNumber(report.needs_percentage_used),
    wants_percentage_used: parseNumber(report.wants_percentage_used),
    savings_percentage_used: parseNumber(report.savings_percentage_used),
    remaining_budget: parseNumber(report.remaining_budget),
    last_calculated_at: report.last_calculated_at || null,
    overall_deviation: parseNumber(report.overall_deviation) || overallDeviation,
    category_breakdown:
      report.breakdowns?.map((b: any) => ({
        category_id: b.category_id,
        category_name: b.category_name,
        budgeted: parseNumber(b.budgeted_amount),
        spent: parseNumber(b.actual_amount),
        deviation: parseNumber(b.deviation_percentage),
      })) ||
      report.category_breakdown ||
      [],
    breakdowns:
      report.breakdowns?.map((b: any) => ({
        ...b,
        budgeted_amount: parseNumber(b.budgeted_amount),
        actual_amount: parseNumber(b.actual_amount),
        deviation: parseNumber(b.deviation),
        deviation_percentage: parseNumber(b.deviation_percentage),
      })) || [],
  };
}

// Helper function to normalize scenario data (defensive parsing for Decimal serialization)
function normalizeScenario(scenario: any): Scenario {
  /**
   * Ensures all numeric fields in scenarios are numbers, not strings.
   *
   * This prevents NaN errors when doing calculations or displaying amounts.
   */
  return {
    ...scenario,
    income_change: parseNumber(scenario.income_change),
    new_income: parseNumber(scenario.new_income),
    scenario_needs_percentage: parseNumber(scenario.scenario_needs_percentage),
    scenario_wants_percentage: parseNumber(scenario.scenario_wants_percentage),
    scenario_savings_percentage: parseNumber(
      scenario.scenario_savings_percentage,
    ),
    scenario_needs_amount: parseNumber(scenario.scenario_needs_amount),
    scenario_wants_amount: parseNumber(scenario.scenario_wants_amount),
    scenario_savings_amount: parseNumber(scenario.scenario_savings_amount),
    current_needs_amount: parseNumber(scenario.current_needs_amount),
    current_wants_amount: parseNumber(scenario.current_wants_amount),
    current_savings_amount: parseNumber(scenario.current_savings_amount),
    needs_impact: parseNumber(scenario.needs_impact),
    wants_impact: parseNumber(scenario.wants_impact),
    savings_impact: parseNumber(scenario.savings_impact),
  };
}

// Helper function to normalize category mapping data between backend and frontend field names
function normalizeCategoryMapping(mapping: any): CategoryMapping {
  return {
    ...mapping,
    // Backend returns `name`; frontend uses `keyword`
    keyword: mapping.keyword ?? mapping.name ?? mapping.contains_text ?? "",
    priority: parseNumber(mapping.priority),
  };
}

export const api = {
  // Auth APIs
  async login(data: LoginData): Promise<Token> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<Token>(response);
  },

  async signup(data: SignupData): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<User>(response);
  },

  async forgotPassword(data: ForgotPasswordData): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  async resetPassword(data: ResetPasswordData): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },

  async getCurrentUser(token: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<User>(response);
  },

  async logout(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse<{ message: string }>(response);
  },

  // Transaction APIs
  async getTransactions(
    params?: TransactionParams,
  ): Promise<TransactionListResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    const response = await fetchWithAuth<TransactionListResponse>(
      `/api/transactions${query ? `?${query}` : ""}`,
    );
    // Normalize transaction amounts (defensive parsing for Decimal serialization)
    return {
      ...response,
      transactions: normalizeTransactions(response.transactions),
    };
  },

  async getTransaction(id: string): Promise<Transaction> {
    const transaction = await fetchWithAuth<Transaction>(
      `/api/transactions/${id}`,
    );
    // Normalize transaction amount
    return normalizeTransaction(transaction);
  },

  async createTransaction(data: CreateTransactionData): Promise<Transaction> {
    const transaction = await fetchWithAuth<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return normalizeTransaction(transaction);
  },

  async updateTransaction(
    id: string,
    data: UpdateTransactionData,
  ): Promise<Transaction> {
    const transaction = await fetchWithAuth<Transaction>(
      `/api/transactions/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return normalizeTransaction(transaction);
  },

  async deleteTransaction(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/transactions/${id}`, {
      method: "DELETE",
    });
  },

  async bulkUpdateTransactions(
    data: BulkUpdateTransactionsData,
  ): Promise<{ message: string; updated_count: number }> {
    return fetchWithAuth<{ message: string; updated_count: number }>(
      "/api/transactions/bulk-update",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  // Upload APIs
  async initiateUpload(source: string): Promise<{ upload_id: string }> {
    return fetchWithAuth<{ upload_id: string }>("/api/upload/initiate", {
      method: "POST",
      body: JSON.stringify({ source }),
    });
  },

  async processUpload(
    uploadId: string,
    file: File,
  ): Promise<{ message: string; summary: Upload }> {
    const formData = new FormData();
    formData.append("file", file);
    return fetchFormWithAuth<{ message: string; summary: Upload }>(
      `/api/upload/${uploadId}/process`,
      formData,
    );
  },

  async getUploadStatus(id: string): Promise<Upload> {
    return fetchWithAuth<Upload>(`/api/upload/${id}/status`);
  },

  async getUploadHistory(): Promise<UploadHistoryResponse> {
    return fetchWithAuth<UploadHistoryResponse>("/api/upload/history");
  },

  // Category APIs
  async getCategories(): Promise<Category[]> {
    const response = await fetchWithAuth<{ categories: Category[] }>(
      "/api/categories",
    );
    return response.categories;
  },

  async getCategory(id: string): Promise<Category> {
    return fetchWithAuth<Category>(`/api/categories/${id}`);
  },

  async createCategory(data: CreateCategoryData): Promise<Category> {
    return fetchWithAuth<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateCategory(
    id: string,
    data: UpdateCategoryData,
  ): Promise<Category> {
    return fetchWithAuth<Category>(`/api/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/categories/${id}`, {
      method: "DELETE",
    });
  },

  async getSystemCategories(): Promise<Category[]> {
    return fetchWithAuth<Category[]>("/api/categories/system");
  },

  // Category Mapping APIs
  async getCategoryMappings(): Promise<CategoryMappingListResponse> {
    const response = await fetchWithAuth<CategoryMappingListResponse>(
      "/api/category-mappings",
    );
    return {
      ...response,
      mappings: (response.mappings || []).map(normalizeCategoryMapping),
    };
  },

  async createCategoryMapping(
    data: CreateCategoryMappingData,
  ): Promise<CategoryMapping> {
    const backendData = {
      name: data.keyword,
      contains_text: data.keyword,
      category_id: data.category_id,
      priority: data.priority ?? 1,
    };
    const mapping = await fetchWithAuth<CategoryMapping>("/api/category-mappings", {
      method: "POST",
      body: JSON.stringify(backendData),
    });
    return normalizeCategoryMapping(mapping);
  },

  async updateCategoryMapping(
    id: string,
    data: UpdateCategoryMappingData,
  ): Promise<CategoryMapping> {
    const backendData: Record<string, unknown> = {
      ...data,
    };
    if (data.keyword !== undefined) {
      backendData.name = data.keyword;
      backendData.contains_text = data.keyword;
      delete backendData.keyword;
    }

    const mapping = await fetchWithAuth<CategoryMapping>(`/api/category-mappings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
    return normalizeCategoryMapping(mapping);
  },

  async deleteCategoryMapping(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/category-mappings/${id}`, {
      method: "DELETE",
    });
  },

  async testCategoryMapping(
    data: TestCategoryMappingData,
  ): Promise<{
    category_id: string;
    category_name: string;
    matched_keyword: string;
  }> {
    return fetchWithAuth<{
      category_id: string;
      category_name: string;
      matched_keyword: string;
    }>("/api/category-mappings/test", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Bank Account APIs
  async getBankAccounts(): Promise<BankAccountListResponse> {
    return fetchWithAuth<BankAccountListResponse>("/api/bank-accounts");
  },

  async getBankAccount(id: string): Promise<BankAccount> {
    return fetchWithAuth<BankAccount>(`/api/bank-accounts/${id}`);
  },

  async createBankAccount(data: CreateBankAccountData): Promise<BankAccount> {
    return fetchWithAuth<BankAccount>("/api/bank-accounts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateBankAccount(
    id: string,
    data: UpdateBankAccountData,
  ): Promise<BankAccount> {
    return fetchWithAuth<BankAccount>(`/api/bank-accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteBankAccount(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/bank-accounts/${id}`, {
      method: "DELETE",
    });
  },

  // Budget APIs
  async getBudgets(): Promise<Budget[]> {
    const response = await fetchWithAuth<{ budgets: any[] }>("/api/budgets");
    return response.budgets.map((b) => transformBackendBudget(b));
  },

  async getBudget(id: string): Promise<Budget> {
    const budget = await fetchWithAuth<any>(`/api/budgets/${id}`);
    return transformBackendBudget(budget);
  },

  async createBudget(data: CreateBudgetData): Promise<Budget> {
    // Transform frontend data to backend schema
    const backendData = {
      name: data.name,
      budget_type: data.type === "50/30/20" ? "fifty_thirty_twenty" : "custom",
      period: data.period,
      total_budget: data.total_amount,
      needs_percentage: data.needs_percentage,
      wants_percentage: data.wants_percentage,
      savings_percentage: data.savings_percentage,
      start_date: data.start_date,
      end_date: data.end_date,
      is_default: data.is_default,
    };
    const budget = await fetchWithAuth<any>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(backendData),
    });
    return transformBackendBudget(budget);
  },

  async analyzeBudget(data: BudgetAnalyzeRequest): Promise<BudgetAnalysisResponse> {
    const analysis = await fetchWithAuth<any>("/api/budgets/analyze", {
      method: "POST",
      body: JSON.stringify(data),
    });

    return {
      ...analysis,
      total_spending: parseNumber(analysis.total_spending),
      needs_total: parseNumber(analysis.needs_total),
      wants_total: parseNumber(analysis.wants_total),
      savings_total: parseNumber(analysis.savings_total),
      needs_percentage: parseNumber(analysis.needs_percentage),
      wants_percentage: parseNumber(analysis.wants_percentage),
      savings_percentage: parseNumber(analysis.savings_percentage),
    } as BudgetAnalysisResponse;
  },

  async createBudgetWithAnalysis(
    data: CreateBudgetWithAnalysisRequest,
  ): Promise<Budget> {
    const budget = await fetchWithAuth<any>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return transformBackendBudget(budget);
  },

  async getBudgetHistoryAnalysis(
    budgetId: string,
  ): Promise<BudgetAnalysisResponse> {
    const analysis = await fetchWithAuth<any>(
      `/api/budgets/${budgetId}/history-analysis`,
    );
    return {
      ...analysis,
      analysis_id: analysis.analysis_id ?? "",
      budget_name: analysis.budget_name ?? "",
      total_spending: parseNumber(analysis.total_spending),
      needs_total: parseNumber(analysis.needs_total),
      wants_total: parseNumber(analysis.wants_total),
      savings_total: parseNumber(analysis.savings_total),
      needs_percentage: parseNumber(analysis.needs_percentage),
      wants_percentage: parseNumber(analysis.wants_percentage),
      savings_percentage: parseNumber(analysis.savings_percentage),
    } as BudgetAnalysisResponse;
  },

  async updateBudget(id: string, data: UpdateBudgetData): Promise<Budget> {
    // Transform frontend data to backend schema if needed
    const backendData: any = {};
    if (data.name !== undefined) backendData.name = data.name;
    if (data.type !== undefined)
      backendData.budget_type =
        data.type === "50/30/20" ? "fifty_thirty_twenty" : "custom";
    if (data.period !== undefined) backendData.period = data.period;
    if (data.total_amount !== undefined)
      backendData.total_budget = data.total_amount;
    if (data.needs_percentage !== undefined)
      backendData.needs_percentage = data.needs_percentage;
    if (data.wants_percentage !== undefined)
      backendData.wants_percentage = data.wants_percentage;
    if (data.savings_percentage !== undefined)
      backendData.savings_percentage = data.savings_percentage;
    if (data.start_date !== undefined) backendData.start_date = data.start_date;
    if (data.end_date !== undefined) backendData.end_date = data.end_date;
    if (data.is_default !== undefined) backendData.is_default = data.is_default;

    const budget = await fetchWithAuth<any>(`/api/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(backendData),
    });
    return transformBackendBudget(budget);
  },

  async deleteBudget(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/budgets/${id}`, {
      method: "DELETE",
    });
  },

  async setDefaultBudget(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(
      `/api/budgets/${id}/set-default`,
      {
        method: "POST",
      },
    );
  },

  async getDefaultBudget(): Promise<Budget | null> {
    try {
      const budget = await fetchWithAuth<any>("/api/budgets/default");
      return transformBackendBudget(budget);
    } catch {
      return null;
    }
  },

  async generateBudgetFromActuals(
    startDate?: string,
    endDate?: string,
  ): Promise<BudgetGenerateResponse> {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const queryString = params.toString();
    const url = queryString
      ? `/api/budgets/generate-from-actuals?${queryString}`
      : "/api/budgets/generate-from-actuals";

    return fetchWithAuth<BudgetGenerateResponse>(url, {
      method: "POST",
    });
  },

  // Budget Report APIs
  async getBudgetReports(budgetId: string): Promise<BudgetReport[]> {
    const response = await fetchWithAuth<{
      reports: BudgetReport[];
      total: number;
    }>(`/api/budgets/${budgetId}/reports`);
    return response.reports.map(normalizeBudgetReport);
  },

  async generateBudgetReport(
    budgetId: string,
    data?: GenerateBudgetReportData,
  ): Promise<BudgetReport> {
    const report = await fetchWithAuth<BudgetReport>(
      `/api/budgets/${budgetId}/reports`,
      {
        method: "POST",
        body: JSON.stringify(data || {}),
      },
    );
    return normalizeBudgetReport(report);
  },

  async getBudgetReport(
    budgetId: string,
    reportId: string,
  ): Promise<BudgetReport> {
    const report = await fetchWithAuth<BudgetReport>(
      `/api/budgets/${budgetId}/reports/${reportId}`,
    );
    return normalizeBudgetReport(report);
  },

  async getCurrentReport(
    budgetId: string,
    recalculate: boolean = false,
  ): Promise<BudgetReport | null> {
    try {
      const params = new URLSearchParams();
      if (recalculate) params.set("recalculate", "true");
      const url = `/api/budgets/${budgetId}/reports/current${params.toString() ? `?${params.toString()}` : ""}`;
      const report = await fetchWithAuth<BudgetReport>(
        url,
      );
      return normalizeBudgetReport(report);
    } catch {
      return null;
    }
  },

  async recalculateCurrentReport(budgetId: string): Promise<BudgetReport> {
    const report = await fetchWithAuth<BudgetReport>(
      `/api/budgets/${budgetId}/reports/recalculate`,
      {
        method: "POST",
      },
    );
    return normalizeBudgetReport(report);
  },

  async getBudgetCategories(budgetId: string): Promise<BudgetCategoryAllocation[]> {
    const response = await fetchWithAuth<{ allocations: BudgetCategoryAllocation[]; total: number }>(
      `/api/budgets/${budgetId}/categories`,
    );
    return (response.allocations || []).map((a) => ({
      ...a,
      budgeted_amount: parseNumber(a.budgeted_amount),
      sort_order: parseNumber(a.sort_order),
    }));
  },

  async updateBudgetCategories(
    budgetId: string,
    allocations: BudgetCategoryAllocationInput[],
  ): Promise<BudgetCategoryAllocation[]> {
    const response = await fetchWithAuth<{ allocations: BudgetCategoryAllocation[]; total: number }>(
      `/api/budgets/${budgetId}/categories`,
      {
        method: "PUT",
        body: JSON.stringify({
          allocations: allocations.map((a, index) => ({
            category_id: a.category_id,
            budgeted_amount: a.budgeted_amount,
            sort_order: a.sort_order ?? index,
          })),
        }),
      },
    );
    return (response.allocations || []).map((a) => ({
      ...a,
      budgeted_amount: parseNumber(a.budgeted_amount),
      sort_order: parseNumber(a.sort_order),
    }));
  },

  async getLatestReport(budgetId: string): Promise<BudgetReport | null> {
    try {
      const report = await fetchWithAuth<BudgetReport>(
        `/api/budgets/${budgetId}/reports/latest`,
      );
      return normalizeBudgetReport(report);
    } catch {
      return null;
    }
  },

  // Scenario APIs
  async getScenarios(budgetId?: string): Promise<Scenario[]> {
    const query = budgetId ? `?budget_id=${budgetId}` : "";
    const response = await fetchWithAuth<{ scenarios: Scenario[]; total: number } | Scenario[]>(`/api/scenarios${query}`);
    // Backend returns { scenarios: [...], total: N }
    const scenarios = Array.isArray(response) ? response : (response as any).scenarios ?? [];
    return scenarios.map(normalizeScenario);
  },

  async getScenario(id: string): Promise<Scenario> {
    const scenario = await fetchWithAuth<Scenario>(`/api/scenarios/${id}`);
    return normalizeScenario(scenario);
  },

  async createScenario(
    budgetId: string,
    data: CreateScenarioData,
  ): Promise<Scenario> {
    // Transform frontend data to backend schema
    const backendData = {
      budget_id: budgetId,
      name: data.name,
      description: data.description || null,
      income_change: data.income_change || null,
      new_income: data.new_income || null,
      scenario_needs_percentage: data.needs_percentage || null,
      scenario_wants_percentage: data.wants_percentage || null,
      scenario_savings_percentage: data.savings_percentage || null,
    };
    const scenario = await fetchWithAuth<Scenario>(
      `/api/scenarios`,
      {
        method: "POST",
        body: JSON.stringify(backendData),
      },
    );
    return normalizeScenario(scenario);
  },

  async updateScenario(
    id: string,
    data: UpdateScenarioData,
  ): Promise<Scenario> {
    const scenario = await fetchWithAuth<Scenario>(`/api/scenarios/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return normalizeScenario(scenario);
  },

  async deleteScenario(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(`/api/scenarios/${id}`, {
      method: "DELETE",
    });
  },

  async calculateScenario(
    id: string,
    data: CalculateScenarioData,
  ): Promise<ScenarioCalculation> {
    // Transform frontend data to backend schema (filter out unsupported fields)
    const backendData = {
      income_change: data.income_change || null,
      new_income: data.new_income || null,
      scenario_needs_percentage: data.needs_percentage || null,
      scenario_wants_percentage: data.wants_percentage || null,
      scenario_savings_percentage: data.savings_percentage || null,
    };
    const response = await fetchWithAuth<any>(
      `/api/scenarios/${id}/calculate`,
      {
        method: "POST",
        body: JSON.stringify(backendData),
      },
    );
    
    // Normalize the response to map server fields to frontend interface
    // Server returns: scenario_needs_amount, scenario_wants_amount, scenario_savings_amount
    // Frontend expects: calculated_needs, calculated_wants, calculated_savings
    const calculatedNeeds = parseNumber(response.scenario_needs_amount);
    const calculatedWants = parseNumber(response.scenario_wants_amount);
    const calculatedSavings = parseNumber(response.scenario_savings_amount);
    const newIncome = parseNumber(response.new_income);
    
    // Compute derived fields for UI
    const newTotalBudget = calculatedNeeds + calculatedWants + calculatedSavings;
    const projectedSpending = calculatedNeeds + calculatedWants; // expenses only
    const difference = newIncome - projectedSpending; // what's left after expenses (for savings)
    
    return {
      original_income: newIncome, // The original budget amount
      new_income: newIncome,
      income_change_percentage: parseNumber(response.income_change || 0) > 0 
        ? ((parseNumber(response.income_change || 0) / newIncome) * 100)
        : 0,
      needs_percentage: parseNumber(response.needs_ratio || 0),
      wants_percentage: parseNumber(response.wants_ratio || 0), // Approximate from ratio
      savings_percentage: parseNumber(response.savings_rate || 0),
      calculated_needs: calculatedNeeds,
      calculated_wants: calculatedWants,
      calculated_savings: calculatedSavings,
      // Additional UI fields
      new_total_budget: newTotalBudget,
      projected_spending: projectedSpending,
      difference: difference,
    };
  },

  async applyScenario(
    id: string,
  ): Promise<{ message: string; new_budget_id: string }> {
    return fetchWithAuth<{ message: string; new_budget_id: string }>(
      `/api/scenarios/${id}/apply`,
      {
        method: "POST",
      },
    );
  },

  // Alert APIs
  async getAlerts(): Promise<Alert[]> {
    return fetchWithAuth<Alert[]>("/api/budgets/alerts");
  },

  async getAlertConfig(): Promise<AlertConfig> {
    const data = await fetchWithAuth<AlertConfig>("/api/budgets/alerts/config");
    // Map backend fields to frontend format
    return {
      ...data,
      overspent_threshold: data.warning_threshold,
      enable_email_notifications: data.notifications_enabled,
      enable_push_notifications: data.notifications_enabled,
    };
  },

  async updateAlertConfig(data: UpdateAlertConfigData): Promise<AlertConfig> {
    // Transform frontend data to backend schema
    const backendData = {
      warning_threshold: data.warning_threshold ?? null,
      critical_threshold: data.critical_threshold ?? null,
      overspend_alert: data.overspend_alert ?? true,
      notifications_enabled: data.notifications_enabled ?? true,
    };
    return fetchWithAuth<AlertConfig>("/api/budgets/alerts/config", {
      method: "PUT",
      body: JSON.stringify(backendData),
    });
  },

  async triggerAlertCheck(): Promise<{
    message: string;
    alerts_triggered: number;
  }> {
    return fetchWithAuth<{ message: string; alerts_triggered: number }>(
      "/api/budgets/alerts/check",
      {
        method: "POST",
      },
    );
  },

  async dismissAlert(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(
      `/api/budgets/alerts/${id}/dismiss`,
      {
        method: "PATCH",
      },
    );
  },

  async markAlertRead(id: string): Promise<{ message: string }> {
    return fetchWithAuth<{ message: string }>(
      `/api/budgets/alerts/${id}/read`,
      {
        method: "POST",
      },
    );
  },

  // User Preferences APIs
  async getUserPreferences(): Promise<UserPreferences> {
    return fetchWithAuth<UserPreferences>("/api/user/preferences");
  },

  async updateUserPreferences(
    data: UpdateUserPreferencesData,
  ): Promise<UserPreferences> {
    return fetchWithAuth<UserPreferences>("/api/user/preferences", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Goal APIs
  async getGoals(
    statusFilter?: string,
  ): Promise<{ goals: Goal[]; total: number }> {
    const query = statusFilter ? `?status_filter=${statusFilter}` : "";
    return fetchWithAuth<{ goals: Goal[]; total: number }>(
      `/api/goals${query}`,
    );
  },

  async getGoal(goalId: string): Promise<Goal> {
    return fetchWithAuth<Goal>(`/api/goals/${goalId}`);
  },

  async createGoal(data: GoalCreate): Promise<Goal> {
    return fetchWithAuth<Goal>("/api/goals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateGoal(goalId: string, data: GoalUpdate): Promise<Goal> {
    return fetchWithAuth<Goal>(`/api/goals/${goalId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteGoal(goalId: string): Promise<void> {
    await fetchWithAuth(`/api/goals/${goalId}`, {
      method: "DELETE",
    });
  },

  async recordContribution(
    goalId: string,
    amount: number,
    date: string,
  ): Promise<Goal> {
    return fetchWithAuth<Goal>(`/api/goals/${goalId}/contribute`, {
      method: "POST",
      body: JSON.stringify({
        amount,
        contribution_date: date,
      }),
    });
  },

  async getGoalAnalysis(goalId: string): Promise<GoalAnalysis> {
    return fetchWithAuth<GoalAnalysis>(`/api/goals/${goalId}/analysis`);
  },

  async getGoalMilestones(goalId: string): Promise<GoalMilestone[]> {
    return fetchWithAuth<GoalMilestone[]>(`/api/goals/${goalId}/milestones`);
  },

  async createGoalMilestone(
    goalId: string,
    data: GoalMilestoneCreate,
  ): Promise<GoalMilestone> {
    return fetchWithAuth<GoalMilestone>(`/api/goals/${goalId}/milestones`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Recommendation APIs
  async getRecommendations(params?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ recommendations: Recommendation[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append("category", params.category);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
    return fetchWithAuth<{ recommendations: Recommendation[]; total: number }>(
      `/api/recommendations${query}`,
    );
  },

  async getRecommendation(recommendationId: string): Promise<Recommendation> {
    return fetchWithAuth<Recommendation>(
      `/api/recommendations/${recommendationId}`,
    );
  },

  async generateRecommendations(
    data?: RecommendationGenerateRequest,
  ): Promise<{ recommendations: Recommendation[]; total: number }> {
    return fetchWithAuth<{ recommendations: Recommendation[]; total: number }>(
      "/api/recommendations/generate",
      {
        method: "POST",
        body: JSON.stringify(data || {}),
      },
    );
  },

  async dismissRecommendation(
    recommendationId: string,
    data?: RecommendationDismissRequest,
  ): Promise<Recommendation> {
    return fetchWithAuth<Recommendation>(
      `/api/recommendations/${recommendationId}/dismiss`,
      {
        method: "PATCH",
        body: JSON.stringify(data || {}),
      },
    );
  },

  async implementRecommendation(
    recommendationId: string,
  ): Promise<Recommendation> {
    return fetchWithAuth<Recommendation>(
      `/api/recommendations/${recommendationId}/implement`,
      {
        method: "PATCH",
      },
    );
  },

  async snoozeRecommendation(
    recommendationId: string,
    data?: RecommendationSnoozeRequest,
  ): Promise<Recommendation> {
    return fetchWithAuth<Recommendation>(
      `/api/recommendations/${recommendationId}/snooze`,
      {
        method: "PATCH",
        body: JSON.stringify(data || { days: 7 }),
      },
    );
  },
};

export { ApiError, fetchWithAuth };
