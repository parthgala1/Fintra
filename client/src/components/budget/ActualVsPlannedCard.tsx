"use client"

import { formatINR } from "@/lib/utils"
import { Calendar } from "lucide-react"

interface ActualVsPlannedCardProps {
  actual: {
    needs: number
    wants: number
    savings: number
    income: number
    transactionCount: number
  }
  planned?: {
    needs: number
    wants: number
    savings: number
  }
  periodStart: Date
  periodEnd: Date
}

export function ActualVsPlannedCard({
  actual,
  planned,
  periodStart,
  periodEnd,
}: ActualVsPlannedCardProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
  }

  const actualNeedsPercentage = actual.income > 0 ? (actual.needs / actual.income) * 100 : 0
  const actualWantsPercentage = actual.income > 0 ? (actual.wants / actual.income) * 100 : 0
  const actualSavingsPercentage = actual.income > 0 ? (actual.savings / actual.income) * 100 : 0

  const plannedNeedsPercentage = planned ? (planned.needs / actual.income) * 100 : actualNeedsPercentage
  const plannedWantsPercentage = planned ? (planned.wants / actual.income) * 100 : actualWantsPercentage
  const plannedSavingsPercentage = planned ? (planned.savings / actual.income) * 100 : actualSavingsPercentage

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-white">YOUR ACTUAL SPENDING vs PLANNED BUDGET</h3>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Calendar className="h-4 w-4" />
          <span>
            Based on {actual.transactionCount} transactions from {formatDate(periodStart)} to {formatDate(periodEnd)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left font-semibold text-slate-400">Category</th>
              <th colSpan={2} className="px-4 py-3 text-center font-semibold text-slate-400">
                Actual (Last 3 months)
              </th>
              {planned && (
                <th colSpan={2} className="px-4 py-3 text-center font-semibold text-slate-400">
                  Proposed Budget
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Needs Row */}
            <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="font-medium text-white">Needs</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <p className="font-semibold text-white">{formatINR(actual.needs, 0)}</p>
                <p className="text-xs text-slate-500">{actualNeedsPercentage.toFixed(1)}%</p>
              </td>
              <td className="px-4 py-4">
                <PercentageBar percentage={actualNeedsPercentage} color="bg-blue-500" />
              </td>
              {planned && (
                <>
                  <td className="px-4 py-4 text-right">
                    <p className="font-semibold text-white">{formatINR(planned.needs, 0)}</p>
                    <p className="text-xs text-slate-500">{plannedNeedsPercentage.toFixed(1)}%</p>
                  </td>
                  <td className="px-4 py-4">
                    <PercentageBar percentage={plannedNeedsPercentage} color="bg-blue-500" />
                  </td>
                </>
              )}
            </tr>

            {/* Wants Row */}
            <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="font-medium text-white">Wants</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <p className="font-semibold text-white">{formatINR(actual.wants, 0)}</p>
                <p className="text-xs text-slate-500">{actualWantsPercentage.toFixed(1)}%</p>
              </td>
              <td className="px-4 py-4">
                <PercentageBar percentage={actualWantsPercentage} color="bg-purple-500" />
              </td>
              {planned && (
                <>
                  <td className="px-4 py-4 text-right">
                    <p className="font-semibold text-white">{formatINR(planned.wants, 0)}</p>
                    <p className="text-xs text-slate-500">{plannedWantsPercentage.toFixed(1)}%</p>
                  </td>
                  <td className="px-4 py-4">
                    <PercentageBar percentage={plannedWantsPercentage} color="bg-purple-500" />
                  </td>
                </>
              )}
            </tr>

            {/* Savings Row */}
            <tr className="hover:bg-white/5 transition-colors">
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="font-medium text-white">Savings</span>
                </div>
              </td>
              <td className="px-4 py-4 text-right">
                <p className="font-semibold text-white">{formatINR(actual.savings, 0)}</p>
                <p className="text-xs text-slate-500">{actualSavingsPercentage.toFixed(1)}%</p>
              </td>
              <td className="px-4 py-4">
                <PercentageBar percentage={actualSavingsPercentage} color="bg-green-500" />
              </td>
              {planned && (
                <>
                  <td className="px-4 py-4 text-right">
                    <p className="font-semibold text-white">{formatINR(planned.savings, 0)}</p>
                    <p className="text-xs text-slate-500">{plannedSavingsPercentage.toFixed(1)}%</p>
                  </td>
                  <td className="px-4 py-4">
                    <PercentageBar percentage={plannedSavingsPercentage} color="bg-green-500" />
                  </td>
                </>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface PercentageBarProps {
  percentage: number
  color: string
}

function PercentageBar({ percentage, color }: PercentageBarProps) {
  return (
    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-700">
      <div
        className={`h-full ${color} transition-all`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  )
}
