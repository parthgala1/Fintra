"use client"

import { HelpCircle } from "lucide-react"
import { useState } from "react"

interface ContextualHelpTooltipProps {
  title: string
  description: string
  className?: string
}

const HELP_DEFINITIONS: Record<string, { title: string; description: string }> = {
  remaining_budget: {
    title: "Remaining Budget",
    description: "The amount of your monthly budget that you haven't spent yet. This is calculated as: Total Budget - Amount Spent So Far.",
  },
  total_spent: {
    title: "Total Spent",
    description: "The sum of all your spending across Needs, Wants, and Savings categories. This includes all transactions recorded in your budget.",
  },
  budget_percentage: {
    title: "Budget Percentage",
    description: "How much of your monthly budget you've used so far, expressed as a percentage. For example, 21% means you've used 21% of your total monthly budget.",
  },
  savings_progress: {
    title: "Savings Progress",
    description: "Shows how much you've actually saved or invested compared to your savings goal. Includes investments and other savings categories.",
  },
  needs: {
    title: "Needs",
    description: "Essential expenses that you must pay for survival and basic living. Examples: rent, utilities, groceries, insurance, transportation.",
  },
  wants: {
    title: "Wants",
    description: "Discretionary spending on things you enjoy but don't necessarily need. Examples: dining out, entertainment, shopping, travel.",
  },
  savings: {
    title: "Savings",
    description: "Money you set aside for future goals, emergencies, or investments. This includes investments, emergency fund contributions, and other savings.",
  },
  deviation: {
    title: "Deviation",
    description: "The difference between what you budgeted and what you actually spent. Negative means you spent less (under budget), positive means you spent more (over budget).",
  },
  overspent: {
    title: "Over Budget",
    description: "You've spent more in this category than you planned. Consider reducing spending in this area or adjusting your budget allocation.",
  },
  underspent: {
    title: "Under Budget",
    description: "You've spent less in this category than you planned. This could mean you're being careful with spending, or you might not need that much budget allocated here.",
  },
}

export function ContextualHelpTooltip({
  title,
  description,
  className = "",
}: ContextualHelpTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="inline-flex items-center justify-center h-5 w-5 text-slate-400 hover:text-slate-300 transition-colors cursor-help"
        aria-label={`Help: ${title}`}
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {showTooltip && (
        <div className="absolute z-50 left-6 top-0 w-64 rounded-lg border border-white/20 bg-slate-900 p-3 shadow-lg pointer-events-none">
          <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
          <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
          
          {/* Arrow */}
          <div className="absolute -left-1 top-2 w-2 h-2 bg-slate-900 border-l border-t border-white/20 transform rotate-45" />
        </div>
      )}
    </div>
  )
}

/**
 * Helper to get help definition by key
 */
export function getHelpDefinition(key: string) {
  return HELP_DEFINITIONS[key] || { title: "Help", description: "Learn more about this metric." }
}

/**
 * Tooltip component that can be wrapped around any metric card
 */
export function MetricWithHelp({
  children,
  helpKey,
}: {
  children: React.ReactNode
  helpKey: string
}) {
  const help = getHelpDefinition(helpKey)
  return (
    <div className="relative">
      <div className="absolute top-2 right-2">
        <ContextualHelpTooltip title={help.title} description={help.description} />
      </div>
      {children}
    </div>
  )
}
