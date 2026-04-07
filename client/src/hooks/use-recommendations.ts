"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  api, 
  Recommendation, 
  RecommendationGenerateRequest,
  RecommendationDismissRequest,
  RecommendationSnoozeRequest,
  ApiError 
} from "@/lib/api"

interface UseRecommendationsResult {
  recommendations: Recommendation[]
  isLoading: boolean
  error: string | null
  fetchRecommendations: (params?: { category?: string; status?: string; limit?: number }) => Promise<void>
  generateRecommendations: (data?: RecommendationGenerateRequest) => Promise<void>
  dismissRecommendation: (id: string, reason?: string) => Promise<void>
  implementRecommendation: (id: string) => Promise<void>
  snoozeRecommendation: (id: string, days?: number) => Promise<void>
}

export function useRecommendations(params?: { category?: string; status?: string; limit?: number }): UseRecommendationsResult {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendations = useCallback(async (fetchParams?: { category?: string; status?: string; limit?: number }) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getRecommendations(fetchParams || params)
      setRecommendations(data.recommendations)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch recommendations")
      }
    } finally {
      setIsLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const generateRecommendations = async (data?: RecommendationGenerateRequest): Promise<void> => {
    try {
      await api.generateRecommendations(data)
      // Refresh the list after generating
      await fetchRecommendations()
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to generate recommendations")
      }
    }
  }

  const dismissRecommendation = async (id: string, reason?: string): Promise<void> => {
    try {
      await api.dismissRecommendation(id, reason ? { reason } : undefined)
      // Remove from local state
      setRecommendations(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to dismiss recommendation")
      }
    }
  }

  const implementRecommendation = async (id: string): Promise<void> => {
    try {
      const updated = await api.implementRecommendation(id)
      // Update in local state
      setRecommendations(prev => prev.map(r => r.id === id ? updated : r))
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to implement recommendation")
      }
    }
  }

  const snoozeRecommendation = async (id: string, days: number = 7): Promise<void> => {
    try {
      await api.snoozeRecommendation(id, { days })
      // Remove from local state (will reappear after snooze expires)
      setRecommendations(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to snooze recommendation")
      }
    }
  }

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
    generateRecommendations,
    dismissRecommendation,
    implementRecommendation,
    snoozeRecommendation,
  }
}

// Hook for single recommendation
interface UseRecommendationResult {
  recommendation: Recommendation | null
  isLoading: boolean
  error: string | null
  fetchRecommendation: () => Promise<void>
  dismiss: (reason?: string) => Promise<void>
  implement: () => Promise<void>
  snooze: (days?: number) => Promise<void>
}

export function useRecommendation(recommendationId: string): UseRecommendationResult {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecommendation = useCallback(async () => {
    if (!recommendationId) return
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getRecommendation(recommendationId)
      setRecommendation(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch recommendation")
      }
    } finally {
      setIsLoading(false)
    }
  }, [recommendationId])

  useEffect(() => {
    fetchRecommendation()
  }, [fetchRecommendation])

  const dismiss = async (reason?: string): Promise<void> => {
    if (!recommendationId) return
    
    try {
      await api.dismissRecommendation(recommendationId, reason ? { reason } : undefined)
      setRecommendation(null)
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to dismiss recommendation")
      }
    }
  }

  const implement = async (): Promise<void> => {
    if (!recommendationId) return
    
    try {
      const updated = await api.implementRecommendation(recommendationId)
      setRecommendation(updated)
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to implement recommendation")
      }
    }
  }

  const snooze = async (days: number = 7): Promise<void> => {
    if (!recommendationId) return
    
    try {
      await api.snoozeRecommendation(recommendationId, { days })
      setRecommendation(null)
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message)
      } else {
        throw new Error("Failed to snooze recommendation")
      }
    }
  }

  return {
    recommendation,
    isLoading,
    error,
    fetchRecommendation,
    dismiss,
    implement,
    snooze,
  }
}
