"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { GoalUpdate } from "@/lib/api"
import { useGoal } from "@/hooks/use-goals"
import { GoalEditForm } from "@/components/goals/goal-edit-form"
import { GoalStatusActions } from "@/components/goals/goal-status-actions"

export default function EditGoalPage() {
  const params = useParams()
  const router = useRouter()
  const goalId = params.id as string

  const { goal, isLoading, error, updateGoal } = useGoal(goalId)

  const handleSubmit = async (updates: GoalUpdate) => {
    await updateGoal(goalId, updates)
    router.push(`/goals/${goalId}`)
  }

  const handleStatusChange = async (status: "active" | "paused" | "completed" | "cancelled") => {
    await updateGoal(goalId, { status })
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

  return (
    <div className="p-6 pb-12">
      <div className="mb-8">
        <Link
          href={`/goals/${goalId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Goal
        </Link>

        <h1 className="text-2xl font-bold">Edit Goal</h1>
        <p className="text-slate-400">Update details, progress inputs, and status for this goal.</p>
      </div>

      <div className="mb-6 max-w-2xl">
        <GoalStatusActions currentStatus={goal.status} onChangeStatus={handleStatusChange} />
      </div>

      <GoalEditForm goal={goal} onSubmit={handleSubmit} onCancel={() => router.push(`/goals/${goalId}`)} />
    </div>
  )
}
