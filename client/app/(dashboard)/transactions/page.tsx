"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  Search, 
  Filter, 
  Plus,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react"
import { useTransactions } from "@/hooks/use-transactions"
import { useCategories } from "@/hooks/use-categories"
import { Transaction, TransactionParams } from "@/lib/api"

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("")
  const [showFilters, setShowFilters] = useState(false)
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [currentPageSize, setCurrentPageSize] = useState(50)

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
    const params: TransactionParams = {
      page: 1,
      page_size: currentPageSize,
    }
    if (searchTerm) params.search = searchTerm
    if (selectedType !== "all") params.type = selectedType
    if (selectedCategory) params.category_id = selectedCategory
    if (selectedBankAccount) params.bank_account_id = selectedBankAccount
    if (dateRange.start) params.start_date = dateRange.start
    if (dateRange.end) params.end_date = dateRange.end
    
    fetchTransactions(params)
  }, [searchTerm, selectedType, selectedCategory, selectedBankAccount, dateRange.start, dateRange.end, currentPageSize])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handlePageChange = (newPage: number) => {
    const params: TransactionParams = {
      page: newPage,
      page_size: currentPageSize,
    }
    if (searchTerm) params.search = searchTerm
    if (selectedType !== "all") params.type = selectedType
    if (selectedCategory) params.category_id = selectedCategory
    if (selectedBankAccount) params.bank_account_id = selectedBankAccount
    if (dateRange.start) params.start_date = dateRange.start
    if (dateRange.end) params.end_date = dateRange.end
    
    fetchTransactions(params)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setCurrentPageSize(newPageSize)
  }

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
    // Defensive check: ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) {
      return `${prefix}₹0`
    }
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
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-slate-400">View and manage all your transactions.</p>
        </div>
        <Link href="/transactions/upload" className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Link>
      </div>

          {/* Search and Filters */}
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <form onSubmit={handleSearch} className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as "all" | "income" | "expense")}
                  className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="all">All Types</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>

                <select
                   value={selectedCategory}
                   onChange={(e) => setSelectedCategory(e.target.value)}
                   className="rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                 >
                   <option value="">All Categories</option>
                   {Array.isArray(categories) && categories.map((cat) => (
                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                   ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 px-4 text-sm text-white transition-colors cursor-pointer ${showFilters ? 'border-green-500' : ''}`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
              </div>
            </form>

            {/* Extended Filters */}
            {showFilters && (
              <div className="mt-4 flex flex-wrap gap-4 pt-4 border-t border-white/10">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    className="rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => setDateRange({ start: "", end: "" })}
                  className="self-end rounded-lg bg-white/5 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Clear Dates
                </button>
              </div>
            )}
          </div>

          {/* Error State */}
          {null}

          {/* Transactions List */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
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
                {/* Transaction Groups by Date */}
                <div className="divide-y divide-white/5">
                  {groupedTransactions.map((group) => (
                    <div key={group.date}>
                      {/* Date Header */}
                      <div className="sticky top-0 z-10 bg-[#0f172a] px-6 py-3 border-b border-white/10">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-white">
                            {formatDateHeader(group.date)}
                          </h3>
                          <span className="text-xs text-slate-400">
                            {group.transactions.length} transaction{group.transactions.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Transactions for this date */}
                      <div className="divide-y divide-white/5">
                        {group.transactions.map((transaction) => (
                          <Link
                            key={transaction.id}
                            href={`/transactions/${transaction.id}`}
                            className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer items-center"
                          >
                            <div className="col-span-3 text-sm text-slate-300">
                              {formatDate(transaction.date)}
                            </div>
                            <div className="col-span-4">
                              <p className="text-sm font-medium text-white truncate">{transaction.description}</p>
                              {transaction.bank_account_name && (
                                <p className="text-xs text-slate-500">{transaction.bank_account_name}</p>
                              )}
                            </div>
                            <div className="col-span-2">
                              <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                                {transaction.category_name || "Uncategorized"}
                              </span>
                            </div>
                            <div className="col-span-2">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                transaction.type === "income" ? "text-green-400" : "text-red-400"
                              }`}>
                                {transaction.type === "income" ? (
                                  <ArrowDownRight className="h-3 w-3" />
                                ) : (
                                  <ArrowUpRight className="h-3 w-3" />
                                )}
                                {transaction.type === "income" ? "Income" : "Expense"}
                              </span>
                            </div>
                            <div className={`col-span-1 text-right text-sm font-semibold ${
                              transaction.type === "income" ? "text-green-400" : "text-white"
                            }`}>
                              {formatAmount(transaction.amount, transaction.type)}
                            </div>
                          </Link>
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
                <p className="text-sm text-slate-400">
                  Showing {transactions.length > 0 ? ((page - 1) * currentPageSize) + 1 : 0} to {Math.min(page * currentPageSize, total)} of {total} transactions
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-400">Per page:</label>
                  <select
                    value={currentPageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-white/10 bg-white/5 py-1.5 px-3 text-sm text-white focus:border-green-500 focus:outline-none"
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
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-300 px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Last
                </button>
              </div>
            </div>
          )}
    </div>
  )
}
