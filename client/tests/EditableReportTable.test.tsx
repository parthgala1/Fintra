import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EditableReportTable } from "@/components/budget/EditableReportTable";

describe("EditableReportTable", () => {
  it("renders required table columns and totals row", () => {
    render(
      <EditableReportTable
        rows={[
          {
            categoryId: "1",
            categoryName: "Housing",
            categoryType: "needs",
            budgetPercentage: 35,
            actualPercentage: 40,
            budgetedAmount: 7000,
            actualAmount: 8000,
            deviationAmount: 1000,
            deviationPercentage: 14.29,
          },
        ]}
        totals={{
          budgetPercentage: 35,
          actualPercentage: 40,
          budgetedAmount: 7000,
          actualAmount: 8000,
          deviationAmount: 1000,
          deviationPercentage: 14.29,
        }}
        formatAmount={(amount) => `₹${amount}`}
        onBudgetPercentageChange={() => {}}
      />,
    );

    expect(screen.getByText("Category Type")).toBeInTheDocument();
    expect(screen.getByText("Budget % (Editable)")).toBeInTheDocument();
    expect(screen.getByText("Actual %")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("emits budget percentage updates when user edits a row", () => {
    const onBudgetPercentageChange = vi.fn();

    render(
      <EditableReportTable
        rows={[
          {
            categoryId: "1",
            categoryName: "Housing",
            categoryType: "needs",
            budgetPercentage: 35,
            actualPercentage: 40,
            budgetedAmount: 7000,
            actualAmount: 8000,
            deviationAmount: 1000,
            deviationPercentage: 14.29,
          },
        ]}
        totals={{
          budgetPercentage: 35,
          actualPercentage: 40,
          budgetedAmount: 7000,
          actualAmount: 8000,
          deviationAmount: 1000,
          deviationPercentage: 14.29,
        }}
        formatAmount={(amount) => `₹${amount}`}
        onBudgetPercentageChange={onBudgetPercentageChange}
      />,
    );

    const input = screen.getByLabelText("Budget percentage for Housing");
    fireEvent.change(input, { target: { value: "45" } });

    expect(onBudgetPercentageChange).toHaveBeenCalledWith("1", 45);
  });
});
