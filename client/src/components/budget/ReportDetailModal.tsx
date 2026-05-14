"use client"

import { X } from "lucide-react"
import { BudgetReport } from "@/lib/api"
import { formatINR } from "@/lib/utils"

interface ReportDetailModalProps {
  report: BudgetReport
  budget: { name: string } | null
  onClose: () => void
}

export function ReportDetailModal({
  report,
  budget,
  onClose,
}: ReportDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatAmount = (amount: number) => formatINR(amount, 2)

  const getVarianceColor = (actual: number, budgeted: number) => {
    if (actual > budgeted) return "text-red-400" // Overspent
    if (actual < budgeted * 0.9) return "text-green-400" // Well under budget
    return "text-yellow-400" // Reasonable spending
  }

  const getVariancePercentage = (actual: number, budgeted: number): number => {
    if (budgeted === 0) return 0
    return ((actual - budgeted) / budgeted) * 100
  }

  const budgetedNeeds = report.budgeted_needs ?? 0
  const budgetedWants = report.budgeted_wants ?? 0
  const budgetedSavings = report.budgeted_savings ?? 0
  const actualNeeds = report.actual_needs ?? 0
  const actualWants = report.actual_wants ?? 0
  const actualSavings = report.actual_savings ?? 0
  const totalBudgeted = report.total_budgeted ?? 0
  const totalSpent = report.total_spent ?? 0

  const needsVariance = getVariancePercentage(actualNeeds, budgetedNeeds)
  const wantsVariance = getVariancePercentage(actualWants, budgetedWants)
  const savingsVariance = getVariancePercentage(actualSavings, budgetedSavings)

  const breakdowns = report.category_breakdown ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-8 px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#0f172a] p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Budget Report</h2>
            <p className="text-sm text-slate-400 mt-1">
              {budget?.name || "Budget"} •{" "}
              {formatDate(report.period_start)} to {formatDate(report.period_end)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Row */}
        <div className="mb-8 grid grid-cols-4 gap-4 rounded-lg bg-white/5 border border-white/10 p-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">
              Total Budgeted
            </p>
            <p className="text-lg font-bold text-white">
              {formatAmount(totalBudgeted)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">
              Total Spent
            </p>
            <p className="text-lg font-bold text-white">
              {formatAmount(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">
              Remaining
            </p>
            <p
              className={`text-lg font-bold ${
                totalSpent <= totalBudgeted
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {formatAmount(totalBudgeted - totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase mb-1">
              Status
            </p>
            <p
              className={`text-lg font-bold ${
                totalSpent <= totalBudgeted
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {totalSpent <= totalBudgeted ? "Under" : "Over"}
            </p>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="space-y-6">
          {/* NEEDS Section */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
            <div className="bg-blue-500/10 px-4 py-3 border-b border-blue-500/20">
              <h3 className="font-semibold text-blue-400">NEEDS (50%)</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Budgeted
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Actual
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdowns
                  .filter((b) => b.category_name && b.category_name.toLowerCase().includes("needs") ||
                    // Include any category under needs category type
                    report.budgeted_needs !== undefined && b.budgeted === budgetedNeeds / (breakdowns.filter(x => x.category_name?.toLowerCase().includes("needs")).length || 1)
                  )
                  .map((category) => (
                    <tr key={category.category_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-300">{category.category_name}</td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.budgeted)}
                      </td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.spent)}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium ${getVarianceColor(
                          category.spent,
                          category.budgeted
                        )}`}
                      >
                        {formatAmount(category.spent - category.budgeted)}
                        {" "}
                        ({getVariancePercentage(category.spent, category.budgeted).toFixed(0)}%)
                      </td>
                    </tr>
                  ))}
                <tr className="bg-blue-500/10 border-t border-blue-500/20 font-semibold">
                  <td className="px-4 py-3 text-blue-300">Total Needs</td>
                  <td className="text-right px-4 py-3 text-blue-300">
                    {formatAmount(budgetedNeeds)}
                  </td>
                  <td className="text-right px-4 py-3 text-blue-300">
                    {formatAmount(actualNeeds)}
                  </td>
                  <td
                    className={`text-right px-4 py-3 ${getVarianceColor(
                      actualNeeds,
                      budgetedNeeds
                    )}`}
                  >
                    {formatAmount(actualNeeds - budgetedNeeds)}
                    {" "}
                    ({needsVariance.toFixed(0)}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* WANTS Section */}
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 overflow-hidden">
            <div className="bg-purple-500/10 px-4 py-3 border-b border-purple-500/20">
              <h3 className="font-semibold text-purple-400">WANTS (30%)</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Budgeted
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Actual
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdowns
                  .filter((b) => b.category_name && b.category_name.toLowerCase().includes("wants"))
                  .map((category) => (
                    <tr key={category.category_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-300">{category.category_name}</td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.budgeted)}
                      </td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.spent)}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium ${getVarianceColor(
                          category.spent,
                          category.budgeted
                        )}`}
                      >
                        {formatAmount(category.spent - category.budgeted)}
                        {" "}
                        ({getVariancePercentage(category.spent, category.budgeted).toFixed(0)}%)
                      </td>
                    </tr>
                  ))}
                <tr className="bg-purple-500/10 border-t border-purple-500/20 font-semibold">
                  <td className="px-4 py-3 text-purple-300">Total Wants</td>
                  <td className="text-right px-4 py-3 text-purple-300">
                    {formatAmount(budgetedWants)}
                  </td>
                  <td className="text-right px-4 py-3 text-purple-300">
                    {formatAmount(actualWants)}
                  </td>
                  <td
                    className={`text-right px-4 py-3 ${getVarianceColor(
                      actualWants,
                      budgetedWants
                    )}`}
                  >
                    {formatAmount(actualWants - budgetedWants)}
                    {" "}
                    ({wantsVariance.toFixed(0)}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* SAVINGS Section */}
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 overflow-hidden">
            <div className="bg-green-500/10 px-4 py-3 border-b border-green-500/20">
              <h3 className="font-semibold text-green-400">SAVINGS & INVESTMENTS (20%)</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="text-left px-4 py-2 text-xs font-medium text-slate-400">
                    Category
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Budgeted
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Actual
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-slate-400">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdowns
                  .filter((b) => b.category_name && (b.category_name.toLowerCase().includes("saving") || b.category_name.toLowerCase().includes("investment")))
                  .map((category) => (
                    <tr key={category.category_id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-slate-300">{category.category_name}</td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.budgeted)}
                      </td>
                      <td className="text-right px-4 py-3 text-white">
                        {formatAmount(category.spent)}
                      </td>
                      <td
                        className={`text-right px-4 py-3 font-medium ${getVarianceColor(
                          category.spent,
                          category.budgeted
                        )}`}
                      >
                        {formatAmount(category.spent - category.budgeted)}
                        {" "}
                        ({getVariancePercentage(category.spent, category.budgeted).toFixed(0)}%)
                      </td>
                    </tr>
                  ))}
                <tr className="bg-green-500/10 border-t border-green-500/20 font-semibold">
                  <td className="px-4 py-3 text-green-300">Total Savings</td>
                  <td className="text-right px-4 py-3 text-green-300">
                    {formatAmount(budgetedSavings)}
                  </td>
                  <td className="text-right px-4 py-3 text-green-300">
                    {formatAmount(actualSavings)}
                  </td>
                  <td
                    className={`text-right px-4 py-3 ${getVarianceColor(
                      actualSavings,
                      budgetedSavings
                    )}`}
                  >
                    {formatAmount(actualSavings - budgetedSavings)}
                    {" "}
                    ({savingsVariance.toFixed(0)}%)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-green-500/20 px-6 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
