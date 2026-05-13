"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { 
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
  income:   { label: "Income",   className: "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/15" },
  expense:  { label: "Expense",  className: "bg-rose-500/10 text-rose-400/80 border border-rose-500/15" },
  needs:    { label: "Needs",    className: "bg-blue-500/10 text-blue-400/80 border border-blue-500/15" },
  wants:    { label: "Wants",    className: "bg-violet-500/10 text-violet-400/80 border border-violet-500/15" },
  savings:  { label: "Savings",  className: "bg-teal-500/10 text-teal-400/80 border border-teal-500/15" },
  transfer: { label: "Transfer", className: "bg-slate-500/10 text-slate-400 border border-slate-500/15" },
  both:     { label: "Both",     className: "bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/15" },
}

function CategoryTypeBadge({ type }: { type: NonNullable<Category["category_type"]> }) {
  const config = categoryTypeConfig[type]
  if (!config) return null
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs tracking-wide ${config.className}`}>
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
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="p-6">
        <Link href={returnTo} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Transactions
        </Link>
        <div className="mt-4 rounded-md bg-rose-500/10 border border-rose-500/15 p-4 text-rose-400 text-sm">
          {error || "Transaction not found"}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-12">
      <div className="mx-auto max-w-3xl">
        {/* Back Link + Actions */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Transactions
          </Link>
          {!isEditing && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-md border border-rose-500/15 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-400/80 hover:bg-rose-500/15 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>

          {/* Transaction Card */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            {/* Amount Header */}
            <div className="px-6 py-6 border-b border-white/[0.07]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {transaction.type === "income" ? (
                      <ArrowDownRight className="h-4 w-4 text-emerald-400/70" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-rose-400/70" />
                    )}
                    <span className={`text-xs uppercase tracking-wider font-medium ${
                      transaction.type === "income" ? "text-emerald-400/70" : "text-rose-400/70"
                    }`}>
                      {transaction.type === "income" ? "Income" : "Expense"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
                </div>
                <span className={`text-2xl font-semibold tabular-nums ${
                  transaction.type === "income" ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </span>
              </div>
            </div>

            {/* Transaction Details */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Description</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
                  />
                ) : (
                  <p className="text-sm text-slate-200">{transaction.description}</p>
                )}
              </div>

              {/* Amount */}
              {isEditing && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editData.amount || 0}
                    onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-200 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40"
                  />
                </div>
              )}

              {/* Date */}
              {isEditing && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={editData.date || ""}
                    onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Type */}
              {isEditing && (
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={editData.type || "expense"}
                    onChange={(e) => setEditData({ ...editData, type: e.target.value as "income" | "expense" })}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <select
                      value={editData.category_id || ""}
                      onChange={(e) => setEditData({ ...editData, category_id: e.target.value || null })}
                      className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
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
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-xs text-slate-400 border border-white/[0.07]">
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
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Bank Account</label>
                  <p className="text-sm text-slate-300">{transaction.bank_account_name}</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                {isEditing ? (
                  <textarea
                    value={editData.notes || ""}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    placeholder="Add notes..."
                    rows={3}
                    className="w-full rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40 resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-400">{transaction.notes || <span className="text-slate-600">—</span>}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-white/[0.06]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 uppercase tracking-wider mb-1">Created</label>
                    <p className="text-xs text-slate-500">
                      {transaction.created_at ? formatDate(transaction.created_at) : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 uppercase tracking-wider mb-1">Updated</label>
                    <p className="text-xs text-slate-500">
                      {transaction.updated_at ? formatDate(transaction.updated_at) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Actions */}
            {isEditing && (
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/[0.07] bg-white/[0.02]">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="mx-4 w-full max-w-sm rounded-lg border border-white/[0.08] bg-[#0f172a] p-5">
                <h3 className="text-sm font-semibold text-slate-200">Delete Transaction</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Are you sure you want to delete this transaction? This action cannot be undone.
                </p>
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 rounded-md border border-rose-500/20 bg-rose-500/15 px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
