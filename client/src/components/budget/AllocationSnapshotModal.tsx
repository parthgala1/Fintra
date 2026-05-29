"use client";

import React from "react";
import { X } from "lucide-react";
import { EditableReportRow, ReportTableTotals, ReportTypeSummary } from "@/components/budget/reportTableUtils";
import { ReportMetricsSummary } from "@/components/budget/ReportMetricsSummary";
import { TypePercentageComparisonCard } from "@/components/budget/TypePercentageComparisonCard";
import { AllocationDetailsCard } from "@/components/budget/AllocationDetailsCard";

interface AllocationSnapshotModalProps {
  isOpen: boolean;
  budgetName: string;
  analysisWindowLabel: string;
  totals: ReportTableTotals;
  typeSummaries: ReportTypeSummary[];
  largestOverrun: EditableReportRow | null;
  largestUnderrun: EditableReportRow | null;
  rows: EditableReportRow[];
  formatAmount: (amount: number) => string;
  onClose: () => void;
}

export function AllocationSnapshotModal({
  isOpen,
  budgetName,
  analysisWindowLabel,
  totals,
  typeSummaries,
  largestOverrun,
  largestUnderrun,
  rows,
  formatAmount,
  onClose,
}: AllocationSnapshotModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Allocation Snapshot</h2>
            <p className="mt-1 text-sm text-slate-400">{budgetName}</p>
            <p className="mt-1 text-xs text-slate-500">Analysis Window: {analysisWindowLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close snapshot modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <ReportMetricsSummary
            totals={totals}
            largestOverrun={largestOverrun}
            largestUnderrun={largestUnderrun}
            formatAmount={formatAmount}
          />

          <TypePercentageComparisonCard totals={totals} typeSummaries={typeSummaries} />

          <AllocationDetailsCard rows={rows} formatAmount={formatAmount} />
        </div>
      </div>
    </div>
  );
}
