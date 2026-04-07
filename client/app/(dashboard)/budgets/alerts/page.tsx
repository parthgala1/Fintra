"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Bell,
  BellOff,
  Loader2,
  Check,
  CheckCheck,
  RefreshCw,
  Settings,
  AlertTriangle,
  TrendingDown,
  Info,
  Save
} from "lucide-react"
import { api, AlertConfig, UpdateAlertConfigData } from "@/lib/api"
import { useAlerts } from "@/hooks/use-alerts"

const ALERT_TYPE_ICONS: Record<string, React.ReactNode> = {
  budget_overrun: <AlertTriangle className="h-5 w-5 text-red-400" />,
  unusual_spending: <TrendingDown className="h-5 w-5 text-yellow-400" />,
  goal_progress: <TrendingUp className="h-5 w-5 text-green-400" />,
}

export default function BudgetAlertsPage() {
  const { alerts, isLoading: alertsLoading, error: alertsError, fetchAlerts, dismissAlert, markAlertRead } = useAlerts()
  const [config, setConfig] = useState<AlertConfig | null>(null)
  const [isLoadingConfig, setIsLoadingConfig] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false)

  const [configForm, setConfigForm] = useState<UpdateAlertConfigData>({
    warning_threshold: 80,
    critical_threshold: 90,
    overspend_alert: true,
    notifications_enabled: true,
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const data = await api.getAlertConfig()
      setConfig(data)
      setConfigForm({
        warning_threshold: data.warning_threshold,
        critical_threshold: data.critical_threshold,
        overspend_alert: data.overspend_alert,
        notifications_enabled: data.notifications_enabled,
      })
    } catch (err) {
      console.error("Failed to fetch alert config:", err)
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    try {
      const updated = await api.updateAlertConfig(configForm)
      setConfig(updated)
      setShowConfigModal(false)
    } catch (err) {
      console.error("Failed to update alert config:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCheckAlerts = async () => {
    setIsCheckingAlerts(true)
    try {
      await api.triggerAlertCheck()
      await fetchAlerts()
    } catch (err) {
      console.error("Failed to check alerts:", err)
    } finally {
      setIsCheckingAlerts(false)
    }
  }

  const handleDismiss = async (alertId: string) => {
    try {
      await dismissAlert(alertId)
    } catch (err) {
      console.error("Failed to dismiss alert:", err)
    }
  }

  const handleMarkRead = async (alertId: string) => {
    try {
      await markAlertRead(alertId)
    } catch (err) {
      console.error("Failed to mark alert as read:", err)
    }
  }

  const getAlertIcon = (type: string) => {
    return ALERT_TYPE_ICONS[type] || <Info className="h-5 w-5 text-blue-400" />
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const unreadCount = alerts.filter(a => !a.is_read).length

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-5 w-5 text-[#020617]" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Fintra</span>
            </Link>
          </div>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/budgets" className="text-sm font-medium text-green-400">Budget</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleCheckAlerts}
              disabled={isCheckingAlerts}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isCheckingAlerts ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check Now
            </button>
            <button 
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Alerts</h1>
              {unreadCount > 0 && (
                <span className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-green-500 text-xs font-semibold text-[#020617]">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-slate-400">Stay informed about your financial health.</p>
          </div>

          {/* Config Status */}
          {!isLoadingConfig && config && (
            <div className={`mb-6 rounded-xl border p-4 flex items-center justify-between ${
              config.enabled 
                ? "border-green-500/30 bg-green-500/5" 
                : "border-slate-500/30 bg-slate-500/5"
            }`}>
              <div className="flex items-center gap-3">
                {config.notifications_enabled ? (
                  <Bell className="h-5 w-5 text-green-400" />
                ) : (
                  <BellOff className="h-5 w-5 text-slate-400" />
                )}
                <div>
                  <p className="font-medium text-white">
                    {config.notifications_enabled ? "Alerts Enabled" : "Alerts Disabled"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Warning at {config.warning_threshold}% • Critical at {config.critical_threshold}%
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="text-sm text-green-400 hover:text-green-300 cursor-pointer"
              >
                Edit Settings
              </button>
            </div>
          )}

          {/* Error State */}
          {alertsError && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {alertsError}
            </div>
          )}

          {/* Alerts List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold text-white">All Alerts</h3>
            </div>
            
            {alertsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Bell className="h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400">No alerts at the moment.</p>
                <p className="text-sm text-slate-500 mt-1">
                  You&apos;ll be notified when something needs your attention.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 transition-colors ${
                      alert.is_read ? "opacity-60" : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        alert.severity === "high" 
                          ? "bg-red-500/20" 
                          : alert.severity === "medium"
                          ? "bg-yellow-500/20"
                          : "bg-white/10"
                      }`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className={`font-medium ${
                              alert.is_read ? "text-slate-400" : "text-white"
                            }`}>
                              {alert.title}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                              {alert.message}
                            </p>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatDate(alert.created_at)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-3">
                          {!alert.is_read && (
                            <button
                              onClick={() => handleMarkRead(alert.id)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <CheckCheck className="h-3 w-3" />
                              Mark read
                            </button>
                          )}
                          {!alert.is_dismissed && (
                            <button
                              onClick={() => handleDismiss(alert.id)}
                              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <Check className="h-3 w-3" />
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Alert Settings</h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Enable Alerts</p>
                  <p className="text-sm text-slate-400">Receive budget alerts</p>
                </div>
                <button
                  onClick={() => setConfigForm({ ...configForm, notifications_enabled: !configForm.notifications_enabled })}
                  className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                    configForm.notifications_enabled ? "bg-green-500" : "bg-slate-600"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    configForm.notifications_enabled ? "translate-x-5" : ""
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                  Warning Threshold (%)
                </label>
                <input
                  type="number"
                  value={configForm.warning_threshold || 80}
                  onChange={(e) => setConfigForm({ 
                    ...configForm, 
                    warning_threshold: parseInt(e.target.value) || 80 
                  })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  min={50}
                  max={100}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Alert when spending exceeds this percentage of budget
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">
                  Critical Threshold (%)
                </label>
                <input
                  type="number"
                  value={configForm.critical_threshold || 90}
                  onChange={(e) => setConfigForm({ 
                    ...configForm, 
                    critical_threshold: parseInt(e.target.value) || 90 
                  })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  min={50}
                  max={100}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Critical alert when spending exceeds this percentage
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Overspend Alert</p>
                  <p className="text-sm text-slate-400">Alert when budget is exceeded</p>
                </div>
                <button
                  onClick={() => setConfigForm({ 
                    ...configForm, 
                    overspend_alert: !configForm.overspend_alert 
                  })}
                  className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                    configForm.overspend_alert ? "bg-green-500" : "bg-slate-600"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    configForm.overspend_alert ? "translate-x-5" : ""
                  }`} />
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
