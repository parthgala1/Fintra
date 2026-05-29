import { describe, expect, it } from "vitest";
import {
  computeEditableReportData,
  ReportRowSource,
} from "@/components/budget/reportTableUtils";

describe("computeEditableReportData", () => {
  const sourceRows: ReportRowSource[] = [
    {
      categoryId: "c1",
      categoryName: "Housing",
      categoryType: "needs",
      baselineBudgetedAmount: 6000,
      actualAmount: 7000,
    },
    {
      categoryId: "c2",
      categoryName: "Entertainment",
      categoryType: "wants",
      baselineBudgetedAmount: 4000,
      actualAmount: 3000,
    },
  ];

  it("computes totals and percentages with fixed actual percentages", () => {
    const result = computeEditableReportData(sourceRows, 10000, {
      c1: 60,
      c2: 40,
    });

    expect(result.rows[0].actualPercentage).toBe(70);
    expect(result.rows[1].actualPercentage).toBe(30);
    expect(result.totals.actualPercentage).toBe(100);
    expect(result.totals.budgetedAmount).toBe(10000);
    expect(result.totals.actualAmount).toBe(10000);
    expect(result.totals.deviationAmount).toBe(0);
  });

  it("recalculates what-if budget values when editable percentages change", () => {
    const initial = computeEditableReportData(sourceRows, 10000, {
      c1: 60,
      c2: 40,
    });

    const updated = computeEditableReportData(sourceRows, 10000, {
      c1: 50,
      c2: 50,
    });

    expect(initial.rows[0].actualPercentage).toBe(updated.rows[0].actualPercentage);
    expect(updated.rows[0].budgetedAmount).toBe(5000);
    expect(updated.rows[1].budgetedAmount).toBe(5000);
    expect(updated.totals.budgetPercentage).toBe(100);
    expect(updated.totals.deviationAmount).toBe(0);
  });
});
