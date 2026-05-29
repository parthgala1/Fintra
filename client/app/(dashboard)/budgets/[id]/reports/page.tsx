"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Loader2,
  Download,
  FileSpreadsheet,
  Info,
  Plus,
  RotateCcw,
  Save,
} from "lucide-react";
import {
  api,
  BudgetAnalysisResponse,
  Budget as BudgetType,
} from "@/lib/api";
import { formatINR } from "@/lib/utils";
import { EditableReportTable } from "@/components/budget/EditableReportTable";
import { AllocationSnapshotModal } from "@/components/budget/AllocationSnapshotModal";
import { CategoryTransactionsModal } from "@/components/budget/CategoryTransactionsModal";
import {
  computeEditableReportData,
  normalizeCategoryType,
  ReportRowSource,
  EditableReportRow,
} from "@/components/budget/reportTableUtils";

interface BudgetReportsPageProps {
  params: Promise<{ id: string }>;
}

export default function BudgetReportsPage({ params }: BudgetReportsPageProps) {
  const router = useRouter();
  const { id: budgetId } = use(params);
  const [historyAnalysis, setHistoryAnalysis] =
    useState<BudgetAnalysisResponse | null>(null);
  const [budget, setBudget] = useState<BudgetType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [isApplyingPeriod, setIsApplyingPeriod] = useState(false);
  const [isSavingAllocations, setIsSavingAllocations] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<"monthly" | "annual" | "custom">("monthly");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedRowForTransactions, setSelectedRowForTransactions] = useState<EditableReportRow | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [editablePercentages, setEditablePercentages] = useState<
    Record<string, number>
  >({});
  const [filterCategoryType, setFilterCategoryType] = useState<"all" | "needs" | "wants" | "savings">("all");
  const [filterSearchTerm, setFilterSearchTerm] = useState<string>("");
  const [filterDeviationMode, setFilterDeviationMode] = useState<"all" | "overrun" | "underrun">("all");

  const toIsoDate = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const getMonthBoundary = (monthValue: string) => {
    const monthStart = monthValue ? new Date(`${monthValue}-01T00:00:00`) : null;
    if (!monthStart || Number.isNaN(monthStart.getTime())) {
      return { start: "", end: "" };
    }
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    const toLocalDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return {
      start: toLocalDate(monthStart),
      end: toLocalDate(monthEnd),
    };
  };

  const getYearBoundary = (yearValue: string) => {
    const year = Number.parseInt(yearValue, 10);
    if (!Number.isFinite(year)) {
      return { start: "", end: "" };
    }
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [budgetData, historyData] = await Promise.all([
          api.getBudget(budgetId),
          api.getBudgetHistoryAnalysis(budgetId),
        ]);
        setBudget(budgetData);
        setHistoryAnalysis(historyData);

        const defaultEnd = toIsoDate(historyData.analysis_end_date);
        const defaultStart = toIsoDate(historyData.analysis_start_date);
        if (defaultEnd) {
          setSelectedMonth(defaultEnd.slice(0, 7));
          setSelectedYear(defaultEnd.slice(0, 4));
        }
        if (defaultStart) {
          setCustomStartDate(defaultStart);
        }
        if (defaultEnd) {
          setCustomEndDate(defaultEnd);
        }
      } catch (fetchError: unknown) {
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to fetch historical analysis";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [budgetId]);

  const handleDownloadCsv = async () => {
    if (!budget) return;
    setIsDownloading(true);
    try {
      const blob = await api.exportBudgetHistoryAnalysisCsv(budgetId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const safeName = budget.name.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
      anchor.download = `${safeName || "budget"}_historical_analysis.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError: unknown) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download CSV";
      alert(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCreateNextBudget = async () => {
    if (!budget) return;

    const suggestedName = `${budget.name} - Next Budget`;
    const name = window.prompt("Name for the next budget", suggestedName)?.trim();
    if (!name) return;

    const suggestedStartDate = (() => {
      if (budget.end_date) {
        const nextDay = new Date(budget.end_date);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay.toISOString().slice(0, 10);
      }
      const today = new Date();
      return today.toISOString().slice(0, 10);
    })();

    const startDate =
      window.prompt("Start date for the next budget (YYYY-MM-DD)", suggestedStartDate)?.trim() ||
      suggestedStartDate;

    setIsCreatingBudget(true);
    try {
      const created = await api.createBudgetFromHistoryAnalysis(budgetId, {
        name,
        budget_start_date: startDate,
        rule_type: "custom",
      });
      router.push(`/budgets/${created.id}`);
    } catch (createError: unknown) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to create next budget";
      alert(message);
    } finally {
      setIsCreatingBudget(false);
    }
  };

  const handleApplyPeriod = async () => {
    setError(null);

    let nextStart = "";
    let nextEnd = "";

    if (periodMode === "monthly") {
      const boundary = getMonthBoundary(selectedMonth);
      nextStart = boundary.start;
      nextEnd = boundary.end;
    } else if (periodMode === "annual") {
      const boundary = getYearBoundary(selectedYear);
      nextStart = boundary.start;
      nextEnd = boundary.end;
    } else {
      nextStart = customStartDate;
      nextEnd = customEndDate;
    }

    if (!nextStart || !nextEnd) {
      setError("Please provide a valid period before applying.");
      return;
    }

    if (new Date(nextStart) > new Date(nextEnd)) {
      setError("Start date must be on or before end date.");
      return;
    }

    const budgetStartDate = budget?.start_date ? new Date(budget.start_date) : null;
    if (budgetStartDate) {
      const endDate = new Date(nextEnd);
      if (endDate >= budgetStartDate) {
        setError("Selected period must end before the budget start date.");
        return;
      }
    }

    setIsApplyingPeriod(true);
    try {
      const analysis = await api.getBudgetHistoryAnalysis(budgetId, {
        analysisStartDate: nextStart,
        analysisEndDate: nextEnd,
      });
      setHistoryAnalysis(analysis);
    } catch (applyError: unknown) {
      const message =
        applyError instanceof Error
          ? applyError.message
          : "Failed to apply selected period";
      setError(message);
    } finally {
      setIsApplyingPeriod(false);
    }
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

  const toNumber = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const round2 = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  };

  const allSourceRows = useMemo<ReportRowSource[]>(() => {
    if (!historyAnalysis) return [];

    const grouped = historyAnalysis.category_breakdown || {
      Needs: {},
      Wants: {},
      Savings: {},
    };
    const rows: ReportRowSource[] = [];

    for (const [rawType, categories] of Object.entries(grouped)) {
      const typedCategories = categories as Record<
        string,
        { amount: number; percentage: number; transaction_count: number }
      >;
      for (const [categoryName, item] of Object.entries(typedCategories || {})) {
        const categoryType = normalizeCategoryType(rawType);
        const key = `${categoryType}:${categoryName}`;
        rows.push({
          categoryId: key,
          categoryName,
          categoryType,
          baselineBudgetedAmount: toNumber(item.amount),
          actualAmount: toNumber(item.amount),
        });
      }
    }

    return rows.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }, [historyAnalysis]);

  const baseTotalBudget = useMemo(() => {
    const historyTotal = toNumber(historyAnalysis?.total_spending);
    if (historyTotal > 0) return historyTotal;
    return allSourceRows.reduce((sum, row) => sum + row.actualAmount, 0);
  }, [historyAnalysis, allSourceRows]);

  const initialPercentages = useMemo(() => {
    const initial: Record<string, number> = {};

    if (!budget) {
      // Fallback: use historical percentages if budget is not available
      for (const row of allSourceRows) {
        initial[row.categoryId] =
          baseTotalBudget > 0 ? (row.actualAmount / baseTotalBudget) * 100 : 0;
      }
      return initial;
    }

    // Use budget's configured rule to allocate percentages
    const budgetRulePercentages = {
      needs: budget.needs_percentage,
      wants: budget.wants_percentage,
      savings: budget.savings_percentage,
    };

    // Group rows by category type and calculate total actual amount per type
    const typeGroups = new Map<string, ReportRowSource[]>();
    const typeTotals = new Map<string, number>();

    for (const row of allSourceRows) {
      const typeKey = row.categoryType;
      if (!typeGroups.has(typeKey)) {
        typeGroups.set(typeKey, []);
      }
      typeGroups.get(typeKey)!.push(row);

      const currentTotal = typeTotals.get(typeKey) || 0;
      typeTotals.set(typeKey, currentTotal + row.actualAmount);
    }

    // Allocate budget percentages within each type based on actual spending ratios
    for (const [typeKey, rows] of typeGroups.entries()) {
      const typeRulePercentage = budgetRulePercentages[typeKey as keyof typeof budgetRulePercentages] || 0;
      const typeTotal = typeTotals.get(typeKey) || 1;

      for (const row of rows) {
        const ratioWithinType = typeTotal > 0 ? row.actualAmount / typeTotal : 1 / rows.length;
        initial[row.categoryId] = typeRulePercentage * ratioWithinType;
      }
    }

    return initial;
  }, [allSourceRows, budget, baseTotalBudget]);

  useEffect(() => {
    if (allSourceRows.length === 0) {
      setEditablePercentages({});
      return;
    }
    setEditablePercentages(initialPercentages);
  }, [allSourceRows, initialPercentages]);

  const fullReportComputation = useMemo(
    () => computeEditableReportData(allSourceRows, baseTotalBudget, editablePercentages),
    [allSourceRows, baseTotalBudget, editablePercentages],
  );

  const filteredRows = useMemo(() => {
    return fullReportComputation.rows.filter((row) => {
      if (filterCategoryType !== "all" && row.categoryType !== filterCategoryType) {
        return false;
      }
      if (filterSearchTerm && !row.categoryName.toLowerCase().includes(filterSearchTerm.toLowerCase())) {
        return false;
      }
      if (filterDeviationMode === "overrun" && row.deviationAmount <= 0) {
        return false;
      }
      if (filterDeviationMode === "underrun" && row.deviationAmount >= 0) {
        return false;
      }
      return true;
    });
  }, [fullReportComputation.rows, filterCategoryType, filterSearchTerm, filterDeviationMode]);

  const filteredTotals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.budgetPercentage += row.budgetPercentage;
        acc.actualPercentage += row.actualPercentage;
        acc.budgetedAmount += row.budgetedAmount;
        acc.actualAmount += row.actualAmount;
        acc.deviationAmount += row.deviationAmount;
        return acc;
      },
      {
        budgetPercentage: 0,
        actualPercentage: 0,
        budgetedAmount: 0,
        actualAmount: 0,
        deviationAmount: 0,
        deviationPercentage: 0,
      },
    );
  }, [filteredRows]);

  const displayedTotals = useMemo(() => {
    const budgetedAmount = round2(filteredTotals.budgetedAmount);
    const deviationAmount = round2(filteredTotals.deviationAmount);
    return {
      budgetPercentage: round2(filteredTotals.budgetPercentage),
      actualPercentage: round2(filteredTotals.actualPercentage),
      budgetedAmount,
      actualAmount: round2(filteredTotals.actualAmount),
      deviationAmount,
      deviationPercentage: budgetedAmount > 0 ? round2((deviationAmount / budgetedAmount) * 100) : 0,
    };
  }, [filteredTotals]);

  const handleBudgetPercentageChange = (categoryId: string, value: number) => {
    const nextValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    setEditablePercentages((prev) => ({
      ...prev,
      [categoryId]: nextValue,
    }));
    setSaveSuccessMessage(null);
  };

  const handleRowClick = (row: EditableReportRow) => {
    setSelectedRowForTransactions(row);
    setIsTransactionModalOpen(true);
  };

  const handleSaveAllocationEdits = async () => {
    if (!budget || fullReportComputation.rows.length === 0) {
      return;
    }

    setError(null);
    setSaveSuccessMessage(null);

    const totalEditedPercentage = fullReportComputation.rows.reduce(
      (sum, row) => sum + row.budgetPercentage,
      0,
    );

    if (Math.abs(totalEditedPercentage - 100) > 0.1) {
      setError("Budget percentages must sum to 100% before saving.");
      return;
    }

    const typePercentage = fullReportComputation.rows.reduce(
      (acc, row) => {
        if (row.categoryType === "needs" || row.categoryType === "wants" || row.categoryType === "savings") {
          acc[row.categoryType] += row.budgetPercentage;
        }
        return acc;
      },
      { needs: 0, wants: 0, savings: 0 },
    );

    setIsSavingAllocations(true);
    try {
      const [existingAllocations, categories] = await Promise.all([
        api.getBudgetCategories(budgetId),
        api.getCategories(),
      ]);

      const categoryById = new Map(categories.map((category) => [category.id, category]));
      const rowByTypeAndName = new Map(
        fullReportComputation.rows.map((row) => [
          `${row.categoryType}:${row.categoryName.toLowerCase()}`,
          row,
        ]),
      );

      await api.updateBudget(budgetId, {
        total_amount: budget.total_amount,
        needs_percentage: round2(typePercentage.needs),
        wants_percentage: round2(typePercentage.wants),
        savings_percentage: round2(typePercentage.savings),
      });

      const updatedAllocations = existingAllocations.map((allocation) => {
        const category = categoryById.get(allocation.category_id);
        if (!category) {
          return {
            category_id: allocation.category_id,
            budgeted_amount: allocation.budgeted_amount,
            sort_order: allocation.sort_order,
          };
        }

        const row = rowByTypeAndName.get(
          `${allocation.category_type}:${category.name.toLowerCase()}`,
        );

        if (!row) {
          return {
            category_id: allocation.category_id,
            budgeted_amount: allocation.budgeted_amount,
            sort_order: allocation.sort_order,
          };
        }

        return {
          category_id: allocation.category_id,
          budgeted_amount: round2((row.budgetPercentage / 100) * budget.total_amount),
          sort_order: allocation.sort_order,
        };
      });

      await api.updateBudgetCategories(budgetId, updatedAllocations);
      const refreshedBudget = await api.getBudget(budgetId);
      setBudget(refreshedBudget);
      setSaveSuccessMessage("Allocation edits saved to budget categories.");
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save allocation edits";
      setError(message);
    } finally {
      setIsSavingAllocations(false);
    }
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
      <main className="p-6 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          {/* Back Link */}
          <Link
            href={`/budgets/${budgetId}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Budget
          </Link>

          {/* Page Header */}
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-100">Historical Report</h1>
                <p className="text-sm text-slate-400">
                  {budget?.name || "Budget"} - spending behavior before budget start date
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEditablePercentages(initialPercentages)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset Example
                </button>
                <button
                  onClick={handleDownloadCsv}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download CSV
                </button>
                <button
                  onClick={handleCreateNextBudget}
                  disabled={isCreatingBudget}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-900/35 disabled:opacity-60"
                >
                  {isCreatingBudget ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Create Next Budget
                </button>
              </div>
            </div>

            {historyAnalysis && (
              <p className="text-xs text-slate-500">
                Analysis Window: {formatDate(historyAnalysis.analysis_start_date)} to{" "}
                {formatDate(historyAnalysis.analysis_end_date)}
              </p>
            )}

            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Period Selector
                </p>
                <button
                  onClick={handleApplyPeriod}
                  disabled={isApplyingPeriod}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                >
                  {isApplyingPeriod ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Apply Period
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                    Mode
                  </label>
                  <select
                    value={periodMode}
                    onChange={(event) => setPeriodMode(event.target.value as "monthly" | "annual" | "custom")}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {periodMode === "monthly" && (
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                      Month
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(event) => setSelectedMonth(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                )}

                {periodMode === "annual" && (
                  <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                      Year
                    </label>
                    <input
                      type="number"
                      min={2000}
                      max={2100}
                      value={selectedYear}
                      onChange={(event) => setSelectedYear(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                    />
                  </div>
                )}

                {periodMode === "custom" && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(event) => setCustomStartDate(event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(event) => setCustomEndDate(event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {historyAnalysis && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 p-3">
                  <div className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Currently Applied Period:</span>
                    <span className="ml-2">
                      {formatDate(historyAnalysis.analysis_start_date)} to{" "}
                      {formatDate(historyAnalysis.analysis_end_date)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Interactive Report Table */}
          <div className="mb-6 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
              What-if Category Allocation Table
            </h3>
            {/* Filter Panel */}
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-950/50 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Category Type
                  </label>
                  <select
                    value={filterCategoryType}
                    onChange={(e) => setFilterCategoryType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="all">All Types</option>
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="savings">Investments</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Search Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Housing, Food..."
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Deviation
                  </label>
                  <select
                    value={filterDeviationMode}
                    onChange={(e) => setFilterDeviationMode(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="all">All Deviations</option>
                    <option value="overrun">Overrun Only</option>
                    <option value="underrun">Underrun Only</option>
                  </select>
                </div>
              </div>

              {(filterCategoryType !== "all" || filterSearchTerm || filterDeviationMode !== "all") && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Filters applied</span>
                  <button
                    onClick={() => {
                      setFilterCategoryType("all");
                      setFilterSearchTerm("");
                      setFilterDeviationMode("all");
                    }}
                    className="text-slate-300 hover:text-white transition"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {fullReportComputation.rows.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <button
                  onClick={handleSaveAllocationEdits}
                  disabled={isSavingAllocations}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-600/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-900/35 disabled:opacity-60"
                >
                  {isSavingAllocations ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Allocation Edits
                </button>

                <button
                  onClick={() => setIsSnapshotOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Allocation Snapshot
                </button>
              </div>
            )}

            {saveSuccessMessage && (
              <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {saveSuccessMessage}
              </div>
            )}

            {filteredRows.length > 0 ? (
              <div className="space-y-6">
                <EditableReportTable
                  rows={filteredRows}
                  totals={displayedTotals}
                  formatAmount={formatAmount}
                  onBudgetPercentageChange={handleBudgetPercentageChange}
                  onRowClick={handleRowClick}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-6 text-center text-slate-400">
                <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                <p>
                  {historyAnalysis && historyAnalysis.category_breakdown && Object.keys(historyAnalysis.category_breakdown).length > 0
                    ? "No categories match your filters."
                    : "No historical transactions are available before this budget start date."}
                </p>
              </div>
            )}
          </div>

          {/* Glossary / Description */}
          <div className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-100">
              <Info className="h-4 w-4" />
              How to Read This Page
            </h3>
            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2 leading-relaxed">
              <p>
                <span className="font-medium text-white">Budget % (Editable):</span> The what-if allocation you control per category. It updates budgeted amount instantly.
              </p>
              <p>
                <span className="font-medium text-white">Actual % (Fixed):</span> Share of actual spending in the pre-budget historical window. This does not change when you edit budget percentages.
              </p>
              <p>
                <span className="font-medium text-white">Budgeted Amount:</span> Calculated as Budget % multiplied by historical total spending.
              </p>
              <p>
                <span className="font-medium text-white">Deviation:</span> Actual Amount minus Budgeted Amount. Positive means overspend; negative means under budget.
              </p>
              <p>
                <span className="font-medium text-white">Total Row:</span> Summarizes all categories so you can check overall planning balance.
              </p>
              <p>
                <span className="font-medium text-white">Type-level Totals:</span> Consolidated view by needs, wants, and investments to compare against your 50/30/20 style intent.
              </p>
            </div>
          </div>
        </div>
      </main>

      <AllocationSnapshotModal
        isOpen={isSnapshotOpen}
        budgetName={budget?.name || "Budget"}
        analysisWindowLabel={
          historyAnalysis
            ? `${formatDate(historyAnalysis.analysis_start_date)} to ${formatDate(historyAnalysis.analysis_end_date)}`
            : "N/A"
        }
        totals={fullReportComputation.totals}
        typeSummaries={fullReportComputation.typeSummaries}
        largestOverrun={fullReportComputation.largestOverrun}
        largestUnderrun={fullReportComputation.largestUnderrun}
        rows={fullReportComputation.rows}
        formatAmount={formatAmount}
        onClose={() => setIsSnapshotOpen(false)}
      />

      {selectedRowForTransactions && historyAnalysis && (
        <CategoryTransactionsModal
          isOpen={isTransactionModalOpen}
          categoryName={selectedRowForTransactions.categoryName}
          categoryType={selectedRowForTransactions.categoryType}
          categoryId={selectedRowForTransactions.categoryId}
          startDate={historyAnalysis.analysis_start_date}
          endDate={historyAnalysis.analysis_end_date}
          onClose={() => setIsTransactionModalOpen(false)}
        />
      )}
    </div>
  );
}
