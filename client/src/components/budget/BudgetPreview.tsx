"use client";

import React from "react";
import { BudgetAnalysisResponse } from "@/lib/api";
import { HistoricalBreakdown } from "@/components/budget/HistoricalBreakdown";

interface BudgetPreviewProps {
  analysis: BudgetAnalysisResponse;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BudgetPreview({
  analysis,
  onConfirm,
  onBack,
  isLoading = false,
}: BudgetPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Review Suggested Allocations</h2>
        <p className="mt-1 text-sm text-slate-400">
          Confirm this breakdown to create your budget from historical spending.
        </p>
      </div>

      <HistoricalBreakdown
        analysis={analysis}
        onConfirm={onConfirm}
        onCancel={onBack}
        isLoading={isLoading}
      />
    </div>
  );
}
