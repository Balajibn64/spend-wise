export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  parentCategoryId: number | null;
  isDefault: boolean;
}

export type TransactionType = "INCOME" | "EXPENSE";

export type PaymentMethod =
  | "CASH"
  | "UPI"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "NET_BANKING"
  | "WALLET";

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description: string;
  transactionDate: string;
  categoryName: string;
  categoryId: number;
  createdAt: string;
}

export interface TransactionRequest {
  categoryId: number;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description?: string;
  transactionDate: string;
}

export interface Budget {
  id: string;
  categoryId: number;
  categoryName: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  month: number;
  year: number;
  alertLevel: "NORMAL" | "WARNING" | "EXCEEDED";
}

export interface BudgetRequest {
  categoryId: number;
  monthlyLimit: number;
  month: number;
  year: number;
}

export interface RecurringTransaction {
  id: string;
  categoryId: number;
  categoryName: string;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description: string;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  lastProcessedDate: string | null;
}

export interface RecurringTransactionRequest {
  categoryId: number;
  amount: number;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  description?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
}

export interface DashboardData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: CategoryBreakdown[];
  monthlyComparison: MonthlyComparison[];
  paymentMethodDistribution: PaymentMethodBreakdown[];
  dailySpending: DailySpending[];
}

export interface DailySpending {
  day: number;
  amount: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyComparison {
  month: string;
  income: number;
  expense: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  percentage: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  categoriesCreated: string[];
  errors: string[];
}

export interface PageResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

// Borrow/Lend
export type BorrowLendType = "BORROWED" | "LENT";
export type BorrowLendStatus = "PENDING" | "PARTIALLY_SETTLED" | "SETTLED";

export interface BorrowLend {
  id: string;
  type: BorrowLendType;
  personName: string;
  amount: number;
  settledAmount: number;
  remainingAmount: number;
  status: BorrowLendStatus;
  description: string | null;
  date: string;
  dueDate: string | null;
  createdAt: string;
}

export interface BorrowLendRequest {
  type: BorrowLendType;
  personName: string;
  amount: number;
  description?: string;
  date: string;
  dueDate?: string;
}

export interface BorrowLendSummary {
  totalBorrowed: number;
  totalLent: number;
  borrowedPending: number;
  lentPending: number;
  netBalance: number;
  activeCount: number;
}
