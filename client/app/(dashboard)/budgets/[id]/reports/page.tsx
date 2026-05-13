"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowLeft,
  Loader2,
  FileText,
  Plus,
  Calendar,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";
import { api, BudgetReport as BudgetReportType } from "@/lib/api";
import { formatINR } from "@/lib/utils";

interface BudgetReportsPageProps {
  params: Promise<{ id: string }>;
}

export default function BudgetReportsPage({ params }: BudgetReportsPageProps) {
  const { id: budgetId } = use(params);
  const [reports, setReports] = useState<BudgetReportType[]>([]);
  const [currentReport, setCurrentReport] = useState<BudgetReportType | null>(
    null,
  );
  const [budget, setBudget] = useState<{ name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reportsData, currentData, budgetData] = await Promise.all([
          api.getBudgetReports(budgetId),
          api.getCurrentReport(budgetId),
          api.getBudget(budgetId),
        ]);
        setReports(reportsData);
        setCurrentReport(currentData);
        setBudget(budgetData);
      } catch {
        setError("Failed to fetch reports");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [budgetId]);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // Calculate current period dates
      const now = new Date();
      const periodStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      ).toISOString();
      const periodEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      ).toISOString();

      await api.generateBudgetReport(budgetId, {
        period_start: periodStart,
        period_end: periodEnd,
      });
      // Refetch the reports
      const [reportsData, currentData, budgetData] = await Promise.all([
        api.getBudgetReports(budgetId),
        api.getCurrentReport(budgetId),
        api.getBudget(budgetId),
      ]);
      setReports(reportsData);
      setCurrentReport(currentData);
      setBudget(budgetData);
    } catch (error: unknown) {
      console.error("Failed to generate report:", error);
      let errorMessage = "Failed to generate report. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "detail" in error
      ) {
        errorMessage = (error as Record<string, string>).detail;
      }
      alert(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPeriodType = (report: BudgetReportType): string => {
    if (report.period_type) return report.period_type;
    // Derive period type from dates if not provided
    const start = new Date(report.period_start);
    const end = new Date(report.period_end);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) return "Weekly";
    if (daysDiff <= 14) return "Biweekly";
    if (daysDiff <= 31) return "Monthly";
    return "Yearly";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return formatINR(amount, 2);
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeviationColor = (deviation: number) => {
    if (deviation < 0) return "text-green-400";
    if (deviation > 10) return "text-red-400";
    return "text-yellow-400";
  };

  const getDeviationIcon = (deviation: number) => {
    if (deviation < 0) return <TrendingDown className="h-4 w-4" />;
    if (deviation > 10) return <TrendingUpIcon className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}

      <main className="p-6 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Back Link */}
          <Link
            href={`/budgets/${budgetId}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Budget
          </Link>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Budget Reports</h1>
            <p className="text-slate-400">
              {budget?.name || "Budget"} - Reports and analysis
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Current Report Summary */}
          {currentReport && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-400" />
                Current Period Summary
              </h2>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <p className="text-sm text-slate-400">Total Budgeted</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {formatAmount(currentReport.total_budgeted)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Spent</p>
                  <p className="text-xl font-bold text-white mt-1">
                    {formatAmount(currentReport.total_spent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Remaining</p>
                  <p className="text-xl font-bold text-green-400 mt-1">
                    {formatAmount(currentReport.remaining_budget ?? (currentReport.total_budgeted - currentReport.total_spent))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Deviation</p>
                  <p
                    className={`text-xl font-bold mt-1 flex items-center gap-1 ${getDeviationColor(currentReport.overall_deviation ?? 0)}`}
                  >
                    {getDeviationIcon(currentReport.overall_deviation ?? 0)}
                    {(currentReport.overall_deviation ?? 0).toFixed(1)}%
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Last calculated: {formatDateTime(currentReport.last_calculated_at)}
              </p>

              {currentReport.category_breakdown &&
                currentReport.category_breakdown.length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="text-xs font-medium text-slate-400 uppercase mb-3">
                      Current Period Category Breakdown
                    </p>
                    <div className="space-y-2">
                      {currentReport.category_breakdown.map((cat) => (
                        <div
                          key={cat.category_id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-300">{cat.category_name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400">
                              {formatAmount(cat.spent)} / {formatAmount(cat.budgeted)}
                            </span>
                            <span
                              className={`font-medium ${getDeviationColor(cat.deviation ?? 0)}`}
                            >
                              {(cat.deviation ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Reports List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold text-white">All Reports</h3>
            </div>

            {reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400">No reports generated yet.</p>
                <button
                  onClick={handleGenerateReport}
                  className="mt-2 text-green-400 hover:text-green-300"
                >
                  Generate your first report
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="p-6 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                          <Calendar className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">
                            {getPeriodType(report)} Report
                          </h4>
                          <p className="text-sm text-slate-400">
                            {formatDate(report.period_start)} -{" "}
                            {formatDate(report.period_end)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Spent</p>
                          <p className="font-semibold text-white">
                            {formatAmount(report.total_spent)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Budgeted</p>
                          <p className="font-semibold text-white">
                            {formatAmount(report.total_budgeted)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Deviation</p>
                          <p
                            className={`font-semibold flex items-center gap-1 ${getDeviationColor(report.overall_deviation ?? 0)}`}
                          >
                            {getDeviationIcon(report.overall_deviation ?? 0)}
                            {(report.overall_deviation ?? 0).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Category Breakdown */}
                    {report.category_breakdown &&
                      report.category_breakdown.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <p className="text-xs font-medium text-slate-400 uppercase mb-3">
                            Category Breakdown
                          </p>
                          <div className="space-y-2">
                            {report.category_breakdown.map((cat) => (
                              <div
                                key={cat.category_id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-slate-300">
                                  {cat.category_name}
                                </span>
                                <div className="flex items-center gap-4">
                                  <span className="text-slate-400">
                                    {formatAmount(cat.spent)} /{" "}
                                    {formatAmount(cat.budgeted)}
                                  </span>
                                  <span
                                    className={`font-medium ${getDeviationColor(cat.deviation ?? 0)}`}
                                  >
                                    {(cat.deviation ?? 0).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
