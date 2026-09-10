import api from "./api";
import type {
  ApiResponse,
  BorrowLend,
  BorrowLendRequest,
  BorrowLendStatus,
  BorrowLendSummary,
  BorrowLendType,
  Budget,
  BudgetRequest,
  Category,
  DashboardData,
  PageResponse,
  RecurringTransaction,
  RecurringTransactionRequest,
  Transaction,
  TransactionRequest,
  TransactionType,
} from "@/types";

// Categories
export const fetchCategories = async () => {
  const { data } = await api.get<ApiResponse<Category[]>>("/api/categories");
  return data.data;
};

export const fetchCategoriesByType = async (type: TransactionType) => {
  const { data } = await api.get<ApiResponse<Category[]>>(
    `/api/categories/type/${type}`
  );
  return data.data;
};

// Transactions
export const fetchTransactions = async (params: {
  page?: number;
  size?: number;
  type?: TransactionType;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  sort?: string;
}) => {
  const { data } = await api.get<ApiResponse<PageResponse<Transaction>>>(
    "/api/transactions",
    { params }
  );
  return data.data;
};

export const createTransaction = async (request: TransactionRequest) => {
  const { data } = await api.post<ApiResponse<Transaction>>(
    "/api/transactions",
    request
  );
  return data.data;
};

export const updateTransaction = async (
  id: string,
  request: TransactionRequest
) => {
  const { data } = await api.put<ApiResponse<Transaction>>(
    `/api/transactions/${id}`,
    request
  );
  return data.data;
};

export const deleteTransaction = async (id: string) => {
  await api.delete(`/api/transactions/${id}`);
};

// Budgets
export const fetchBudgets = async (month: number, year: number) => {
  const { data } = await api.get<ApiResponse<Budget[]>>("/api/budgets", {
    params: { month, year },
  });
  return data.data;
};

export const createBudget = async (request: BudgetRequest) => {
  const { data } = await api.post<ApiResponse<Budget>>(
    "/api/budgets",
    request
  );
  return data.data;
};

export const updateBudget = async (id: string, request: BudgetRequest) => {
  const { data } = await api.put<ApiResponse<Budget>>(
    `/api/budgets/${id}`,
    request
  );
  return data.data;
};

export const deleteBudget = async (id: string) => {
  await api.delete(`/api/budgets/${id}`);
};

// Recurring Transactions
export const fetchRecurringTransactions = async () => {
  const { data } = await api.get<ApiResponse<RecurringTransaction[]>>(
    "/api/recurring-transactions"
  );
  return data.data;
};

export const createRecurringTransaction = async (
  request: RecurringTransactionRequest
) => {
  const { data } = await api.post<ApiResponse<RecurringTransaction>>(
    "/api/recurring-transactions",
    request
  );
  return data.data;
};

export const updateRecurringTransaction = async (
  id: string,
  request: RecurringTransactionRequest
) => {
  const { data } = await api.put<ApiResponse<RecurringTransaction>>(
    `/api/recurring-transactions/${id}`,
    request
  );
  return data.data;
};

export const toggleRecurringTransaction = async (id: string) => {
  await api.patch(`/api/recurring-transactions/${id}/toggle`);
};

export const deleteRecurringTransaction = async (id: string) => {
  await api.delete(`/api/recurring-transactions/${id}`);
};

// Dashboard
export const fetchDashboard = async (month: number, year: number) => {
  const { data } = await api.get<ApiResponse<DashboardData>>(
    "/api/dashboard",
    { params: { month, year } }
  );
  return data.data;
};

// Export
export const exportCsv = async (startDate: string, endDate: string) => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get("/api/export/csv", {
    params,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  window.URL.revokeObjectURL(url);
};

export const exportPdf = async (startDate: string, endDate: string) => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await api.get("/api/export/pdf", {
    params,
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.pdf";
  a.click();
  window.URL.revokeObjectURL(url);
};

// Borrow/Lend
export const fetchBorrowLends = async (params: {
  page?: number;
  size?: number;
  type?: BorrowLendType;
  status?: BorrowLendStatus;
}) => {
  const { data } = await api.get<ApiResponse<PageResponse<BorrowLend>>>(
    "/api/borrow-lend",
    { params }
  );
  return data.data;
};

export const fetchBorrowLendSummary = async () => {
  const { data } = await api.get<ApiResponse<BorrowLendSummary>>(
    "/api/borrow-lend/summary"
  );
  return data.data;
};

export const createBorrowLend = async (request: BorrowLendRequest) => {
  const { data } = await api.post<ApiResponse<BorrowLend>>(
    "/api/borrow-lend",
    request
  );
  return data.data;
};

export const updateBorrowLend = async (
  id: string,
  request: BorrowLendRequest
) => {
  const { data } = await api.put<ApiResponse<BorrowLend>>(
    `/api/borrow-lend/${id}`,
    request
  );
  return data.data;
};

export const settleBorrowLend = async (id: string, amount: number) => {
  const { data } = await api.patch<ApiResponse<BorrowLend>>(
    `/api/borrow-lend/${id}/settle`,
    { amount }
  );
  return data.data;
};

export const deleteBorrowLend = async (id: string) => {
  await api.delete(`/api/borrow-lend/${id}`);
};
