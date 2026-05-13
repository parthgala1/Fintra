"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  TrendingUp,
  ArrowLeft,
  Star,
  Trash2,
  Loader2,
  BarChart3,
  Calculator,
  Bell,
} from "lucide-react";
import { useBudget } from "@/hooks/use-budgets";
import { api, BudgetReport, Recommendation } from "@/lib/api";
import { ImpactPanel } from "@/components/budget/ImpactPanel";

export default function BudgetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const budgetId = params.id as string;

  const { budget, isLoading, error, deleteBudget, setDefault } =
    useBudget(budgetId);
  const [currentReport, setCurrentReport] = useState<BudgetReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [isRecalculatingReport, setIsRecalculatingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchCurrentReport = async () => {
      if (budgetId) {
        setReportLoading(true);
        try {
          const report = await api.getCurrentReport(budgetId);
          setCurrentReport(report);
        } catch (err) {
          console.error("Failed to fetch report:", err);
        } finally {
          setReportLoading(false);
        }
      }
    };
    fetchCurrentReport();
  }, [budgetId]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (budgetId) {
        setRecommendationsLoading(true);
        try {
          const result = await api.getRecommendations();
          setRecommendations(result.recommendations || []);
        } catch (err) {
          console.error("Failed to fetch recommendations:", err);
          setRecommendations([]);
        } finally {
          setRecommendationsLoading(false);
        }
      }
    };
    fetchRecommendations();
  }, [budgetId]);

  const handleDelete = async () => {
    try {
      await deleteBudget(budgetId);
      router.push("/budgets");
    } catch (err) {
      console.error("Failed to delete budget:", err);
    }
  };

  const handleGenerateRecommendations = async () => {
    setIsGeneratingRecs(true);
    try {
      await api.generateRecommendations({ type: "budget" });
      const result = await api.getRecommendations();
      setRecommendations(result.recommendations || []);
    } catch (err) {
      console.error("Failed to generate recommendations:", err);
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  const handleRecalculateReport = async () => {
    setIsRecalculatingReport(true);
    try {
      const report = await api.recalculateCurrentReport(budgetId);
      setCurrentReport(report);
    } catch (err) {
      console.error("Failed to recalculate report:", err);
    } finally {
      setIsRecalculatingReport(false);
    }
  };

  const handleSetDefault = async () => {
    try {
      await setDefault(budgetId);
    } catch (err) {
      console.error("Failed to set default:", err);
    }
  };

  const formatAmount = (amount: number | string | null | undefined) => {
    // Handle null/undefined/empty cases
    if (amount === null || amount === undefined || amount === "") {
      return `₹0`;
    }

    // Convert to number
    const numAmount =
      typeof amount === "number" ? amount : parseFloat(String(amount));

    // Check for NaN or invalid result
    if (!Number.isFinite(numAmount)) {
      return `₹0`;
    }

    return `₹${numAmount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || "Budget not found"}</p>
          <Link href="/budgets" className="text-green-400 hover:text-green-300">
            Back to Budgets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      

      <main className="p-6 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <Link
              href="/budgets"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Budgets
            </Link>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{budget.name}</h1>
                  {budget.is_default && (
                    <Star className="h-5 w-5 text-green-400 fill-green-400" />
                  )}
                </div>
                <p className="text-slate-400 capitalize">
                  {budget.period} • {budget.type} • Started{" "}
                  {formatDate(budget.start_date)}
                </p>
              </div>
              <div className="flex gap-3">
                {!budget.is_default && (
                  <button
                    onClick={handleSetDefault}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <Star className="h-4 w-4" />
                    Set as Default
                  </button>
                )}
                <Link
                  href={`/budgets/${budgetId}/reports`}
                  className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] hover:bg-green-400 transition-colors"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Reports
                </Link>
                <button
                  onClick={handleRecalculateReport}
                  disabled={isRecalculatingReport}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isRecalculatingReport ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  Recalculate
                </button>
              </div>
            </div>
          </div>

          {/* Budget Overview Cards */}
          <div className="grid gap-6 md:grid-cols-4 mb-8">
            {/* Total Budget */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Total Budget</p>
              <p className="text-3xl font-bold text-white mt-1">
                {formatAmount(budget.total_amount)}
              </p>
              <p className="text-xs text-slate-500 mt-1 capitalize">
                {budget.period}
              </p>
            </div>

            {/* Needs */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 backdrop-blur-sm">
              <p className="text-sm text-blue-400 font-medium">Needs</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatAmount(budget.needs_amount)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${budget.needs_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {budget.needs_percentage}%
                </span>
              </div>
            </div>

            {/* Wants */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 backdrop-blur-sm">
              <p className="text-sm text-purple-400 font-medium">Wants</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatAmount(budget.wants_amount)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${budget.wants_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {budget.wants_percentage}%
                </span>
              </div>
            </div>

            {/* Savings */}
            <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
              <p className="text-sm text-green-400 font-medium">Savings</p>
              <p className="text-2xl font-bold text-white mt-1">
                {formatAmount(budget.savings_amount)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${budget.savings_percentage}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">
                  {budget.savings_percentage}%
                </span>
              </div>
            </div>
          </div>

          {/* Impact Panel Section */}
          <div className="mb-8">
            <ImpactPanel
              budgetId={budgetId}
              budget={budget}
              report={currentReport}
              recommendations={recommendations}
              isLoading={reportLoading || recommendationsLoading}
              onGenerateRecommendations={handleGenerateRecommendations}
              isGenerating={isGeneratingRecs}
            />
          </div>

          {/* Current Period Report */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Current Period Overview</h2>
              <Link
                href={`/budgets/${budgetId}/reports`}
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                View Detailed Report
              </Link>
            </div>

            {currentReport?.last_calculated_at && (
              <p className="mb-4 text-xs text-slate-500">
                Last calculated: {formatDate(currentReport.last_calculated_at)}
              </p>
            )}

            {reportLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
              </div>
            ) : currentReport ? (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Income */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Total Income</p>
                  <p className="text-xl font-bold text-green-400 mt-1">
                    {formatAmount(currentReport.total_income)}
                  </p>
                </div>

                {/* Expenses */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Total Expenses</p>
                  <p className="text-xl font-bold text-red-400 mt-1">
                    {formatAmount(currentReport.total_expenses)}
                  </p>
                </div>

                {/* Savings Rate */}
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Savings Rate</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {currentReport.savings_rate !== null &&
                    currentReport.savings_rate !== undefined &&
                    Number.isFinite(currentReport.savings_rate)
                      ? `${currentReport.savings_rate.toFixed(1)}%`
                      : "0%"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>No report data available for the current period.</p>
                <Link
                  href={`/budgets/${budgetId}/reports`}
                  className="text-green-400 hover:text-green-300 mt-2 inline-block"
                >
                  Generate a report
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href={`/budgets/${budgetId}/reports`}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-white">Reports</p>
                <p className="text-sm text-slate-400">
                  View detailed spending reports
                </p>
              </div>
            </Link>

            <Link
              href={`/budgets/${budgetId}/scenarios`}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-white">Scenarios</p>
                <p className="text-sm text-slate-400">Plan what-if scenarios</p>
              </div>
            </Link>

            <Link
              href="/budgets/alerts"
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium text-white">Alerts</p>
                <p className="text-sm text-slate-400">Manage budget alerts</p>
              </div>
            </Link>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 rounded-2xl border border-white/10 bg-[#0F172A] p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Delete Budget?
                </h3>
                <p className="text-slate-400 mb-6">
                  Are you sure you want to delete &quot;{budget.name}&quot;?
                  This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
