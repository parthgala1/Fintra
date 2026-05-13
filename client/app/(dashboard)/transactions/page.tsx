"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { 
  Search, 
  Filter, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Trash2,
  Save,
  X
} from "lucide-react"
import { useTransactions, useTransaction } from "@/hooks/use-transactions"
import { useCategories } from "@/hooks/use-categories"
import { Transaction, TransactionParams, UpdateTransactionData, Category } from "@/lib/api"

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialType = searchParams.get("type")
  const parsedPage = Number(searchParams.get("page") || "1")
  const parsedPageSize = Number(searchParams.get("pageSize") || "50")

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "")
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">(
    initialType === "income" || initialType === "expense" ? initialType : "all"
  )
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") || "")
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>(searchParams.get("categoryType") || "")
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>(searchParams.get("bankAccount") || "")
  const [showFilters, setShowFilters] = useState(searchParams.get("showFilters") === "1")
  const [dateRange, setDateRange] = useState({
    start: searchParams.get("startDate") || "",
    end: searchParams.get("endDate") || "",
  })
  const [currentPage, setCurrentPage] = useState(parsedPage > 0 ? parsedPage : 1)
  const [currentPageSize, setCurrentPageSize] = useState(
    parsedPageSize === 25 || parsedPageSize === 50 || parsedPageSize === 100 ? parsedPageSize : 50
  )

  const { 
    transactions, 
    total, 
    page, 
    pageSize, 
    totalPages, 
    isLoading, 
    error,
    fetchTransactions 
  } = useTransactions()

  const { categories } = useCategories()

  useEffect(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set("search", searchTerm)
    if (selectedType !== "all") params.set("type", selectedType)
    if (selectedCategory) params.set("category", selectedCategory)
    if (selectedCategoryType) params.set("categoryType", selectedCategoryType)
    if (selectedBankAccount) params.set("bankAccount", selectedBankAccount)
    if (dateRange.start) params.set("startDate", dateRange.start)
    if (dateRange.end) params.set("endDate", dateRange.end)
    if (showFilters) params.set("showFilters", "1")
    params.set("page", String(currentPage))
    params.set("pageSize", String(currentPageSize))
    router.replace(`${pathname}?${params.toString()}`)
  }, [
    searchTerm,
    selectedType,
    selectedCategory,
    selectedCategoryType,
    selectedBankAccount,
    dateRange.start,
    dateRange.end,
    showFilters,
    currentPage,
    currentPageSize,
    router,
    pathname,
  ])

  useEffect(() => {
    const params: TransactionParams = {
      page: currentPage,
      page_size: currentPageSize,
    }
    if (searchTerm) params.search = searchTerm
    if (selectedType !== "all") params.type = selectedType
    if (selectedCategory) params.category_id = selectedCategory
    if (selectedCategoryType) params.category_type = selectedCategoryType
    if (selectedBankAccount) params.bank_account_id = selectedBankAccount
    if (dateRange.start) params.start_date = dateRange.start
    if (dateRange.end) params.end_date = dateRange.end
    
    fetchTransactions(params)
  }, [
    searchTerm,
    selectedType,
    selectedCategory,
    selectedCategoryType,
    selectedBankAccount,
    dateRange.start,
    dateRange.end,
    currentPage,
    currentPageSize,
    fetchTransactions,
  ])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPageSize(newPageSize)
    setCurrentPage(1)
  }

  const resetToFirstPage = () => setCurrentPage(1)

  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

  const refreshList = useCallback(() => {
    const params: TransactionParams = {
      page: currentPage,
      page_size: currentPageSize,
    }
    if (searchTerm) params.search = searchTerm
    if (selectedType !== "all") params.type = selectedType
    if (selectedCategory) params.category_id = selectedCategory
    if (selectedCategoryType) params.category_type = selectedCategoryType
    if (selectedBankAccount) params.bank_account_id = selectedBankAccount
    if (dateRange.start) params.start_date = dateRange.start
    if (dateRange.end) params.end_date = dateRange.end
    fetchTransactions(params)
  }, [currentPage, currentPageSize, searchTerm, selectedType, selectedCategory, selectedCategoryType, selectedBankAccount, dateRange.start, dateRange.end, fetchTransactions])

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    } catch (error) {
      return "Invalid Date"
    }
  }

  const formatDateHeader = (dateString: string) => {
    try {
      if (!dateString) return "Invalid Date"
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid Date"
      
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      // Reset time for comparison
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      
      if (dateOnly.getTime() === todayOnly.getTime()) {
        return "Today"
      } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return "Yesterday"
      } else {
        return date.toLocaleDateString("en-IN", { 
          weekday: "long",
          day: "numeric", 
          month: "long", 
          year: "numeric" 
        })
      }
    } catch (error) {
      return "Invalid Date"
    }
  }

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === "income" ? "+" : "-"
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) return `${prefix}₹0`
    return `${prefix}₹${Math.abs(numAmount).toLocaleString("en-IN")}`
  }

  // Group transactions by date
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped: { [key: string]: Transaction[] } = {}
    
    transactions.forEach((transaction) => {
      const dateKey = transaction.date?.split('T')[0] ?? "unknown"
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(transaction)
    })
    
    // Sort dates in descending order (newest first)
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
    
    return sortedDates.map(date => ({
      date,
      transactions: grouped[date]
    }))
  }

  const groupedTransactions = groupTransactionsByDate(transactions)


  return (
    <div className="p-6 pb-12">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">Transactions</h1>
          <p className="text-slate-500 text-sm mt-0.5">View and manage all your transactions.</p>
        </div>
        <Link href="/transactions/upload" className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition-all hover:bg-slate-700 hover:border-slate-500 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Link>
      </div>

          {/* Search and Filters */}
          <div className="mb-6 rounded-lg border border-white/[0.07] bg-white/[0.03] p-4">
            <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    resetToFirstPage()
                  }}
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] py-2 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-600 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500/50"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value as "all" | "income" | "expense")
                    resetToFirstPage()
                  }}
                  className="rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                   value={selectedCategory}
                   onChange={(e) => {
                     setSelectedCategory(e.target.value)
                     resetToFirstPage()
                   }}
                   className="rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                 >
                   <option value="">All Categories</option>
                   {Array.isArray(categories) && categories.map((cat) => (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                   ))}
                </select>

                <select
                  value={selectedCategoryType}
                  onChange={(e) => {
                    setSelectedCategoryType(e.target.value)
                    resetToFirstPage()
                  }}
                  className="rounded-md border border-white/[0.08] bg-[#0f172a] py-2 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                >
                  <option value="">All Buckets</option>
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                  <option value="savings">Savings</option>
                  <option value="transfer">Transfer</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 rounded-md border bg-white/[0.04] py-2 px-3 text-sm text-slate-400 transition-colors cursor-pointer hover:text-slate-200 ${showFilters ? 'border-slate-400 text-slate-200' : 'border-white/[0.08]'}`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </form>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-white/[0.07]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, start: e.target.value })
                      resetToFirstPage()
                    }}
                    className="rounded-md border border-white/[0.08] bg-[#0f172a] py-1.5 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, end: e.target.value })
                      resetToFirstPage()
                    }}
                    className="rounded-md border border-white/[0.08] bg-[#0f172a] py-1.5 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    setDateRange({ start: "", end: "" })
                    resetToFirstPage()
                  }}
                  className="self-end rounded-md border border-white/[0.07] bg-transparent px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Clear Dates
                </button>
              </div>
            )}
          </div>

          {/* Error State */}
          {null}

          {/* Transactions List */}
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-green-500" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-slate-400">No transactions found.</p>
                <Link href="/transactions/upload" className="mt-2 text-green-400 hover:text-green-300">
                  Upload a statement to get started
                </Link>
              </div>
            ) : (
              <>
                {/* Column Headers */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-2.5 border-b border-white/[0.07] bg-white/[0.02]">
                  <div className="col-span-5 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</div>
                  <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</div>
                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Bucket</div>
                  <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Amount</div>
                </div>

                {/* Transaction Groups by Date */}
                <div className="divide-y divide-white/5">
                  {groupedTransactions.map((group) => (
                    <div key={group.date}>
                      {/* Date Header */}
                      <div className="px-6 py-2 border-b border-white/[0.06] bg-[#0a1120]/60">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            {formatDateHeader(group.date)}
                          </h3>
                          <span className="text-xs text-slate-600">
                            {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Transactions for this date */}
                          <div className="divide-y divide-white/[0.04]">
                        {group.transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            onClick={() => setSelectedTxId(transaction.id)}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-colors cursor-pointer items-center"
                          >
                            <div className="col-span-5">
                              <p className="text-sm text-slate-200 truncate">{transaction.description}</p>
                              {transaction.bank_account_name && (
                                <p className="text-xs text-slate-500">{transaction.bank_account_name}</p>
                              )}
                            </div>
                            <div className="col-span-3">
                              <span className="inline-flex items-center rounded px-2 py-0.5 text-xs text-slate-400 w-fit border border-white/[0.07]">
                                {transaction.category_name || "Uncategorized"}
                              </span>
                            </div>
                            <div className="col-span-2">
                              {transaction.category_type ? (
                                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium w-fit capitalize tracking-wide ${
                                  transaction.category_type === "needs" ? "bg-blue-500/10 text-blue-400/80" :
                                  transaction.category_type === "wants" ? "bg-violet-500/10 text-violet-400/80" :
                                  transaction.category_type === "savings" ? "bg-teal-500/10 text-teal-400/80" :
                                  transaction.category_type === "income" ? "bg-emerald-500/10 text-emerald-400/80" :
                                  "bg-slate-500/10 text-slate-500"
                                }`}>
                                  {transaction.category_type}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </div>
                            <div className={`col-span-2 text-right text-sm font-medium tabular-nums ${
                              transaction.type === "income" ? "text-emerald-400" : "text-rose-400"
                            }`}>
                              {formatAmount(transaction.amount, transaction.type)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-xs text-slate-500">
                  Showing {transactions.length > 0 ? ((currentPage - 1) * currentPageSize) + 1 : 0}–{Math.min(currentPage * currentPageSize, total)} of {total} transactions
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Per page:</label>
                  <select
                    value={currentPageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="rounded-md border border-white/[0.08] bg-[#0f172a] py-1.5 px-3 text-sm text-slate-300 focus:border-slate-500 focus:outline-none"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={currentPage === 1}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-500 px-2 tabular-nums">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          )}

      {/* Transaction Detail Modal */}
      {selectedTxId && (
        <TransactionModal
          id={selectedTxId}
          categories={categories}
          onClose={() => setSelectedTxId(null)}
          onMutated={() => { setSelectedTxId(null); refreshList() }}
        />
      )}
    </div>
  )
}

// ─── Transaction Detail Modal ─────────────────────────────────────────────────

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

interface TransactionModalProps {
  id: string
  categories: Category[]
  onClose: () => void
  onMutated: () => void
}

function TransactionModal({ id, categories, onClose, onMutated }: TransactionModalProps) {
  const { transaction, isLoading, error, updateTransaction, deleteTransaction } = useTransaction(id)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<UpdateTransactionData>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Trigger enter transition on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 250)
  }, [onClose])

  useEffect(() => {
    if (transaction) {
      setEditData({
        description: transaction.description,
        amount: transaction.amount,
        date: transaction.date,
        type: transaction.type,
        category_id: transaction.category_id,
        notes: transaction.notes,
      })
    }
  }, [transaction])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [handleClose])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  }

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === "income" ? "+" : "-"
    const num = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(num)) return `${prefix}₹0.00`
    return `${prefix}₹${Math.abs(num).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateTransaction(id, editData)
      setIsEditing(false)
      onMutated()
    } catch (err) {
      console.error("Failed to update transaction:", err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTransaction(id)
      onMutated()
    } catch (err) {
      console.error("Failed to delete transaction:", err)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-250 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/[0.07] bg-[#0b1120] shadow-2xl transition-transform duration-250 ease-out ${
        isVisible ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transaction Detail</span>
          <div className="flex items-center gap-2">
            {!isEditing && transaction && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-400 hover:bg-white/[0.07] hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-md border border-rose-500/15 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-400/80 hover:bg-rose-500/15 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : error || !transaction ? (
            <div className="p-5">
              <div className="rounded-md bg-rose-500/10 border border-rose-500/15 p-4 text-rose-400 text-sm">
                {error || "Transaction not found"}
              </div>
            </div>
          ) : (
            <>
              {/* Amount Header */}
              <div className="px-5 py-5 border-b border-white/[0.07]">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      {transaction.type === "income" ? (
                        <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400/70" />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5 text-rose-400/70" />
                      )}
                      <span className={`text-xs uppercase tracking-wider ${
                        transaction.type === "income" ? "text-emerald-400/70" : "text-rose-400/70"
                      }`}>
                        {transaction.type === "income" ? "Income" : "Expense"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
                  </div>
                  <span className={`text-xl font-semibold tabular-nums ${
                    transaction.type === "income" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {formatAmount(transaction.amount, transaction.type)}
                  </span>
                </div>
              </div>

              {/* Fields */}
              <div className="p-5 space-y-5">
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

                {/* Amount (edit only) */}
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

                {/* Date (edit only) */}
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

                {/* Type (edit only) */}
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
                        return selected ? <CategoryTypeBadge type={selected.category_type} /> : null
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
                      <p className="text-xs text-slate-500">{transaction.created_at ? formatDate(transaction.created_at) : "—"}</p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 uppercase tracking-wider mb-1">Updated</label>
                      <p className="text-xs text-slate-500">{transaction.updated_at ? formatDate(transaction.updated_at) : "—"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Edit Action Footer */}
        {isEditing && (
          <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] bg-white/[0.02] px-5 py-3.5">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-slate-400 hover:bg-white/[0.06] hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
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
    </>
  )
}
