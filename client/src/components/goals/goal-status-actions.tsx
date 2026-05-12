"use client"

import { CheckCircle2, Loader2, PauseCircle, PlayCircle, XCircle } from "lucide-react"

type GoalStatus = "active" | "paused" | "completed" | "cancelled"

interface GoalStatusActionsProps {
  currentStatus: string
  onChangeStatus: (nextStatus: GoalStatus) => Promise<void>
}

export function GoalStatusActions({ currentStatus, onChangeStatus }: GoalStatusActionsProps) {
  const isCurrent = (status: GoalStatus) => currentStatus === status

  const actions: Array<{ status: GoalStatus; label: string; icon: React.ReactNode; className: string }> = [
    {
      status: "active",
      label: "Mark Active",
      icon: <PlayCircle className="h-4 w-4" />,
      className: "border-blue-500/20 bg-blue-500/5 text-blue-300 hover:bg-blue-500/10",
    },
    {
      status: "paused",
      label: "Mark Paused",
      icon: <PauseCircle className="h-4 w-4" />,
      className: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300 hover:bg-yellow-500/10",
    },
    {
      status: "completed",
      label: "Mark Complete",
      icon: <CheckCircle2 className="h-4 w-4" />,
      className: "border-green-500/20 bg-green-500/5 text-green-300 hover:bg-green-500/10",
    },
    {
      status: "cancelled",
      label: "Mark Cancelled",
      icon: <XCircle className="h-4 w-4" />,
      className: "border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10",
    },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <h2 className="text-lg font-semibold mb-4">Quick Status Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <button
            key={action.status}
            type="button"
            disabled={isCurrent(action.status)}
            onClick={() => onChangeStatus(action.status)}
            className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
          >
            {action.icon}
            {isCurrent(action.status) ? "Current" : action.label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Current status: <span className="capitalize text-white">{currentStatus}</span>
      </p>
    </div>
  )
}
