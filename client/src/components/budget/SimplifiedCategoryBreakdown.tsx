"use client"

import { BudgetReport } from "@/lib/api"
import { formatINR } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface SimplifiedCategoryBreakdownProps {
  report: BudgetReport | null
  maxCategories?: number
}

interface AggregatedCategory {
  categoryName: string
  categoryType: string
  budgetedAmount: number
  actualAmount: number
  transactionCount: number
  deviation: number
  deviationPercentage: number
}

/**
 * Deduplicates and aggregates categories with same name and type
 */
function deduplicateCategories(
  breakdowns: any[]
): AggregatedCategory[] {
  if (!breakdowns || breakdowns.length === 0) return []

  const categoryMap = new Map<string, AggregatedCategory>()

  for (const breakdown of breakdowns) {
    const key = `${breakdown.category_name}:${breakdown.category_type}`
    const existing = categoryMap.get(key)

    if (existing) {
      // Merge with existing
      existing.budgetedAmount += breakdown.budgeted_amount || 0
      existing.actualAmount += breakdown.actual_amount || 0
      existing.transactionCount += breakdown.transaction_count || 0
      existing.deviation += breakdown.deviation || 0
    } else {
      // Create new entry
      categoryMap.set(key, {
        categoryName: breakdown.category_name,
        categoryType: breakdown.category_type,
        budgetedAmount: breakdown.budgeted_amount || 0,
        actualAmount: breakdown.actual_amount || 0,
        transactionCount: breakdown.transaction_count || 0,
        deviation: breakdown.deviation || 0,
        deviationPercentage: breakdown.deviation_percentage || 0,
      })
    }
  }

  // Convert to array and recalculate deviation percentage
  let categories = Array.from(categoryMap.values()).map((cat) => ({
    ...cat,
    deviationPercentage:
      cat.budgetedAmount > 0
        ? ((cat.deviation / cat.budgetedAmount) * 100)
        : 0,
  }))

  // Filter: Remove categories with 0 transactions AND 0 actual amount
  categories = categories.filter(
    (cat) => cat.transactionCount > 0 || cat.actualAmount > 0
  )

  // Sort by absolute deviation (largest first)
  categories.sort(
    (a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)
  )

  return categories
}

/**
 * Get status badge for category
 */
function getCategoryStatus(category: AggregatedCategory): {
  label: string
  color: string
  icon: React.ReactNode
} {
  const { actualAmount, budgetedAmount, deviation } = category

  // For savings/investments, overspending is good
  const isSavingsCategory = category.categoryType === "savings"

  if (actualAmount > budgetedAmount) {
    if (isSavingsCategory) {
      return {
        label: `Over (+${Math.abs(category.deviationPercentage).toFixed(0)}%)`,
        color: "bg-green-500/10 text-green-400",
        icon: <TrendingUp className="h-4 w-4" />,
      }
    }
    return {
      label: `Over (+${Math.abs(category.deviationPercentage).toFixed(0)}%)`,
      color: "bg-red-500/10 text-red-400",
      icon: <TrendingUp className="h-4 w-4" />,
    }
  } else if (actualAmount < budgetedAmount) {
    return {
      label: `Under (-${Math.abs(category.deviationPercentage).toFixed(0)}%)`,
      color: "bg-green-500/10 text-green-400",
      icon: <TrendingDown className="h-4 w-4" />,
    }
  }

  return {
    label: "On Track (0%)",
    color: "bg-slate-500/10 text-slate-400",
    icon: <TrendingDown className="h-4 w-4" />,
  }
}

/**
 * Get color for category type
 */
function getCategoryTypeColor(
  type: string
): string {
  switch (type) {
    case "needs":
      return "from-blue-500 to-blue-600"
    case "wants":
      return "from-purple-500 to-purple-600"
    case "savings":
      return "from-green-500 to-green-600"
    default:
      return "from-slate-500 to-slate-600"
  }
}

export function SimplifiedCategoryBreakdown({
  report,
  maxCategories = 10,
}: SimplifiedCategoryBreakdownProps) {
  if (!report || !report.breakdowns) {
    return null
  }

  const categories = deduplicateCategories(report.breakdowns)
  const displayCategories = categories.slice(0, maxCategories)
  const hiddenCount = Math.max(0, categories.length - maxCategories)

  if (categories.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
        <p className="text-sm text-slate-400">No category data available yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
        <p className="text-sm text-slate-400">
          {categories.length} categories
        </p>
      </div>

      <div className="space-y-3">
        {displayCategories.map((category) => {
          const status = getCategoryStatus(category)
          const progress =
            category.budgetedAmount > 0
              ? (category.actualAmount / category.budgetedAmount) * 100
              : 0

          return (
            <div
              key={`${category.categoryName}-${category.categoryType}`}
              className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={`h-3 w-3 rounded-full bg-gradient-to-br ${getCategoryTypeColor(
                        category.categoryType
                      )}`}
                    />
                    <h4 className="font-medium text-white">
                      {category.categoryName}
                    </h4>
                    <span className="text-xs text-slate-500">
                      ({category.transactionCount} transactions)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 capitalize">
                    {category.categoryType}
                  </p>
                </div>

                <div className={`rounded-lg px-3 py-1 flex items-center gap-2 ${status.color}`}>
                  {status.icon}
                  <span className="text-xs font-medium">{status.label}</span>
                </div>
              </div>

              {/* Amount Row */}
              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Budgeted</p>
                  <p className="font-semibold text-white">
                    {formatINR(category.budgetedAmount, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Actual</p>
                  <p className="font-semibold text-white">
                    {formatINR(category.actualAmount, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Difference</p>
                  <p
                    className={`font-semibold ${
                      category.deviation > 0 ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {category.deviation > 0 ? "+" : ""}
                    {formatINR(category.deviation, 0)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress > 100 ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(progress, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {progress.toFixed(0)}% of budgeted amount
              </p>
            </div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-sm text-slate-400">
            +{hiddenCount} more categories with minimal spending
          </p>
        </div>
      )}
    </div>
  )
}
