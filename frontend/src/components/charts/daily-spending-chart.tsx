"use client";

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

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
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
}

export default function DailySpendingChart({
  data,
  highlightDay,
}: {
  data: Array<{ day: string; amount: number }>;
  highlightDay: string | null;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
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
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.day === highlightDay ? "#7C3AED" : "#C4B5FD"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
