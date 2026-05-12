import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BudgetCreateForm } from "@/components/budget/BudgetCreateForm";

describe("BudgetCreateForm", () => {
  it("validates required fields", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);

    render(<BudgetCreateForm onAnalyze={onAnalyze} />);

    fireEvent.change(screen.getByLabelText("Budget Name"), {
      target: { value: "ab" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze Historical Spending" }));

    expect(await screen.findByText("Budget name must be at least 3 characters.")).toBeInTheDocument();
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("submits valid data", async () => {
    const onAnalyze = vi.fn().mockResolvedValue(undefined);

    render(<BudgetCreateForm onAnalyze={onAnalyze} />);

    fireEvent.change(screen.getByLabelText("Budget Name"), {
      target: { value: "May 2026 Budget" },
    });
    fireEvent.change(screen.getByLabelText("Budget Start Date"), {
      target: { value: "2026-05-01" },
    });
    fireEvent.change(screen.getByLabelText("Monthly Income (Optional)"), {
      target: { value: "100000" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Analyze Historical Spending" }));

    expect(onAnalyze).toHaveBeenCalledWith({
      name: "May 2026 Budget",
      budget_start_date: "2026-05-01",
      income: 100000,
    });
  });
});
