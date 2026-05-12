"use client";

import React from "react";
import { useState } from "react";

interface BudgetCreateFormProps {
  onAnalyze: (input: {
    name: string;
    budget_start_date: string;
    income?: number;
  }) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function BudgetCreateForm({
  onAnalyze,
  isLoading = false,
  error,
}: BudgetCreateFormProps) {
  const [name, setName] = useState("");
  const [budgetStartDate, setBudgetStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [income, setIncome] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (name.trim().length < 3) {
      setValidationError("Budget name must be at least 3 characters.");
      return;
    }

    if (!budgetStartDate) {
      setValidationError("Start date is required.");
      return;
    }

    const payload: { name: string; budget_start_date: string; income?: number } = {
      name: name.trim(),
      budget_start_date: budgetStartDate,
    };

    if (income.trim().length > 0) {
      const parsed = Number(income);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setValidationError("Income must be greater than 0.");
        return;
      }
      payload.income = parsed;
    }

    await onAnalyze(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold text-white">Create Budget</h2>

      <div>
        <label htmlFor="budget-name" className="mb-2 block text-sm text-slate-300">Budget Name</label>
        <input
          id="budget-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="May 2026 Budget"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="budget-start-date" className="mb-2 block text-sm text-slate-300">Budget Start Date</label>
        <input
          id="budget-start-date"
          type="date"
          value={budgetStartDate}
          onChange={(e) => setBudgetStartDate(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:border-green-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="budget-income" className="mb-2 block text-sm text-slate-300">Monthly Income (Optional)</label>
        <input
          id="budget-income"
          type="number"
          min="0"
          value={income}
          onChange={(e) => setIncome(e.target.value)}
          placeholder="100000"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      {(validationError || error) && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {validationError || error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-[#020617] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Analyzing Historical Spending..." : "Analyze Historical Spending"}
      </button>
    </form>
  );
}
