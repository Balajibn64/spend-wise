"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Zap,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Hash,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Undo2,
  HandCoins,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";

import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  fetchCategories,
  fetchDashboard,
  createBorrowLend,
  fetchBorrowLends,
  settleBorrowLend,
} from "@/lib/queries";
import type {
  Transaction,
  TransactionRequest,
  Category,
  TransactionType,
  PaymentMethod,
} from "@/types";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Constants ────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "UPI",
  "DEBIT_CARD",
  "CREDIT_CARD",
  "NET_BANKING",
  "WALLET",
];

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  DEBIT_CARD: "Debit Card",
  CREDIT_CARD: "Credit Card",
  NET_BANKING: "Net Banking",
  WALLET: "Wallet",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Helpers ──────────────────────────────────────────────────

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatINRCompact(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Safely evaluate a simple math expression (supports + - * /) */
function evalExpr(expr: string): number | null {
  const cleaned = expr.replace(/\s/g, "");
  if (!cleaned) return null;
  // Only allow digits, decimal points, and operators
  if (!/^[\d.+\-*/()]+$/.test(cleaned)) return null;
  // Must start and end with a digit
  if (!/^\d/.test(cleaned) || !/\d$/.test(cleaned)) return null;
  try {
    // Split into tokens and evaluate step by step
    const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/])/g);
    if (!tokens) return null;
    let result = parseFloat(tokens[0]);
    if (isNaN(result)) return null;
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = parseFloat(tokens[i + 1]);
      if (isNaN(num)) return null;
      if (op === "+") result += num;
      else if (op === "-") result -= num;
      else if (op === "*") result *= num;
      else if (op === "/") result = num !== 0 ? result / num : NaN;
      else return null;
    }
    return isNaN(result) || !isFinite(result) ? null : Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

function hasOperator(expr: string): boolean {
  return /[+\-*/]/.test(expr.replace(/^-/, ""));
}

function buildDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Zod Schema ───────────────────────────────────────────────

const quickAddSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  categoryId: z.string().min(1, "Category is required"),
  amount: z
    .number({ message: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  paymentMethod: z.enum([
    "CASH",
    "UPI",
    "DEBIT_CARD",
    "CREDIT_CARD",
    "NET_BANKING",
    "WALLET",
  ]),
  description: z.string().optional(),
  transactionDate: z.string().min(1, "Date is required"),
});

type QuickAddFormValues = z.infer<typeof quickAddSchema>;

// ── Quick Date Picker ─────────────────────────────────────────

function QuickDatePicker({
  selectedDate,
  selectedMonth,
  selectedYear,
  daysInMonth,
  isCurrentMonth,
  todayStr,
  onChange,
}: {
  selectedDate: string;
  selectedMonth: number;
  selectedYear: number;
  daysInMonth: number;
  isCurrentMonth: boolean;
  todayStr: string;
  onChange: (date: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedDay = parseInt(selectedDate.split("-")[2] || "0", 10);
  const todayDay = new Date().getDate();

  // Auto-scroll to selected day on mount
  useEffect(() => {
    if (scrollRef.current) {
      const chip = scrollRef.current.querySelector("[data-selected='true']");
      if (chip) {
        chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedDate]);

  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];
  const showYesterday = isCurrentMonth || (yesterdayDate.getMonth() + 1 === selectedMonth && yesterdayDate.getFullYear() === selectedYear);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-3.5 w-3.5 text-violet-500" />
        <Label className="text-xs text-violet-600 dark:text-violet-400">
          Date — {SHORT_MONTHS[selectedMonth - 1]} {selectedDay > 0 ? selectedDay : "..."}, {selectedYear}
        </Label>
      </div>

      <div className="flex items-center gap-2">
        {/* Quick presets */}
        {isCurrentMonth && (
          <button
            type="button"
            onClick={() => onChange(todayStr)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              selectedDate === todayStr
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                : "bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
            )}
          >
            Today
          </button>
        )}
        {showYesterday && (
          <button
            type="button"
            onClick={() => onChange(yesterdayStr)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              selectedDate === yesterdayStr
                ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                : "bg-violet-50 text-violet-600 hover:bg-violet-100 dark:bg-violet-500/10 dark:text-violet-400 dark:hover:bg-violet-500/20"
            )}
          >
            Yesterday
          </button>
        )}

        {/* Divider */}
        {(isCurrentMonth || showYesterday) && (
          <div className="shrink-0 w-px h-6 bg-violet-200 dark:bg-violet-700" />
        )}

        {/* Scrollable day chips */}
        <div
          ref={scrollRef}
          className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = buildDateStr(selectedYear, selectedMonth, day);
            const isSelected = selectedDate === dateStr;
            const isToday = isCurrentMonth && day === todayDay;
            const isFuture = isCurrentMonth && day > todayDay;

            return (
              <button
                key={day}
                type="button"
                data-selected={isSelected}
                onClick={() => onChange(dateStr)}
                className={cn(
                  "shrink-0 w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center",
                  isSelected
                    ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                    : isToday
                      ? "bg-violet-100 text-violet-700 ring-1 ring-violet-400 dark:bg-violet-500/20 dark:text-violet-300 dark:ring-violet-500"
                      : isFuture
                        ? "text-muted-foreground/40 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                        : "text-foreground hover:bg-violet-50 dark:hover:bg-violet-500/10"
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────

export default function QuickTrackPage() {
  const queryClient = useQueryClient();

  const today = new Date();
  const todayStr = getTodayString();
  const actualMonth = today.getMonth() + 1;
  const actualYear = today.getFullYear();

  // ── Month selector state ─────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState(actualMonth);
  const [selectedYear, setSelectedYear] = useState(actualYear);

  const isCurrentMonth = selectedMonth === actualMonth && selectedYear === actualYear;
  const firstOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const lastOfMonth = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  function goToPrevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  function goToCurrentMonth() {
    setSelectedMonth(actualMonth);
    setSelectedYear(actualYear);
  }

  // ── Amount expression state ─────────────────────────────────
  const [amountExpr, setAmountExpr] = useState("");

  // ── Return / Spent For tracking state ────────────────────────
  const [isReturn, setIsReturn] = useState(false);
  const [returnPerson, setReturnPerson] = useState("");
  const [isSpentFor, setIsSpentFor] = useState(false);
  const [spentForPerson, setSpentForPerson] = useState("");

  // ── Edit dialog state ──────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────

  const monthlyTxnQuery = useQuery({
    queryKey: ["transactions", "month", selectedMonth, selectedYear],
    queryFn: () =>
      fetchTransactions({
        startDate: firstOfMonth,
        endDate: lastOfMonth,
        size: 500,
        sort: "transactionDate,desc",
      }),
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", selectedMonth, selectedYear],
    queryFn: () => fetchDashboard(selectedMonth, selectedYear),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // ── Quick Add Form ─────────────────────────────────────────

  const form = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type: "EXPENSE",
      categoryId: "",
      amount: 0,
      paymentMethod: "UPI",
      description: "",
      transactionDate: todayStr,
    },
  });

  const watchedType = form.watch("type");

  useEffect(() => {
    form.setValue("categoryId", "");
  }, [watchedType, form]);

  // ── Edit Form ──────────────────────────────────────────────

  const editForm = useForm<QuickAddFormValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type: "EXPENSE",
      categoryId: "",
      amount: 0,
      paymentMethod: "UPI",
      description: "",
      transactionDate: todayStr,
    },
  });

  const editWatchedType = editForm.watch("type");

  useEffect(() => {
    editForm.setValue("categoryId", "");
  }, [editWatchedType, editForm]);

  // ── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createTransaction,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionRequest }) =>
      updateTransaction(id, data),
    onSuccess: () => {
      toast.success("Transaction updated");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setEditDialogOpen(false);
      setEditingTxn(null);
    },
    onError: () => toast.error("Failed to update transaction"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transaction deleted");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Failed to delete transaction"),
  });

  // ── Derived Data ───────────────────────────────────────────

  const allMonthTxns: Transaction[] = monthlyTxnQuery.data?.content ?? [];

  const todayTxns = useMemo(
    () => allMonthTxns.filter((t) => t.transactionDate?.startsWith(todayStr)),
    [allMonthTxns, todayStr]
  );

  const summaryTxns = isCurrentMonth ? todayTxns : allMonthTxns;
  const summaryLabel = isCurrentMonth ? "Today's" : MONTHS[selectedMonth - 1];

  const todaySummary = useMemo(() => {
    const income = summaryTxns
      .filter((t) => t.type === "INCOME")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = summaryTxns
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense, count: summaryTxns.length };
  }, [summaryTxns]);

  const recentTxns = useMemo(() => allMonthTxns.slice(0, 15), [allMonthTxns]);

  const dailySpendingData = useMemo(() => {
    const map = new Map<number, number>();
    for (let d = 1; d <= daysInMonth; d++) map.set(d, 0);
    allMonthTxns
      .filter((t) => t.type === "EXPENSE")
      .forEach((t) => {
        const day = new Date(t.transactionDate).getDate();
        if (map.has(day)) map.set(day, (map.get(day) ?? 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([day, amount]) => ({ day: String(day), amount }))
      .sort((a, b) => Number(a.day) - Number(b.day));
  }, [allMonthTxns, daysInMonth]);

  const filteredCategories: Category[] = (categoriesQuery.data ?? []).filter(
    (c: Category) => c.type === watchedType
  );

  const editFilteredCategories: Category[] = (
    categoriesQuery.data ?? []
  ).filter((c: Category) => c.type === editWatchedType);

  // ── Handlers ───────────────────────────────────────────────

  async function onQuickAdd(values: QuickAddFormValues) {
    let description = values.description ?? "";
    const person = isReturn ? returnPerson.trim() : isSpentFor ? spentForPerson.trim() : "";

    if (isReturn && person) {
      const prefix = `Return from ${person}`;
      description = description ? `${prefix} · ${description}` : prefix;
    }
    if (isSpentFor && person) {
      const prefix = `Spent for ${person}`;
      description = description ? `${prefix} · ${description}` : prefix;
    }

    const payload: TransactionRequest = {
      type: values.type as TransactionType,
      categoryId: Number(values.categoryId),
      amount: values.amount,
      paymentMethod: values.paymentMethod as PaymentMethod,
      description,
      transactionDate: values.transactionDate,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Transaction added!");

      // ── Auto-create LENT entry when "Spent For" ──────────
      if (isSpentFor && person) {
        try {
          await createBorrowLend({
            type: "LENT",
            personName: person,
            amount: values.amount,
            date: values.transactionDate,
            description: `Spent for ${person}`,
          });
          toast.success(`${person} now owes you ${formatINR(values.amount)}`);
        } catch {
          toast.error("Transaction added, but failed to create Borrow/Lend entry");
        }
      }

      // ── Auto-settle LENT entry when "Return" ─────────────
      if (isReturn && person) {
        try {
          const lentEntries = await fetchBorrowLends({ type: "LENT", size: 100 });
          const match = (lentEntries.content ?? []).find(
            (entry) =>
              entry.personName.toLowerCase() === person.toLowerCase() &&
              entry.status !== "SETTLED" &&
              entry.remainingAmount >= values.amount
          );
          if (match) {
            await settleBorrowLend(match.id, values.amount);
            toast.success(`Settled ${formatINR(values.amount)} from ${person}'s debt`);
          }
        } catch {
          // Silent — don't error if no matching entry found
        }
      }

      // ── Invalidate & reset ───────────────────────────────
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["borrow-lend"] });
      queryClient.invalidateQueries({ queryKey: ["borrow-lend-summary"] });

      const lastDate = form.getValues("transactionDate");
      form.reset({
        type: "EXPENSE",
        categoryId: "",
        amount: 0,
        paymentMethod: "UPI",
        description: "",
        transactionDate: lastDate,
      });
      setAmountExpr("");
      setIsReturn(false);
      setReturnPerson("");
      setIsSpentFor(false);
      setSpentForPerson("");
    } catch {
      toast.error("Failed to add transaction");
    }
  }

  function openEditDialog(txn: Transaction) {
    setEditingTxn(txn);
    editForm.reset({
      type: txn.type,
      categoryId: String(txn.categoryId ?? ""),
      amount: txn.amount,
      paymentMethod: txn.paymentMethod,
      description: txn.description ?? "",
      transactionDate: txn.transactionDate?.split("T")[0] ?? getTodayString(),
    });
    setEditDialogOpen(true);
  }

  function onEditSubmit(values: QuickAddFormValues) {
    if (!editingTxn) return;
    const payload: TransactionRequest = {
      type: values.type as TransactionType,
      categoryId: Number(values.categoryId),
      amount: values.amount,
      paymentMethod: values.paymentMethod as PaymentMethod,
      description: values.description ?? "",
      transactionDate: values.transactionDate,
    };
    updateMutation.mutate({ id: String(editingTxn.id), data: payload });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
    setDeleteConfirmOpen(false);
    setDeletingId(null);
  }

  // ── Custom Tooltip ─────────────────────────────────────────

  const ChartTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-violet-200 dark:border-violet-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-xl">
          <p className="text-xs text-muted-foreground">Day {label}</p>
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {formatINR(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 p-4 md:p-8 space-y-6">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-violet-500/20 backdrop-blur-sm border border-violet-500/30">
            <Zap className="h-7 w-7 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-200 md:text-3xl">
              Quick Track
            </h1>
            <p className="text-sm text-violet-600 dark:text-violet-400">
              Fast daily money tracking at a glance
            </p>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevMonth}
            className="h-8 w-8 border-violet-200 dark:border-violet-700"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={goToCurrentMonth}
            className="min-w-[140px] text-center px-3 py-1.5 rounded-lg text-sm font-semibold text-violet-900 dark:text-violet-200 bg-violet-100 dark:bg-violet-500/20 hover:bg-violet-200 dark:hover:bg-violet-500/30 transition-colors"
          >
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="h-8 w-8 border-violet-200 dark:border-violet-700"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Quick Add Form ──────────────────────────────────── */}
      <Card className="border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 backdrop-blur shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-violet-900 dark:text-violet-200 flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Transaction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onQuickAdd)} className="space-y-4">
            {/* Row 1: Type toggle + Amount */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-1.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("type", "EXPENSE", { shouldValidate: true });
                    setIsReturn(false);
                    setIsSpentFor(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    watchedType === "EXPENSE" && !isSpentFor
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                      : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  )}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("type", "EXPENSE", { shouldValidate: true });
                    setIsSpentFor(true);
                    setIsReturn(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isSpentFor
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                      : "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
                  )}
                >
                  <HandCoins className="h-3 w-3" />
                  Spent For
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("type", "INCOME", { shouldValidate: true });
                    setIsReturn(false);
                    setIsSpentFor(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    watchedType === "INCOME" && !isReturn
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/25"
                      : "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                  )}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("type", "INCOME", { shouldValidate: true });
                    setIsReturn(true);
                    setIsSpentFor(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
                    isReturn
                      ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25"
                      : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                  )}
                >
                  <Undo2 className="h-3 w-3" />
                  Return
                </button>
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount (e.g. 100+50+200)"
                  className="text-2xl font-bold h-12 border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
                  value={amountExpr}
                  onChange={(e) => {
                    setAmountExpr(e.target.value);
                    const val = evalExpr(e.target.value);
                    if (val !== null) form.setValue("amount", val, { shouldValidate: true });
                  }}
                  onBlur={() => {
                    const val = evalExpr(amountExpr);
                    if (val !== null) {
                      form.setValue("amount", val, { shouldValidate: true });
                    }
                  }}
                />
                {hasOperator(amountExpr) && evalExpr(amountExpr) !== null && (
                  <p className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                    = {formatINR(evalExpr(amountExpr)!)}
                  </p>
                )}
                {form.formState.errors.amount && (
                  <p className="mt-1 text-xs text-red-500">
                    {form.formState.errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            {/* Spent For: Person Name */}
            {isSpentFor && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
                <HandCoins className="h-4 w-4 text-orange-500 shrink-0" />
                <div className="flex-1">
                  <Input
                    placeholder="Who did you spend for?"
                    value={spentForPerson}
                    onChange={(e) => setSpentForPerson(e.target.value)}
                    className="border-orange-200 dark:border-orange-500/30 focus-visible:ring-orange-500 bg-white dark:bg-white/5"
                  />
                  <p className="mt-1 text-[10px] text-orange-600 dark:text-orange-400">
                    A Borrow/Lend entry will be auto-created
                  </p>
                </div>
              </div>
            )}

            {/* Return: Person Name */}
            {isReturn && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30">
                <Undo2 className="h-4 w-4 text-blue-500 shrink-0" />
                <div className="flex-1">
                  <Input
                    placeholder="Who returned the money?"
                    value={returnPerson}
                    onChange={(e) => setReturnPerson(e.target.value)}
                    className="border-blue-200 dark:border-blue-500/30 focus-visible:ring-blue-500 bg-white dark:bg-white/5"
                  />
                  <p className="mt-1 text-[10px] text-blue-600 dark:text-blue-400">
                    Matching Borrow/Lend entry will be auto-settled
                  </p>
                </div>
              </div>
            )}

            {/* Row 2: Category + Payment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">
                  Category
                </Label>
                <Controller
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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

              <div>
                <Label className="mb-1 text-xs text-violet-600 dark:text-violet-400">
                  Payment Method
                </Label>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                        <SelectValue placeholder="Payment method" />
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
              </div>
            </div>

            {/* Row 2.5: Quick Date Picker */}
            <QuickDatePicker
              selectedDate={form.watch("transactionDate")}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              daysInMonth={daysInMonth}
              isCurrentMonth={isCurrentMonth}
              todayStr={todayStr}
              onChange={(date) => form.setValue("transactionDate", date, { shouldValidate: true })}
            />

            {/* Row 3: Description + Submit */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Description (optional)"
                className="flex-1 border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
                {...form.register("description")}
              />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 h-10 px-8 shrink-0"
              >
                {createMutation.isPending ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Today's Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-300 dark:border-red-500/40 bg-white/80 dark:bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{summaryLabel} Spending</p>
              <TrendingDown className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatINRCompact(todaySummary.expense)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-300 dark:border-green-500/40 bg-white/80 dark:bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{summaryLabel} Income</p>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatINRCompact(todaySummary.income)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-300 dark:border-violet-500/40 bg-white/80 dark:bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">{summaryLabel} Net</p>
              <Wallet className="h-4 w-4 text-violet-400" />
            </div>
            <p
              className={cn(
                "text-xl font-bold",
                todaySummary.net >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatINRCompact(todaySummary.net)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-300 dark:border-violet-500/40 bg-white/80 dark:bg-white/5 backdrop-blur">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Transactions</p>
              <Hash className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-xl font-bold text-violet-700 dark:text-violet-300">
              {todaySummary.count}
            </p>
            <p className="text-[10px] text-muted-foreground">{isCurrentMonth ? "today" : "this month"}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Grid: Recent + Overview ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Recent Transactions (3 cols) ────────────────── */}
        <Card className="lg:col-span-3 border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-violet-900 dark:text-violet-200">
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyTxnQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
              </div>
            ) : recentTxns.length === 0 ? (
              <div className="py-12 text-center">
                <Zap className="mx-auto mb-3 h-10 w-10 text-violet-300 dark:text-violet-600" />
                <p className="text-violet-600 dark:text-violet-400">
                  No transactions this month yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use the form above to add your first one!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentTxns.map((txn) => {
                  const txnIsReturn = txn.description?.startsWith("Return from");
                  const txnIsSpentFor = txn.description?.startsWith("Spent for");
                  return (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-violet-50/50 dark:hover:bg-violet-900/20 transition-colors border-b border-violet-100 dark:border-violet-800/50 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                          txnIsReturn
                            ? "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                            : txnIsSpentFor
                              ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400"
                              : txn.type === "EXPENSE"
                                ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                : "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400"
                        )}
                      >
                        {txnIsReturn
                          ? <Undo2 className="h-4 w-4" />
                          : txnIsSpentFor
                            ? <HandCoins className="h-4 w-4" />
                            : (txn.categoryName?.charAt(0)?.toUpperCase() ?? "?")}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-violet-900 dark:text-violet-100 truncate">
                            {txn.categoryName ?? "—"}
                          </p>
                          {txnIsReturn && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-0">
                              Return
                            </Badge>
                          )}
                          {txnIsSpentFor && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border-0">
                              Spent For
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDate(txn.transactionDate)}
                          {txn.description ? ` · ${txn.description}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            txn.type === "INCOME"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {txn.type === "INCOME" ? "+" : "-"}
                          {formatINR(txn.amount)}
                        </p>
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
                        >
                          {PAYMENT_METHOD_LABELS[txn.paymentMethod as PaymentMethod] ??
                            txn.paymentMethod}
                        </Badge>
                      </div>
                      <div className="flex gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/30"
                          onClick={() => openEditDialog(txn)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => handleDelete(String(txn.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Right Column: Month Overview + Daily Chart (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* This Month Overview */}
          <Card className="border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-violet-900 dark:text-violet-200">
                {MONTHS[selectedMonth - 1]} Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-violet-300 border-t-violet-600" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Income</span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatINRCompact(dashboardQuery.data?.totalIncome ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expense</span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      {formatINRCompact(dashboardQuery.data?.totalExpense ?? 0)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-violet-900 dark:text-violet-200">
                      Balance
                    </span>
                    <span className="text-base font-bold text-violet-600 dark:text-violet-400">
                      {formatINRCompact(dashboardQuery.data?.balance ?? 0)}
                    </span>
                  </div>

                  {/* Top spending categories */}
                  {(dashboardQuery.data?.categoryBreakdown ?? []).length > 0 && (
                    <>
                      <Separator />
                      <p className="text-sm font-medium text-violet-900 dark:text-violet-200">
                        Top Spending
                      </p>
                      <div className="space-y-2.5">
                        {(dashboardQuery.data?.categoryBreakdown ?? [])
                          .slice(0, 5)
                          .map((cat) => (
                            <div key={cat.category} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-violet-700 dark:text-violet-300 truncate">
                                  {cat.category}
                                </span>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                  {formatINRCompact(cat.amount)} ({Math.round(cat.percentage)}%)
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-violet-100 dark:bg-violet-950/50 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-500 transition-all duration-500"
                                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Daily Spending Chart */}
          <Card className="border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-white/5 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-violet-900 dark:text-violet-200">
                Daily Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTxnQuery.isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="h-6 w-6 animate-spin rounded-full border-3 border-violet-300 border-t-violet-600" />
                </div>
              ) : dailySpendingData.every((d) => d.amount === 0) ? (
                <div className="flex items-center justify-center h-[200px]">
                  <p className="text-sm text-muted-foreground">No spending data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailySpendingData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="[&>line]:stroke-gray-200 dark:[&>line]:stroke-white/5"
                      stroke="currentColor"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      interval={2}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                      width={50}
                      tickFormatter={(v: number) =>
                        new Intl.NumberFormat("en-IN", {
                          notation: "compact",
                          compactDisplay: "short",
                        }).format(v)
                      }
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={14}>
                      {dailySpendingData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={
                            isCurrentMonth && entry.day === String(today.getDate())
                              ? "#7C3AED"
                              : "#C4B5FD"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Edit Transaction Dialog ─────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-violet-900 dark:text-violet-200">
              Edit Transaction
            </DialogTitle>
            <DialogDescription className="text-violet-600 dark:text-violet-400">
              Update the details of this transaction.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            {/* Type */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Type
              </Label>
              <Controller
                control={editForm.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
            </div>

            {/* Category */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Category
              </Label>
              <Controller
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="border-violet-200 dark:border-violet-700 focus:ring-violet-500">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {editFilteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {editForm.formState.errors.categoryId && (
                <p className="mt-1 text-xs text-red-500">
                  {editForm.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...editForm.register("amount", { valueAsNumber: true })}
                className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
              />
              {editForm.formState.errors.amount && (
                <p className="mt-1 text-xs text-red-500">
                  {editForm.formState.errors.amount.message}
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Payment Method
              </Label>
              <Controller
                control={editForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
            </div>

            {/* Description */}
            <div>
              <Label className="mb-1 text-sm text-violet-700 dark:text-violet-300">
                Description
              </Label>
              <Input
                placeholder="Enter a description (optional)"
                {...editForm.register("description")}
                className="border-violet-200 dark:border-violet-700 focus-visible:ring-violet-500"
              />
            </div>

            {/* Transaction Date */}
            <QuickDatePicker
              selectedDate={editForm.watch("transactionDate")}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              daysInMonth={daysInMonth}
              isCurrentMonth={isCurrentMonth}
              todayStr={todayStr}
              onChange={(date) => editForm.setValue("transactionDate", date, { shouldValidate: true })}
            />

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
              >
                {updateMutation.isPending ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Transaction"
        description="This transaction will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
