"use client"

import { Budget, BudgetReport, Recommendation } from "@/lib/api"
import { formatINR } from "@/lib/utils"
import { TrendingUp, Zap, CheckCircle, RefreshCw, BarChart3 } from "lucide-react"
import { ContextualHelpTooltip } from "./ContextualHelpTooltip"

interface ImpactPanelProps {
  budgetId: string
  budget: Budget | null
  report?: BudgetReport | null
  recommendations?: Recommendation[]
  isLoading?: boolean
  onGenerateRecommendations?: () => Promise<void>
  isGenerating?: boolean
}

export function ImpactPanel({
  budgetId,
  budget,
  report,
  recommendations = [],
  isLoading = false,
  onGenerateRecommendations,
  isGenerating = false,
}: ImpactPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <span className="text-slate-400">Loading impact analysis...</span>
        </div>
      </div>
    )
  }

  if (!budget || !report) {
    return null
  }

  // Calculate key metrics
  const totalSpent = report.total_spent || 0
  const totalBudgeted = report.total_budgeted || budget.total_amount || 0
  const remaining = totalBudgeted - totalSpent
  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  const actualSavings = report.actual_savings || 0
  const budgetedSavings = report.budgeted_savings || budget.savings_amount || 0
  const savingsProgress =
    budgetedSavings > 0 ? (actualSavings / budgetedSavings) * 100 : 0

  const savingsRate = totalBudgeted > 0 ? (actualSavings / totalBudgeted) * 100 : 0

  return (
    <div className="space-y-6">
      {/* 3 Key Metric Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Remaining Budget */}
        <div className="relative rounded-2xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <ContextualHelpTooltip
              title="Remaining Budget"
              description="The amount of your monthly budget that you haven't spent yet. This is calculated as: Total Budget - Amount Spent So Far."
            />
          </div>

          <div className="flex items-start gap-3 mb-3">
            <BarChart3 className="h-5 w-5 text-green-400 mt-0.5" />
            <h3 className="text-sm font-medium text-slate-400">Remaining Budget</h3>
          </div>

          <p className="text-3xl font-bold text-white mb-2">{formatINR(remaining, 0)}</p>
          <p className="text-sm text-green-300 mb-3">
            {(100 - percentageUsed).toFixed(0)}% of ₹{formatINR(totalBudgeted, 0)} left
          </p>

          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${100 - percentageUsed}%` }}
            />
          </div>
        </div>

        {/* Card 2: Savings Progress */}
        <div className="relative rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <ContextualHelpTooltip
              title="Savings Progress"
              description="Shows how much you've actually saved or invested compared to your savings goal. Includes investments and other savings categories."
            />
          </div>

          <div className="flex items-start gap-3 mb-3">
            <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
            <h3 className="text-sm font-medium text-slate-400">Savings Progress</h3>
          </div>

          <p className="text-3xl font-bold text-white mb-2">
            {formatINR(actualSavings, 0)}
          </p>
          <p className="text-sm text-blue-300 mb-3">
            {savingsProgress.toFixed(0)}% of ₹{formatINR(budgetedSavings, 0)} goal
          </p>

          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                savingsProgress >= 80 ? "bg-green-500" : "bg-blue-500"
              }`}
              style={{ width: `${Math.min(savingsProgress, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 3: Savings Rate */}
        <div className="relative rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 backdrop-blur-sm">
          <div className="absolute top-4 right-4">
            <ContextualHelpTooltip
              title="Savings Rate"
              description="The percentage of your total budget that you're saving. Higher is better. Target: 20% or more."
            />
          </div>

          <div className="flex items-start gap-3 mb-3">
            <Zap className="h-5 w-5 text-purple-400 mt-0.5" />
            <h3 className="text-sm font-medium text-slate-400">Savings Rate</h3>
          </div>

          <p className="text-3xl font-bold text-white mb-2">{savingsRate.toFixed(1)}%</p>
          <p
            className={`text-sm mb-3 ${
              savingsRate >= 20 ? "text-green-300" : "text-yellow-300"
            }`}
          >
            {savingsRate >= 20 ? "✓ On target" : "Below 20% target"}
          </p>

          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                savingsRate >= 20 ? "bg-green-500" : "bg-yellow-500"
              }`}
              style={{ width: `${Math.min(savingsRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations Section (if any) */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h3 className="font-semibold text-white">💡 Recommendations</h3>
          </div>
          <div className="space-y-3">
            {recommendations.slice(0, 2).map((rec, idx) => (
              <div
                key={rec.id || idx}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <p className="font-medium text-white mb-1">{rec.title}</p>
                <p className="text-sm text-slate-400">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Recommendations Button */}
      {recommendations.length === 0 && onGenerateRecommendations && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center backdrop-blur-sm">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-green-400" />
          <p className="text-green-400 font-semibold mb-2">Budget looks balanced!</p>
          <p className="text-sm text-green-400/70 mb-4">
            Generate AI recommendations for personalized insights.
          </p>
          <button
            onClick={onGenerateRecommendations}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Generate Recommendations"}
          </button>
        </div>
      )}
    </div>
  )
}
