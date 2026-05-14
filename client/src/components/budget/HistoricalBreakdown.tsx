"use client";

import React, { useState } from "react";
import { BudgetAnalysisResponse } from "@/lib/api";
import { formatINR } from "@/lib/utils";

type RuleType = "fifty_thirty_twenty" | "custom" | "manual_custom";

interface CustomPercentages {
  needs: string;
  wants: string;
  savings: string;
}

interface HistoricalBreakdownProps {
  analysis: BudgetAnalysisResponse;
  budgetStartDate: string; // YYYY-MM-DD
  onConfirm: (
    ruleType: RuleType,
    customPercentages?: { needs: number; wants: number; savings: number },
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function categoryClass(category: string): string {
  if (category === "Needs") return "text-emerald-300";
  if (category === "Wants") return "text-amber-300";
  return "text-sky-300";
}

function budgetEndDate(startDateStr: string): string {
  const d = new Date(startDateStr + "T00:00:00");
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return lastDay.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseNum(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function HistoricalBreakdown({
  analysis,
  budgetStartDate,
  onConfirm,
  onCancel,
  isLoading = false,
}: HistoricalBreakdownProps) {
  const [ruleType, setRuleType] = useState<RuleType>("custom");
  const [customPct, setCustomPct] = useState<CustomPercentages>({ needs: "", wants: "", savings: "" });

  const rows = ["Needs", "Wants", "Savings"].flatMap((group) => {
    const entries = Object.entries(
      analysis.category_breakdown[group as keyof typeof analysis.category_breakdown] || {},
    );
    return entries.map(([subcategory, data]) => ({
      category: group,
      subcategory,
      amount: data.amount,
      percentage: data.percentage,
      transactionCount: data.transaction_count,
    }));
  });

  // Effective percentages for the preview bar
  const effectiveNeeds =
    ruleType === "fifty_thirty_twenty"
      ? 50
      : ruleType === "manual_custom"
        ? parseNum(customPct.needs)
        : Number(analysis.needs_percentage);
  const effectiveWants =
    ruleType === "fifty_thirty_twenty"
      ? 30
      : ruleType === "manual_custom"
        ? parseNum(customPct.wants)
        : Number(analysis.wants_percentage);
  const effectiveSavings =
    ruleType === "fifty_thirty_twenty"
      ? 20
      : ruleType === "manual_custom"
        ? parseNum(customPct.savings)
        : Number(analysis.savings_percentage);

  const customSum = parseNum(customPct.needs) + parseNum(customPct.wants) + parseNum(customPct.savings);
  const customSumValid = Math.abs(customSum - 100) <= 0.5;
  const customFieldsFilled =
    customPct.needs.trim() !== "" &&
    customPct.wants.trim() !== "" &&
    customPct.savings.trim() !== "";

  const canConfirm =
    ruleType !== "manual_custom" || (customFieldsFilled && customSumValid);

  function handleConfirm() {
    if (ruleType === "manual_custom") {
      onConfirm(ruleType, {
        needs: parseNum(customPct.needs),
        wants: parseNum(customPct.wants),
        savings: parseNum(customPct.savings),
      });
    } else {
      onConfirm(ruleType);
    }
  }

  const confirmLabel = isLoading
    ? "Creating Budget..."
    : ruleType === "fifty_thirty_twenty"
      ? "Create with 50/30/20 Rule"
      : ruleType === "manual_custom"
        ? "Create with My Custom Split"
        : "Create from My Spending";

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">

      {/* ── Date context ────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Analysis Period</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {fmtDate(analysis.analysis_start_date)} → {fmtDate(analysis.analysis_end_date)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Transactions used to calculate your spending mix</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-green-500">Budget Period</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">
            {fmtDate(budgetStartDate)} → {budgetEndDate(budgetStartDate)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">New transactions will be tracked against this budget</p>
        </div>
      </div>

      {/* ── Rule type selector ──────────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-medium text-slate-300">Choose a Budgeting Rule</p>
        <div className="grid gap-3 sm:grid-cols-3">

          {/* Card: Based on My Spending */}
          <button
            type="button"
            onClick={() => setRuleType("custom")}
            className={`rounded-xl border p-4 text-left transition ${
              ruleType === "custom"
                ? "border-green-500/50 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-semibold text-white leading-snug">Based on My Spending</span>
              {ruleType === "custom" && (
                <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-[#020617]">
                  SELECTED
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Uses your actual historical ratios</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-300">
                N {Number(analysis.needs_percentage).toFixed(1)}%
              </span>
              <span className="rounded-md bg-purple-500/15 px-2 py-1 text-purple-300">
                W {Number(analysis.wants_percentage).toFixed(1)}%
              </span>
              <span className="rounded-md bg-green-500/15 px-2 py-1 text-green-300">
                S {Number(analysis.savings_percentage).toFixed(1)}%
              </span>
            </div>
          </button>

          {/* Card: 50/30/20 */}
          <button
            type="button"
            onClick={() => setRuleType("fifty_thirty_twenty")}
            className={`rounded-xl border p-4 text-left transition ${
              ruleType === "fifty_thirty_twenty"
                ? "border-green-500/50 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-semibold text-white leading-snug">50 / 30 / 20 Rule</span>
              {ruleType === "fifty_thirty_twenty" && (
                <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-[#020617]">
                  SELECTED
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Standard budgeting guideline</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-md bg-blue-500/15 px-2 py-1 text-blue-300">N 50%</span>
              <span className="rounded-md bg-purple-500/15 px-2 py-1 text-purple-300">W 30%</span>
              <span className="rounded-md bg-green-500/15 px-2 py-1 text-green-300">S 20%</span>
            </div>
          </button>

          {/* Card: Manual Custom */}
          <button
            type="button"
            onClick={() => setRuleType("manual_custom")}
            className={`rounded-xl border p-4 text-left transition ${
              ruleType === "manual_custom"
                ? "border-green-500/50 bg-green-500/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="text-sm font-semibold text-white leading-snug">Set My Own Split</span>
              {ruleType === "manual_custom" && (
                <span className="shrink-0 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-[#020617]">
                  SELECTED
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Define your own N / W / S percentages</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate-500">
              <span className="rounded-md border border-white/10 px-2 py-1">N ?%</span>
              <span className="rounded-md border border-white/10 px-2 py-1">W ?%</span>
              <span className="rounded-md border border-white/10 px-2 py-1">S ?%</span>
            </div>
          </button>
        </div>

        {/* Inline inputs — only shown when manual_custom is selected */}
        {ruleType === "manual_custom" && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <p className="text-xs font-medium text-slate-400">Enter your target percentages (must add up to 100%)</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "needs", label: "Needs %", color: "border-blue-500/40 focus:border-blue-400" },
                  { key: "wants", label: "Wants %", color: "border-purple-500/40 focus:border-purple-400" },
                  { key: "savings", label: "Savings %", color: "border-green-500/40 focus:border-green-400" },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs text-slate-400">{label}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={customPct[key]}
                    onChange={(e) => setCustomPct((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder="0"
                    className={`w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none ${color}`}
                  />
                </div>
              ))}
            </div>
            {/* Running sum indicator */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Total:</span>
              <span
                className={`font-semibold tabular-nums ${
                  !customFieldsFilled
                    ? "text-slate-400"
                    : customSumValid
                      ? "text-green-400"
                      : "text-red-400"
                }`}
              >
                {customFieldsFilled ? customSum.toFixed(1) : "—"}%
              </span>
              {customFieldsFilled && !customSumValid && (
                <span className="text-red-400">· must equal 100%</span>
              )}
              {customFieldsFilled && customSumValid && (
                <span className="text-green-400">· looks good</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Allocation preview bar ──────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-xs text-slate-500">Allocation preview</p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="bg-blue-500 transition-all duration-300" style={{ width: `${Math.min(effectiveNeeds, 100)}%` }} />
          <div className="bg-purple-500 transition-all duration-300" style={{ width: `${Math.min(effectiveWants, 100)}%` }} />
          <div className="bg-green-500 transition-all duration-300" style={{ width: `${Math.min(effectiveSavings, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span className="text-blue-400">Needs {effectiveNeeds.toFixed(1)}%</span>
          <span className="text-purple-400">Wants {effectiveWants.toFixed(1)}%</span>
          <span className="text-green-400">Savings {effectiveSavings.toFixed(1)}%</span>
        </div>
      </div>

      {/* ── Analysis header ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Historical Transaction Breakdown</h3>
          <p className="text-xs text-slate-400">
            {analysis.total_transactions} transactions · {fmtDate(analysis.analysis_start_date)} to {fmtDate(analysis.analysis_end_date)}
          </p>
        </div>
        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-green-300">
          {analysis.data_quality} quality
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
              <th className="px-4 py-3">% of Spending</th>
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
          onClick={handleConfirm}
          disabled={isLoading || !canConfirm}
          className="rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
