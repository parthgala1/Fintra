"use client"

import { useState } from "react"
import { unstable_noStore as noStore } from "next/cache"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  Target, 
  ArrowLeft,
  Loader2
} from "lucide-react"
import { useGoals } from "@/hooks/use-goals"
import { GoalCreate } from "@/lib/api"

export default function CreateGoalPage() {
  noStore()
  const router = useRouter()
  const { createGoal } = useGoals()

  const [formData, setFormData] = useState<GoalCreate>({
    name: "",
    description: "",
    goal_type: "savings",
    target_amount: 0,
    current_amount: 0,
    target_date: "",
    monthly_contribution: 0,
    priority: "medium",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError("Goal name is required")
      return
    }

    if (formData.target_amount <= 0) {
      setError("Target amount must be greater than 0")
      return
    }

    setIsSubmitting(true)

    try {
      const goal = await createGoal(formData)
      router.push(`/goals/${goal.id}`)
    } catch (err: any) {
      setError(err.message || "Failed to create goal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  return (
    <div className="p-6 pb-12">
      {/* Page Header */}
      <div className="mb-8">
        <Link 
          href="/goals" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        <h1 className="text-2xl font-bold">Create New Goal</h1>
        <p className="text-slate-400">Set up a new financial goal and track your progress.</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic Info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Goal Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Emergency Fund, MacBook Pro, Dream Vacation"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add details about this goal..."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Goal Type
                </label>
                <select
                  value={formData.goal_type}
                  onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="savings">Savings</option>
                  <option value="emergency_fund">Emergency Fund</option>
                  <option value="retirement">Retirement</option>
                  <option value="purchase">Purchase</option>
                  <option value="investment">Investment</option>
                  <option value="debt_payoff">Debt Payoff</option>
                  <option value="education">Education</option>
                  <option value="travel">Travel</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Details */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold mb-4">Financial Details</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Amount (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.target_amount || ""}
                  onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                />
                {formData.target_amount > 0 && (
                  <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.target_amount)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Amount (₹)
                </label>
                <input
                  type="number"
                  value={formData.current_amount || ""}
                  onChange={(e) => setFormData({ ...formData, current_amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="1000"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                {(formData.current_amount || 0) > 0 && (
                  <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.current_amount || 0)}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.target_date || ""}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Monthly Contribution (₹)
                </label>
                <input
                  type="number"
                  value={formData.monthly_contribution || ""}
                  onChange={(e) => setFormData({ ...formData, monthly_contribution: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  min="0"
                  step="500"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                {(formData.monthly_contribution || 0) > 0 && (
                  <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.monthly_contribution || 0)}/month</p>
                )}
              </div>
            </div>

            {/* Progress Preview */}
            {formData.target_amount > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300">Initial Progress</span>
                  <span className="text-sm font-semibold text-white">
                    {((formData.current_amount || 0) / formData.target_amount * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${Math.min((formData.current_amount || 0) / formData.target_amount * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {formatAmount(formData.current_amount || 0)} of {formatAmount(formData.target_amount)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Target className="h-4 w-4" />
                Create Goal
              </>
            )}
          </button>
          
          <Link
            href="/goals"
            className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
