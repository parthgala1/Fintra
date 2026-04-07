"use client";

import Link from "next/link";
import {
  TrendingUp,
  Target,
  PieChart,
  Wallet,
  CreditCard,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";

const features = [
  {
    icon: CreditCard,
    title: "Data Layer",
    description:
      "Upload your bank statements via CSV. We parse and normalize all your transactions automatically.",
  },
  {
    icon: PieChart,
    title: "Smart Categorization",
    description:
      "Rule-based categorization with AI fallback. Every expense automatically sorted into needs, wants, and investments.",
  },
  {
    icon: TrendingUp,
    title: "Budget Intelligence",
    description:
      "Follow the 50/30/20 rule or customize your allocation. Compare planned vs actual spending in real-time.",
  },
  {
    icon: Sparkles,
    title: "Budget Sandbox",
    description:
      "Excel-like planner with guardrails. Add categories, edit percentages, and simulate financial scenarios.",
  },
  {
    icon: Target,
    title: "Goal Engine",
    description:
      "Set financial goals with deadlines. Get gap analysis and actionable recommendations to hit your targets.",
  },
  {
    icon: Wallet,
    title: "Behavioral Insights",
    description:
      "Understand the true cost of purchases with time-to-earn calculations. Get alerts when you breach your budget.",
  },
];

const benefits = [
  "Deterministic core - all calculations are predictable and explainable",
  "AI enhances understanding, not correctness",
  "Minimal friction - upload once, get insights forever",
  "Action-oriented: every feature answers 'What should I do next?'",
  "Built for developers and early professionals",
  "Your data stays yours - no third-party sharing",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#020617]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
              <TrendingUp className="h-5 w-5 text-[#020617]" />
            </div>
            <span className="text-xl font-semibold tracking-tight">Fintra</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-[#020617] transition-all hover:bg-green-400 hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/2 top-1/4 h-96 w-96 rounded-full bg-green-500/20 blur-3xl" />
          <div className="absolute -right-1/2 bottom-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute left-1/4 top-1/2 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-300">
            <Sparkles className="h-4 w-4 text-green-400" />
            <span>Personal Financial Decision Engine</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
            Your finances,{" "}
            <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              decoded.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-400 md:text-xl">
            Most apps answer &ldquo;What did I spend?&rdquo;
            <br className="hidden md:block" />
            Fintra answers:{" "}
            <span className="text-white font-medium">
              &ldquo;What should I do next?&rdquo;
            </span>
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group flex items-center gap-2 rounded-xl bg-green-500 px-8 py-4 text-lg font-semibold text-[#020617] transition-all hover:bg-green-400 hover:scale-105"
            >
              Start for free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-lg font-medium text-white transition-all hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card required. Free forever for personal use.
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ArrowDown />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Everything you need to master your money
            </h2>
            <p className="mx-auto max-w-2xl text-slate-400">
              From parsing bank statements to calculating goal timelines —
              Fintra gives you the complete financial picture.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-green-500/30 hover:bg-white/10"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 text-green-400 group-hover:bg-green-500/20 transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works / Philosophy Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                Financial decisions,{" "}
                <span className="text-green-400">simplified.</span>
              </h2>
              <p className="mb-8 text-lg text-slate-400">
                Fintra isn&apos;t just another budgeting app. It&apos;s a
                decision engine that tells you exactly what to do next with your
                money.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400 mt-0.5" />
                    <span className="text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 blur-3xl" />
              <div className="relative rounded-2xl border border-white/10 bg-[#0F172A] p-8 backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Monthly Income</span>
                    <span className="text-xl font-semibold text-white">
                      ₹80,000
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Needs (50%)</span>
                        <span className="text-white">₹40,000</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700">
                        <div className="h-full w-1/2 rounded-full bg-blue-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Wants (30%)</span>
                        <span className="text-white">₹24,000</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700">
                        <div className="h-full w-[30%] rounded-full bg-purple-500" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">
                          Investments (20%)
                        </span>
                        <span className="text-white">₹16,000</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700">
                        <div className="h-full w-[20%] rounded-full bg-green-500" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                    <p className="text-sm text-green-400 font-medium">
                      🎯 Recommendation: Increase investments to 25% to reach
                      your goal of ₹5L emergency fund in 18 months.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/20 to-blue-500/20 p-12 text-center backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative z-10">
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                Ready to take control?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-slate-300">
                Join thousands of early professionals who stopped guessing and
                started planning with Fintra.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-8 py-4 text-lg font-semibold text-[#020617] transition-all hover:bg-green-400 hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500">
                <TrendingUp className="h-4 w-4 text-[#020617]" />
              </div>
              <span className="text-lg font-semibold">Fintra</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 Fintra. Built for developers and early professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
