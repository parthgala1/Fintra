"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { EditableReportRow, ReportTableTotals } from "@/components/budget/reportTableUtils";

type SortColumn = "categoryType" | "categoryName" | "budgetPercentage" | "actualPercentage" | "budgetedAmount" | "actualAmount" | "deviationAmount" | null;
type SortDirection = "asc" | "desc";

interface EditableReportTableProps {
  rows: EditableReportRow[];
  totals: ReportTableTotals;
  formatAmount: (amount: number) => string;
  onBudgetPercentageChange: (categoryId: string, value: number) => void;
  onRowClick?: (row: EditableReportRow) => void;
}

const getDeviationColor = (deviationPercentage: number) => {
  if (deviationPercentage < 0) return "text-green-400";
  if (deviationPercentage > 10) return "text-red-400";
  return "text-yellow-400";
};

const formatCategoryType = (categoryType: EditableReportRow["categoryType"]) => {
  switch (categoryType) {
    case "needs":
      return "NEEDS";
    case "wants":
      return "WANTS";
    case "savings":
      return "INVESTMENTS";
    default:
      return "OTHER";
  }
};

const getCategoryTypeColor = (categoryType: EditableReportRow["categoryType"]) => {
  switch (categoryType) {
    case "needs":
      return "bg-blue-500/10 text-blue-300";
    case "wants":
      return "bg-purple-500/10 text-purple-300";
    case "savings":
      return "bg-emerald-500/10 text-emerald-300";
    default:
      return "bg-slate-500/10 text-slate-300";
  }
};

const getRowBackgroundColor = (categoryType: EditableReportRow["categoryType"]) => {
  switch (categoryType) {
    case "needs":
      return "bg-blue-500/10";
    case "wants":
      return "bg-purple-500/10";
    case "savings":
      return "bg-emerald-500/10";
    default:
      return "";
  }
};

const SortIcon = ({ column, sortColumn, sortDirection }: { column: SortColumn; sortColumn: SortColumn; sortDirection: SortDirection }) => {
  if (column !== sortColumn) {
    return <span className="text-slate-500 ml-1">⇅</span>;
  }
  return sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1 inline" /> : <ChevronDown className="h-4 w-4 ml-1 inline" />;
};

export function EditableReportTable({
  rows,
  totals,
  formatAmount,
  onBudgetPercentageChange,
  onRowClick,
}: EditableReportTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: number | string = 0;
    let bValue: number | string = 0;

    switch (sortColumn) {
      case "categoryType":
        aValue = a.categoryType.toLowerCase();
        bValue = b.categoryType.toLowerCase();
        break;
      case "categoryName":
        aValue = a.categoryName.toLowerCase();
        bValue = b.categoryName.toLowerCase();
        break;
      case "budgetPercentage":
        aValue = a.budgetPercentage;
        bValue = b.budgetPercentage;
        break;
      case "actualPercentage":
        aValue = a.actualPercentage;
        bValue = b.actualPercentage;
        break;
      case "budgetedAmount":
        aValue = a.budgetedAmount;
        bValue = b.budgetedAmount;
        break;
      case "actualAmount":
        aValue = a.actualAmount;
        bValue = b.actualAmount;
        break;
      case "deviationAmount":
        aValue = a.deviationAmount;
        bValue = b.deviationAmount;
        break;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    return sortDirection === "asc" ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1220]/70">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-300">
          <tr>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("categoryType")}
            >
              Category Type
              <SortIcon column="categoryType" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-left cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("categoryName")}
            >
              Category
              <SortIcon column="categoryName" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("budgetPercentage")}
            >
              Budget % (Editable)
              <SortIcon column="budgetPercentage" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("actualPercentage")}
            >
              Actual %
              <SortIcon column="actualPercentage" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("budgetedAmount")}
            >
              Budgeted Amount
              <SortIcon column="budgetedAmount" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("actualAmount")}
            >
              Actual Amount
              <SortIcon column="actualAmount" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
            <th
              className="px-4 py-3 text-right cursor-pointer hover:bg-white/10 transition"
              onClick={() => handleSort("deviationAmount")}
            >
              Deviation
              <SortIcon column="deviationAmount" sortColumn={sortColumn} sortDirection={sortDirection} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.categoryId}
              className={`border-t border-white/5 text-slate-200 hover:opacity-80 transition ${getRowBackgroundColor(row.categoryType)} ${onRowClick ? "cursor-pointer" : ""}`}
              onClick={() => onRowClick?.(row)}
            >
              <td className={`px-4 py-3 font-medium ${getCategoryTypeColor(row.categoryType)}`}>
                {formatCategoryType(row.categoryType)}
              </td>
              <td className="px-4 py-3">{row.categoryName}</td>
              <td className="px-4 py-3 text-right">
                <input
                  type="number"
                  value={row.budgetPercentage}
                  onChange={(e) => onBudgetPercentageChange(row.categoryId, parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={0.01}
                  className="w-20 bg-transparent border border-white/20 rounded px-2 py-1 text-right text-sm text-slate-200 focus:outline-none focus:border-white/40"
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="px-4 py-3 text-right text-slate-300">{row.actualPercentage.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right">{formatAmount(row.budgetedAmount)}</td>
              <td className="px-4 py-3 text-right">{formatAmount(row.actualAmount)}</td>
              <td className={`px-4 py-3 text-right font-medium ${getDeviationColor(row.deviationPercentage)}`}>
                {formatAmount(row.deviationAmount)} ({row.deviationPercentage.toFixed(2)}%)
              </td>
            </tr>
          ))}

          <tr className="border-t border-white/10 bg-white/5 font-semibold text-white">
            <td className="px-4 py-3" colSpan={2}>
              Total
            </td>
            <td className="px-4 py-3 text-right">{totals.budgetPercentage.toFixed(2)}%</td>
            <td className="px-4 py-3 text-right">{totals.actualPercentage.toFixed(2)}%</td>
            <td className="px-4 py-3 text-right">{formatAmount(totals.budgetedAmount)}</td>
            <td className="px-4 py-3 text-right">{formatAmount(totals.actualAmount)}</td>
            <td className={`px-4 py-3 text-right ${getDeviationColor(totals.deviationPercentage)}`}>
              {formatAmount(totals.deviationAmount)} ({totals.deviationPercentage.toFixed(2)}%)
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
