"use client"

import { useState, useEffect } from "react"
import { 
  Settings,
  Palette,
  Bell,
  Shield,
  Globe,
  DollarSign,
  Moon,
  Sun,
  Loader2,
  Check
} from "lucide-react"
import { api, UserPreferences } from "@/lib/api"

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "locale", label: "Locale", icon: Globe },
]

const themes = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
  { id: "system", label: "System", icon: Settings },
]

const currencies = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  
  // Form states
  const [theme, setTheme] = useState("dark")
  const [currency, setCurrency] = useState("INR")
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(true)
  const [showAmounts, setShowAmounts] = useState(true)
  const [autoCategorize, setAutoCategorize] = useState(true)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const data = await api.getUserPreferences()
      setPreferences(data)
      // Set form values from preferences
      setTheme(data.theme || "dark")
      setCurrency(data.currency || "INR")
      setDateFormat(data.date_format || "DD/MM/YYYY")
      setEmailNotifications(data.email_notifications ?? true)
      setPushNotifications(data.push_notifications ?? true)
      setWeeklySummary(data.weekly_summary ?? true)
      setShowAmounts(data.show_amounts ?? true)
      setAutoCategorize(data.auto_categorize ?? true)
    } catch (err) {
      console.error("Failed to fetch preferences:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await api.updateUserPreferences({
        theme,
        currency,
        date_format: dateFormat,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        weekly_summary: weeklySummary,
        show_amounts: showAmounts,
        auto_categorize: autoCategorize,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error("Failed to save preferences:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your preferences and account settings</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tabs */}
          <div className="lg:w-48 flex-shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-[#22C55E]/10 text-[#22C55E]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-[#0F172A] rounded-2xl border border-white/10 p-6">
              {activeTab === "general" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">General Settings</h3>
                    
                    {/* Currency */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <DollarSign className="h-4 w-4 inline mr-2" />
                        Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-[#22C55E] focus:outline-none"
                      >
                        {currencies.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.symbol} {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Format */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Globe className="h-4 w-4 inline mr-2" />
                        Date Format
                      </label>
                      <select
                        value={dateFormat}
                        onChange={(e) => setDateFormat(e.target.value)}
                        className="w-full max-w-xs rounded-lg border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-[#22C55E] focus:outline-none"
                      >
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>

                    {/* Auto Categorize */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">Auto-categorize transactions</p>
                        <p className="text-xs text-slate-400 mt-1">Automatically categorize new transactions</p>
                      </div>
                      <button
                        onClick={() => setAutoCategorize(!autoCategorize)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          autoCategorize ? "bg-[#22C55E]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            autoCategorize ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Appearance</h3>
                    
                    {/* Theme */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Theme
                      </label>
                      <div className="flex gap-3">
                        {themes.map((t) => {
                          const Icon = t.icon
                          return (
                            <button
                              key={t.id}
                              onClick={() => setTheme(t.id)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all cursor-pointer ${
                                theme === t.id
                                  ? "border-[#22C55E] bg-[#22C55E]/10 text-[#22C55E]"
                                  : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Notification Preferences</h3>
                    
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white">Email notifications</p>
                        <p className="text-xs text-slate-400 mt-1">Receive updates via email</p>
                      </div>
                      <button
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          emailNotifications ? "bg-[#22C55E]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            emailNotifications ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Push Notifications */}
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white">Push notifications</p>
                        <p className="text-xs text-slate-400 mt-1">Receive push notifications</p>
                      </div>
                      <button
                        onClick={() => setPushNotifications(!pushNotifications)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          pushNotifications ? "bg-[#22C55E]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            pushNotifications ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Weekly Summary */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-white">Weekly summary</p>
                        <p className="text-xs text-slate-400 mt-1">Receive weekly spending summary</p>
                      </div>
                      <button
                        onClick={() => setWeeklySummary(!weeklySummary)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          weeklySummary ? "bg-[#22C55E]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            weeklySummary ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Privacy Settings</h3>
                    
                    {/* Show Amounts */}
                    <div className="flex items-center justify-between py-3 border-b border-white/5">
                      <div>
                        <p className="text-sm font-medium text-white">Show amounts</p>
                        <p className="text-xs text-slate-400 mt-1">Display actual amounts instead of masked</p>
                      </div>
                      <button
                        onClick={() => setShowAmounts(!showAmounts)}
                        className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                          showAmounts ? "bg-[#22C55E]" : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            showAmounts ? "left-6" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "locale" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Locale Settings</h3>
                    <p className="text-slate-400">Configure your regional settings</p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-[#22C55E]/90 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                  {isSaving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}