"use client";

import React from "react";
import {
  EditableReportRow,
  ReportTableTotals,
} from "@/components/budget/reportTableUtils";

interface ReportMetricsSummaryProps {
  totals: ReportTableTotals;
  largestOverrun: EditableReportRow | null;
  largestUnderrun: EditableReportRow | null;
  formatAmount: (amount: number) => string;
}

const getDeviationColor = (amount: number) => {
  if (amount < 0) return "text-green-400";
  if (amount > 0) return "text-red-400";
  return "text-slate-200";
};

export function ReportMetricsSummary({
  totals,
  largestOverrun,
  largestUnderrun,
  formatAmount,
}: ReportMetricsSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">What-if Budgeted</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatAmount(totals.budgetedAmount)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Actual Spent</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatAmount(totals.actualAmount)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Net Deviation</p>
          <p className={`mt-1 text-lg font-semibold ${getDeviationColor(totals.deviationAmount)}`}>
            {formatAmount(totals.deviationAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase text-slate-400">Budget % Total</p>
          <p className="mt-1 text-lg font-semibold text-white">{totals.budgetPercentage.toFixed(2)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="mb-3 text-xs uppercase text-slate-400">Deviation Highlights</p>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-slate-400">Largest Overrun</p>
              <p className="text-white">
                {largestOverrun
                  ? `${largestOverrun.categoryName} (${formatAmount(largestOverrun.deviationAmount)})`
                  : "None"}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Largest Underrun</p>
              <p className="text-white">
                {largestUnderrun
                  ? `${largestUnderrun.categoryName} (${formatAmount(largestUnderrun.deviationAmount)})`
                  : "None"}
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}
