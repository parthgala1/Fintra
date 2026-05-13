"use client"

import { Budget, BudgetReport, Recommendation } from "@/lib/api"
import { formatINR } from "@/lib/utils"
import { AlertTriangle, TrendingUp, Zap, CheckCircle, RefreshCw } from "lucide-react"

interface ImpactPanelProps {
  budgetId: string
  budget: Budget | null
  report?: BudgetReport | null
  recommendations?: Recommendation[]
  isLoading?: boolean
  onGenerateRecommendations?: () => Promise<void>
  isGenerating?: boolean
}

export function ImpactPanel({
  budgetId,
  budget,
  report,
  recommendations = [],
  isLoading = false,
  onGenerateRecommendations,
  isGenerating = false,
}: ImpactPanelProps) {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
          <span className="text-slate-400">Loading impact analysis...</span>
        </div>
      </div>
    )
  }

  if (!budget) {
    return null
  }

  // Calculate metrics
  const savingsRate = report?.savings_rate ?? calculateSavingsRate(budget)
  const investmentRate = 0 // TODO: Add investment tracking to BudgetReport
  const needsRatio = budget.needs_percentage
  const wantsRatio = budget.wants_percentage

  // Determine violations
  const violations = getViolations(budget, savingsRate)

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          status={savingsRate >= 20 ? "good" : "warning"}
          description={savingsRate >= 20 ? "On track" : "Below 20% target"}
          icon={TrendingUp as any}
        />
        <MetricCard
          title="Investment Rate"
          value={`${investmentRate.toFixed(1)}%`}
          status={investmentRate >= 10 ? "good" : "neutral"}
          description={investmentRate >= 10 ? "Healthy" : "Could improve"}
          icon={Zap as any}
        />
        <MetricCard
          title="Needs Ratio"
          value={`${needsRatio.toFixed(1)}%`}
          status={needsRatio <= 50 ? "good" : "warning"}
          description={needsRatio <= 50 ? "Within 50%" : "Over 50%"}
          icon={CheckCircle}
        />
        <MetricCard
          title="Wants Ratio"
          value={`${wantsRatio.toFixed(1)}%`}
          status={wantsRatio <= 30 ? "good" : "warning"}
          description={wantsRatio <= 30 ? "Controlled" : "Above 30%"}
          icon={AlertTriangle as any}
        />
      </div>

      {/* Violations Section */}
      {violations.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <h3 className="font-semibold text-red-400">🔴 VIOLATIONS</h3>
          </div>
          <div className="space-y-3">
            {violations.map((violation, idx) => (
              <ViolationItem key={idx} violation={violation} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h3 className="font-semibold text-white">💡 WHAT SHOULD I DO?</h3>
          </div>
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <RecommendationCard key={rec.id || idx} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* No Violations, All Good */}
      {violations.length === 0 && recommendations.length === 0 && (
        <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 text-center backdrop-blur-sm">
          <CheckCircle className="mx-auto mb-3 h-8 w-8 text-green-400" />
          <p className="text-green-400 font-semibold">Your budget is on track!</p>
          <p className="text-sm text-green-400/70 mb-4">Keep maintaining these spending habits.</p>
          {onGenerateRecommendations && (
            <button
              onClick={onGenerateRecommendations}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
              {isGenerating ? "Generating..." : "Generate Personalised Recommendations"}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  status: "good" | "warning" | "neutral"
  description: string
  icon: any
}

function MetricCard({ title, value, status, description, icon: Icon }: MetricCardProps) {
  const bgColor =
    status === "good"
      ? "bg-green-500/10 border-green-500/20"
      : status === "warning"
        ? "bg-red-500/10 border-red-500/20"
        : "bg-blue-500/10 border-blue-500/20"

  const textColor =
    status === "good"
      ? "text-green-400"
      : status === "warning"
        ? "text-red-400"
        : "text-blue-400"

  return (
    <div className={`rounded-xl border ${bgColor} p-4 backdrop-blur-sm`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <Icon className={`h-4 w-4 ${textColor}`} />
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  )
}

interface ViolationItemProps {
  violation: {
    type: string
    message: string
    severity: "high" | "medium" | "low"
  }
}

function ViolationItem({ violation }: ViolationItemProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-red-500/10 p-3">
      <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-red-400" />
      <div>
        <p className="text-sm font-medium text-red-300">{violation.message}</p>
      </div>
    </div>
  )
}

interface RecommendationCardProps {
  recommendation: Recommendation
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  let actionSteps: string[] = []
  try {
    if (recommendation.action_steps && typeof recommendation.action_steps === "string") {
      actionSteps = JSON.parse(recommendation.action_steps)
    }
  } catch {
    actionSteps = []
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-start justify-between">
        <h4 className="font-semibold text-white">{recommendation.title}</h4>
        {recommendation.potential_savings && (
          <span className="text-sm font-bold text-green-400">
            Save {formatINR(recommendation.potential_savings, 0)}
          </span>
        )}
      </div>

      <p className="mb-3 text-sm text-slate-400">{recommendation.description}</p>

      {actionSteps.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs font-medium text-slate-500">Action Steps:</p>
          <ol className="list-inside space-y-1 text-xs text-slate-400">
            {actionSteps.map((step, idx) => (
              <li key={idx} className="list-decimal">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      <button className="w-full rounded-lg bg-green-500/20 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/30">
        Implement
      </button>
    </div>
  )
}

// Helper Functions
function calculateSavingsRate(budget: Budget): number {
  // Formula: savings_rate = (savings_amount / total_amount) * 100
  if (budget.total_amount <= 0) return 0
  return (budget.savings_amount / budget.total_amount) * 100
}

interface Violation {
  type: string
  message: string
  severity: "high" | "medium" | "low"
}

function getViolations(budget: Budget, savingsRate: number): Violation[] {
  const violations: Violation[] = []

  // Check needs ratio (should be <= 50%)
  if (budget.needs_percentage > 50) {
    violations.push({
      type: "needs_over_budget",
      message: `Needs spending at ${budget.needs_percentage.toFixed(1)}% (target: 50% or less)`,
      severity: "high",
    })
  }

  // Check wants ratio (should be <= 30%)
  if (budget.wants_percentage > 30) {
    violations.push({
      type: "wants_over_budget",
      message: `Wants spending at ${budget.wants_percentage.toFixed(1)}% (target: 30% or less)`,
      severity: "medium",
    })
  }

  // Check savings rate (should be >= 20%)
  if (savingsRate < 20) {
    violations.push({
      type: "savings_under_target",
      message: `Savings rate at ${savingsRate.toFixed(1)}% (target: 20% or more)`,
      severity: "high",
    })
  }

  return violations
}
