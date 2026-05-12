"use client";

import React from "react";
import { BudgetAnalysisResponse } from "@/lib/api";
import { formatINR } from "@/lib/utils";

interface HistoricalBreakdownProps {
  analysis: BudgetAnalysisResponse;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function categoryClass(category: string): string {
  if (category === "Needs") return "text-emerald-300";
  if (category === "Wants") return "text-amber-300";
  return "text-sky-300";
}

export function HistoricalBreakdown({
  analysis,
  onConfirm,
  onCancel,
  isLoading = false,
}: HistoricalBreakdownProps) {
  const rows = ["Needs", "Wants", "Savings"].flatMap((group) => {
    const entries = Object.entries(analysis.category_breakdown[group as keyof typeof analysis.category_breakdown] || {});
    return entries.map(([subcategory, data]) => ({
      category: group,
      subcategory,
      amount: data.amount,
      percentage: data.percentage,
      transactionCount: data.transaction_count,
    }));
  });

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Historical Breakdown</h3>
          <p className="text-sm text-slate-400">
            Analyzed from {analysis.analysis_start_date} to {analysis.analysis_end_date}
          </p>
        </div>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-300">
          {analysis.data_quality}
        </span>
      </div>

      {analysis.validation_warnings.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
          {analysis.validation_warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Subcategory</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Percentage</th>
              <th className="px-4 py-3">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.category}-${row.subcategory}`} className="border-t border-white/10 text-slate-200">
                <td className={`px-4 py-3 font-medium ${categoryClass(row.category)}`}>{row.category}</td>
                <td className="px-4 py-3">{row.subcategory}</td>
                <td className="px-4 py-3">{formatINR(row.amount)}</td>
                <td className="px-4 py-3">{Number(row.percentage).toFixed(2)}%</td>
                <td className="px-4 py-3">{row.transactionCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/10 bg-white/5 text-white">
              <td className="px-4 py-3 font-semibold" colSpan={2}>Total</td>
              <td className="px-4 py-3 font-semibold">{formatINR(analysis.total_spending)}</td>
              <td className="px-4 py-3 font-semibold">100.00%</td>
              <td className="px-4 py-3 font-semibold">{analysis.total_transactions}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
        >
          Edit Inputs
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition hover:bg-green-400 disabled:opacity-60"
        >
          {isLoading ? "Creating Budget..." : "Confirm and Create Budget"}
        </button>
      </div>
    </div>
  );
}
