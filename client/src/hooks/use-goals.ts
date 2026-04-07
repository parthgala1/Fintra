"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Goal, GoalCreate, GoalUpdate, GoalAnalysis, ApiError } from "@/lib/api"

interface UseGoalsResult {
  goals: Goal[]
  isLoading: boolean
  error: string | null
  fetchGoals: (statusFilter?: string) => Promise<void>
  createGoal: (data: GoalCreate) => Promise<Goal>
  updateGoal: (id: string, data: GoalUpdate) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>
  recordContribution: (id: string, amount: number, date: string) => Promise<Goal>
}

export function useGoals(statusFilter?: string): UseGoalsResult {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async (filter?: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getGoals(filter)
      setGoals(data.goals)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch goals")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals(statusFilter)
  }, [fetchGoals, statusFilter])

  const createGoal = async (data: GoalCreate): Promise<Goal> => {
    const goal = await api.createGoal(data)
    await fetchGoals(statusFilter)
    return goal
  }

  const updateGoal = async (id: string, data: GoalUpdate): Promise<Goal> => {
    const goal = await api.updateGoal(id, data)
    setGoals(prev => prev.map(g => g.id === id ? goal : g))
    return goal
  }

  const deleteGoal = async (id: string): Promise<void> => {
    await api.deleteGoal(id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const recordContribution = async (id: string, amount: number, date: string): Promise<Goal> => {
    const goal = await api.recordContribution(id, amount, date)
    setGoals(prev => prev.map(g => g.id === id ? goal : g))
    return goal
  }

  return {
    goals,
    isLoading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    recordContribution,
  }
}

// Hook for single goal
interface UseGoalResult {
  goal: Goal | null
  analysis: GoalAnalysis | null
  isLoading: boolean
  error: string | null
  fetchGoal: (id: string) => Promise<void>
  fetchAnalysis: (id: string) => Promise<void>
  updateGoal: (id: string, data: GoalUpdate) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>
  recordContribution: (id: string, amount: number, date: string) => Promise<Goal>
}

export function useGoal(id?: string): UseGoalResult {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGoal = useCallback(async (goalId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getGoal(goalId)
      setGoal(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch goal")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchAnalysis = useCallback(async (goalId: string) => {
    try {
      const data = await api.getGoalAnalysis(goalId)
      setAnalysis(data)
    } catch (err) {
      console.error("Failed to fetch goal analysis:", err)
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchGoal(id)
      fetchAnalysis(id)
    }
  }, [id, fetchGoal, fetchAnalysis])

  const updateGoal = async (goalId: string, data: GoalUpdate): Promise<Goal> => {
    const updatedGoal = await api.updateGoal(goalId, data)
    setGoal(updatedGoal)
    // Refresh analysis after update
    await fetchAnalysis(goalId)
    return updatedGoal
  }

  const deleteGoal = async (goalId: string): Promise<void> => {
    await api.deleteGoal(goalId)
    setGoal(null)
    setAnalysis(null)
  }

  const recordContribution = async (goalId: string, amount: number, date: string): Promise<Goal> => {
    const updatedGoal = await api.recordContribution(goalId, amount, date)
    setGoal(updatedGoal)
    // Refresh analysis after contribution
    await fetchAnalysis(goalId)
    return updatedGoal
  }

  return {
    goal,
    analysis,
    isLoading,
    error,
    fetchGoal,
    fetchAnalysis,
    updateGoal,
    deleteGoal,
    recordContribution,
  }
}
