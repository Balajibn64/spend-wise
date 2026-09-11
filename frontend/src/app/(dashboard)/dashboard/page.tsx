"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchDashboard } from "@/lib/queries";
import { MONTHS, selectableYears, formatINRCompact } from "@/lib/format";

const DashboardCharts = dynamic(() => import("@/components/charts/dashboard-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {[0, 1, 2].map((i) => (
        <Card
          key={i}
          className={`glass border border-violet-200 dark:border-violet-500/30 ${i === 2 ? "lg:col-span-2" : ""}`}
        >
          <CardContent className="flex h-[320px] items-center justify-center p-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-300 border-t-violet-600" />
          </CardContent>
        </Card>
      ))}
    </div>
  ),
});

const YEARS = selectableYears();
const formatCurrency = formatINRCompact;

export default function DashboardPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(currentDate.getMonth() + 1)
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(currentDate.getFullYear())
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", selectedMonth, selectedYear],
    queryFn: () =>
      fetchDashboard(Number(selectedMonth), Number(selectedYear)),
  });

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const balance = data?.balance ?? totalIncome - totalExpense;
  const categoryBreakdown = (data?.categoryBreakdown ?? []).map((d) => ({
    name: d.category,
    value: d.amount,
    percentage: d.percentage,
  }));
  const monthlyComparison = data?.monthlyComparison ?? [];
  const paymentMethodBreakdown = (data?.paymentMethodDistribution ?? []).map(
    (d) => ({ name: d.method, value: d.amount, percentage: d.percentage })
  );

  const summaryCards = [
    {
      title: "Total Income",
      value: totalIncome,
      icon: TrendingUp,
      trend: ArrowUpRight,
      color: "text-emerald-600 dark:text-emerald-400",
      bgGradient: "from-emerald-500/20 to-emerald-500/5",
      iconBg: "from-emerald-500 to-emerald-600",
      borderColor: "border-emerald-300 dark:border-emerald-500/40",
    },
    {
      title: "Total Expense",
      value: totalExpense,
      icon: TrendingDown,
      trend: ArrowDownRight,
      color: "text-red-600 dark:text-red-400",
      bgGradient: "from-red-500/20 to-red-500/5",
      iconBg: "from-red-500 to-red-600",
      borderColor: "border-red-300 dark:border-red-500/40",
    },
    {
      title: "Total Balance",
      value: balance,
      icon: Wallet,
      trend: balance >= 0 ? ArrowUpRight : ArrowDownRight,
      color: "text-violet-600 dark:text-violet-400",
      bgGradient: "from-violet-500/20 to-violet-500/5",
      iconBg: "from-violet-500 to-violet-600",
      borderColor: "border-violet-300 dark:border-violet-500/40",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
          <p className="text-lg text-gray-500 dark:text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass rounded-2xl border border-red-500/20 p-8 text-center">
          <p className="text-lg font-medium text-red-600 dark:text-red-400">
            Failed to load dashboard data.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/50">
            Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Page Header with Month/Year Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-violet-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-violet-600 dark:text-white/50">
            Your financial overview at a glance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] border-violet-200 dark:border-white/10 text-violet-900 dark:text-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] border-violet-200 dark:border-white/10 text-violet-900 dark:text-white">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {summaryCards.map((card) => {
          const IconComponent = card.icon;
          const TrendIcon = card.trend;

          return (
            <Card
              key={card.title}
              className={`glass group relative overflow-hidden border ${card.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-500 dark:text-white/60">
                      {card.title}
                    </p>
                    <p className={`text-3xl font-bold ${card.color}`}>
                      {formatCurrency(card.value)}
                    </p>
                  </div>
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${card.iconBg} shadow-lg`}
                  >
                    <IconComponent className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1">
                  <TrendIcon className={`h-4 w-4 ${card.color}`} />
                  <span className={`text-xs font-medium ${card.color}`}>
                    {MONTHS[Number(selectedMonth) - 1]} {selectedYear}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <DashboardCharts
        categoryBreakdown={categoryBreakdown}
        monthlyComparison={monthlyComparison}
        paymentMethodBreakdown={paymentMethodBreakdown}
      />
    </div>
  );
}
