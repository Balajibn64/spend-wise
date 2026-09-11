"use client";

import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Download, Upload, Filter, Search } from "lucide-react";
import { toast } from "sonner";

import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchCategories,
  exportCsv,
  exportPdf,
  importTransactions,
  invalidateAfterTransactionChange,
} from "@/lib/queries";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  formatINR,
  formatDate,
  todayLocalDateString,
} from "@/lib/format";
import type {
  Transaction,
  TransactionRequest,
  Category,
  TransactionType,
  PaymentMethod,
  ImportResult,
} from "@/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;

/* ------------------------------------------------------------------ */
/*  Zod schema                                                         */
/* ------------------------------------------------------------------ */

const transactionSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], {
    message: "Transaction type is required",
  }),
  categoryId: z.string().min(1, "Category is required"),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  paymentMethod: z.enum(
    ["CASH", "UPI", "DEBIT_CARD", "CREDIT_CARD", "NET_BANKING", "WALLET"],
    { message: "Payment method is required" }
  ),
  description: z.string().optional(),
  transactionDate: z.string().min(1, "Transaction date is required"),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

const TransactionRow = memo(function TransactionRow({
  txn,
  onEdit,
  onDelete,
}: {
  txn: Transaction;
  onEdit: (txn: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow className="border-violet-200 dark:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-violet-900/20">
      <TableCell className="text-sm text-gray-700 dark:text-gray-300">
        {formatDate(txn.transactionDate)}
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium text-violet-800 dark:text-violet-200">
          {txn.categoryName ?? "—"}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={`text-sm font-semibold ${
            txn.type === "INCOME"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {txn.type === "INCOME" ? "+" : "-"}
          {formatINR(txn.amount)}
        </span>
      </TableCell>
      <TableCell>
        <Badge
          variant="secondary"
          className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
        >
          {PAYMENT_METHOD_LABELS[txn.paymentMethod as PaymentMethod] ?? txn.paymentMethod}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm text-gray-500 dark:text-gray-400">
        {txn.description || "—"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-violet-600 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-200"
            onClick={() => onEdit(txn)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
            onClick={() => onDelete(String(txn.id))}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function TransactionsPage() {
  const queryClient = useQueryClient();

  /* ---- filter / pagination state ---- */
  const [page, setPage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ---- import state ---- */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importResultOpen, setImportResultOpen] = useState(false);

  /* ---- react-hook-form ---- */
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "EXPENSE",
      categoryId: "",
      amount: 0,
      paymentMethod: "CASH",
      description: "",
      transactionDate: todayLocalDateString(),
    },
  });

  const watchedType = form.watch("type");

  /* ---- queries ---- */
  const transactionsQuery = useQuery({
    queryKey: [
      "transactions",
      page,
      startDate,
      endDate,
      typeFilter,
      categoryFilter,
    ],
    queryFn: () =>
      fetchTransactions({
        page,
        size: PAGE_SIZE,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: typeFilter !== "ALL" ? (typeFilter as TransactionType) : undefined,
        categoryId:
          categoryFilter !== "ALL" ? Number(categoryFilter) : undefined,
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  /* Derived: categories filtered by selected type (for form) */
  const filteredCategories: Category[] = useMemo(
    () => (categoriesQuery.data ?? []).filter((c: Category) => c.type === watchedType),
    [categoriesQuery.data, watchedType]
  );

  /* All categories for the top-level filter, matching the currently selected type */
  const allCategories: Category[] = useMemo(
    () =>
      (categoriesQuery.data ?? []).filter(
        (c: Category) => typeFilter === "ALL" || c.type === typeFilter
      ),
    [categoriesQuery.data, typeFilter]
  );

  /* ---- mutations ---- */
  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      toast.success("Transaction created successfully");
      invalidateAfterTransactionChange(queryClient);
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create transaction"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: TransactionRequest;
    }) => updateTransaction(id, data),
    onSuccess: () => {
      toast.success("Transaction updated successfully");
      invalidateAfterTransactionChange(queryClient);
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update transaction"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transaction deleted successfully");
      invalidateAfterTransactionChange(queryClient);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete transaction"));
    },
  });

  const importMutation = useMutation({
    mutationFn: importTransactions,
    onSuccess: (result) => {
      setImportResult(result);
      setImportResultOpen(true);
      invalidateAfterTransactionChange(queryClient);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      if (result.imported > 0) {
        toast.success(
          `Imported ${result.imported} transaction${result.imported === 1 ? "" : "s"}`
        );
      } else {
        toast.error("No transactions were imported");
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to import file")),
  });

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = "";
  }

  /* ---- dialog helpers ---- */
  function openCreateDialog() {
    setEditingTransaction(null);
    form.reset({
      type: "EXPENSE",
      categoryId: "",
      amount: 0,
      paymentMethod: "CASH",
      description: "",
      transactionDate: todayLocalDateString(),
    });
    setDialogOpen(true);
  }

  const openEditDialog = useCallback(
    (transaction: Transaction) => {
      setEditingTransaction(transaction);
      form.reset({
        type: transaction.type as "INCOME" | "EXPENSE",
        categoryId: String(transaction.categoryId ?? ""),
        amount: transaction.amount,
        paymentMethod: transaction.paymentMethod as PaymentMethod,
        description: transaction.description ?? "",
        transactionDate: transaction.transactionDate
          ? transaction.transactionDate.split("T")[0]
          : todayLocalDateString(),
      });
      setDialogOpen(true);
    },
    [form]
  );

  function closeDialog() {
    setDialogOpen(false);
    setEditingTransaction(null);
    form.reset();
  }

  /* ---- form submit ---- */
  function onSubmit(values: TransactionFormValues) {
    const payload: TransactionRequest = {
      type: values.type as TransactionType,
      categoryId: Number(values.categoryId),
      amount: values.amount,
      paymentMethod: values.paymentMethod as PaymentMethod,
      description: values.description ?? "",
      transactionDate: values.transactionDate,
    };

    if (editingTransaction) {
      updateMutation.mutate({ id: String(editingTransaction.id), data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  /* ---- export handlers ---- */
  async function handleExportCsv() {
    try {
      await exportCsv(startDate || "", endDate || "");
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export CSV"));
    }
  }

  async function handleExportPdf() {
    try {
      await exportPdf(startDate || "", endDate || "");
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export PDF"));
    }
  }

  /* ---- delete handler ---- */
  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  }, []);

  function confirmDelete() {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
    setDeleteConfirmOpen(false);
    setDeletingId(null);
  }

  /* ---- pagination helpers ---- */
  const transactions: Transaction[] =
    transactionsQuery.data?.content ?? [];
  const totalPages: number =
    transactionsQuery.data?.totalPages ?? 1;
  const totalElements: number =
    transactionsQuery.data?.totalElements ?? transactions.length;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 p-4 md:p-8">
      {/* ---- Header ---- */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-200 md:text-3xl">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-violet-600 dark:text-violet-400">
            Manage your income and expenses
          </p>
        </div>

        {/* Import / Export buttons */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={importMutation.isPending}
            onClick={() => fileInputRef.current?.click()}
            className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importMutation.isPending ? "Importing..." : "Import"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* ---- Filters ---- */}
      <div className="mb-6 rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center gap-2 text-violet-700 dark:text-violet-300">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-semibold">Filters</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Start date */}
          <div>
            <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
              className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
            />
          </div>

          {/* End date */}
          <div>
            <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
              className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
            />
          </div>

          {/* Type filter */}
          <div>
            <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">Type</Label>
            <Select
              value={typeFilter}
              onValueChange={(val) => {
                setTypeFilter(val);
                // A category from the other type would no longer be in the
                // list below, and would silently filter out every result.
                setCategoryFilter("ALL");
                setPage(0);
              }}
            >
              <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div>
            <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">Category</Label>
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val);
                setPage(0);
              }}
            >
              <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ---- Loading / Empty ---- */}
      {transactionsQuery.isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
        </div>
      )}

      {transactionsQuery.isError && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-center text-red-600 dark:text-red-400">
          Failed to load transactions. Please try again.
        </div>
      )}

      {!transactionsQuery.isLoading &&
        !transactionsQuery.isError &&
        transactions.length === 0 && (
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 p-12 text-center">
            <Search className="mx-auto mb-3 h-10 w-10 text-violet-300 dark:text-violet-600" />
            <p className="text-violet-600 dark:text-violet-300">No transactions found.</p>
            <p className="mt-1 text-sm text-violet-400 dark:text-violet-500">
              Click the + button to add your first transaction.
            </p>
          </div>
        )}

      {/* ---- Desktop Table (hidden on mobile) ---- */}
      {!transactionsQuery.isLoading &&
        !transactionsQuery.isError &&
        transactions.length > 0 && (
          <div className="hidden rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 shadow-sm backdrop-blur md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-violet-200 dark:border-violet-800 hover:bg-violet-50/50 dark:hover:bg-violet-900/20">
                  <TableHead className="text-violet-700 dark:text-violet-300">Date</TableHead>
                  <TableHead className="text-violet-700 dark:text-violet-300">Category</TableHead>
                  <TableHead className="text-violet-700 dark:text-violet-300">Amount</TableHead>
                  <TableHead className="text-violet-700 dark:text-violet-300">Payment</TableHead>
                  <TableHead className="text-violet-700 dark:text-violet-300">Description</TableHead>
                  <TableHead className="text-right text-violet-700 dark:text-violet-300">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    txn={txn}
                    onEdit={openEditDialog}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      {/* ---- Mobile Cards (hidden on desktop) ---- */}
      {!transactionsQuery.isLoading &&
        !transactionsQuery.isError &&
        transactions.length > 0 && (
          <div className="flex flex-col gap-3 md:hidden">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 p-4 shadow-sm backdrop-blur"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                      {txn.categoryName ?? "—"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(txn.transactionDate)}
                    </p>
                  </div>
                  <span
                    className={`text-base font-bold ${
                      txn.type === "INCOME"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {txn.type === "INCOME" ? "+" : "-"}
                    {formatINR(txn.amount)}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  >
                    {PAYMENT_METHOD_LABELS[
                      txn.paymentMethod as PaymentMethod
                    ] ?? txn.paymentMethod}
                  </Badge>
                  {txn.description && (
                    <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                      {txn.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-violet-200 dark:border-violet-800 pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-violet-600 hover:bg-violet-100 hover:text-violet-800 dark:text-violet-400 dark:hover:bg-violet-900/30 dark:hover:text-violet-200"
                    onClick={() => openEditDialog(txn)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                    onClick={() => handleDelete(String(txn.id))}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* ---- Pagination ---- */}
      {!transactionsQuery.isLoading &&
        !transactionsQuery.isError &&
        transactions.length > 0 && (
          <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-violet-600 dark:text-violet-400">
              Showing {page * PAGE_SIZE + 1} –{" "}
              {Math.min((page + 1) * PAGE_SIZE, totalElements)} of{" "}
              {totalElements} transactions
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30 disabled:opacity-50"
              >
                Previous
              </Button>
              <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}

      {/* ---- Floating Action Button ---- */}
      <button
        onClick={openCreateDialog}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl active:scale-95"
        aria-label="Add Transaction"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* ---- Add / Edit Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-violet-900 dark:text-violet-200">
              {editingTransaction ? "Edit Transaction" : "Add Transaction"}
            </DialogTitle>
            <DialogDescription className="text-violet-600 dark:text-violet-400">
              {editingTransaction
                ? "Update the details of this transaction."
                : "Fill in the details to record a new transaction."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      // The category list depends on type, so a category
                      // picked under the old type would no longer be valid.
                      form.setValue("categoryId", "");
                    }}
                  >
                    <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">Category</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.length === 0 && (
                        <SelectItem value="__none" disabled>
                          No categories available
                        </SelectItem>
                      )}
                      {filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.categoryId && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...form.register("amount", { valueAsNumber: true })}
                className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
              />
              {form.formState.errors.amount && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Payment Method
              </Label>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.paymentMethod && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.paymentMethod.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Description
              </Label>
              <Input
                placeholder="Enter a description (optional)"
                {...form.register("description")}
                className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
              />
            </div>

            {/* Transaction Date */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Transaction Date
              </Label>
              <Input
                type="date"
                {...form.register("transactionDate")}
                className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
              />
              {form.formState.errors.transactionDate && (
                <p className="mt-1 text-xs text-red-500">
                  {form.formState.errors.transactionDate.message}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingTransaction
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Transaction"
        description="This transaction will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />

      {/* ---- Import Result ---- */}
      <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-violet-900 dark:text-violet-200">
              Import Complete
            </DialogTitle>
            <DialogDescription className="text-violet-600 dark:text-violet-400">
              {importResult?.imported ?? 0} transaction
              {importResult?.imported === 1 ? "" : "s"} imported
              {importResult && importResult.skipped > 0
                ? `, ${importResult.skipped} row${importResult.skipped === 1 ? "" : "s"} skipped`
                : ""}
              .
            </DialogDescription>
          </DialogHeader>

          {importResult && importResult.categoriesCreated.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-violet-800 dark:text-violet-200">
                New categories created
              </p>
              <div className="flex flex-wrap gap-1.5">
                {importResult.categoriesCreated.map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {importResult && importResult.errors.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-red-600 dark:text-red-400">
                Skipped rows
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => setImportResultOpen(false)}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
