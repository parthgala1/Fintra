"use client"

import Link from "next/link"
import { 
  TrendingUp, 
  Plus,
  Settings,
  Loader2,
  Star
} from "lucide-react"
import { useBudgets } from "@/hooks/use-budgets"

export default function BudgetsPage() {
  const { budgets, defaultBudget, isLoading, error } = useBudgets()

  const formatAmount = (amount: number) => {
    // Defensive check: ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) {
      return `₹0`
    }
    return `₹${numAmount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" })
  }

  return (
    <div className="p-6 pb-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Budgets</h1>
          <p className="text-slate-400">Manage your spending with smart budgets.</p>
        </div>
        <Link
          href="/budgets/create"
          className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Analyze & Create Budget
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
      ) : budgets.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 mx-auto mb-4">
            <Settings className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No budgets yet</h2>
          <p className="text-slate-400 mb-6">Create your first budget to start tracking your spending.</p>
          <Link
            href="/budgets/create"
            className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Analyze & Create Budget
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Link
              key={budget.id}
              href={`/budgets/${budget.id}`}
              className={`group rounded-2xl border bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10 cursor-pointer ${
                budget.is_default 
                  ? "border-green-500/50" 
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
                      {budget.name}
                    </h3>
                    {budget.is_default && (
                      <Star className="h-4 w-4 text-green-400 fill-green-400" />
                    )}
                  </div>
                  <p className="text-sm text-slate-400 capitalize">{budget.period} • {budget.type}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-white">{formatAmount(budget.total_amount)}</p>
                  <p className="text-xs text-slate-500">Total Budget</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex h-2 rounded-full overflow-hidden bg-slate-700">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${budget.needs_percentage}%` }}
                  />
                  <div 
                    className="bg-purple-500" 
                    style={{ width: `${budget.wants_percentage}%` }}
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${budget.savings_percentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <p className="text-xs text-blue-400 font-medium">Needs</p>
                  <p className="text-sm font-semibold text-white">{budget.needs_percentage}%</p>
                  <p className="text-xs text-slate-400">{formatAmount(budget.needs_amount)}</p>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <p className="text-xs text-purple-400 font-medium">Wants</p>
                  <p className="text-sm font-semibold text-white">{budget.wants_percentage}%</p>
                  <p className="text-xs text-slate-400">{formatAmount(budget.wants_amount)}</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-2">
                  <p className="text-xs text-green-400 font-medium">Savings</p>
                  <p className="text-sm font-semibold text-white">{budget.savings_percentage}%</p>
                  <p className="text-xs text-slate-400">{formatAmount(budget.savings_amount)}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
                <span>Started {formatDate(budget.start_date)}</span>
                {budget.end_date && <span>Ends {formatDate(budget.end_date)}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {budgets.length > 0 && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Total Budgets</p>
            <p className="text-2xl font-bold text-white">{budgets.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Default Budget</p>
            <p className="text-2xl font-bold text-green-400">
              {defaultBudget?.name || "None"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <p className="text-sm text-slate-400">Total Monthly Budget</p>
            <p className="text-2xl font-bold text-white">
              {formatAmount(
                budgets.reduce((acc, b) => {
                  const amount = typeof b.total_amount === 'number' ? b.total_amount : 0
                  return acc + amount
                }, 0)
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}