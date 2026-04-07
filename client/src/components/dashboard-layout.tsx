"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { 
  TrendingUp,
  Wallet,
  CreditCard,
  Target,
  PieChart,
  Tags,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Loader2,
  Lightbulb
} from "lucide-react"
import { useState } from "react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: TrendingUp },
  { href: "/transactions", label: "Transactions", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: CreditCard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/recommendations", label: "Recommendations", icon: Lightbulb },
  { href: "/bank-accounts", label: "Accounts", icon: BankIcon },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/category-mappings", label: "Rules", icon: Settings },
  { href: "/budgets/alerts", label: "Alerts", icon: Bell },
]

function BankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

interface SidebarProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, isLoading: authLoading } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-[#22C55E]" />
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return null
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-[#0F172A] border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-[#0F172A] border-r border-white/10 z-40 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22C55E]">
              <TrendingUp className="h-5 w-5 text-[#020617]" />
            </div>
            <span className="text-xl font-semibold text-white tracking-tight">Fintra</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#22C55E]/10 text-[#22C55E]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-[#22C55E]' : ''}`} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-4">
          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer mb-3"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-[#1E293B] flex items-center justify-center text-sm font-medium text-slate-300">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || ""}</p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={authLoading}
            className="flex items-center gap-3 w-full px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
            {authLoading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
