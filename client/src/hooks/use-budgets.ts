"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Budget, CreateBudgetData, UpdateBudgetData, ApiError } from "@/lib/api"

interface UseBudgetsResult {
  budgets: Budget[]
  defaultBudget: Budget | null
  isLoading: boolean
  error: string | null
  fetchBudgets: () => Promise<void>
  fetchDefaultBudget: () => Promise<void>
  createBudget: (data: CreateBudgetData) => Promise<Budget>
  updateBudget: (id: string, data: UpdateBudgetData) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>
  setDefaultBudget: (id: string) => Promise<void>
}

export function useBudgets(): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [defaultBudget, setDefaultBudget] = useState<Budget | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getBudgets()
      setBudgets(data)
      // Also fetch default budget
      const defaultData = await api.getDefaultBudget()
      setDefaultBudget(defaultData)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch budgets")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets])

  const fetchDefaultBudget = async () => {
    try {
      const data = await api.getDefaultBudget()
      setDefaultBudget(data)
    } catch (err) {
      // Ignore error
    }
  }

  const createBudget = async (data: CreateBudgetData): Promise<Budget> => {
    const budget = await api.createBudget(data)
    await fetchBudgets()
    return budget
  }

  const updateBudget = async (id: string, data: UpdateBudgetData): Promise<Budget> => {
    const budget = await api.updateBudget(id, data)
    setBudgets(prev => prev.map(b => b.id === id ? budget : b))
    if (budget.is_default) {
      setDefaultBudget(budget)
    }
    return budget
  }

  const deleteBudget = async (id: string): Promise<void> => {
    await api.deleteBudget(id)
    setBudgets(prev => prev.filter(b => b.id !== id))
    if (defaultBudget?.id === id) {
      setDefaultBudget(null)
    }
  }

  const setAsDefault = async (id: string): Promise<void> => {
    await api.setDefaultBudget(id)
    await fetchBudgets()
  }

  return {
    budgets,
    defaultBudget,
    isLoading,
    error,
    fetchBudgets,
    fetchDefaultBudget,
    createBudget,
    updateBudget,
    deleteBudget,
    setDefaultBudget: setAsDefault,
  }
}

// Hook for single budget
interface UseBudgetResult {
  budget: Budget | null
  isLoading: boolean
  error: string | null
  fetchBudget: (id: string) => Promise<void>
  updateBudget: (id: string, data: UpdateBudgetData) => Promise<Budget>
  deleteBudget: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
}

export function useBudget(id?: string): UseBudgetResult {
  const [budget, setBudget] = useState<Budget | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBudget = useCallback(async (budgetId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getBudget(budgetId)
      setBudget(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch budget")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchBudget(id)
    }
  }, [id, fetchBudget])

  const updateBudget = async (budgetId: string, data: UpdateBudgetData): Promise<Budget> => {
    const budget = await api.updateBudget(budgetId, data)
    setBudget(budget)
    return budget
  }

  const deleteBudget = async (budgetId: string): Promise<void> => {
    await api.deleteBudget(budgetId)
    setBudget(null)
  }

  const setDefault = async (budgetId: string): Promise<void> => {
    await api.setDefaultBudget(budgetId)
    setBudget(prev => prev ? { ...prev, is_default: true } : null)
  }

  return {
    budget,
    isLoading,
    error,
    fetchBudget,
    updateBudget,
    deleteBudget,
    setDefault,
  }
}
