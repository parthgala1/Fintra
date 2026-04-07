"use client"

import { useState, useEffect } from "react"
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
  Building2,
  CreditCard,
  Wallet,
  PiggyBank,
  DollarSign
} from "lucide-react"
import { api, BankAccount, CreateBankAccountData, UpdateBankAccountData } from "@/lib/api"
import { toast } from "sonner"
import { formatINR } from "@/lib/utils"

const ACCOUNT_TYPE_ICONS: Record<string, typeof Building2> = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  cash: DollarSign,
}

const ACCOUNT_TYPE_OPTIONS = [
  { value: "checking", label: "Checking Account" },
  { value: "savings", label: "Savings Account" },
  { value: "credit", label: "Credit Card" },
  { value: "investment", label: "Investment Account" },
  { value: "cash", label: "Cash" },
]

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<CreateBankAccountData>({
    account_name: "",
    account_type: "checking",
    institution_name: "",
    current_balance: 0,
  })

  const [editData, setEditData] = useState<UpdateBankAccountData>({})

  const fetchAccounts = async () => {
    try {
      const response = await api.getBankAccounts()
      setAccounts(response.accounts)
    } catch {
      setError("Failed to fetch bank accounts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (error) toast.error(error)
  }, [error])

  const filteredAccounts = accounts.filter(account => 
    account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.institution_name?.toLowerCase()?.includes(searchTerm.toLowerCase())
  )

  const totalBalance = accounts
    .filter(a => a.is_active)
    .reduce((sum, a) => sum + a.current_balance, 0)

  const handleCreate = async () => {
    if (!formData.account_name.trim()) return
    setIsSaving(true)
    try {
      const newAccount = await api.createBankAccount(formData)
      setAccounts([...accounts, newAccount])
      setShowCreateModal(false)
      setFormData({ account_name: "", account_type: "checking", institution_name: "", current_balance: 0 })
    } catch (err) {
      console.error("Failed to create account:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = async (id: string) => {
    setIsSaving(true)
    try {
      const updated = await api.updateBankAccount(id, editData)
      setAccounts(accounts.map(a => a.id === id ? updated : a))
      setEditingId(null)
      setEditData({})
    } catch (err) {
      console.error("Failed to update account:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteBankAccount(id)
      setAccounts(accounts.filter(a => a.id !== id))
      setDeleteConfirmId(null)
    } catch (err) {
      console.error("Failed to delete account:", err)
    }
  }

  const toggleActive = async (account: BankAccount) => {
    try {
      const updated = await api.updateBankAccount(account.id, { 
        is_active: !account.is_active 
      })
      setAccounts(accounts.map(a => a.id === account.id ? updated : a))
    } catch (err) {
      console.error("Failed to toggle account:", err)
    }
  }

  const startEditing = (account: BankAccount) => {
    setEditingId(account.id)
    setEditData({
      account_name: account.account_name,
      account_type: account.account_type,
      institution_name: account.institution_name ?? undefined,
      current_balance: account.current_balance,
      is_active: account.is_active
    })
  }

  const formatBalance = (amount: number) => {
    return formatINR(amount, 2)
  }

  const getAccountIcon = (type: string) => {
    const Icon = ACCOUNT_TYPE_ICONS[type] || Wallet
    return <Icon className="h-5 w-5" />
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
            <Link href="/bank-accounts" className="text-sm font-medium text-green-400">Accounts</Link>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Account
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-7xl px-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">Bank Accounts</h1>
            <p className="text-slate-400">Manage your connected bank accounts.</p>
          </div>

          {/* Total Balance Card */}
          <div className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-green-500/10 to-blue-500/10 p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Balance</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {formatBalance(totalBalance)}
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {accounts.filter(a => a.is_active).length} active accounts
                </p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/20">
                <Wallet className="h-7 w-7 text-green-400" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Error State */}
          {null}

          {/* Accounts Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-white/10 bg-white/5">
              <Wallet className="h-12 w-12 text-slate-500 mb-4" />
              <p className="text-slate-400">No bank accounts found.</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="mt-2 text-green-400 hover:text-green-300"
              >
                Add your first account
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAccounts.map((account) => (
                <div 
                  key={account.id}
                  className={`rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10 ${
                    !account.is_active ? "opacity-60" : ""
                  }`}
                >
                  {editingId === account.id ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={editData.account_name || ""}
                        onChange={(e) => setEditData({ ...editData, account_name: e.target.value })}
                        placeholder="Account name"
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                        autoFocus
                      />
                      <select
                        value={editData.account_type || "checking"}
                        onChange={(e) => setEditData({ ...editData, account_type: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                      >
                        {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={editData.institution_name || ""}
                        onChange={(e) => setEditData({ ...editData, institution_name: e.target.value })}
                        placeholder="Bank/Institution name"
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editData.current_balance || 0}
                        onChange={(e) => setEditData({ ...editData, current_balance: parseFloat(e.target.value) })}
                        placeholder="Balance"
                        className="w-full rounded-lg border border-white/10 bg-white/5 py-2 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(account.id)}
                          disabled={isSaving}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 py-2 text-sm font-semibold text-[#020617] hover:bg-green-400 disabled:opacity-50 cursor-pointer"
                        >
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditData({}) }}
                          className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                            {getAccountIcon(account.account_type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{account.account_name}</h3>
                            <p className="text-xs text-slate-400">
                              {account.institution_name || "No institution"}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleActive(account)}
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                            account.is_active 
                              ? "bg-green-500/10 text-green-400 hover:bg-green-500/20" 
                              : "bg-slate-500/10 text-slate-400 hover:bg-slate-500/20"
                          }`}
                        >
                          {account.is_active ? "Active" : "Inactive"}
                        </button>
                      </div>
                      
                      <div className="mb-4">
                        <p className="text-sm text-slate-400">Current Balance</p>
                        <p className="text-2xl font-bold text-white mt-1">
                          {formatBalance(account.current_balance)}
                        </p>
                      </div>

                      {/* Reconciliation Status */}
                      {account.reconciliation_status && (
                        <div className="mb-4 rounded-lg bg-white/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">Reconciliation Status</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded inline-block ${
                              account.reconciliation_status === "reconciled" 
                                ? "bg-green-500/10 text-green-400"
                                : account.reconciliation_status === "discrepancy"
                                ? "bg-yellow-500/10 text-yellow-400"
                                : "bg-slate-500/10 text-slate-400"
                            }`}>
                              {account.reconciliation_status.charAt(0).toUpperCase() + account.reconciliation_status.slice(1)}
                            </span>
                          </div>
                          
                          {account.statement_date && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Statement Date</span>
                              <span className="text-white">
                                {new Date(account.statement_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                            </div>
                          )}

                          {account.statement_balance !== null && account.statement_balance !== undefined && (
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Statement Balance</span>
                              <span className="text-white">
                                {formatBalance(account.statement_balance)}
                              </span>
                            </div>
                          )}

                          {account.balance_discrepancy_amount !== null && account.balance_discrepancy_amount !== undefined && account.balance_discrepancy_amount !== 0 && (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                              <span className="text-orange-400">Discrepancy</span>
                              <span className="text-orange-400 font-medium">
                                ₹{Math.abs(account.balance_discrepancy_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}

                          {account.last_reconciled_at && (
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                              <span className="text-slate-400">Last Reconciled</span>
                              <span className="text-slate-300">
                                {new Date(account.last_reconciled_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1 pt-4 border-t border-white/10">
                        <button
                          onClick={() => startEditing(account)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(account.id)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Add Bank Account</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="e.g., Primary Checking"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Account Type</label>
                <select
                  value={formData.account_type}
                  onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Bank/Institution</label>
                <input
                  type="text"
                  value={formData.institution_name || ""}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  placeholder="e.g., HDFC Bank"
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase mb-2">Current Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.current_balance || 0}
                  onChange={(e) => setFormData({ ...formData, current_balance: parseFloat(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
                disabled={isSaving || !formData.account_name.trim()}
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Add Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] p-6">
            <h3 className="text-lg font-semibold text-white">Delete Account</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete this bank account? This won&apos;t delete your transactions.
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
