export type ReportCategoryType = "needs" | "wants" | "savings" | "other";

export interface ReportRowSource {
  categoryId: string;
  categoryName: string;
  categoryType: ReportCategoryType;
  baselineBudgetedAmount: number;
  actualAmount: number;
}

export interface EditableReportRow {
  categoryId: string;
  categoryName: string;
  categoryType: ReportCategoryType;
  budgetPercentage: number;
  actualPercentage: number;
  budgetedAmount: number;
  actualAmount: number;
  deviationAmount: number;
  deviationPercentage: number;
  allocationSource: string;
}

export interface ReportTableTotals {
  budgetPercentage: number;
  actualPercentage: number;
  budgetedAmount: number;
  actualAmount: number;
  deviationAmount: number;
  deviationPercentage: number;
}

export interface ReportTypeSummary {
  categoryType: ReportCategoryType;
  budgetedAmount: number;
  actualAmount: number;
  deviationAmount: number;
}

export interface ReportComputationResult {
  rows: EditableReportRow[];
  totals: ReportTableTotals;
  typeSummaries: ReportTypeSummary[];
  largestOverrun: EditableReportRow | null;
  largestUnderrun: EditableReportRow | null;
}

export const normalizeCategoryType = (value?: string): ReportCategoryType => {
  if (!value) return "other";
  const normalized = value.toLowerCase();
  if (normalized === "needs" || normalized === "wants" || normalized === "savings") {
    return normalized as ReportCategoryType;
  }
  return "other";
};

const round2 = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
};

export function computeEditableReportData(
  sourceRows: ReportRowSource[],
  baseTotalBudget: number,
  editablePercentages: Record<string, number>,
): ReportComputationResult {
  const safeBaseTotalBudget = Number.isFinite(baseTotalBudget) && baseTotalBudget > 0
    ? baseTotalBudget
    : 0;

  const actualTotal = sourceRows.reduce((sum, row) => sum + row.actualAmount, 0);

  const rows: EditableReportRow[] = sourceRows.map((row) => {
    const inputPct = editablePercentages[row.categoryId];
    const isUserEdited = Number.isFinite(inputPct);
    const budgetPercentage = isUserEdited
      ? Math.max(0, inputPct)
      : safeBaseTotalBudget > 0
        ? (row.baselineBudgetedAmount / safeBaseTotalBudget) * 100
        : 0;

    const budgetedAmount = safeBaseTotalBudget * (budgetPercentage / 100);
    const actualPercentage = actualTotal > 0 ? (row.actualAmount / actualTotal) * 100 : 0;
    const deviationAmount = row.actualAmount - budgetedAmount;
    const deviationPercentage = budgetedAmount > 0
      ? (deviationAmount / budgetedAmount) * 100
      : row.actualAmount > 0
        ? 100
        : 0;

    // Determine allocation source
    let allocationSource = "";
    if (isUserEdited) {
      allocationSource = "Custom adjustment";
    } else if (safeBaseTotalBudget > 0) {
      allocationSource = "From budget rule and historical spending proportions";
    } else {
      allocationSource = "From historical spending analysis";
    }

    return {
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      categoryType: row.categoryType,
      budgetPercentage: round2(budgetPercentage),
      actualPercentage: round2(actualPercentage),
      budgetedAmount: round2(budgetedAmount),
      actualAmount: round2(row.actualAmount),
      deviationAmount: round2(deviationAmount),
      deviationPercentage: round2(deviationPercentage),
      allocationSource,
    };
  });

  const totals = rows.reduce<ReportTableTotals>(
    (acc, row) => ({
      budgetPercentage: acc.budgetPercentage + row.budgetPercentage,
      actualPercentage: acc.actualPercentage + row.actualPercentage,
      budgetedAmount: acc.budgetedAmount + row.budgetedAmount,
      actualAmount: acc.actualAmount + row.actualAmount,
      deviationAmount: acc.deviationAmount + row.deviationAmount,
      deviationPercentage: 0,
    }),
    {
      budgetPercentage: 0,
      actualPercentage: 0,
      budgetedAmount: 0,
      actualAmount: 0,
      deviationAmount: 0,
      deviationPercentage: 0,
    },
  );

  totals.budgetPercentage = round2(totals.budgetPercentage);
  totals.actualPercentage = round2(totals.actualPercentage);
  totals.budgetedAmount = round2(totals.budgetedAmount);
  totals.actualAmount = round2(totals.actualAmount);
  totals.deviationAmount = round2(totals.deviationAmount);
  totals.deviationPercentage = round2(
    totals.budgetedAmount > 0 ? (totals.deviationAmount / totals.budgetedAmount) * 100 : 0,
  );

  const typeSummariesMap = new Map<ReportCategoryType, ReportTypeSummary>();
  for (const row of rows) {
    const current = typeSummariesMap.get(row.categoryType) ?? {
      categoryType: row.categoryType,
      budgetedAmount: 0,
      actualAmount: 0,
      deviationAmount: 0,
    };

    current.budgetedAmount += row.budgetedAmount;
    current.actualAmount += row.actualAmount;
    current.deviationAmount += row.deviationAmount;
    typeSummariesMap.set(row.categoryType, current);
  }

  const typeSummaries = Array.from(typeSummariesMap.values()).map((summary) => ({
    ...summary,
    budgetedAmount: round2(summary.budgetedAmount),
    actualAmount: round2(summary.actualAmount),
    deviationAmount: round2(summary.deviationAmount),
  }));

  const overrunCandidates = rows.filter((row) => row.deviationAmount > 0);
  const underrunCandidates = rows.filter((row) => row.deviationAmount < 0);

  const largestOverrun = overrunCandidates.length
    ? overrunCandidates.reduce((max, row) => (row.deviationAmount > max.deviationAmount ? row : max))
    : null;

  const largestUnderrun = underrunCandidates.length
    ? underrunCandidates.reduce((min, row) => (row.deviationAmount < min.deviationAmount ? row : min))
    : null;

  return {
    rows,
    totals,
    typeSummaries,
    largestOverrun,
    largestUnderrun,
  };
}
