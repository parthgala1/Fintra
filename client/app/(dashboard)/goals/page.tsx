"use client"

import Link from "next/link"
import { 
  Target, 
  Plus,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { useGoals } from "@/hooks/use-goals"

export default function GoalsPage() {
  const { goals, isLoading, error } = useGoals()

  const formatAmount = (amount: number) => {
    // Defensive check: ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) {
      return `₹0`
    }
    return `₹${numAmount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "No deadline"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
  }

  // Calculate summary stats
  const activeGoals = goals.filter(g => g.status === "active")
  const completedGoals = goals.filter(g => g.status === "completed")
  const onTrackGoals = activeGoals.filter(g => g.progress_percentage >= 50)
  const atRiskGoals = activeGoals.filter(g => g.progress_percentage < 30)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-500/50 bg-green-500/10"
      case "active":
        return "border-blue-500/50 bg-blue-500/5"
      case "paused":
        return "border-yellow-500/50 bg-yellow-500/5"
      case "cancelled":
        return "border-red-500/50 bg-red-500/5"
      default:
        return "border-white/10"
    }
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500"
    if (progress >= 50) return "bg-blue-500"
    if (progress >= 25) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="p-6 pb-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-slate-400">Track your financial goals and make them reality.</p>
        </div>
        <Link
          href="/goals/create"
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Create Goal
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : goals.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mx-auto mb-4">
            <Target className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No goals yet</h2>
          <p className="text-slate-400 mb-6">Create your first goal to start saving with purpose.</p>
          <Link
            href="/goals/create"
            className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Goal
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-slate-400">Active Goals</p>
              <p className="text-2xl font-bold text-white">{activeGoals.length}</p>
            </div>
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-green-400">On Track</p>
              <p className="text-2xl font-bold text-white">{onTrackGoals.length}</p>
            </div>
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-red-400">At Risk</p>
              <p className="text-2xl font-bold text-white">{atRiskGoals.length}</p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 backdrop-blur-sm">
              <p className="text-sm text-blue-400">Completed</p>
              <p className="text-2xl font-bold text-white">{completedGoals.length}</p>
            </div>
          </div>

          {/* Goals Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => {
              const progress = goal.progress_percentage || 0
              const progressColor = getProgressColor(progress)
              
              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className={`group rounded-2xl border p-6 backdrop-blur-sm transition-all hover:bg-white/10 cursor-pointer ${getStatusColor(goal.status)}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors mb-1">
                        {goal.name}
                      </h3>
                      {goal.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">{goal.description}</p>
                      )}
                    </div>
                    <div className="ml-2">
                      {goal.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400" />
                      ) : progress < 30 ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400">Progress</span>
                      <span className="text-sm font-semibold text-white">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                      <div 
                        className={`h-full ${progressColor} transition-all duration-300`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-slate-400 mb-1">Current</p>
                      <p className="text-sm font-semibold text-white">{formatAmount(goal.current_amount)}</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3">
                      <p className="text-xs text-slate-400 mb-1">Target</p>
                      <p className="text-sm font-semibold text-white">{formatAmount(goal.target_amount)}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400 capitalize">{goal.goal_type.replace(/_/g, " ")}</span>
                    <span className="text-slate-400">{formatDate(goal.target_date)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
