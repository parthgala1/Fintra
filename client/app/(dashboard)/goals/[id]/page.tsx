"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { 
  Target, 
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Plus,
  AlertCircle,
  CheckCircle2,
  Edit,
  Trash2
} from "lucide-react"
import { useGoal } from "@/hooks/use-goals"

export default function GoalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.id as string
  
  const { goal, analysis, isLoading, error, recordContribution, deleteGoal } = useGoal(goalId)

  const [showContributionModal, setShowContributionModal] = useState(false)
  const [contributionAmount, setContributionAmount] = useState<number>(0)
  const [contributionDate, setContributionDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "No deadline"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })
  }

  const handleContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (contributionAmount <= 0) {
      setSubmitError("Contribution amount must be greater than 0")
      return
    }

    setIsSubmitting(true)

    try {
      await recordContribution(goalId, contributionAmount, contributionDate)
      setShowContributionModal(false)
      setContributionAmount(0)
      setContributionDate(new Date().toISOString().split("T")[0])
    } catch (err: any) {
      setSubmitError(err.message || "Failed to record contribution")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this goal? This action cannot be undone.")) {
      return
    }

    try {
      await deleteGoal(goalId)
      router.push("/goals")
    } catch (err: any) {
      alert(err.message || "Failed to delete goal")
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (error || !goal) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error || "Goal not found"}
        </div>
      </div>
    )
  }

  const progress = goal.progress_percentage || 0
  const remainingAmount = goal.target_amount - goal.current_amount

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/20"
      case "medium":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20"
      default:
        return "text-slate-400 bg-slate-500/10 border-slate-500/20"
    }
  }

  return (
    <div className="p-6 pb-12">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/goals" 
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Goals
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{goal.name}</h1>
              {goal.status === "completed" && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </span>
              )}
            </div>
            {goal.description && (
              <p className="text-slate-400">{goal.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/goals/${goalId}/edit`)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-white/10"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-2xl font-bold text-white">{progress.toFixed(1)}%</span>
        </div>
        
        <div className="h-4 rounded-full bg-slate-700 overflow-hidden mb-4">
          <div 
            className={`h-full transition-all duration-300 ${
              progress >= 75 ? "bg-green-500" :
              progress >= 50 ? "bg-blue-500" :
              progress >= 25 ? "bg-yellow-500" :
              "bg-red-500"
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400 mb-1">Current</p>
            <p className="text-lg font-semibold text-white">{formatAmount(goal.current_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Remaining</p>
            <p className="text-lg font-semibold text-white">{formatAmount(remainingAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Target</p>
            <p className="text-lg font-semibold text-white">{formatAmount(goal.target_amount)}</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowContributionModal(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400"
          >
            <Plus className="h-4 w-4" />
            Record Contribution
          </button>
        </div>
      </div>

      {/* Analysis Section */}
      {analysis && (
        <div className="mb-6 grid gap-6 md:grid-cols-2">
          {/* Feasibility Analysis */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4">Feasibility Analysis</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Required Monthly</span>
                <span className="font-semibold text-white">{formatAmount(analysis.required_monthly)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Current Contribution</span>
                <span className="font-semibold text-white">{formatAmount(analysis.current_contribution)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Gap</span>
                <span className={`font-semibold ${analysis.gap > 0 ? "text-red-400" : "text-green-400"}`}>
                  {analysis.gap > 0 ? "-" : "+"}{formatAmount(Math.abs(analysis.gap))}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Feasibility</span>
                <span className={`font-semibold ${
                  analysis.feasibility_percentage >= 100 ? "text-green-400" :
                  analysis.feasibility_percentage >= 75 ? "text-blue-400" :
                  analysis.feasibility_percentage >= 50 ? "text-yellow-400" :
                  "text-red-400"
                }`}>
                  {analysis.feasibility_percentage.toFixed(0)}%
                </span>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg border ${getRiskColor(analysis.risk_level)}`}>
                <span className="text-sm font-medium">Risk Level</span>
                <span className="font-semibold capitalize">{analysis.risk_level}</span>
              </div>
            </div>
          </div>

          {/* Timeline Analysis */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold mb-4">Timeline</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Target Date</span>
                <span className="font-semibold text-white">{formatDate(goal.target_date)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <span className="text-sm text-slate-400">Months Remaining</span>
                <span className="font-semibold text-white">{analysis.months_remaining} months</span>
              </div>
              
              {analysis.projected_completion_date && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm text-slate-400">Projected Completion</span>
                  <span className="font-semibold text-white">{formatDate(analysis.projected_completion_date)}</span>
                </div>
              )}
              
              <div className={`p-4 rounded-lg ${
                analysis.is_on_track 
                  ? "bg-green-500/10 border border-green-500/20" 
                  : "bg-red-500/10 border border-red-500/20"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {analysis.is_on_track ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  <span className={`font-semibold ${analysis.is_on_track ? "text-green-400" : "text-red-400"}`}>
                    {analysis.is_on_track ? "On Track" : "Behind Schedule"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {analysis.is_on_track 
                    ? "Your current contribution rate is sufficient to meet your goal."
                    : `You need to increase your monthly contribution by ${formatAmount(analysis.gap)} to stay on track.`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Details */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="text-lg font-semibold mb-4">Goal Details</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-slate-400 mb-1">Type</p>
            <p className="font-semibold text-white capitalize">{goal.goal_type.replace(/_/g, " ")}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-slate-400 mb-1">Priority</p>
            <p className="font-semibold text-white capitalize">{goal.priority}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-slate-400 mb-1">Created</p>
            <p className="font-semibold text-white">{formatDate(goal.created_at)}</p>
          </div>
          
          <div className="p-3 rounded-lg bg-white/5">
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <p className="font-semibold text-white capitalize">{goal.status}</p>
          </div>
        </div>
      </div>

      {/* Contribution Modal */}
      {showContributionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#020617] p-6">
            <h2 className="text-xl font-bold mb-4">Record Contribution</h2>
            
            {submitError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {submitError}
              </div>
            )}

            <form onSubmit={handleContribution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Amount (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={contributionAmount || ""}
                  onChange={(e) => setContributionAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  min="0"
                  step="100"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={contributionDate}
                  onChange={(e) => setContributionDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3 mt-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Record
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowContributionModal(false)
                    setSubmitError(null)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
