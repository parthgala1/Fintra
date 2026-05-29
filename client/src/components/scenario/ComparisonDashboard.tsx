/**
 * Scenario Comparison Dashboard Component
 *
 * Displays side-by-side comparison of multiple scenarios
 * with feasibility scores and metrics.
 */

"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScenarioComparison } from "@/lib/api"
import { useScenarioComparison } from "@/hooks/useScenarioSimulation"

interface ComparisonDashboardProps {
  baseScenarioId: string
  comparisonScenarioIds: string[]
  onCompare?: (comparison: ScenarioComparison) => void
}

export function ComparisonDashboard({
  baseScenarioId,
  comparisonScenarioIds,
  onCompare,
}: ComparisonDashboardProps) {
  const { comparison, loading, error, compare } = useScenarioComparison()

  const handleCompare = async () => {
    const result = await compare(baseScenarioId, comparisonScenarioIds)
    if (result && onCompare) {
      onCompare(result)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scenario Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Scenario Comparison</CardTitle>
        <CardDescription>
          Compare multiple scenarios side-by-side
        </CardDescription>
        <Button
          onClick={handleCompare}
          disabled={loading}
          className="mt-4"
        >
          {loading ? "Comparing..." : "Compare Scenarios"}
        </Button>
      </CardHeader>
      <CardContent>
        {!comparison ? (
          <p className="text-center text-gray-500">
            Click "Compare Scenarios" to view comparison data
          </p>
        ) : (
          <div className="space-y-6">
            {/* Feasibility Scores */}
            <div>
              <h3 className="font-semibold mb-4">Feasibility Scores</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(comparison).map(([scenarioId, data]) => (
                  <Card key={scenarioId} className="p-4">
                    <p className="text-sm font-medium">{data.scenario.name}</p>
                    <p className="text-2xl font-bold mt-2">
                      {data.scenario.feasibility_score.toFixed(1)}%
                    </p>
                  </Card>
                ))}
              </div>
            </div>

            {/* End-of-Horizon Metrics */}
            <div>
              <h3 className="font-semibold mb-4">End-of-Horizon Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Scenario</th>
                      <th className="text-left p-2">Final Income</th>
                      <th className="text-left p-2">Final Expenses</th>
                      <th className="text-left p-2">Total Savings</th>
                      <th className="text-left p-2">Health Score</th>
                      <th className="text-left p-2">Goal Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(comparison).map(([scenarioId, data]) => {
                      const lastSnapshot = data.snapshots[data.snapshots.length - 1];
                      return (
                        <tr key={scenarioId} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{data.scenario.name}</td>
                          <td className="p-2">₹{lastSnapshot?.projected_income.toFixed(0) || 0}</td>
                          <td className="p-2">₹{lastSnapshot?.projected_expenses.toFixed(0) || 0}</td>
                          <td className="p-2">₹{lastSnapshot?.projected_savings.toFixed(0) || 0}</td>
                          <td className="p-2">{lastSnapshot?.health_score.toFixed(1) || 0}</td>
                          <td className="p-2">
                            {((lastSnapshot?.goal_progress || 0) * 100).toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Average Metrics */}
            <div>
              <h3 className="font-semibold mb-4">Average Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(comparison).map(([scenarioId, data]) => {
                  const avgIncome =
                    data.snapshots.reduce((sum, s) => sum + s.projected_income, 0) /
                    data.snapshots.length;
                  const avgSavings =
                    data.snapshots.reduce((sum, s) => sum + s.projected_savings, 0) /
                    data.snapshots.length;
                  const avgHealth =
                    data.snapshots.reduce((sum, s) => sum + s.health_score, 0) /
                    data.snapshots.length;

                  return (
                    <Card key={scenarioId} className="p-4">
                      <p className="text-sm font-medium mb-3">{data.scenario.name}</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-gray-600">Avg Income</p>
                          <p className="font-semibold">₹{avgIncome.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Savings</p>
                          <p className="font-semibold">₹{avgSavings.toFixed(0)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Avg Health</p>
                          <p className="font-semibold">{avgHealth.toFixed(1)}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
