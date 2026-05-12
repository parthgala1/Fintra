"use client"

import { useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"
import { Goal, GoalUpdate } from "@/lib/api"

interface GoalEditFormProps {
  goal: Goal
  onSubmit: (data: GoalUpdate) => Promise<void>
  onCancel: () => void
}

type GoalFormState = {
  name: string
  description: string
  goal_type: string
  target_amount: number
  current_amount: number
  target_date: string
  monthly_contribution: number
  priority: string
  status: string
}

function normalizeDate(dateString?: string): string {
  if (!dateString) return ""
  return new Date(dateString).toISOString().split("T")[0]
}

function normalizeNumber(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return 0
}

export function GoalEditForm({ goal, onSubmit, onCancel }: GoalEditFormProps) {
  const [formData, setFormData] = useState<GoalFormState>({
    name: goal.name,
    description: goal.description || "",
    goal_type: goal.goal_type,
    target_amount: normalizeNumber(goal.target_amount),
    current_amount: normalizeNumber(goal.current_amount),
    target_date: normalizeDate(goal.target_date),
    monthly_contribution: normalizeNumber(goal.monthly_contribution),
    priority: goal.priority,
    status: goal.status,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialSnapshot = useMemo(
    () => ({
      name: goal.name,
      description: goal.description || "",
      goal_type: goal.goal_type,
      target_amount: normalizeNumber(goal.target_amount),
      current_amount: normalizeNumber(goal.current_amount),
      target_date: normalizeDate(goal.target_date),
      monthly_contribution: normalizeNumber(goal.monthly_contribution),
      priority: goal.priority,
      status: goal.status,
    }),
    [goal]
  )

  const formatAmount = (amount: number) => `₹${amount.toLocaleString("en-IN")}`

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

    if (formData.current_amount < 0 || formData.monthly_contribution < 0) {
      setError("Current and monthly contribution amounts cannot be negative")
      return
    }

    const updates: GoalUpdate = {}

    if (formData.name !== initialSnapshot.name) updates.name = formData.name
    if ((formData.description || "") !== (initialSnapshot.description || "")) updates.description = formData.description || undefined
    if (formData.goal_type !== initialSnapshot.goal_type) updates.goal_type = formData.goal_type
    if (formData.target_amount !== initialSnapshot.target_amount) updates.target_amount = formData.target_amount
    if (formData.current_amount !== initialSnapshot.current_amount) updates.current_amount = formData.current_amount
    if ((formData.target_date || "") !== (initialSnapshot.target_date || "")) updates.target_date = formData.target_date || undefined
    if (formData.monthly_contribution !== initialSnapshot.monthly_contribution) updates.monthly_contribution = formData.monthly_contribution
    if (formData.priority !== initialSnapshot.priority) updates.priority = formData.priority
    if (formData.status !== initialSnapshot.status) updates.status = formData.status

    if (Object.keys(updates).length === 0) {
      onCancel()
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(updates)
    } catch (err: any) {
      setError(err?.message || "Failed to update goal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Goal Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Goal Type</label>
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
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4">Financial Details</h2>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Amount (₹)</label>
              <input
                type="number"
                value={formData.target_amount || ""}
                onChange={(e) => setFormData({ ...formData, target_amount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="1000"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {formData.target_amount > 0 && (
                <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.target_amount)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Current Amount (₹)</label>
              <input
                type="number"
                value={formData.current_amount || ""}
                onChange={(e) => setFormData({ ...formData, current_amount: parseFloat(e.target.value) || 0 })}
                min="0"
                step="1000"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.current_amount || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Target Date</label>
              <input
                type="date"
                value={formData.target_date || ""}
                onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Monthly Contribution (₹)</label>
              <input
                type="number"
                value={formData.monthly_contribution || ""}
                onChange={(e) => setFormData({ ...formData, monthly_contribution: parseFloat(e.target.value) || 0 })}
                min="0"
                step="500"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-slate-400">{formatAmount(formData.monthly_contribution || 0)}/month</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
