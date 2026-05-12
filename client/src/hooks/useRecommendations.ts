"use client"

import { useState, useEffect } from "react"
import { api, Recommendation } from "@/lib/api"

interface UseRecommendationsParams {
  budgetId?: string
  status?: string
}

interface UseRecommendationsResult {
  recommendations: Recommendation[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useRecommendations(
  params?: UseRecommendationsParams
): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await api.getRecommendations({
        
        status: params?.status,
      })
      setRecommendations(result.recommendations || [])
    } catch (err: any) {
      setError(err.message || "Failed to fetch recommendations")
      setRecommendations([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [params?.budgetId, params?.status])

  return {
    recommendations,
    isLoading,
    error,
    refetch,
  }
}
