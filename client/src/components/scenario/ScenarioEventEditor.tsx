/**
 * Scenario Event Editor Component
 *
 * Allows users to add, edit, and remove events for a scenario.
 * Supports event types like salary raises, expense changes, etc.
 */

"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScenarioEvent, CreateScenarioEventData } from "@/lib/api"
import { useScenarioEvents } from "@/hooks/useScenarioSimulation"

interface EventEditorProps {
  scenarioId: string
}

const EVENT_TYPES = [
  { value: "salary_raise", label: "Salary Raise" },
  { value: "salary_cut", label: "Salary Cut" },
  { value: "expense_added", label: "Expense Added" },
  { value: "expense_removed", label: "Expense Removed" },
  { value: "emi_added", label: "EMI Added" },
  { value: "emi_cleared", label: "EMI Cleared" },
]

const RECURRENCE_OPTIONS = [
  { value: "once", label: "One-time" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

export function ScenarioEventEditor({ scenarioId }: EventEditorProps) {
  const { events, loading, error, loadEvents, createEvent, deleteEvent } =
    useScenarioEvents(scenarioId)
  
  const [showForm, setShowForm] = useState(false)
  const [eventType, setEventType] = useState("")
  const [effectiveDate, setEffectiveDate] = useState("")
  const [recurrence, setRecurrence] = useState("once")
  const [amount, setAmount] = useState("")
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadEvents()
  }, [scenarioId])

  const handleAddEvent = async () => {
    if (!eventType || !effectiveDate || !amount) {
      setFormError("Please fill in all fields")
      return
    }

    const eventData: CreateScenarioEventData = {
      event_type: eventType,
      effective_date: new Date(effectiveDate).toISOString(),
      recurrence_rule: recurrence === "once" ? undefined : recurrence,
      payload_json: { amount: parseFloat(amount) },
      priority: 0,
    }

    const result = await createEvent(eventData)
    if (result) {
      // Reset form
      setEventType("")
      setEffectiveDate("")
      setRecurrence("once")
      setAmount("")
      setFormError(null)
      setShowForm(false)
    } else {
      setFormError("Failed to create event")
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    await deleteEvent(eventId)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
        <CardDescription>
          Add financial events that affect your scenario
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Events List */}
        {events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{event.event_type}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(event.effective_date).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteEvent(event.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Event Form */}
        {showForm ? (
          <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
            <h3 className="font-semibold">Add New Event</h3>
            
            {formError && (
              <div className="text-sm text-red-600">{formError}</div>
            )}

            <div>
              <label className="text-sm font-medium">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                <option value="">Select event type</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Effective Date</label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Recurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full mt-1 p-2 border rounded"
              >
                {RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddEvent} disabled={loading}>
                {loading ? "Creating..." : "Create Event"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full">
            Add Event
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
