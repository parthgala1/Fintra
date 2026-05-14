"use client";

import React from "react";
import { BudgetAnalysisResponse } from "@/lib/api";
import { HistoricalBreakdown } from "@/components/budget/HistoricalBreakdown";

type RuleType = "fifty_thirty_twenty" | "custom" | "manual_custom";

interface BudgetPreviewProps {
  analysis: BudgetAnalysisResponse;
  budgetStartDate: string; // YYYY-MM-DD
  onConfirm: (
    ruleType: RuleType,
    customPercentages?: { needs: number; wants: number; savings: number },
  ) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BudgetPreview({
  analysis,
  budgetStartDate,
  onConfirm,
  onBack,
  isLoading = false,
}: BudgetPreviewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">Review Spending Analysis &amp; Choose Rule</h2>
        <p className="mt-1 text-sm text-slate-400">
          Select how you want to allocate your budget, then confirm to create it.
        </p>
      </div>

      <HistoricalBreakdown
        analysis={analysis}
        budgetStartDate={budgetStartDate}
        onConfirm={onConfirm}
        onCancel={onBack}
        isLoading={isLoading}
      />
    </div>
  );
}
