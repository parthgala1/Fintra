"use client"

import { Budget, BudgetReport } from "@/lib/api"
import { formatINR } from "@/lib/utils"
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Lightbulb,
} from "lucide-react"

interface BudgetNarrativeSummaryProps {
  budget: Budget | null
  report: BudgetReport | null
}

function generateNarrative(budget: Budget | null, report: BudgetReport | null) {
  if (!budget || !report) {
    return null
  }

  const totalSpent = report.total_spent || 0
  const totalBudgeted = report.total_budgeted || budget.total_amount || 0
  const remainingBudget = totalBudgeted - totalSpent
  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  const actualNeeds = report.actual_needs || 0
  const actualWants = report.actual_wants || 0
  const actualSavings = report.actual_savings || 0

  const budgetedNeeds = report.budgeted_needs || budget.needs_amount || 0
  const budgetedWants = report.budgeted_wants || budget.wants_amount || 0
  const budgetedSavings = report.budgeted_savings || budget.savings_amount || 0

  // Identify over/under categories from breakdowns
  const overCategories: { name: string; deviation: number }[] = []
  const underCategories: { name: string; deviation: number }[] = []

  if (report.breakdowns) {
    const seen = new Set<string>()
    for (const breakdown of report.breakdowns) {
      const key = `${breakdown.category_name}:${breakdown.category_type}`
      const transactionCount = breakdown.transaction_count || 0
      if (!seen.has(key) && transactionCount > 0) {
        seen.add(key)
        const deviation = breakdown.deviation || 0
        if (Math.abs(deviation) > 0) {
          if (deviation > 0 && breakdown.category_type !== "savings") {
            overCategories.push({
              name: breakdown.category_name,
              deviation,
            })
          } else if (deviation < 0 && breakdown.category_type !== "savings") {
            underCategories.push({
              name: breakdown.category_name,
              deviation: Math.abs(deviation),
            })
          }
        }
      }
    }
  }

  // Sort by deviation amount
  overCategories.sort((a, b) => b.deviation - a.deviation)
  underCategories.sort((a, b) => b.deviation - a.deviation)

  return {
    totalSpent,
    totalBudgeted,
    remainingBudget,
    percentageUsed,
    actualNeeds,
    actualWants,
    actualSavings,
    budgetedNeeds,
    budgetedWants,
    budgetedSavings,
    overCategories: overCategories.slice(0, 3),
    underCategories: underCategories.slice(0, 3),
  }
}

export function BudgetNarrativeSummary({
  budget,
  report,
}: BudgetNarrativeSummaryProps) {
  const narrative = generateNarrative(budget, report)

  if (!narrative) {
    return null
  }

  const {
    totalSpent,
    totalBudgeted,
    remainingBudget,
    percentageUsed,
    actualNeeds,
    budgetedNeeds,
    actualWants,
    budgetedWants,
    actualSavings,
    budgetedSavings,
    overCategories,
    underCategories,
  } = narrative

  const savingsProgressPercent =
    budgetedSavings > 0 ? (actualSavings / budgetedSavings) * 100 : 0
  const hasOverspent = totalSpent > totalBudgeted
  const hasUnderspent = totalSpent < totalBudgeted * 0.2
  const isSavingsLow = savingsProgressPercent < 50

  return (
    <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      {/* Main Status Summary */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">📊 Your Budget Snapshot</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          You've spent{" "}
          <span className="font-semibold text-white">
            {formatINR(totalSpent, 0)}
          </span>{" "}
          of your{" "}
          <span className="font-semibold text-white">
            {formatINR(totalBudgeted, 0)}
          </span>{" "}
          monthly budget ({percentageUsed.toFixed(0)}%). That leaves you with{" "}
          <span className="font-semibold text-green-400">
            {formatINR(remainingBudget, 0)}
          </span>{" "}
          to spend.
        </p>
      </div>

      {/* Spending Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-slate-300 mb-3">💰 Spending Breakdown:</h4>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex justify-between items-center">
            <span>
              • Needs: <span className="text-white font-semibold">{formatINR(actualNeeds, 0)}</span>{" "}
              ({((actualNeeds / totalBudgeted) * 100).toFixed(0)}% of budget)
            </span>
            {actualNeeds > budgetedNeeds && (
              <span className="text-red-400 text-xs">Over by {formatINR(actualNeeds - budgetedNeeds, 0)}</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span>
              • Wants: <span className="text-white font-semibold">{formatINR(actualWants, 0)}</span>{" "}
              ({((actualWants / totalBudgeted) * 100).toFixed(0)}% of budget)
            </span>
            {actualWants > budgetedWants && (
              <span className="text-red-400 text-xs">Over by {formatINR(actualWants - budgetedWants, 0)}</span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span>
              • Savings: <span className="text-white font-semibold">{formatINR(actualSavings, 0)}</span>{" "}
              ({((actualSavings / totalBudgeted) * 100).toFixed(0)}% of budget)
            </span>
            {savingsProgressPercent < 100 && (
              <span className="text-yellow-400 text-xs">{savingsProgressPercent.toFixed(0)}% of goal</span>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(overCategories.length > 0 || hasOverspent || isSavingsLow) && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-400 mb-2">⚠️ Watch Out:</h4>
              <ul className="space-y-1 text-sm text-red-300">
                {hasOverspent && (
                  <li>
                    • You're <span className="font-semibold">{percentageUsed.toFixed(0)}% over budget</span> — reduce
                    spending
                  </li>
                )}
                {overCategories.map((cat) => (
                  <li key={cat.name}>
                    • {cat.name} is <span className="font-semibold">{formatINR(cat.deviation, 0)} over</span> budget
                  </li>
                ))}
                {isSavingsLow && (
                  <li>
                    • Savings goal at only{" "}
                    <span className="font-semibold">{savingsProgressPercent.toFixed(0)}%</span> — save more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Positives */}
      {underCategories.length > 0 && !hasOverspent && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-2">✅ Looking Good:</h4>
              <ul className="space-y-1 text-sm text-green-300">
                {underCategories.slice(0, 2).map((cat) => (
                  <li key={cat.name}>
                    • {cat.name} is <span className="font-semibold">{formatINR(cat.deviation, 0)} under</span> budget
                  </li>
                ))}
                {!hasOverspent && (
                  <li>
                    • Overall, you're <span className="font-semibold">{(100 - percentageUsed).toFixed(0)}%</span> under
                    budget
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 Next Steps:</h4>
            <ul className="space-y-1 text-sm text-blue-300">
              {overCategories.length > 0 && (
                <li>• Reduce spending in {overCategories[0].name.toLowerCase()}</li>
              )}
              {isSavingsLow && (
                <li>• Focus on meeting your savings goal ({savingsProgressPercent.toFixed(0)}% done)</li>
              )}
              <li>• Review the full report for detailed category insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
