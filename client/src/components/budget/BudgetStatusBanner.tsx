"use client"

import { Budget, BudgetReport } from "@/lib/api"
import { formatINR } from "@/lib/utils"
import {
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Zap,
} from "lucide-react"

interface BudgetStatusBannerProps {
  budget: Budget | null
  report: BudgetReport | null
}

interface StatusInfo {
  status: "on_track" | "overspent" | "underspent"
  title: string
  message: string
  icon: React.ReactNode
  color: string // Tailwind color class
  backgroundColor: string
  borderColor: string
  percentageUsed: number
}

function calculateStatus(budget: Budget | null, report: BudgetReport | null): StatusInfo {
  if (!budget || !report) {
    return {
      status: "on_track",
      title: "Loading...",
      message: "Calculating your budget status",
      icon: <Zap className="h-6 w-6" />,
      color: "text-slate-400",
      backgroundColor: "bg-slate-500/10",
      borderColor: "border-slate-500/20",
      percentageUsed: 0,
    }
  }

  const totalSpent = report.total_spent || 0
  const totalBudgeted = report.total_budgeted || budget.total_amount || 0
  const percentageUsed = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0

  // Status logic:
  // - Overspent: > 100% of budget used
  // - Underspent: < 20% of budget used (not enough spending)
  // - On track: 20-100% of budget used

  if (percentageUsed > 100) {
    return {
      status: "overspent",
      title: "⚠️ Over Budget",
      message: `You've spent ₹${formatINR(totalSpent, 0)} of ₹${formatINR(totalBudgeted, 0)} budgeted (${percentageUsed.toFixed(0)}%).`,
      icon: <AlertCircle className="h-6 w-6" />,
      color: "text-red-400",
      backgroundColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      percentageUsed,
    }
  } else if (percentageUsed < 20 && totalSpent > 0) {
    return {
      status: "underspent",
      title: "💤 Underspent",
      message: `You've spent ₹${formatINR(totalSpent, 0)} of ₹${formatINR(totalBudgeted, 0)} budgeted (${percentageUsed.toFixed(0)}%). Consider if your budget needs adjustment.`,
      icon: <TrendingDown className="h-6 w-6" />,
      color: "text-yellow-400",
      backgroundColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      percentageUsed,
    }
  }

  // On track
  const remaining = totalBudgeted - totalSpent
  return {
    status: "on_track",
    title: "✅ You're On Track",
    message: `You've spent ₹${formatINR(totalSpent, 0)} of ₹${formatINR(totalBudgeted, 0)} budgeted (${percentageUsed.toFixed(0)}%). ₹${formatINR(remaining, 0)} remaining.`,
    icon: <CheckCircle className="h-6 w-6" />,
    color: "text-green-400",
    backgroundColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    percentageUsed,
  }
}

export function BudgetStatusBanner({ budget, report }: BudgetStatusBannerProps) {
  const status = calculateStatus(budget, report)

  return (
    <div
      className={`rounded-2xl border ${status.borderColor} ${status.backgroundColor} p-6 backdrop-blur-sm mb-8`}
    >
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${status.color}`}>{status.icon}</div>
        <div className="flex-1">
          <h2 className={`text-xl font-bold mb-1 ${status.color}`}>{status.title}</h2>
          <p className="text-sm text-slate-300 mb-4">{status.message}</p>

          {/* Progress Bar */}
          <div className="w-full bg-slate-700/50 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status.status === "overspent"
                  ? "bg-red-500"
                  : status.status === "underspent"
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(status.percentageUsed, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {status.percentageUsed.toFixed(0)}% of monthly budget used
          </p>
        </div>
      </div>
    </div>
  )
}
