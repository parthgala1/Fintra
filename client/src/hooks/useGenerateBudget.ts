"use client"

import { useState, useEffect, useCallback } from "react"
import { api, BudgetGenerateResponse, ApiError } from "@/lib/api"

interface UseGenerateBudgetResult {
  data: BudgetGenerateResponse | null
  isLoading: boolean
  error: string | null
  generateBudget: (startDate?: string, endDate?: string) => Promise<void>
}

export function useGenerateBudget(
  startDate?: string,
  endDate?: string
): UseGenerateBudgetResult {
  const [data, setData] = useState<BudgetGenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateBudget = useCallback(
    async (customStartDate?: string, customEndDate?: string) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await api.generateBudgetFromActuals(
          customStartDate || startDate,
          customEndDate || endDate
        )
        setData(result)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to generate budget from transactions")
        }
        setData(null)
      } finally {
        setIsLoading(false)
      }
    },
    [startDate, endDate]
  )

  // Auto-generate on mount if dates provided
  useEffect(() => {
    if (startDate || endDate) {
      generateBudget()
    }
  }, [startDate, endDate, generateBudget])

  return {
    data,
    isLoading,
    error,
    generateBudget,
  }
}
