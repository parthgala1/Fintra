"use client"

import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricDeltaProps {
  label: string
  beforeValue: number
  afterValue: number
  format?: (value: number) => string
  isPercentage?: boolean
  suffix?: string
}

export function MetricDelta({
  label,
  beforeValue,
  afterValue,
  format = (val) => val.toFixed(1),
  isPercentage = false,
  suffix = ""
}: MetricDeltaProps) {
  const delta = afterValue - beforeValue
  const deltaPercent = beforeValue !== 0 ? ((delta / beforeValue) * 100) : 0
  const deltaPercentStr = deltaPercent.toFixed(1)
  const isPositive = delta > 0
  const isNeutral = delta === 0

  const getDeltaColor = () => {
    if (isNeutral) return "text-slate-400"
    // For percentage metrics, increasing is usually good (savings rate, investment rate)
    // For amount metrics, it depends on context
    if (isPercentage) {
      return isPositive ? "text-green-400" : "text-red-400"
    }
    // For amounts, we consider both positive and negative as changes
    return isPositive ? "text-green-400" : "text-orange-400"
  }

  const getDeltaBgColor = () => {
    if (isNeutral) return "bg-slate-500/10"
    return isPositive ? "bg-green-500/10" : "bg-orange-500/10"
  }

  return (
    <div className="rounded-lg bg-white/5 p-4 border border-white/10">
      <p className="text-xs font-medium text-slate-400 uppercase mb-3">{label}</p>
      
      <div className="flex items-end justify-between mb-2">
        <div>
          <p className="text-xs text-slate-500 mb-1">Before</p>
          <p className="text-lg font-semibold text-white">
            {format(beforeValue)}{isPercentage ? "%" : ""}
            {suffix}
          </p>
        </div>
        
        <div className="flex flex-col items-center px-2">
          <TrendingUp className="h-4 w-4 text-slate-400 mb-1" />
          <p className="text-xs text-slate-500">→</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-500 mb-1">After</p>
          <p className="text-lg font-semibold text-white">
            {format(afterValue)}{isPercentage ? "%" : ""}
            {suffix}
          </p>
        </div>
      </div>

      {!isNeutral && (
        <div className={`flex items-center gap-2 mt-3 px-2 py-1.5 rounded-lg ${getDeltaBgColor()}`}>
          {isPositive ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-400" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-orange-400" />
          )}
          <span className={`text-xs font-medium ${getDeltaColor()}`}>
            {isPositive ? "+" : ""}{format(delta)}{isPercentage ? "%" : ""}
            {suffix} ({deltaPercent > 0 ? "+" : ""}{deltaPercentStr}%)
          </span>
        </div>
      )}
    </div>
  )
}

