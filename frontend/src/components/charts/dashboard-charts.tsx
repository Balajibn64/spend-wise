"use client";

import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_COLORS = [
  "#7C3AED",
  "#8B5CF6",
  "#A78BFA",
  "#C4B5FD",
  "#DDD6FE",
  "#EDE9FE",
  "#F59E0B",
  "#10B981",
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-violet-200 dark:border-white/10 bg-white dark:bg-gray-900 px-4 py-3 shadow-xl">
        {label && (
          <p className="mb-1 text-sm font-medium text-gray-500 dark:text-white/70">{label}</p>
        )}
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-semibold text-gray-900 dark:text-white">
            <span style={{ color: entry.color }}>{entry.name}: </span>
            {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function DashboardCharts({
  categoryBreakdown,
  monthlyComparison,
  paymentMethodBreakdown,
}: {
  categoryBreakdown: Array<{ name: string; value: number; percentage: number }>;
  monthlyComparison: Array<{ month: string; income: number; expense: number }>;
  paymentMethodBreakdown: Array<{ name: string; value: number; percentage: number }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      {/* Category Breakdown - Pie Chart */}
      <Card className="glass border border-violet-200 dark:border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-violet-900 dark:text-white">
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {categoryBreakdown.map((_: unknown, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltipContent />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-sm text-gray-600 dark:text-white/70">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center">
              <p className="text-gray-400 dark:text-white/40">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 6-Month Comparison - Bar Chart */}
      <Card className="glass border border-violet-200 dark:border-violet-500/30">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-violet-900 dark:text-white">
            6-Month Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyComparison.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={monthlyComparison}
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="[&>line]:stroke-gray-200 dark:[&>line]:stroke-white/5"
                  stroke="currentColor"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  tickFormatter={(value: number) =>
                    `${new Intl.NumberFormat("en-IN", {
                      notation: "compact",
                      compactDisplay: "short",
                    }).format(value)}`
                  }
                />
                <Tooltip content={<CustomTooltipContent />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-sm text-gray-600 dark:text-white/70">{value}</span>
                  )}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#EF4444"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[320px] items-center justify-center">
              <p className="text-gray-400 dark:text-white/40">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method - Donut Chart */}
      <Card className="glass border border-violet-200 dark:border-violet-500/30 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-violet-900 dark:text-white">
            Payment Method Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentMethodBreakdown.length > 0 ? (
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={paymentMethodBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={130}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {paymentMethodBreakdown.map((_: unknown, index: number) => (
                      <Cell
                        key={`method-${index}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltipContent />} />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-sm text-gray-600 dark:text-white/70">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[320px] items-center justify-center">
              <p className="text-gray-400 dark:text-white/40">No data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
