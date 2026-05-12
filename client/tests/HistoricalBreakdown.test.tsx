import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HistoricalBreakdown } from "@/components/budget/HistoricalBreakdown";
import type { BudgetAnalysisResponse } from "@/lib/api";

const mockAnalysis: BudgetAnalysisResponse = {
  analysis_id: "analysis-1",
  budget_name: "May 2026",
  analysis_start_date: "2026-01-01",
  analysis_end_date: "2026-04-30",
  total_spending: 100000,
  needs_total: 50000,
  wants_total: 30000,
  savings_total: 20000,
  needs_percentage: 50,
  wants_percentage: 30,
  savings_percentage: 20,
  total_transactions: 120,
  data_quality: "high",
  validation_warnings: [],
  category_breakdown: {
    Needs: {
      Housing: {
        amount: 25000,
        percentage: 25,
        transaction_count: 4,
      },
    },
    Wants: {
      Dining: {
        amount: 10000,
        percentage: 10,
        transaction_count: 8,
      },
    },
    Savings: {
      Investments: {
        amount: 20000,
        percentage: 20,
        transaction_count: 2,
      },
    },
  },
};

describe("HistoricalBreakdown", () => {
  it("renders all categories and key values", () => {
    render(
      <HistoricalBreakdown
        analysis={mockAnalysis}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Historical Breakdown")).toBeInTheDocument();
    expect(screen.getByText("Needs")).toBeInTheDocument();
    expect(screen.getByText("Wants")).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getByText("Investments")).toBeInTheDocument();
  });

  it("shows percentages", () => {
    render(
      <HistoricalBreakdown
        analysis={mockAnalysis}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getAllByText("25.00%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("10.00%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("20.00%").length).toBeGreaterThan(0);
  });
});
