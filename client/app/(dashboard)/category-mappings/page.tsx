"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Search, 
  Plus,
  Loader2,
  Pencil,
  Trash2,
  X,
  Save,
  Check,
  RefreshCw
} from "lucide-react"
import { api, CategoryMapping, CreateCategoryMappingData, UpdateCategoryMappingData, TestCategoryMappingData } from "@/lib/api"
import { useCategories } from "@/hooks/use-categories"
import { toast } from "sonner"

export default function CategoryMappingsPage() {
  const { categories } = useCategories()
  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [testInput, setTestInput] = useState("")
  const [testResult, setTestResult] = useState<{ category_id: string; category_name: string; matched_keyword: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const [formData, setFormData] = useState<CreateCategoryMappingData>({
    keyword: "",
    category_id: "",
    priority: 1
  })

  const [editData, setEditData] = useState<UpdateCategoryMappingData>({})
  const lastErrorRef = useRef<string | null>(null)

  const fetchMappings = async () => {
    try {
      const response = await api.getCategoryMappings()
      setMappings(response.mappings)
    } catch {
      setError("Failed to fetch category mappings")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMappings()
  }, [])

  useEffect(() => {
    if (error && error !== lastErrorRef.current) {
      lastErrorRef.current = error
      toast.error(error)
    }
  }, [error])

  const filteredMappings = mappings.filter(mapping => 
    mapping.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!formData.keyword.trim() || !formData.category_id) return
    setIsSaving(true)
    try {
      const newMapping = await api.createCategoryMapping(formData)
      setMappings([...mappings, newMapping])
      setShowCreateModal(false)
      setFormData({ keyword: "", category_id: "", priority: 1 })
    } catch (err) {
      console.error("Failed to create mapping:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    setIsSaving(true)
    try {
      const updated = await api.updateCategoryMapping(id, editData)
      setMappings(mappings.map(m => m.id === id ? updated : m))
      setEditingId(null)
      setEditData({})
    } catch {
      // Error handled by toast
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteCategoryMapping(id)
      setMappings(mappings.filter(m => m.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      console.error("Failed to delete mapping:", err)
    }
  }

  const handleTest = async () => {
    if (!testInput.trim()) return
    setIsTesting(true)
    try {
      const data: TestCategoryMappingData = { description: testInput }
      const result = await api.testCategoryMapping(data)
      setTestResult(result)
    } catch {
      setTestResult(null)
    } finally {
      setIsTesting(false)
    }
  }

  const toggleActive = async (mapping: CategoryMapping) => {
    try {
      const updated = await api.updateCategoryMapping(mapping.id, { 
        is_active: !mapping.is_active 
      })
      setMappings(mappings.map(m => m.id === mapping.id ? updated : m))
    } catch (err) {
      console.error("Failed to toggle mapping:", err)
    }
  }

  const startEditing = (mapping: CategoryMapping) => {
    setEditingId(mapping.id)
    setEditData({
      keyword: mapping.keyword,
      category_id: mapping.category_id,
      priority: mapping.priority,
      is_active: mapping.is_active
    })
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
            <Link href="/transactions" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Transactions</Link>
            <Link href="/budgets" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Budget</Link>
            <Link href="/categories" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Categories</Link>
            <Link href="/category-mappings" className="text-sm font-medium text-green-400">Mappings</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Mapping
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Category Mappings</h1>
            <p className="text-slate-400">Automatically categorize transactions based on keywords.</p>
          </div>

          {/* Test Section */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Test Mapping</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Enter transaction description to test..."
                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
              />
              <button
                onClick={handleTest}
                disabled={isTesting || !testInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Test
              </button>
            </div>
            {testResult && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                <Check className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-400">
                  Matches: <strong>&quot;{testResult.matched_keyword}&quot;</strong> → <strong>{testResult.category_name}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search mappings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Error State */}
          {null}

          {/* Mappings List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-slate-400">No category mappings found.</p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="mt-2 text-green-400 hover:text-green-300"
                >
                  Create your first mapping
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs font-medium text-slate-400 uppercase">
                      <th className="px-6 py-3">Keyword</th>
                      <th className="px-6 py-3">Category</th>
                      <th className="px-6 py-3">Priority</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          {editingId === mapping.id ? (
                            <input
                              type="text"
                              value={editData.keyword || ""}
                              onChange={(e) => setEditData({ ...editData, keyword: e.target.value })}
                              className="rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm font-medium text-white">&quot;{mapping.keyword}&quot;</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === mapping.id ? (
                            <select
                              value={editData.category_id || ""}
                              onChange={(e) => setEditData({ ...editData, category_id: e.target.value })}
                              className="rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                            >
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm text-slate-300">{mapping.category_name}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {editingId === mapping.id ? (
                            <input
                              type="number"
                              value={editData.priority || 1}
                              onChange={(e) => setEditData({ ...editData, priority: parseInt(e.target.value) })}
                              className="w-20 rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                              min={1}
                            />
                          ) : (
                            <span className="text-sm text-slate-400">{mapping.priority}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleActive(mapping)}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                              mapping.is_active 
                                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                                : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                            }`}
                          >
                            {mapping.is_active ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingId === mapping.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(mapping.id)}
                                disabled={isSaving}
                                className="p-2 text-green-400 hover:text-green-300 disabled:opacity-50 cursor-pointer"
                              >
                                <Save className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditData({}) }}
                                className="p-2 text-slate-400 hover:text-white cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditing(mapping)}
                                className="p-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(mapping.id)}
                                className="p-2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Create Mapping</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Keyword</label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                  placeholder="e.g., UBER, SWIGGY, NETFLIX"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Category</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Priority (1 = highest)</label>
                <input
                  type="number"
                  value={formData.priority || 1}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  min={1}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isSaving || !formData.keyword.trim() || !formData.category_id}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <h3 className="text-lg font-semibold text-white">Delete Mapping</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete this category mapping?
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
