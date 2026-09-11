"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { exportCsv, exportPdf } from "@/lib/queries";
import { getApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Moon, Sun, Download, FileText } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  // Date range for data export
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  // ── Export handlers ────────────────────────────────────────
  const handleExportCsv = async () => {
    try {
      setExporting("csv");
      await exportCsv(startDate || "", endDate || "");
      toast.success("CSV exported successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export CSV"));
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting("pdf");
      await exportPdf(startDate || "", endDate || "");
      toast.success("PDF exported successfully");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to export PDF"));
    } finally {
      setExporting(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-violet-700 dark:text-violet-300">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, preferences and data.
        </p>
      </div>

      {/* ── 1. Profile Info ─────────────────────────────────── */}
      <Card className="glass border-violet-200 dark:border-violet-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/40">
              <User className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-violet-700 dark:text-violet-300">
                Profile
              </CardTitle>
              <CardDescription>Your account information.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input
                id="profile-name"
                value={user?.name ?? "—"}
                readOnly
                className="bg-muted cursor-default"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={user?.email ?? "—"}
                readOnly
                className="bg-muted cursor-default"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. App Preferences ──────────────────────────────── */}
      <Card className="glass border-violet-200 dark:border-violet-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/40">
              {theme === "dark" ? (
                <Moon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              ) : (
                <Sun className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              )}
            </div>
            <div>
              <CardTitle className="text-violet-700 dark:text-violet-300">
                Appearance
              </CardTitle>
              <CardDescription>Customize how SpendWise looks.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={theme === "light" ? "default" : "outline"}
                onClick={() => setTheme("light")}
                className={
                  theme === "light"
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : ""
                }
              >
                <Sun className="h-4 w-4 mr-1.5" />
                Light
              </Button>
              <Button
                size="sm"
                variant={theme === "dark" ? "default" : "outline"}
                onClick={() => setTheme("dark")}
                className={
                  theme === "dark"
                    ? "bg-violet-600 hover:bg-violet-700 text-white"
                    : ""
                }
              >
                <Moon className="h-4 w-4 mr-1.5" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. Data Management ──────────────────────────────── */}
      <Card className="glass border-violet-200 dark:border-violet-700">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/40">
              <Download className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <CardTitle className="text-violet-700 dark:text-violet-300">
                Data Management
              </CardTitle>
              <CardDescription>Export your transaction data.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Date range picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="export-start" className="text-violet-700 dark:text-violet-300">Start Date</Label>
              <Input
                id="export-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-violet-200 dark:border-violet-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-end" className="text-violet-700 dark:text-violet-300">End Date</Label>
              <Input
                id="export-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-violet-200 dark:border-violet-700"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave dates empty to export all data.
          </p>

          <Separator />

          {/* Export buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleExportCsv}
              disabled={exporting !== null}
              className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              <FileText className="h-4 w-4" />
              {exporting === "csv" ? "Exporting..." : "Export CSV"}
            </Button>

            <Button
              onClick={handleExportPdf}
              disabled={exporting !== null}
              variant="outline"
              className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-900/30 gap-2"
            >
              <Download className="h-4 w-4" />
              {exporting === "pdf" ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
