"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Transaction, TransactionParams, TransactionListResponse, CreateTransactionData, UpdateTransactionData, ApiError } from "@/lib/api"

interface UseTransactionsResult {
  transactions: Transaction[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  isLoading: boolean
  error: string | null
  fetchTransactions: (params?: TransactionParams) => Promise<void>
  createTransaction: (data: CreateTransactionData) => Promise<Transaction>
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  bulkUpdateCategory: (transactionIds: string[], categoryId: string) => Promise<number>
}

export function useTransactions(initialParams?: TransactionParams): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async (params?: TransactionParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.getTransactions({
        page: params?.page || page,
        page_size: params?.page_size || pageSize,
        ...params,
      })
      setTransactions(Array.isArray(response.transactions) ? response.transactions : [])
      setTotal(response.total || 0)
      setPage(response.page || 1)
      setPageSize(response.page_size || 50)
      setTotalPages(response.total_pages || 0)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch transactions")
      }
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    fetchTransactions(initialParams)
  }, [])

  const createTransaction = async (data: CreateTransactionData): Promise<Transaction> => {
    const transaction = await api.createTransaction(data)
    await fetchTransactions()
    return transaction
  }

  const updateTransaction = async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    const transaction = await api.updateTransaction(id, data)
    setTransactions(prev => prev.map(t => t.id === id ? transaction : t))
    return transaction
  }

  const deleteTransaction = async (id: string): Promise<void> => {
    await api.deleteTransaction(id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const bulkUpdateCategory = async (transactionIds: string[], categoryId: string): Promise<number> => {
    const result = await api.bulkUpdateTransactions({ transaction_ids: transactionIds, category_id: categoryId })
    await fetchTransactions()
    return result.updated_count
  }

  return {
    transactions,
    total,
    page,
    pageSize,
    totalPages,
    isLoading,
    error,
    fetchTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkUpdateCategory,
  }
}

// Hook for single transaction
interface UseTransactionResult {
  transaction: Transaction | null
  isLoading: boolean
  error: string | null
  fetchTransaction: (id: string) => Promise<void>
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
}

export function useTransaction(id?: string): UseTransactionResult {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransaction = useCallback(async (transactionId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getTransaction(transactionId)
      setTransaction(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch transaction")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (id) {
      fetchTransaction(id)
    }
  }, [id, fetchTransaction])

  const updateTransaction = async (transactionId: string, data: UpdateTransactionData): Promise<Transaction> => {
    const transaction = await api.updateTransaction(transactionId, data)
    setTransaction(transaction)
    return transaction
  }

  const deleteTransaction = async (transactionId: string): Promise<void> => {
    await api.deleteTransaction(transactionId)
    setTransaction(null)
  }

  return {
    transaction,
    isLoading,
    error,
    fetchTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
