"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Target, 
  CreditCard,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Activity,
  Bell,
  Settings,
  Upload,
  Loader2
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useBudgets } from "@/hooks/use-budgets"
import { useTransactions } from "@/hooks/use-transactions"
import { useGoals } from "@/hooks/use-goals"
import { useRecommendations } from "@/hooks/use-recommendations"
import { api, BudgetReport, Transaction } from "@/lib/api"

export default function DashboardPage() {
  const { user } = useAuth()
  const { budgets, defaultBudget, isLoading: budgetsLoading } = useBudgets()
  const { transactions, isLoading: transactionsLoading } = useTransactions({ page_size: 6 })
  const { goals, isLoading: goalsLoading } = useGoals("active")
  const { recommendations, isLoading: recommendationsLoading } = useRecommendations({ limit: 1 })
  const [currentReport, setCurrentReport] = useState<BudgetReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  useEffect(() => {
    const fetchReport = async () => {
      if (defaultBudget?.id) {
        setReportLoading(true)
        try {
          const report = await api.getCurrentReport(defaultBudget.id)
          setCurrentReport(report)
        } catch (err) {
          console.error("Failed to fetch report:", err)
        } finally {
          setReportLoading(false)
        }
      }
    }
    fetchReport()
  }, [defaultBudget?.id])

  const isLoading = budgetsLoading || transactionsLoading || reportLoading || goalsLoading

  const formatAmount = (amount: number) => {
    // Defensive check: ensure amount is a number
    const numAmount = typeof amount === "number" ? amount : parseFloat(String(amount))
    if (isNaN(numAmount)) {
      return `₹0`
    }
    return `₹${numAmount.toLocaleString("en-IN")}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const diffTime = today.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
  }

  // Calculate overview data from report or use defaults
  const monthlyIncome = currentReport?.total_income ?? 80000
  const totalExpenses = currentReport?.total_expenses ?? 52400
  const savings = currentReport?.total_savings ?? 27600
  const savingsRate = currentReport?.savings_rate ?? 34.5

  // Calculate budget breakdown from default budget
  const budgetBreakdown = defaultBudget ? [
    { category: "Needs", amount: defaultBudget.needs_amount, percentage: defaultBudget.needs_percentage, color: "bg-blue-500", target: 50 },
    { category: "Wants", amount: defaultBudget.wants_amount, percentage: defaultBudget.wants_percentage, color: "bg-purple-500", target: 30 },
    { category: "Savings", amount: defaultBudget.savings_amount, percentage: defaultBudget.savings_percentage, color: "bg-green-500", target: 20 }
  ] : [
    { category: "Needs", amount: 32000, percentage: 50, color: "bg-blue-500", target: 50 },
    { category: "Wants", amount: 19200, percentage: 30, color: "bg-purple-500", target: 30 },
    { category: "Investments", amount: 12800, percentage: 20, color: "bg-green-500", target: 20 }
  ]

  // Transform transactions for display
  const recentTransactions = transactions.slice(0, 6).map((t: Transaction) => ({
    id: t.id,
    name: t.description,
    category: t.category_name ?? "Uncategorized",
    date: formatDate(t.date),
    amount: t.amount,
    type: t.type
  }))

  // Get active goals (limit to 3 for dashboard)
  const activeGoals = goals.filter(g => g.status === "active").slice(0, 3).map(g => ({
    id: g.id,
    name: g.name,
    current: g.current_amount,
    target: g.target_amount,
    deadline: g.target_date ? formatDate(g.target_date) : "No deadline",
    progress: g.progress_percentage || 0
  }))

  // Mock monthly trend (would come from API in future)
  const monthlyTrend = [
    { month: "Oct", income: 70000, expenses: 48000 },
    { month: "Nov", income: 72000, expenses: 51000 },
    { month: "Dec", income: 75000, expenses: 58000 },
    { month: "Jan", income: 78000, expenses: 50000 },
    { month: "Feb", income: 78000, expenses: 49000 },
    { month: "Mar", income: monthlyIncome, expenses: totalExpenses }
  ]

  const cardIconClasses = {
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    blue: "bg-blue-500/10 text-blue-400",
  } as const

  const overviewCards = [
    {
      title: "Monthly Income",
      value: formatAmount(monthlyIncome),
      change: "+12%",
      changeType: "positive",
      icon: DollarSign,
      color: "green"
    },
    {
      title: "Total Expenses",
      value: formatAmount(totalExpenses),
      change: "-8%",
      changeType: "positive",
      icon: CreditCard,
      color: "red"
    },
    {
      title: "Savings",
      value: formatAmount(savings),
      change: "+23%",
      changeType: "positive",
      icon: Wallet,
      color: "green"
    },
    {
      title: "Savings Rate",
      value: `${savingsRate.toFixed(1)}%`,
      change: "+2.1%",
      changeType: "positive",
      icon: TrendingUp,
      color: "blue"
    }
  ]

  return (
    <div className="p-6 pb-12">
      {/* Loading State */}
      {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-green-500" />
            </div>
          ) : (
            <>
              {/* Page Header */}
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-slate-400">Welcome back{user?.name ? `, ${user.name?.split(" ")[0] ?? user.name}` : ""}! Here's your financial overview.</p>
                </div>
                <Link href="/transactions/upload" className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Upload Statement
                </Link>
              </div>

              {/* Overview Cards */}
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {overviewCards.map((card, index) => (
                  <div 
                    key={index}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${cardIconClasses[card.color as keyof typeof cardIconClasses]}`}>
                        <card.icon className="h-5 w-5" />
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${
                        card.changeType === "positive" ? "text-green-400" : "text-red-400"
                      }`}>
                        {card.changeType === "positive" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {card.change}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Budget Breakdown - 50/30/20 */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Budget Breakdown</h2>
                    <span className="text-xs text-slate-500">50/30/20 Rule</span>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-700">
                      {budgetBreakdown.map((item, index) => (
                        <div 
                          key={index}
                          className={`${item.color} transition-all`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {budgetBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${item.color}`} />
                          <span className="text-sm text-slate-300">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatAmount(item.amount)}</p>
                          <p className="text-xs text-slate-500">{item.percentage}% / {item.target}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spending by Category */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Spending by Category</h2>
                    <PieChart className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="space-y-3">
                    {currentReport ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-300">Needs</span>
                            <span className="text-sm font-medium">{formatAmount(currentReport.total_needs ?? 0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-700">
                              <div className="h-full rounded-full bg-blue-500" style={{ width: `${(currentReport.total_expenses ?? 0) > 0 ? ((currentReport.total_needs ?? 0) / (currentReport.total_expenses ?? 1) * 100).toFixed(0) : 0}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{(currentReport.total_expenses ?? 0) > 0 ? (((currentReport.total_needs ?? 0) / (currentReport.total_expenses ?? 1) * 100)).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-300">Wants</span>
                            <span className="text-sm font-medium">{formatAmount(currentReport.total_wants ?? 0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-slate-700">
                              <div className="h-full rounded-full bg-purple-500" style={{ width: `${(currentReport.total_expenses ?? 0) > 0 ? ((currentReport.total_wants ?? 0) / (currentReport.total_expenses ?? 1) * 100).toFixed(0) : 0}%` }} />
                            </div>
                            <span className="text-xs text-slate-500">{(currentReport.total_expenses ?? 0) > 0 ? (((currentReport.total_wants ?? 0) / (currentReport.total_expenses ?? 1) * 100)).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {[
                          { category: "Rent", amount: 18000, percentage: 34, color: "bg-blue-500" },
                          { category: "Food & Dining", amount: 8500, percentage: 16, color: "bg-orange-500" },
                          { category: "Transportation", amount: 4200, percentage: 8, color: "bg-yellow-500" },
                          { category: "Entertainment", amount: 5100, percentage: 10, color: "bg-purple-500" },
                          { category: "Shopping", amount: 8400, percentage: 16, color: "bg-pink-500" }
                        ].map((item, index) => (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-300">{item.category}</span>
                              <span className="text-sm font-medium">{formatAmount(item.amount)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-700">
                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }} />
                              </div>
                              <span className="text-xs text-slate-500">{item.percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Goals Progress */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Goals</h2>
                    <Link href="/goals" className="text-sm text-green-400 hover:text-green-300 transition-colors">
                      View All
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {activeGoals.length > 0 ? (
                      activeGoals.map((goal) => (
                        <Link 
                          key={goal.id} 
                          href={`/goals/${goal.id}`}
                          className="block p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{goal.name}</span>
                            <span className="text-xs text-slate-400">{goal.deadline}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-slate-400">{formatAmount(goal.current)}</span>
                            <span className="text-slate-400">{formatAmount(goal.target)}</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-700">
                            <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${Math.min(goal.progress, 100)}%` }} />
                          </div>
                          <p className="text-xs text-green-400 mt-1.5">{goal.progress.toFixed(0)}% complete</p>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <p className="mb-2">No goals yet.</p>
                        <Link href="/goals/create" className="text-green-400 hover:text-green-300 inline-block">
                          Create your first goal
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Transactions & Monthly Trend */}
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Recent Transactions */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Recent Transactions</h2>
                    <Link href="/transactions" className="text-sm text-green-400 hover:text-green-300 transition-colors">
                      View All
                    </Link>
                  </div>

                  <div className="space-y-3">
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((txn) => (
                        <div 
                          key={txn.id}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                              txn.type === "income" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                            }`}>
                              {txn.type === "income" ? (
                                <ArrowDownRight className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{txn.name}</p>
                              <p className="text-xs text-slate-400">{txn.category} • {txn.date}</p>
                            </div>
                          </div>
                          <p className={`text-sm font-semibold ${
                            txn.type === "income" ? "text-green-400" : "text-white"
                          }`}>
                            {txn.type === "income" ? "+" : "-"}{formatAmount(Math.abs(txn.amount))}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        <p>No transactions yet.</p>
                        <Link href="/transactions/upload" className="text-green-400 hover:text-green-300 mt-2 inline-block">
                          Upload a statement to get started
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Monthly Trend</h2>
                    <BarChart3 className="h-5 w-5 text-slate-400" />
                  </div>

                  <div className="flex items-end justify-between gap-2 h-48">
                    {monthlyTrend.map((item, index) => {
                      const maxAmount = Math.max(...monthlyTrend.map(m => m.income), 1) // Ensure at least 1 to avoid division by zero
                      const incomeHeight = maxAmount > 0 ? (item.income / maxAmount) * 100 : 0
                      const expenseHeight = maxAmount > 0 ? (item.expenses / maxAmount) * 100 : 0
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 gap-2">
                          <div className="flex items-end gap-1 h-36 w-full justify-center">
                            <div 
                              className="w-4 bg-green-500 rounded-t-md transition-all hover:opacity-80"
                              style={{ height: `${incomeHeight}%` }}
                            />
                            <div 
                              className="w-4 bg-purple-500 rounded-t-md transition-all hover:opacity-80"
                              style={{ height: `${expenseHeight}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{item.month}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-xs text-slate-400">Income</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      <span className="text-xs text-slate-400">Expenses</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights / Top Recommendation */}
              {!recommendationsLoading && recommendations.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                      <Activity className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">Top Recommendation</h3>
                      <p className="text-slate-300 mb-3">
                        {recommendations[0].description}
                      </p>
                      {recommendations[0].potential_savings && (
                        <p className="text-sm text-green-400 mb-3">
                          Potential savings: ₹{recommendations[0].potential_savings.toLocaleString()}
                        </p>
                      )}
                      <Link 
                        href="/recommendations" 
                        className="text-sm text-green-400 hover:text-green-300 underline"
                      >
                        View all recommendations →
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-6 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                      <Activity className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Quick Insight</h3>
                      <p className="text-slate-300">
                        Your savings rate is <span className="text-green-400 font-semibold">{savingsRate.toFixed(1)}%</span> — 
                        above the recommended 20%! You could reach your emergency fund goal 2 months earlier 
                        by increasing investments to 25% of income.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
    </div>
  )
}
