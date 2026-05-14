"use client";

import { useState } from "react";
import { unstable_noStore as noStore } from "next/cache";
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
  noStore();
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

  const handleCreateFromAnalysis = async (
    ruleType: "fifty_thirty_twenty" | "custom" | "manual_custom",
    customPercentages?: { needs: number; wants: number; savings: number },
  ) => {
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
        rule_type: ruleType,
        ...(ruleType === "manual_custom" && customPercentages
          ? {
              custom_needs_percentage: customPercentages.needs,
              custom_wants_percentage: customPercentages.wants,
              custom_savings_percentage: customPercentages.savings,
            }
          : {}),
      });


      // Auto-generate recommendations so the detail page has content immediately
      try {
        await api.generateRecommendations({ type: "budget" });
      } catch {
        // Non-critical — swallow and continue
      }

      router.push(`/budgets/${budget.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create budget.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">

      <main className="mx-auto max-w-4xl px-6 pb-12 p-6">
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
            budgetStartDate={analysisInput?.budget_start_date ?? ""}
            onConfirm={handleCreateFromAnalysis}
            onBack={() => setAnalysis(null)}
            isLoading={isCreating}
          />
        )}
      </main>
    </div>
  );
}
