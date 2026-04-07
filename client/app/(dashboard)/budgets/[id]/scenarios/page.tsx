"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  ArrowLeft,
  Loader2,
  Plus,
  Play,
  Copy,
  Trash2,
  X,
  Save,
  GitBranch,
  AlertTriangle
} from "lucide-react"
import { api, Scenario, CreateScenarioData, ScenarioCalculation } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { formatINR } from "@/lib/utils"

interface BudgetScenariosPageProps {
  params: Promise<{ id: string }>
}

export default function BudgetScenariosPage({ params }: BudgetScenariosPageProps) {
  const { id: budgetId } = use(params)
  const { categories } = useCategories()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [budget, setBudget] = useState<{ name: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [calculatingId, setCalculatingId] = useState<string | null>(null)
  const [calculations, setCalculations] = useState<Record<string, ScenarioCalculation>>({})
  const [applyConfirmId, setApplyConfirmId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CreateScenarioData>({
    name: "",
    description: "",
    adjustments: {}
  })

  const [categoryAdjustments, setCategoryAdjustments] = useState<Record<string, number>>({})

  const fetchData = async () => {
    try {
      const [scenariosData, budgetData] = await Promise.all([
        api.getScenarios(budgetId),
        api.getBudget(budgetId)
      ])
      setScenarios(scenariosData)
      setBudget(budgetData)
    } catch (err) {
      setError("Failed to fetch scenarios")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [budgetId])

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    
    const adjustments: Record<string, number> = {}
    Object.entries(categoryAdjustments).forEach(([catId, adjustment]) => {
      if (adjustment !== 0) {
        adjustments[catId] = adjustment
      }
    })

    setIsSaving(true)
    try {
      await api.createScenario(budgetId, {
        ...formData,
        adjustments
      })
      setShowCreateModal(false)
      setFormData({ name: "", description: "", adjustments: {} })
      setCategoryAdjustments({})
      await fetchData()
    } catch (err) {
      console.error("Failed to create scenario:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCalculate = async (scenarioId: string) => {
    setCalculatingId(scenarioId)
    try {
      const result = await api.calculateScenario(scenarioId, {
        income_change: 0,
        expense_changes: {}
      })
      setCalculations(prev => ({ ...prev, [scenarioId]: result }))
    } catch (err) {
      console.error("Failed to calculate scenario:", err)
    } finally {
      setCalculatingId(null)
    }
  }

  const handleApply = async (scenarioId: string) => {
    try {
      const result = await api.applyScenario(scenarioId)
      alert(`Scenario applied! New budget created: ${result.new_budget_id}`)
      setApplyConfirmId(null)
    } catch (err) {
      console.error("Failed to apply scenario:", err)
    }
  }

  const handleDelete = async (scenarioId: string) => {
    try {
      await api.deleteScenario(scenarioId)
      setScenarios(scenarios.filter(s => s.id !== scenarioId))
      setDeleteConfirmId(null)
    } catch (err) {
      console.error("Failed to delete scenario:", err)
    }
  }

  const formatAmount = (amount?: number) => {
    if (amount === undefined) return formatINR(0, 2)
    return formatINR(amount, 2)
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case "positive":
        return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">Positive</span>
      case "negative":
        return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">Negative</span>
      default:
        return <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">Neutral</span>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

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
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Scenario
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Back Link */}
          <Link href={`/budgets/${budgetId}`} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Budget
          </Link>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Budget Scenarios</h1>
            <p className="text-slate-400">
              {budget?.name || "Budget"} - Explore "what-if" situations
            </p>
          </div>

          {/* Info Box */}
          <div className="mb-8 rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-400">Sandbox Mode</h3>
                <p className="text-sm text-slate-300 mt-1">
                  Scenarios let you explore "what-if" situations without affecting your actual budget. 
                  Calculate projections and apply scenarios to create new budgets.
                </p>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Scenarios List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="font-semibold text-white">Your Scenarios</h3>
            </div>
            
            {scenarios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <GitBranch className="h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400">No scenarios created yet.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 text-green-400 hover:text-green-300"
                >
                  Create your first scenario
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {scenarios.map((scenario) => (
                  <div key={scenario.id} className="p-6 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">
                          <GitBranch className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{scenario.name}</h4>
                          {scenario.description && (
                            <p className="text-sm text-slate-400">{scenario.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scenario.impact && getImpactBadge(scenario.impact)}
                        <button
                          onClick={() => handleCalculate(scenario.id)}
                          disabled={calculatingId === scenario.id}
                          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {calculatingId === scenario.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          Calculate
                        </button>
                        <button
                          onClick={() => setApplyConfirmId(scenario.id)}
                          className="flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-400 hover:bg-green-500/20 transition-colors cursor-pointer"
                        >
                          <Copy className="h-4 w-4" />
                          Apply
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(scenario.id)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Calculation Results */}
                    {calculations[scenario.id] && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-xs font-medium text-slate-400 uppercase mb-3">Calculation Results</p>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-xs text-slate-400">New Total Budget</p>
                            <p className="text-lg font-semibold text-white mt-1">
                              {formatAmount(calculations[scenario.id].new_total_budget)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-xs text-slate-400">Projected Spending</p>
                            <p className="text-lg font-semibold text-white mt-1">
                              {formatAmount(calculations[scenario.id]?.projected_spending)}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/5 p-3">
                            <p className="text-xs text-slate-400">Difference</p>
                            <p className={`text-lg font-semibold mt-1 ${
                              (calculations[scenario.id]?.difference ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                            }`}>
                              {formatAmount(calculations[scenario.id]?.difference)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Create Scenario</h3>
              <button 
                onClick={() => { setShowCreateModal(false); setCategoryAdjustments({}) }}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Scenario Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Reduce Dining Out"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Description (optional)</label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this scenario explores..."
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-3">
                  Category Adjustments (percentage change)
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.filter(c => c.type === "expense" || c.type === "both").map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between">
                      <span className="text-sm text-slate-300">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={categoryAdjustments[cat.id] || 0}
                          onChange={(e) => setCategoryAdjustments({
                            ...categoryAdjustments,
                            [cat.id]: parseFloat(e.target.value) || 0
                          })}
                          className="w-20 rounded-lg border border-white/10 bg-white/5 py-1.5 px-2 text-sm text-white text-right focus:border-green-500 focus:outline-none"
                          placeholder="0"
                        />
                        <span className="text-sm text-slate-400 w-6">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Use negative values to decrease budgets, positive to increase
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowCreateModal(false); setCategoryAdjustments({}) }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !formData.name.trim()}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Confirmation Modal */}
      {applyConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <h3 className="text-lg font-semibold text-white">Apply Scenario</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will create a new budget based on this scenario. Your current budget will not be modified.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setApplyConfirmId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApply(applyConfirmId)}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
              >
                <Copy className="h-4 w-4" />
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <h3 className="text-lg font-semibold text-white">Delete Scenario</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
