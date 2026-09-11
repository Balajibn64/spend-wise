"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, PiggyBank, AlertTriangle } from "lucide-react";

import {
  fetchBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  fetchCategoriesByType,
} from "@/lib/queries";
import { getApiErrorMessage } from "@/lib/api-error";
import { MONTHS, formatINRCompact } from "@/lib/format";
import type { Budget, BudgetRequest, Category } from "@/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ---------- constants & helpers ----------

const formatCurrency = formatINRCompact;

function getAlertStatus(spent: number, limit: number) {
  if (limit <= 0) return "NORMAL";
  const pct = (spent / limit) * 100;
  if (pct >= 100) return "EXCEEDED";
  if (pct >= 80) return "WARNING";
  return "NORMAL";
}

function getProgressColor(status: string) {
  switch (status) {
    case "EXCEEDED":
      return "bg-red-500";
    case "WARNING":
      return "bg-amber-500";
    default:
      return "bg-green-500";
  }
}

function getBadgeVariant(status: string) {
  switch (status) {
    case "EXCEEDED":
      return "destructive" as const;
    case "WARNING":
      return "secondary" as const;
    default:
      return "default" as const;
  }
}

function getBadgeClasses(status: string) {
  switch (status) {
    case "EXCEEDED":
      return "bg-red-500/90 text-white hover:bg-red-500";
    case "WARNING":
      return "bg-amber-500/90 text-white hover:bg-amber-500";
    default:
      return "bg-green-500/90 text-white hover:bg-green-500";
  }
}

// ---------- zod schema ----------

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  monthlyLimit: z
    .number({ message: "Must be a valid positive number" })
    .positive("Limit must be greater than 0"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

// ---------- main page ----------

export default function BudgetsPage() {
  const queryClient = useQueryClient();

  // Computed fresh on every render (not once at module load) — a tab left
  // open across midnight on the 1st would otherwise keep defaulting to the
  // wrong month forever.
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();

  // month / year selector state
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---------- queries ----------

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    isError: budgetsError,
  } = useQuery({
    queryKey: ["budgets", selectedMonth, selectedYear],
    queryFn: () => fetchBudgets(selectedMonth, selectedYear),
  });

  const { data: expenseCategories = [] } = useQuery<Category[]>({
    queryKey: ["categories", "EXPENSE"],
    queryFn: () => fetchCategoriesByType("EXPENSE"),
  });

  // ---------- mutations ----------

  // Invalidated by prefix (not the exact [selectedMonth, selectedYear] key)
  // so an update that moves a budget to a different month, or any other
  // cached month, doesn't keep showing stale data.
  const createMutation = useMutation({
    mutationFn: (data: BudgetRequest) => createBudget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to create budget"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetRequest }) =>
      updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated successfully");
      closeDialog();
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to update budget"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBudget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted successfully");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, "Failed to delete budget"));
    },
  });

  // ---------- form ----------

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: "",
      monthlyLimit: 0,
      month: selectedMonth,
      year: selectedYear,
    },
  });

  function openAddDialog() {
    setEditingBudget(null);
    form.reset({
      categoryId: "",
      monthlyLimit: 0,
      month: selectedMonth,
      year: selectedYear,
    });
    setDialogOpen(true);
  }

  function openEditDialog(budget: Budget) {
    setEditingBudget(budget);
    form.reset({
      categoryId: String(budget.categoryId ?? ""),
      monthlyLimit: budget.monthlyLimit,
      month: budget.month,
      year: budget.year,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBudget(null);
    form.reset();
  }

  function onSubmit(values: BudgetFormValues) {
    const payload: BudgetRequest = {
      categoryId: Number(values.categoryId),
      monthlyLimit: values.monthlyLimit,
      month: values.month,
      year: values.year,
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
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

  // year range for selectors
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 2; y++) {
      years.push(y);
    }
    return years;
  }, []);

  const isMutating =
    createMutation.isPending || updateMutation.isPending;

  // ---------- render ----------

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-violet-500/20 backdrop-blur-sm border border-violet-500/30">
            <PiggyBank className="h-7 w-7 text-violet-600 dark:text-violet-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-200 dark:to-purple-400 bg-clip-text text-transparent">
              Budgets
            </h1>
            <p className="text-sm text-violet-600 dark:text-violet-300/70">
              Track and manage your monthly spending limits
            </p>
          </div>
        </div>

        <Button
          onClick={openAddDialog}
          className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:shadow-violet-500/40"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* ---- Month / Year Selector ---- */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-white/80 dark:bg-white/5 backdrop-blur-md border border-violet-200 dark:border-violet-700">
          <Select
            value={String(selectedMonth)}
            onValueChange={(v) => setSelectedMonth(Number(v))}
          >
            <SelectTrigger className="w-[140px] bg-transparent border-0 text-violet-900 dark:text-violet-100 focus:ring-violet-500/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, idx) => (
                <SelectItem key={idx} value={String(idx + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-violet-500/30" />

          <Select
            value={String(selectedYear)}
            onValueChange={(v) => setSelectedYear(Number(v))}
          >
            <SelectTrigger className="w-[100px] bg-transparent border-0 text-violet-900 dark:text-violet-100 focus:ring-violet-500/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ---- Budget Cards Grid ---- */}
      {budgetsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="bg-white/80 dark:bg-white/5 backdrop-blur-md border-violet-200 dark:border-violet-700 animate-pulse"
            >
              <CardContent className="p-6 space-y-4">
                <div className="h-5 w-1/2 bg-violet-500/20 rounded" />
                <div className="h-3 w-full bg-violet-500/10 rounded-full" />
                <div className="h-4 w-1/3 bg-violet-500/15 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : budgetsError ? (
        <Card className="bg-red-50 dark:bg-red-500/10 backdrop-blur-md border-red-300 dark:border-red-500/30">
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 dark:text-red-400" />
            <p className="text-red-600 dark:text-red-300 font-medium">
              Failed to load budgets. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : budgets.length === 0 ? (
        <Card className="bg-white/80 dark:bg-white/5 backdrop-blur-md border-violet-200 dark:border-violet-700">
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-full bg-violet-100 dark:bg-violet-500/10">
              <PiggyBank className="h-12 w-12 text-violet-400 dark:text-violet-400/60" />
            </div>
            <div>
              <p className="text-violet-800 dark:text-violet-200 font-medium text-lg">
                No budgets for {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
              <p className="text-violet-500 dark:text-violet-300/50 text-sm mt-1">
                Click &quot;Add Budget&quot; to create your first budget for this
                month.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget: Budget) => {
            const spent = budget.spent ?? 0;
            const limit = budget.monthlyLimit ?? 0;
            const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const clampedPct = Math.min(pct, 100);
            const status = budget.alertLevel ?? getAlertStatus(spent, limit);
            const progressColor = getProgressColor(status);
            const categoryName = budget.categoryName ?? "Unknown";

            return (
              <Card
                key={budget.id}
                className="group relative bg-white/80 dark:bg-white/5 backdrop-blur-md border-violet-200 dark:border-violet-700 hover:border-violet-400 dark:hover:border-violet-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <CardTitle className="text-violet-900 dark:text-violet-100 text-lg truncate">
                        {categoryName}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={getBadgeVariant(status)}
                      className={`text-xs font-semibold shrink-0 ${getBadgeClasses(status)}`}
                    >
                      {status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-violet-600 dark:text-violet-300/70">
                        {formatCurrency(spent)} / {formatCurrency(limit)}
                      </span>
                      <span
                        className={`font-semibold ${
                          status === "EXCEEDED"
                            ? "text-red-400"
                            : status === "WARNING"
                              ? "text-amber-400"
                              : "text-green-400"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-violet-100 dark:bg-violet-950/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ease-out ${progressColor}`}
                        style={{ width: `${clampedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Warning message for exceeded */}
                  {status === "EXCEEDED" && (
                    <div className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>
                        Exceeded by {formatCurrency(spent - limit)}
                      </span>
                    </div>
                  )}

                  {status === "WARNING" && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>Approaching limit</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-violet-200 dark:border-violet-700/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-500/20 h-8 w-8 p-0"
                      onClick={() => openEditDialog(budget)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                      onClick={() => handleDelete(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ---- Add / Edit Dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white dark:bg-gray-950/95 backdrop-blur-xl border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-200 dark:to-purple-400 bg-clip-text text-transparent">
              {editingBudget ? "Edit Budget" : "Add Budget"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-violet-700 dark:text-violet-200">
                Category
              </Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="bg-white dark:bg-white/5 border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100 focus:ring-violet-500/40">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                      {expenseCategories.map((cat: Category) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.categoryId && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.categoryId.message}
                </p>
              )}
            </div>

            {/* Monthly Limit */}
            <div className="space-y-2">
              <Label htmlFor="monthlyLimit" className="text-violet-700 dark:text-violet-200">
                Monthly Limit (&#8377;)
              </Label>
              <Input
                id="monthlyLimit"
                type="number"
                step="any"
                placeholder="e.g. 5000"
                className="bg-white dark:bg-white/5 border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100 placeholder:text-violet-400/40 focus-visible:ring-violet-500/40"
                {...form.register("monthlyLimit", { valueAsNumber: true })}
              />
              {form.formState.errors.monthlyLimit && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.monthlyLimit.message}
                </p>
              )}
            </div>

            {/* Month */}
            <div className="space-y-2">
              <Label htmlFor="month" className="text-violet-700 dark:text-violet-200">
                Month
              </Label>
              <Controller
                control={form.control}
                name="month"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="bg-white dark:bg-white/5 border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100 focus:ring-violet-500/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                      {MONTHS.map((name, idx) => (
                        <SelectItem key={idx} value={String(idx + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.month && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.month.message}
                </p>
              )}
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-violet-700 dark:text-violet-200">
                Year
              </Label>
              <Controller
                control={form.control}
                name="year"
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger className="bg-white dark:bg-white/5 border-violet-200 dark:border-violet-700 text-violet-900 dark:text-violet-100 focus:ring-violet-500/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900/95 backdrop-blur-xl border-violet-200 dark:border-violet-700">
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.year && (
                <p className="text-xs text-red-400">
                  {form.formState.errors.year.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-violet-600 dark:text-violet-300 hover:text-violet-800 dark:hover:text-violet-100 hover:bg-violet-100 dark:hover:bg-violet-500/20"
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isMutating}
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25"
              >
                {isMutating
                  ? "Saving..."
                  : editingBudget
                    ? "Update Budget"
                    : "Create Budget"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation ---- */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Budget"
        description="This budget will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
