"use client"

import { useState, useEffect } from "react"
import { api, BudgetReport } from "@/lib/api"

interface UseBudgetReportResult {
  report: BudgetReport | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBudgetReport(budgetId?: string): UseBudgetReportResult {
  const [report, setReport] = useState<BudgetReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    if (!budgetId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await api.getCurrentReport(budgetId)
      setReport(data)
    } catch (err: any) {
      setError(err.message || "Failed to fetch report")
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (budgetId) {
      refetch()
    }
  }, [budgetId])

  return {
    report,
    isLoading,
    error,
    refetch,
  }
}
