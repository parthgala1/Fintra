"use client"

import { useState, useEffect, useCallback } from "react"
import { api, Alert, AlertConfig, UpdateAlertConfigData, ApiError } from "@/lib/api"

interface UseAlertsResult {
  alerts: Alert[]
  isLoading: boolean
  error: string | null
  fetchAlerts: () => Promise<void>
  dismissAlert: (id: string) => Promise<void>
  markAlertRead: (id: string) => Promise<void>
  triggerCheck: () => Promise<number>
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAlerts()
      setAlerts(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch alerts")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const dismissAlert = async (id: string): Promise<void> => {
    await api.dismissAlert(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_dismissed: true } : a))
  }

  const markAlertRead = async (id: string): Promise<void> => {
    await api.markAlertRead(id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
  }

  const triggerCheck = async (): Promise<number> => {
    const result = await api.triggerAlertCheck()
    await fetchAlerts()
    return result.alerts_triggered
  }

  return {
    alerts,
    isLoading,
    error,
    fetchAlerts,
    dismissAlert,
    markAlertRead,
    triggerCheck,
  }
}

// Hook for alert configuration
interface UseAlertConfigResult {
  config: AlertConfig | null
  isLoading: boolean
  error: string | null
  fetchConfig: () => Promise<void>
  updateConfig: (data: UpdateAlertConfigData) => Promise<AlertConfig>
}

export function useAlertConfig(): UseAlertConfigResult {
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAlertConfig()
      setConfig(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch alert config")
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const updateConfig = async (data: UpdateAlertConfigData): Promise<AlertConfig> => {
    const newConfig = await api.updateAlertConfig(data)
    setConfig(newConfig)
    return newConfig
  }

  return {
    config,
    isLoading,
    error,
    fetchConfig,
    updateConfig,
  }
}
