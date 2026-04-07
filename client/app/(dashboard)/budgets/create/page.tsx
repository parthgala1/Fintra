"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  TrendingUp, 
  ArrowLeft,
  Loader2,
  Calculator
} from "lucide-react"
import { useBudgets } from "@/hooks/use-budgets"
import { CreateBudgetData } from "@/lib/api"
import { formatINR } from "@/lib/utils"

export default function CreateBudgetPage() {
  const router = useRouter()
  const { createBudget } = useBudgets()

  const [formData, setFormData] = useState<CreateBudgetData>({
    name: "",
    type: "50/30/20",
    period: "monthly",
    total_amount: 0,
    needs_percentage: 50,
    wants_percentage: 30,
    savings_percentage: 20,
    start_date: new Date().toISOString().split("T")[0],
    is_default: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculate amounts based on percentages
  const needsAmount = Math.round(formData.total_amount * ((formData.needs_percentage ?? 50) / 100))
  const wantsAmount = Math.round(formData.total_amount * ((formData.wants_percentage ?? 30) / 100))
  const savingsAmount = Math.round(formData.total_amount * ((formData.savings_percentage ?? 20) / 100))
  const totalPercentage = (formData.needs_percentage ?? 50) + (formData.wants_percentage ?? 30) + (formData.savings_percentage ?? 20)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (totalPercentage !== 100) {
      setError("Percentages must add up to 100%")
      return
    }

    if (!formData.name.trim()) {
      setError("Budget name is required")
      return
    }

    if (formData.total_amount <= 0) {
      setError("Total amount must be greater than 0")
      return
    }

    setIsSubmitting(true)

    try {
      const budget = await createBudget(formData)
      router.push(`/budgets/${budget.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create budget")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTypeChange = (type: "50/30/20" | "custom") => {
    if (type === "50/30/20") {
      setFormData(prev => ({
        ...prev,
        type,
        needs_percentage: 50,
        wants_percentage: 30,
        savings_percentage: 20,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        type,
      }))
    }
  }

  const formatAmount = (amount: number) => {
    return formatINR(amount, 0)
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-5 w-5 text-[#020617]" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Fintra</span>
            </Link>
          </div>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/transactions" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Transactions</Link>
            <Link href="/budgets" className="text-sm font-medium text-green-400">Budget</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/budgets" className="text-sm text-slate-400 hover:text-white transition-colors">
              Back to Budgets
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-2xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <Link 
              href="/budgets" 
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Budgets
            </Link>
            <h1 className="text-2xl font-bold">Create New Budget</h1>
            <p className="text-slate-400">Set up a new budget to track your spending.</p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Budget Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Budget"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Budget Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => handleTypeChange(e.target.value as "50/30/20" | "custom")}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="50/30/20">50/30/20 Rule</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Period
                    </label>
                    <select
                      value={formData.period}
                      onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Total Budget Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.total_amount || ""}
                    onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                    placeholder="Enter amount"
                    min="0"
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-green-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-slate-300">
                    Set as default budget
                  </label>
                </div>
              </div>
            </div>

            {/* Allocation */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Budget Allocation</h2>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  totalPercentage === 100 
                    ? "bg-green-500/10 text-green-400" 
                    : "bg-red-500/10 text-red-400"
                }`}>
                  <Calculator className="h-4 w-4" />
                  {totalPercentage}%
                </div>
              </div>

              <div className="space-y-6">
                {/* Needs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-blue-400">Needs (50%)</label>
                    <span className="text-sm text-slate-300">{formatAmount(needsAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.needs_percentage}
                    onChange={(e) => setFormData({ ...formData, needs_percentage: Number(e.target.value) })}
                    disabled={formData.type === "50/30/20"}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0%</span>
                    <span>{formData.needs_percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Wants */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-purple-400">Wants (30%)</label>
                    <span className="text-sm text-slate-300">{formatAmount(wantsAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.wants_percentage}
                    onChange={(e) => setFormData({ ...formData, wants_percentage: Number(e.target.value) })}
                    disabled={formData.type === "50/30/20"}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0%</span>
                    <span>{formData.wants_percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Savings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-green-400">Savings (20%)</label>
                    <span className="text-sm text-slate-300">{formatAmount(savingsAmount)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.savings_percentage}
                    onChange={(e) => setFormData({ ...formData, savings_percentage: Number(e.target.value) })}
                    disabled={formData.type === "50/30/20"}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>0%</span>
                    <span>{formData.savings_percentage}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Visual Breakdown */}
              <div className="mt-6">
                <div className="flex h-4 rounded-full overflow-hidden bg-slate-700">
                  <div 
                    className="bg-blue-500" 
                    style={{ width: `${formData.needs_percentage}%` }}
                  />
                  <div 
                    className="bg-purple-500" 
                    style={{ width: `${formData.wants_percentage}%` }}
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${formData.savings_percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating Budget...
                </>
              ) : (
                <>
                  Create Budget
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
