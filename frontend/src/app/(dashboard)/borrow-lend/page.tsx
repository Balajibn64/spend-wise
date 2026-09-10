"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Handshake,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";

import {
  fetchBorrowLends,
  fetchBorrowLendSummary,
  createBorrowLend,
  updateBorrowLend,
  settleBorrowLend,
  deleteBorrowLend,
} from "@/lib/queries";
import type { BorrowLend, BorrowLendRequest, BorrowLendType, BorrowLendStatus } from "@/types";

import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ---------- constants & helpers ----------

const PAGE_SIZE = 20;

const formatINR = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const isOverdue = (dueDate: string | null) => {
  if (!dueDate) return false;
  return new Date(dueDate + "T00:00:00") < new Date(new Date().toDateString());
};

// ---------- schemas ----------

const borrowLendSchema = z.object({
  type: z.enum(["BORROWED", "LENT"] as const),
  personName: z.string().min(1, "Person name is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  dueDate: z.string().optional(),
});

type BorrowLendFormValues = z.infer<typeof borrowLendSchema>;

const settleSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
});

type SettleFormValues = z.infer<typeof settleSchema>;

// ---------- filter tabs ----------

type FilterTab = "ALL" | "BORROWED" | "LENT" | "PENDING" | "SETTLED";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "BORROWED", label: "Borrowed" },
  { value: "LENT", label: "Lent" },
  { value: "PENDING", label: "Pending" },
  { value: "SETTLED", label: "Settled" },
];

// ============================================================
// PAGE COMPONENT
// ============================================================

export default function BorrowLendPage() {
  const queryClient = useQueryClient();

  // ----- state -----
  const [page, setPage] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BorrowLend | null>(null);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settlingEntry, setSettlingEntry] = useState<BorrowLend | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ----- derived filter params -----
  const filterParams = (() => {
    const params: { type?: BorrowLendType; status?: BorrowLendStatus } = {};
    if (activeTab === "BORROWED") params.type = "BORROWED";
    if (activeTab === "LENT") params.type = "LENT";
    if (activeTab === "PENDING") params.status = "PENDING";
    if (activeTab === "SETTLED") params.status = "SETTLED";
    return params;
  })();

  // ----- queries -----
  const { data: entriesPage, isLoading } = useQuery({
    queryKey: ["borrow-lend", page, activeTab],
    queryFn: () =>
      fetchBorrowLends({
        page,
        size: PAGE_SIZE,
        ...filterParams,
      }),
  });

  const { data: summary } = useQuery({
    queryKey: ["borrow-lend-summary"],
    queryFn: fetchBorrowLendSummary,
  });

  const entries = entriesPage?.content ?? [];
  const totalPages = entriesPage?.totalPages ?? 0;

  // ----- form -----
  const form = useForm<BorrowLendFormValues>({
    resolver: zodResolver(borrowLendSchema),
    defaultValues: {
      type: "LENT",
      personName: "",
      amount: undefined as unknown as number,
      description: "",
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
    },
  });

  const settleForm = useForm<SettleFormValues>({
    resolver: zodResolver(settleSchema),
    defaultValues: { amount: undefined as unknown as number },
  });

  // ----- mutations -----
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["borrow-lend"] });
    queryClient.invalidateQueries({ queryKey: ["borrow-lend-summary"] });
  };

  const createMutation = useMutation({
    mutationFn: createBorrowLend,
    onSuccess: () => {
      toast.success("Entry created successfully");
      invalidateAll();
      closeDialog();
    },
    onError: () => toast.error("Failed to create entry"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, request }: { id: string; request: BorrowLendRequest }) =>
      updateBorrowLend(id, request),
    onSuccess: () => {
      toast.success("Entry updated successfully");
      invalidateAll();
      closeDialog();
    },
    onError: () => toast.error("Failed to update entry"),
  });

  const settleMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      settleBorrowLend(id, amount),
    onSuccess: () => {
      toast.success("Settlement recorded");
      invalidateAll();
      closeSettleDialog();
    },
    onError: () => toast.error("Failed to record settlement"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBorrowLend,
    onSuccess: () => {
      toast.success("Entry deleted");
      invalidateAll();
    },
    onError: () => toast.error("Failed to delete entry"),
  });

  // ----- handlers -----
  function openCreate() {
    setEditingEntry(null);
    form.reset({
      type: "LENT",
      personName: "",
      amount: undefined as unknown as number,
      description: "",
      date: new Date().toISOString().slice(0, 10),
      dueDate: "",
    });
    setDialogOpen(true);
  }

  function openEdit(entry: BorrowLend) {
    setEditingEntry(entry);
    form.reset({
      type: entry.type,
      personName: entry.personName,
      amount: entry.amount,
      description: entry.description || "",
      date: entry.date,
      dueDate: entry.dueDate || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingEntry(null);
  }

  function openSettle(entry: BorrowLend) {
    setSettlingEntry(entry);
    settleForm.reset({ amount: undefined as unknown as number });
    setSettleDialogOpen(true);
  }

  function closeSettleDialog() {
    setSettleDialogOpen(false);
    setSettlingEntry(null);
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  }

  function confirmDelete() {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
      setDeleteConfirmOpen(false);
      setDeletingId(null);
    }
  }

  function onSubmit(values: BorrowLendFormValues) {
    const request: BorrowLendRequest = {
      type: values.type,
      personName: values.personName,
      amount: values.amount,
      description: values.description || undefined,
      date: values.date,
      dueDate: values.dueDate || undefined,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, request });
    } else {
      createMutation.mutate(request);
    }
  }

  function onSettle(values: SettleFormValues) {
    if (settlingEntry) {
      settleMutation.mutate({ id: settlingEntry.id, amount: values.amount });
    }
  }

  function settleFullAmount() {
    if (settlingEntry) {
      settleForm.setValue("amount", settlingEntry.remainingAmount);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600">
              <Handshake className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-violet-900 dark:text-violet-100">
              Borrow & Lend
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track money you owe and money owed to you
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-shadow"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {/* ---------- Summary Cards ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* You Owe */}
        <Card className="border-red-300 dark:border-red-500/40 bg-white/80 dark:bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">You Owe</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatINR(summary?.borrowedPending ?? 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <ArrowDownLeft className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owed to You */}
        <Card className="border-emerald-300 dark:border-emerald-500/40 bg-white/80 dark:bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owed to You</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(summary?.lentPending ?? 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
                <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className="border-violet-200 dark:border-violet-700 bg-white/80 dark:bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    (summary?.netBalance ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {formatINR(summary?.netBalance ?? 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
                <CircleDollarSign className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Entries */}
        <Card className="border-violet-200 dark:border-violet-700 bg-white/80 dark:bg-white/5 backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Entries</p>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                  {summary?.activeCount ?? 0}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
                <Banknote className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Filter Tabs ---------- */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab(tab.value);
              setPage(0);
            }}
            className={
              activeTab === tab.value
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30"
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* ---------- Entries List ---------- */}
      <Card className="border-violet-200 dark:border-violet-700 bg-white/80 dark:bg-white/5 backdrop-blur-md">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <Handshake className="mb-2 h-10 w-10 opacity-40" />
              <p className="text-sm">No entries found</p>
              <Button variant="link" className="mt-1 text-violet-600" onClick={openCreate}>
                Add your first entry
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-violet-100 dark:divide-violet-800">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-violet-50/50 dark:hover:bg-violet-500/5 transition-colors"
                >
                  {/* Left: Person info + badges */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Avatar */}
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
                        entry.type === "LENT"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    >
                      {entry.personName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-violet-900 dark:text-violet-100 truncate">
                          {entry.personName}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            entry.type === "LENT"
                              ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10"
                              : "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-500/10"
                          }
                        >
                          {entry.type === "LENT" ? "Lent" : "Borrowed"}
                        </Badge>
                        <StatusBadge status={entry.status} />
                      </div>

                      {/* Amount + progress */}
                      <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                        <span
                          className={`text-lg font-bold ${
                            entry.type === "LENT"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {formatINR(entry.amount)}
                        </span>
                        {entry.settledAmount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            Settled: {formatINR(entry.settledAmount)} / Remaining:{" "}
                            {formatINR(entry.remainingAmount)}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {entry.status !== "PENDING" && (
                        <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              entry.status === "SETTLED"
                                ? "bg-emerald-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                (entry.settledAmount / entry.amount) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      )}

                      {/* Date + description */}
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(entry.date)}
                        </span>
                        {entry.dueDate && (
                          <span
                            className={`flex items-center gap-1 ${
                              isOverdue(entry.dueDate) && entry.status !== "SETTLED"
                                ? "text-red-500 font-medium"
                                : ""
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            Due: {formatDate(entry.dueDate)}
                            {isOverdue(entry.dueDate) && entry.status !== "SETTLED" && " (Overdue)"}
                          </span>
                        )}
                        {entry.description && (
                          <span className="truncate max-w-[200px]">
                            {entry.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1 shrink-0 sm:ml-3">
                    {entry.status !== "SETTLED" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                        onClick={() => openSettle(entry)}
                        title="Settle"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
                      onClick={() => openEdit(entry)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <>
              <Separator className="bg-violet-100 dark:bg-violet-800" />
              <div className="flex items-center justify-between p-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="border-violet-200 dark:border-violet-700"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-violet-200 dark:border-violet-700"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ---------- Add/Edit Dialog ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-950/95 border-violet-200 dark:border-violet-700">
          <DialogHeader>
            <DialogTitle className="text-violet-900 dark:text-violet-100">
              {editingEntry ? "Edit Entry" : "Add New Entry"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type Toggle */}
            <div className="space-y-2">
              <Label className="text-violet-700 dark:text-violet-300">Type</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={field.value === "BORROWED" ? "default" : "outline"}
                      onClick={() => field.onChange("BORROWED")}
                      className={
                        field.value === "BORROWED"
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "border-violet-200 dark:border-violet-700"
                      }
                    >
                      <ArrowDownLeft className="mr-2 h-4 w-4" />
                      Borrowed
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "LENT" ? "default" : "outline"}
                      onClick={() => field.onChange("LENT")}
                      className={
                        field.value === "LENT"
                          ? "bg-emerald-600 text-white hover:bg-emerald-700"
                          : "border-violet-200 dark:border-violet-700"
                      }
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Lent
                    </Button>
                  </div>
                )}
              />
            </div>

            {/* Person Name */}
            <div className="space-y-2">
              <Label className="text-violet-700 dark:text-violet-300">Person Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...form.register("personName")}
                  placeholder="Who did you borrow from / lend to?"
                  className="pl-10 border-violet-200 dark:border-violet-700 focus:ring-violet-500"
                />
              </div>
              {form.formState.errors.personName && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.personName.message}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-violet-700 dark:text-violet-300">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("amount", { valueAsNumber: true })}
                  placeholder="0"
                  className="pl-8 border-violet-200 dark:border-violet-700 focus:ring-violet-500 text-lg font-semibold"
                />
              </div>
              {form.formState.errors.amount && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-violet-700 dark:text-violet-300">Date</Label>
                <Input
                  type="date"
                  {...form.register("date")}
                  className="border-violet-200 dark:border-violet-700 focus:ring-violet-500"
                />
                {form.formState.errors.date && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-violet-700 dark:text-violet-300">
                  Due Date <span className="text-xs text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="date"
                  {...form.register("dueDate")}
                  className="border-violet-200 dark:border-violet-700 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-violet-700 dark:text-violet-300">
                Description <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Input
                {...form.register("description")}
                placeholder="Reason or notes"
                className="border-violet-200 dark:border-violet-700 focus:ring-violet-500"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                className="border-violet-200 dark:border-violet-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-gradient-to-r from-violet-600 to-purple-600 text-white"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingEntry
                  ? "Update"
                  : "Add Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Settle Dialog ---------- */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-950/95 border-violet-200 dark:border-violet-700">
          <DialogHeader>
            <DialogTitle className="text-violet-900 dark:text-violet-100">
              Record Settlement
            </DialogTitle>
          </DialogHeader>

          {settlingEntry && (
            <div className="space-y-4">
              {/* Entry info */}
              <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                    {settlingEntry.personName}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      settlingEntry.type === "LENT"
                        ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                        : "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400"
                    }
                  >
                    {settlingEntry.type === "LENT" ? "Lent" : "Borrowed"}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Original</p>
                    <p className="font-semibold">{formatINR(settlingEntry.amount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Settled</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatINR(settlingEntry.settledAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Remaining</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {formatINR(settlingEntry.remainingAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={settleForm.handleSubmit(onSettle)} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-violet-700 dark:text-violet-300">Settlement Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      max={settlingEntry.remainingAmount}
                      {...settleForm.register("amount", { valueAsNumber: true })}
                      placeholder="0"
                      className="pl-8 border-violet-200 dark:border-violet-700 text-lg font-semibold"
                    />
                  </div>
                  {settleForm.formState.errors.amount && (
                    <p className="text-xs text-red-500">
                      {settleForm.formState.errors.amount.message}
                    </p>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={settleFullAmount}
                  className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Settle Full Amount ({formatINR(settlingEntry.remainingAmount)})
                </Button>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeSettleDialog}
                    className="border-violet-200 dark:border-violet-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={settleMutation.isPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {settleMutation.isPending ? "Processing..." : "Settle"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------- Delete Confirm ---------- */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Entry"
        description="This borrow/lend entry will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

// ---------- Status Badge ----------

function StatusBadge({ status }: { status: BorrowLendStatus }) {
  switch (status) {
    case "SETTLED":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10"
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Settled
        </Badge>
      );
    case "PARTIALLY_SETTLED":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-500/10"
        >
          <AlertCircle className="mr-1 h-3 w-3" />
          Partial
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-500/10"
        >
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
  }
}
