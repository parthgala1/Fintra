/**
 * Timeline Visualization Component
 *
 * Displays projected income, expenses, savings, and health scores
 * across the simulation horizon.
 */

"use client"

import React from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScenarioSnapshot } from "@/lib/api"

interface TimelineVisualizationProps {
  snapshots: ScenarioSnapshot[]
  title?: string
}

export function TimelineVisualization({
  snapshots,
  title = "Scenario Timeline",
}: TimelineVisualizationProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500">No simulation data available</p>
        </CardContent>
      </Card>
    )
  }

  // Format data for charts
  const chartData = snapshots.map((snapshot) => ({
    month: snapshot.month_index + 1,
    income: snapshot.projected_income,
    expenses: snapshot.projected_expenses,
    savings: snapshot.projected_savings,
    healthScore: snapshot.health_score,
    goalProgress: (snapshot.goal_progress || 0) * 100,
  }))

  return (
    <div className="space-y-6">
      {/* Income vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Income vs Expenses</CardTitle>
          <CardDescription>Projected cash flow over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottomRight", offset: -5 }} />
              <YAxis label={{ value: "Amount", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: any) => `₹${Number(value).toFixed(0)}`} />
              <Legend />
              <Bar dataKey="income" fill="#22c55e" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Savings Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Savings Trend</CardTitle>
          <CardDescription>Monthly savings projection</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottomRight", offset: -5 }} />
              <YAxis label={{ value: "Savings", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: any) => `₹${Number(value).toFixed(0)}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="savings"
                stroke="#3b82f6"
                name="Monthly Savings"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Health Score</CardTitle>
          <CardDescription>Overall financial health over time (0-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: "Month", position: "insideBottomRight", offset: -5 }} />
              <YAxis domain={[0, 100]} label={{ value: "Score", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(value: any) => Number(value).toFixed(1)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="healthScore"
                stroke="#f59e0b"
                name="Health Score"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Goal Progress */}
      {chartData.some((d) => d.goalProgress > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Goal Achievement Progress</CardTitle>
            <CardDescription>Cumulative goal progress (%)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: "Month", position: "insideBottomRight", offset: -5 }} />
                <YAxis domain={[0, 100]} label={{ value: "Progress %", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="goalProgress"
                  stroke="#8b5cf6"
                  name="Goal Progress"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
