"use client";

import React from "react";
import { ReportTableTotals, ReportTypeSummary } from "@/components/budget/reportTableUtils";

interface TypePercentageComparisonCardProps {
  typeSummaries: ReportTypeSummary[];
  totals: ReportTableTotals;
}

const formatCategoryType = (type: ReportTypeSummary["categoryType"]) => {
  switch (type) {
    case "needs":
      return "Needs";
    case "wants":
      return "Wants";
    case "savings":
      return "Investments";
    default:
      return "Other";
  }
};

const getAccent = (type: ReportTypeSummary["categoryType"]) => {
  switch (type) {
    case "needs":
      return {
        chip: "bg-blue-500/15 text-blue-300 border-blue-500/30",
        actualBar: "bg-blue-400",
        budgetBar: "bg-blue-200",
      };
    case "wants":
      return {
        chip: "bg-purple-500/15 text-purple-300 border-purple-500/30",
        actualBar: "bg-purple-400",
        budgetBar: "bg-purple-200",
      };
    case "savings":
      return {
        chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
        actualBar: "bg-emerald-400",
        budgetBar: "bg-emerald-200",
      };
    default:
      return {
        chip: "bg-slate-500/15 text-slate-300 border-slate-500/30",
        actualBar: "bg-slate-400",
        budgetBar: "bg-slate-200",
      };
  }
};

const toPct = (amount: number, total: number): number => {
  if (!Number.isFinite(amount) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round(((amount / total) * 100) * 100) / 100;
};

export function TypePercentageComparisonCard({
  typeSummaries,
  totals,
}: TypePercentageComparisonCardProps) {
  const budgetTotal = totals.budgetedAmount;
  const actualTotal = totals.actualAmount;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-200">
        Category Type % Comparison (Budget vs Actual)
      </h3>

      <div className="grid gap-4 md:grid-cols-3">
        {typeSummaries.map((summary) => {
          const budgetPct = toPct(summary.budgetedAmount, budgetTotal);
          const actualPct = toPct(summary.actualAmount, actualTotal);
          const delta = Math.round((actualPct - budgetPct) * 100) / 100;
          const accent = getAccent(summary.categoryType);

          return (
            <div key={summary.categoryType} className="rounded-xl border border-white/10 bg-[#0f172a]/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${accent.chip}`}>
                  {formatCategoryType(summary.categoryType)}
                </span>
                <span className={`text-xs font-semibold ${delta >= 0 ? "text-red-300" : "text-emerald-300"}`}>
                  Delta: {delta >= 0 ? "+" : ""}{delta.toFixed(2)}%
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Budget Share</span>
                    <span>{budgetPct.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/70">
                    <div
                      className={`h-2 rounded-full ${accent.budgetBar}`}
                      style={{ width: `${Math.min(100, budgetPct)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                    <span>Actual Share</span>
                    <span>{actualPct.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-700/70">
                    <div
                      className={`h-2 rounded-full ${accent.actualBar}`}
                      style={{ width: `${Math.min(100, actualPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
