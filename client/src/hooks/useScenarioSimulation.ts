import { useState, useCallback, useRef, useEffect } from "react"

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
