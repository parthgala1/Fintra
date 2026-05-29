"use client";

import React from "react";
import { Info } from "lucide-react";
import { EditableReportRow } from "@/components/budget/reportTableUtils";

interface AllocationDetailsCardProps {
  rows: EditableReportRow[];
  formatAmount: (amount: number) => string;
}

export function AllocationDetailsCard({
  rows,
  formatAmount,
}: AllocationDetailsCardProps) {
  const getCategoryTypeColor = (categoryType: string) => {
    switch (categoryType) {
      case "needs":
        return "bg-blue-500/10 text-blue-300 border-blue-500/20";
      case "wants":
        return "bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "savings":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/20";
    }
  };

  const formatCategoryType = (type: string) => {
    switch (type) {
      case "needs":
        return "NEEDS";
      case "wants":
        return "WANTS";
      case "savings":
        return "INVESTMENTS";
      default:
        return type.toUpperCase();
    }
  };

  // Group rows by allocation source
  const rowsBySource = rows.reduce(
    (acc, row) => {
      const source = row.allocationSource || "Unknown";
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(row);
      return acc;
    },
    {} as Record<string, EditableReportRow[]>
  );

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Info className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-200">
          Allocation Reasoning
        </h3>
      </div>

      <div className="space-y-4">
        {Object.entries(rowsBySource).map(([source, sourceRows]) => (
          <div key={source} className="rounded-lg border border-slate-700/50 bg-slate-900/30 p-3">
            <p className="mb-3 text-xs font-medium text-slate-300">{source}</p>
            <div className="space-y-2">
              {sourceRows.map((row) => (
                <div
                  key={row.categoryId}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCategoryTypeColor(row.categoryType)}`}
                    >
                      {formatCategoryType(row.categoryType)}
                    </span>
                    <span className="text-slate-300">{row.categoryName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <span>{row.budgetPercentage.toFixed(2)}%</span>
                    <span className="text-slate-500">
                      {formatAmount(row.budgetedAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500 leading-relaxed">
        <span className="font-medium">Note:</span> Categories with "Custom adjustment"
        indicate user-edited percentages. Other allocations are derived from your
        budget rule percentages applied to historical spending proportions within
        each type.
      </p>
    </div>
  );
}
