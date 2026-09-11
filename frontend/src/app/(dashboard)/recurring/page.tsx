"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRecurringTransactions,
  createRecurringTransaction,
  updateRecurringTransaction,
  toggleRecurringTransaction,
  deleteRecurringTransaction,
  fetchCategories,
} from "@/lib/queries";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatINRCompact, todayLocalDateString } from "@/lib/format";
import type {
  RecurringTransaction,
  RecurringTransactionRequest,
  Frequency,
  TransactionType,
  PaymentMethod,
  Category,
} from "@/types";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Plus, Pencil, Trash2, Repeat, Calendar, Power } from "lucide-react";

// ── Zod schema ───────────────────────────────────────────────
const recurringSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["INCOME", "EXPENSE"] as const),
  paymentMethod: z.enum([
    "CASH",
    "UPI",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "NET_BANKING",
    "WALLET",
  ] as const),
  description: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type RecurringFormValues = z.infer<typeof recurringSchema>;

// ── Frequency colours ────────────────────────────────────────
const VISIBLE_CAP = 24;

const frequencyColor: Record<string, string> = {
  DAILY: "bg-violet-600 text-white",
  WEEKLY: "bg-purple-600 text-white",
  MONTHLY: "bg-fuchsia-600 text-white",
  YEARLY: "bg-indigo-600 text-white",
};

// ── Helper: format INR ───────────────────────────────────────
const formatINR = formatINRCompact;

// ── Helper: format date ──────────────────────────────────────
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ═════════════════════════════════════════════════════════════
// Page component
// ═════════════════════════════════════════════════════════════
export default function RecurringPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<RecurringTransaction | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // ── Queries ──────────────────────────────────────────────
  const {
    data: transactions = [],
    isLoading,
    isError,
  } = useQuery<RecurringTransaction[]>({
    queryKey: ["recurring-transactions"],
    queryFn: fetchRecurringTransactions,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // ── Mutations ────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createRecurringTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Recurring transaction created");
      closeDialog();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to create recurring transaction")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RecurringTransactionRequest }) =>
      updateRecurringTransaction(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Recurring transaction updated");
      closeDialog();
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to update recurring transaction")),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Status toggled");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to toggle status")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      toast.success("Recurring transaction deleted");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Failed to delete recurring transaction")),
  });

  // ── Form ─────────────────────────────────────────────────
  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      categoryId: "",
      amount: 0,
      type: "EXPENSE",
      paymentMethod: "UPI",
      description: "",
      frequency: "MONTHLY",
      startDate: "",
      endDate: "",
    },
  });

  const openCreateDialog = () => {
    setEditingTx(null);
    form.reset({
      categoryId: "",
      amount: 0,
      type: "EXPENSE",
      paymentMethod: "UPI",
      description: "",
      frequency: "MONTHLY",
      startDate: todayLocalDateString(),
      endDate: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (tx: RecurringTransaction) => {
    setEditingTx(tx);
    form.reset({
      categoryId: String(tx.categoryId ?? ""),
      amount: tx.amount,
      type: tx.type as TransactionType,
      paymentMethod: tx.paymentMethod as PaymentMethod,
      description: tx.description ?? "",
      frequency: tx.frequency as Frequency,
      startDate: tx.startDate ? new Date(tx.startDate).toISOString().slice(0, 10) : "",
      endDate: tx.endDate ? new Date(tx.endDate).toISOString().slice(0, 10) : "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTx(null);
    form.reset();
  };

  const onSubmit = (values: RecurringFormValues) => {
    const payload: RecurringTransactionRequest = {
      categoryId: Number(values.categoryId),
      amount: values.amount,
      type: values.type,
      paymentMethod: values.paymentMethod,
      description: values.description || undefined,
      frequency: values.frequency,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
    };

    if (editingTx) {
      updateMutation.mutate({ id: editingTx.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-violet-700 dark:text-violet-300">
            Recurring Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your automated recurring incomes &amp; expenses.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreateDialog}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Recurring
            </Button>
          </DialogTrigger>

          {/* ── Dialog Modal ──────────────────────────────── */}
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-violet-700 dark:text-violet-300">
                {editingTx ? "Edit Recurring Transaction" : "Add Recurring Transaction"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="categoryId">Category</Label>
                <Select
                  value={form.watch("categoryId")}
                  onValueChange={(v) => form.setValue("categoryId", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-sm text-red-500">{form.formState.errors.categoryId.message}</p>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (INR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...form.register("amount", { valueAsNumber: true })}
                />
                {form.formState.errors.amount && (
                  <p className="text-sm text-red-500">{form.formState.errors.amount.message}</p>
                )}
              </div>

              {/* Type & Payment Method – side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={form.watch("type")}
                    onValueChange={(v) =>
                      form.setValue("type", v as TransactionType, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCOME">Income</SelectItem>
                      <SelectItem value="EXPENSE">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={form.watch("paymentMethod")}
                    onValueChange={(v) =>
                      form.setValue("paymentMethod", v as PaymentMethod, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="DEBIT_CARD">Debit Card</SelectItem>
                      <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                      <SelectItem value="WALLET">Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. Netflix subscription"
                  {...form.register("description")}
                />
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={form.watch("frequency")}
                  onValueChange={(v) =>
                    form.setValue("frequency", v as Frequency, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" {...form.register("startDate")} />
                  {form.formState.errors.startDate && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.startDate.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">End Date (optional)</Label>
                  <Input id="endDate" type="date" {...form.register("endDate")} />
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isMutating}
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {isMutating
                    ? "Saving..."
                    : editingTx
                      ? "Update"
                      : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading / Error / Empty states */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Repeat className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      )}

      {isError && (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="py-8 text-center text-red-600">
            Failed to load recurring transactions. Please try again later.
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && transactions.length === 0 && (
        <Card className="border-dashed border-violet-300 dark:border-violet-700">
          <CardContent className="py-16 text-center space-y-3">
            <Repeat className="h-12 w-12 mx-auto text-violet-400" />
            <p className="text-muted-foreground">
              No recurring transactions yet. Create one to get started!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Transaction cards grid */}
      {!isLoading && !isError && transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(showAll ? transactions : transactions.slice(0, VISIBLE_CAP)).map((tx) => (
            <Card
              key={tx.id}
              className={`relative overflow-hidden border transition-shadow hover:shadow-lg ${
                tx.isActive
                  ? "border-violet-200 dark:border-violet-800"
                  : "border-gray-200 dark:border-gray-800 opacity-60"
              }`}
            >
              {/* Accent top bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  tx.type === "INCOME"
                    ? "bg-emerald-500"
                    : "bg-violet-500"
                }`}
              />

              <CardHeader className="pb-2 pt-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold truncate">
                    {tx.categoryName ?? "Uncategorised"}
                  </CardTitle>
                  <Badge className={frequencyColor[tx.frequency] ?? "bg-violet-600 text-white"}>
                    {tx.frequency}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-3">
                {/* Amount */}
                <p
                  className={`text-2xl font-bold ${
                    tx.type === "INCOME"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-violet-700 dark:text-violet-300"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : "-"} {formatINR(tx.amount)}
                </p>

                {/* Description */}
                {tx.description && (
                  <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
                )}

                <Separator />

                {/* Meta info */}
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {tx.paymentMethod?.replace(/_/g, " ")}
                    </Badge>
                    <Badge
                      variant={tx.isActive ? "default" : "secondary"}
                      className={
                        tx.isActive
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                          : "text-xs"
                      }
                    >
                      {tx.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {fmtDate(tx.startDate)} &mdash; {fmtDate(tx.endDate)}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t pt-3 flex items-center justify-end gap-2">
                {/* Toggle active/inactive */}
                <Button
                  size="icon"
                  variant="ghost"
                  title={tx.isActive ? "Deactivate" : "Activate"}
                  onClick={() => toggleMutation.mutate(tx.id)}
                  className="hover:text-violet-600"
                >
                  <Power className={`h-4 w-4 ${tx.isActive ? "text-emerald-500" : "text-gray-400"}`} />
                </Button>

                {/* Edit */}
                <Button
                  size="icon"
                  variant="ghost"
                  title="Edit"
                  onClick={() => openEditDialog(tx)}
                  className="hover:text-violet-600"
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                {/* Delete */}
                <Button
                  size="icon"
                  variant="ghost"
                  title="Delete"
                  onClick={() => {
                    setDeletingId(tx.id);
                    setDeleteConfirmOpen(true);
                  }}
                  className="hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !isError && transactions.length > VISIBLE_CAP && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show less" : `Show all ${transactions.length}`}
          </Button>
        </div>
      )}

      {/* ── Delete Confirmation ─────────────────────────────── */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Recurring Transaction"
        description="This recurring transaction will be permanently deleted. Future scheduled entries will no longer be created."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deletingId) {
            deleteMutation.mutate(deletingId);
          }
          setDeleteConfirmOpen(false);
          setDeletingId(null);
        }}
      />
    </div>
  );
}
