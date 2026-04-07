"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Category, CreateCategoryData, UpdateCategoryData, ApiError } from "@/lib/api"

interface UseCategoriesResult {
  categories: Category[]
  isLoading: boolean
  error: string | null
  fetchCategories: () => Promise<void>
  createCategory: (data: CreateCategoryData) => Promise<Category>
  updateCategory: (id: string, data: UpdateCategoryData) => Promise<Category>
  deleteCategory: (id: string) => Promise<void>
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getCategories()
      setCategories(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch categories")
      }
      setCategories([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const createCategory = async (data: CreateCategoryData): Promise<Category> => {
    const category = await api.createCategory(data)
    setCategories(prev => [...prev, category])
    return category
  }

  const updateCategory = async (id: string, data: UpdateCategoryData): Promise<Category> => {
    const category = await api.updateCategory(id, data)
    setCategories(prev => prev.map(c => c.id === id ? category : c))
    return category
  }

  const deleteCategory = async (id: string): Promise<void> => {
    await api.deleteCategory(id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}

// Hook for system categories
export function useSystemCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSystemCategories = async () => {
      setIsLoading(true)
      try {
        const data = await api.getSystemCategories()
        setCategories(data)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError("Failed to fetch system categories")
        }
      } finally {
        setIsLoading(false)
      }
    }
    fetchSystemCategories()
  }, [])

  return { categories, isLoading, error }
}
