import { useState, useCallback, useRef, useEffect } from "react"
import {
  ScenarioEvent,
  ScenarioSnapshot,
  ScenarioComparison,
  FeasibilityScore,
  CreateScenarioEventData,
  UpdateScenarioEventData,
  ApiError,
} from "@/lib/api";
import { api } from "@/lib/api";

interface UseScenarioSimulationParams {
  budgetId: string
  categoryAdjustments: Record<string, number>
  currentBudget?: {
    total_amount: number
    needs_percentage: number
    wants_percentage: number
    savings_percentage: number
  }
  debounceMs?: number
}

interface SimulationResult {
  newSavingsRate: number
  newInvestmentRate: number
  newNeedsPercent: number
  newWantsPercent: number
  savingsDelta: number
  investmentDelta: number
  needsDelta: number
  wantsDelta: number
  estimatedDifference: number
}

export function useScenarioSimulation({
  budgetId,
  categoryAdjustments,
  currentBudget,
  debounceMs = 300
}: UseScenarioSimulationParams) {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Local calculation of scenario impact
  const calculateSimulation = useCallback(() => {
    if (!budgetId || !currentBudget || Object.keys(categoryAdjustments).length === 0) {
      setSimulation(null)
      return
    }

    setIsSimulating(true)
    
    try {
      // Calculate new percentages based on adjustments
      // For now, we'll do a simple calculation:
      // If user adjusts a category by X%, we adjust the percentage allocation
      
      const baseNeeds = currentBudget.needs_percentage
      const baseWants = currentBudget.wants_percentage
      const baseSavings = currentBudget.savings_percentage
      
      // Simple simulation: increase/decrease by adjustment percentage
      // Example: if needs is 50% and adjustment is -10%, new needs = 50% * (1 - 0.10) = 45%
      const adjustmentFactor = 1 + (Object.values(categoryAdjustments).reduce((a, b) => a + b, 0) / 100) * 0.1
      
      const newNeeds = Math.min(Math.max(baseNeeds * adjustmentFactor, 0), 100)
      const newWants = Math.min(Math.max(baseWants * adjustmentFactor, 0), 100)
      const newSavings = 100 - newNeeds - newWants
      
      const needsDelta = newNeeds - baseNeeds
      const wantsDelta = newWants - baseWants
      const savingsDelta = newSavings - baseSavings
      
      // Estimate monthly difference based on adjustments
      const totalAdjustment = Object.values(categoryAdjustments).reduce((a, b) => a + b, 0)
      const estimatedDifference = (currentBudget.total_amount * (totalAdjustment / 100)) / 12
      
      setSimulation({
        newSavingsRate: newSavings,
        newInvestmentRate: 0, // No investment tracking in the current model
        newNeedsPercent: newNeeds,
        newWantsPercent: newWants,
        savingsDelta,
        investmentDelta: 0,
        needsDelta,
        wantsDelta,
        estimatedDifference
      })
    } catch (err) {
      console.error("Simulation error:", err)
      setSimulation(null)
    } finally {
      setIsSimulating(false)
    }
  }, [budgetId, currentBudget, categoryAdjustments])

  // Debounce the simulation calls
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      calculateSimulation()
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [categoryAdjustments, calculateSimulation, debounceMs])

  return {
    simulation,
    isSimulating
  }
}


// Event Management Hook
export function useScenarioEvents(scenarioId: string) {
  const [events, setEvents] = useState<ScenarioEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listScenarioEvents(scenarioId);
      setEvents(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to load scenario events";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [scenarioId]);

  const createEvent = useCallback(
    async (data: CreateScenarioEventData): Promise<ScenarioEvent | null> => {
      setLoading(true);
      setError(null);
      try {
        const newEvent = await api.createScenarioEvent(scenarioId, data);
        setEvents([...events, newEvent]);
        return newEvent;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to create event";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [scenarioId, events],
  );

  const updateEvent = useCallback(
    async (
      eventId: string,
      data: UpdateScenarioEventData,
    ): Promise<ScenarioEvent | null> => {
      setLoading(true);
      setError(null);
      try {
        const updated = await api.updateScenarioEvent(scenarioId, eventId, data);
        setEvents(events.map((e) => (e.id === eventId ? updated : e)));
        return updated;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to update event";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [scenarioId, events],
  );

  const deleteEvent = useCallback(
    async (eventId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await api.deleteScenarioEvent(scenarioId, eventId);
        setEvents(events.filter((e) => e.id !== eventId));
        return true;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to delete event";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [scenarioId, events],
  );

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}


// Simulation Hook
export function useEventDrivenScenarioSimulation() {
  const [snapshots, setSnapshots] = useState<ScenarioSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.simulateScenario(scenarioId);
      setSnapshots(data);
      return data;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to simulate scenario";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    snapshots,
    loading,
    error,
    simulate,
  };
}


// Comparison Hook
export function useScenarioComparison() {
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(
    async (scenarioId: string, comparisonIds: string[]) => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.compareScenarios(scenarioId, comparisonIds);
        setComparison(data);
        return data;
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to compare scenarios";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    comparison,
    loading,
    error,
    compare,
  };
}


// Feasibility Hook
export function useFeasibilityScore() {
  const [feasibility, setFeasibility] = useState<FeasibilityScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async (scenarioId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.computeFeasibility(scenarioId);
      setFeasibility(data);
      return data;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Failed to compute feasibility";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    feasibility,
    loading,
    error,
    compute,
  };
}
