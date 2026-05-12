"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  TrendingUp, 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Pencil,
  Trash2,
  Save,
  X
} from "lucide-react"
import { useTransaction } from "@/hooks/use-transactions"
import { useCategories } from "@/hooks/use-categories"
import { UpdateTransactionData, Category } from "@/lib/api"

const categoryTypeConfig: Record<
  NonNullable<Category["category_type"]>,
  { label: string; className: string }
> = {
  income:   { label: "Income",   className: "bg-green-500/15 text-green-400 border border-green-500/20" },
  expense:  { label: "Expense",  className: "bg-red-500/15 text-red-400 border border-red-500/20" },
  needs:    { label: "Needs",    className: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  wants:    { label: "Wants",    className: "bg-purple-500/15 text-purple-400 border border-purple-500/20" },
  savings:  { label: "Savings",  className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20" },
  transfer: { label: "Transfer", className: "bg-slate-500/15 text-slate-300 border border-slate-500/20" },
  both:     { label: "Both",     className: "bg-teal-500/15 text-teal-400 border border-teal-500/20" },
}

function CategoryTypeBadge({ type }: { type: NonNullable<Category["category_type"]> }) {
  const config = categoryTypeConfig[type]
  if (!config) return null
  return (
    <span className={`inline-flex items-start rounded px-2.5 pb-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

interface TransactionPageProps {
  params: Promise<{ id: string }>
}

export default function TransactionDetailPage({ params }: TransactionPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { transaction, isLoading, error, updateTransaction, deleteTransaction } = useTransaction(id)
  const { categories } = useCategories()
  const returnTo = searchParams.get("returnTo") || "/transactions"
  
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateTransactionData>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (transaction) {
      setEditData({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        type: transaction.type,
        category_id: transaction.category_id,
      })
    }
  }, [transaction])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { 
      weekday: "long",
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    })
  }

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === "income" ? "+" : "-"
    // Defensive check: ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) {
      return `${prefix}₹0.00`
    }
    return `${prefix}₹${Math.abs(numAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTransaction(id, editData)
      setIsEditing(false)
    } catch (err) {
      console.error("Failed to update transaction:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTransaction(id)
      router.push(returnTo)
    } catch (err) {
      console.error("Failed to delete transaction:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-[#020617]">
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href={returnTo} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-5 w-5 text-[#020617]" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Fintra</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 pb-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-red-400">
              {error || "Transaction not found"}
            </div>
            <Link href={returnTo} className="mt-4 inline-flex items-center gap-2 text-green-400 hover:text-green-300">
              <ArrowLeft className="h-4 w-4" />
              Back to Transactions
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Link href={returnTo} className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-5 w-5 text-[#020617]" />
              </div>
              <span className="text-xl font-semibold tracking-tight">Fintra</span>
            </Link>
          </div>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/transactions" className="text-sm font-medium text-green-400">Transactions</Link>
            <Link href="/budgets" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Budget</Link>
          </nav>

          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-3xl px-6">
          {/* Back Link */}
          <Link href={returnTo} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Link>

          {/* Transaction Card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            {/* Amount Header */}
            <div className={`p-8 text-center border-b border-white/10 ${
              transaction.type === "income" 
                ? "bg-gradient-to-b from-green-500/10 to-transparent" 
                : "bg-gradient-to-b from-red-500/10 to-transparent"
            }`}>
              <div className="inline-flex items-center gap-2 mb-4">
                {transaction.type === "income" ? (
                  <ArrowDownRight className="h-5 w-5 text-green-400" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-red-400" />
                )}
                <span className={`text-sm font-medium ${
                  transaction.type === "income" ? "text-green-400" : "text-red-400"
                }`}>
                  {transaction.type === "income" ? "Income" : "Expense"}
                </span>
              </div>
              <h1 className={`text-4xl font-bold ${
                transaction.type === "income" ? "text-green-400" : "text-white"
              }`}>
                {formatAmount(transaction.amount, transaction.type)}
              </h1>
              <p className="mt-2 text-slate-400">
                {formatDate(transaction.date)}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Description</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                ) : (
                  <p className="text-lg font-medium text-white">{transaction.description}</p>
                )}
              </div>

              {/* Amount */}
              {isEditing && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount || 0}
                    onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Date */}
              {isEditing && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Date</label>
                  <input
                    type="date"
                    value={editData.date || ""}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Type */}
              {isEditing && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Type</label>
                  <select
                    value={editData.type || "expense"}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value as "income" | "expense" })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Category</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      value={editData.category_id || ""}
                      onChange={(e) => setEditData({ ...editData, category_id: e.target.value || null })}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {editData.category_id && (() => {
                      const selected = categories.find(c => c.id === editData.category_id)
                      return selected ? (
                        <CategoryTypeBadge type={selected.category_type} />
                      ) : null
                    })()}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center rounded-sm bg-white/10 px-3 py-1 text-sm font-medium text-slate-300">
                      {transaction.category_name || "Uncategorized"}
                    </span>
                    {transaction.category_type && (
                      <CategoryTypeBadge type={transaction.category_type} />
                    )}
                  </div>
                )}
              </div>

              {/* Bank Account */}
              {transaction.bank_account_name && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Bank Account</label>
                  <p className="text-white">{transaction.bank_account_name}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Notes</label>
                {isEditing ? (
                  <textarea
                    value={editData.notes || ""}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                  />
                ) : (
                  <p className="text-slate-300">{transaction.notes || "No notes"}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-slate-500">Created</label>
                    <p className="text-slate-400">
                      {transaction.created_at ? formatDate(transaction.created_at) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500">Updated</label>
                    <p className="text-slate-400">
                      {transaction.updated_at ? formatDate(transaction.updated_at) : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-white/5">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
                <h3 className="text-lg font-semibold text-white">Delete Transaction</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
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
      </main>
    </div>
  )
}
