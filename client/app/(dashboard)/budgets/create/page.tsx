"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  api,
  BudgetAnalysisResponse,
  BudgetAnalyzeRequest,
} from "@/lib/api";
import { BudgetCreateForm } from "@/components/budget/BudgetCreateForm";
import { BudgetPreview } from "@/components/budget/BudgetPreview";

export default function CreateBudgetPage() {
  const router = useRouter();
  const [analysisInput, setAnalysisInput] = useState<BudgetAnalyzeRequest | null>(null);
  const [analysis, setAnalysis] = useState<BudgetAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (input: BudgetAnalyzeRequest) => {
    setError(null);
    setIsAnalyzing(true);
    setAnalysisInput(input);

    try {
      const data = await api.analyzeBudget(input);
      setAnalysis(data);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze spending history.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateFromAnalysis = async () => {
    if (!analysis || !analysisInput) {
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      const budget = await api.createBudgetWithAnalysis({
        name: analysisInput.name,
        budget_start_date: analysisInput.budget_start_date,
        analysis_id: analysis.analysis_id,
        income: analysisInput.income,
        confirmed: true,
      });

      router.push(`/budgets/${budget.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create budget.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
              <TrendingUp className="h-5 w-5 text-[#020617]" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Fintra</span>
          </Link>

          <Link href="/budgets" className="text-sm text-slate-400 transition hover:text-white">
            Back to Budgets
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-12 pt-24">
        <div className="mb-8">
          <Link
            href="/budgets"
            className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold">Create Budget from Historical Analysis</h1>
          <p className="text-slate-400">
            Analyze your spending before the budget starts, review the breakdown, and confirm creation.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        {!analysis ? (
          <BudgetCreateForm
            onAnalyze={handleAnalyze}
            isLoading={isAnalyzing}
            error={error}
          />
        ) : (
          <BudgetPreview
            analysis={analysis}
            onConfirm={handleCreateFromAnalysis}
            onBack={() => setAnalysis(null)}
            isLoading={isCreating}
          />
        )}
      </main>
    </div>
  );
}
