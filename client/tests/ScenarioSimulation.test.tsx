/**
 * Integration tests for scenario events, simulation, and comparison
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ScenarioEventEditor } from "@/components/scenario/ScenarioEventEditor"
import { TimelineVisualization } from "@/components/scenario/TimelineVisualization"
import { ComparisonDashboard } from "@/components/scenario/ComparisonDashboard"
import * as api from "@/lib/api"

// Mock the API
vi.mock("@/lib/api", () => ({
  api: {
    listScenarioEvents: vi.fn(),
    createScenarioEvent: vi.fn(),
    updateScenarioEvent: vi.fn(),
    deleteScenarioEvent: vi.fn(),
    simulateScenario: vi.fn(),
    compareScenarios: vi.fn(),
    computeFeasibility: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
  fetchWithAuth: vi.fn(),
}))

describe("ScenarioEventEditor", () => {
  const scenarioId = "scenario-123"

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.api.listScenarioEvents).mockResolvedValue([])
  })

  it("renders the event editor", async () => {
    render(<ScenarioEventEditor scenarioId={scenarioId} />)

    expect(screen.getByText("Event Timeline")).toBeInTheDocument()
    expect(screen.getByText("Add Event")).toBeInTheDocument()
  })

  it("loads events on mount", async () => {
    vi.mocked(api.api.listScenarioEvents).mockResolvedValue([
      {
        id: "event-1",
        scenario_id: scenarioId,
        event_type: "salary_raise",
        effective_date: "2026-06-15T00:00:00Z",
        priority: 0,
        created_at: "2026-05-15T00:00:00Z",
      },
    ])

    render(<ScenarioEventEditor scenarioId={scenarioId} />)

    await waitFor(() => {
      expect(screen.getByText("salary_raise")).toBeInTheDocument()
    })
  })

  it("allows creating a new event", async () => {
    vi.mocked(api.api.createScenarioEvent).mockResolvedValue({
      id: "event-2",
      scenario_id: scenarioId,
      event_type: "salary_raise",
      effective_date: "2026-06-15T00:00:00Z",
      payload_json: { amount: 10000 },
      priority: 0,
      created_at: "2026-05-15T00:00:00Z",
    })

    render(<ScenarioEventEditor scenarioId={scenarioId} />)

    // Open form
    fireEvent.click(screen.getByText("Add Event"))

    // Fill form
    const eventTypeSelect = screen.getByDisplayValue("Select event type")
    fireEvent.change(eventTypeSelect, { target: { value: "salary_raise" } })

    const dateInput = screen.getByDisplayValue("")
    fireEvent.change(dateInput, { target: { value: "2026-06-15" } })

    const amountInput = screen.getByPlaceholderText("Enter amount")
    fireEvent.change(amountInput, { target: { value: "10000" } })

    // Submit
    fireEvent.click(screen.getByText("Create Event"))

    await waitFor(() => {
      expect(api.api.createScenarioEvent).toHaveBeenCalled()
    })
  })
})

describe("TimelineVisualization", () => {
  const snapshots = [
    {
      id: "snap-1",
      scenario_id: "scenario-1",
      month_index: 0,
      projected_income: 100000,
      projected_expenses: 70000,
      projected_savings: 30000,
      emergency_fund_balance: 30000,
      debt_balance: 0,
      goal_progress: 0.1,
      health_score: 75,
      created_at: "2026-05-15T00:00:00Z",
    },
    {
      id: "snap-2",
      scenario_id: "scenario-1",
      month_index: 1,
      projected_income: 100000,
      projected_expenses: 70000,
      projected_savings: 30000,
      emergency_fund_balance: 60000,
      debt_balance: 0,
      goal_progress: 0.2,
      health_score: 76,
      created_at: "2026-05-15T00:00:00Z",
    },
  ]

  it("renders timeline visualization", () => {
    render(<TimelineVisualization snapshots={snapshots} />)

    expect(screen.getByText("Scenario Timeline")).toBeInTheDocument()
    expect(screen.getByText("Monthly Income vs Expenses")).toBeInTheDocument()
  })

  it("shows empty state when no snapshots", () => {
    render(<TimelineVisualization snapshots={[]} />)

    expect(screen.getByText("No simulation data available")).toBeInTheDocument()
  })

  it("renders all chart sections", () => {
    render(<TimelineVisualization snapshots={snapshots} />)

    expect(screen.getByText("Monthly Income vs Expenses")).toBeInTheDocument()
    expect(screen.getByText("Savings Trend")).toBeInTheDocument()
    expect(screen.getByText("Financial Health Score")).toBeInTheDocument()
  })
})

describe("ComparisonDashboard", () => {
  const baseScenarioId = "scenario-1"
  const comparisonScenarioIds = ["scenario-2"]
  const comparison = {
    "scenario-1": {
      scenario: {
        id: "scenario-1",
        name: "Conservative",
        feasibility_score: 85,
      },
      snapshots: [
        {
          id: "snap-1",
          scenario_id: "scenario-1",
          month_index: 0,
          projected_income: 100000,
          projected_expenses: 70000,
          projected_savings: 30000,
          emergency_fund_balance: 30000,
          debt_balance: 0,
          goal_progress: 0.1,
          health_score: 75,
          created_at: "2026-05-15T00:00:00Z",
        },
      ],
    },
    "scenario-2": {
      scenario: {
        id: "scenario-2",
        name: "Aggressive",
        feasibility_score: 72,
      },
      snapshots: [
        {
          id: "snap-2",
          scenario_id: "scenario-2",
          month_index: 0,
          projected_income: 100000,
          projected_expenses: 80000,
          projected_savings: 20000,
          emergency_fund_balance: 20000,
          debt_balance: 0,
          goal_progress: 0.15,
          health_score: 70,
          created_at: "2026-05-15T00:00:00Z",
        },
      ],
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders comparison dashboard", () => {
    render(
      <ComparisonDashboard
        baseScenarioId={baseScenarioId}
        comparisonScenarioIds={comparisonScenarioIds}
      />
    )

    expect(screen.getByText("Scenario Comparison")).toBeInTheDocument()
    expect(screen.getByText("Compare Scenarios")).toBeInTheDocument()
  })

  it("allows comparing scenarios", async () => {
    vi.mocked(api.api.compareScenarios).mockResolvedValue(comparison)

    render(
      <ComparisonDashboard
        baseScenarioId={baseScenarioId}
        comparisonScenarioIds={comparisonScenarioIds}
      />
    )

    fireEvent.click(screen.getByText("Compare Scenarios"))

    await waitFor(() => {
      expect(api.api.compareScenarios).toHaveBeenCalledWith(
        baseScenarioId,
        comparisonScenarioIds
      )
    })
  })

  it("displays comparison metrics when data is available", async () => {
    vi.mocked(api.api.compareScenarios).mockResolvedValue(comparison)

    const onCompare = vi.fn()
    render(
      <ComparisonDashboard
        baseScenarioId={baseScenarioId}
        comparisonScenarioIds={comparisonScenarioIds}
        onCompare={onCompare}
      />
    )

    fireEvent.click(screen.getByText("Compare Scenarios"))

    await waitFor(() => {
      expect(onCompare).toHaveBeenCalledWith(comparison)
    })
  })
})
