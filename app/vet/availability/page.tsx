"use client"

import { useState } from "react"
import { CalendarIcon, Clock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Mock availability data - in a real app, this would come from your backend
const initialAvailability = [
  {
    id: "1",
    day: "Monday",
    slots: [
      { id: "1-1", startTime: "09:00", endTime: "12:00" },
      { id: "1-2", startTime: "13:00", endTime: "17:00" },
    ],
  },
  {
    id: "2",
    day: "Tuesday",
    slots: [{ id: "2-1", startTime: "09:00", endTime: "17:00" }],
  },
  {
    id: "3",
    day: "Wednesday",
    slots: [{ id: "3-1", startTime: "13:00", endTime: "20:00" }],
  },
  {
    id: "4",
    day: "Thursday",
    slots: [{ id: "4-1", startTime: "09:00", endTime: "17:00" }],
  },
  {
    id: "5",
    day: "Friday",
    slots: [{ id: "5-1", startTime: "09:00", endTime: "15:00" }],
  },
  {
    id: "6",
    day: "Saturday",
    slots: [],
  },
  {
    id: "7",
    day: "Sunday",
    slots: [],
  },
]

// Mock unavailable dates - in a real app, this would come from your backend
const initialUnavailableDates = [
  new Date(2025, 5, 15), // June 15, 2025
  new Date(2025, 5, 16), // June 16, 2025
  new Date(2025, 6, 4), // July 4, 2025
]

export default function VetAvailabilityPage() {
  const [availability, setAvailability] = useState(initialAvailability)
  const [unavailableDates, setUnavailableDates] = useState<Date[]>(initialUnavailableDates)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [isRecurring, setIsRecurring] = useState(false)

  const addTimeSlot = (dayId: string) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            slots: [
              ...day.slots,
              {
                id: `${dayId}-${day.slots.length + 1}`,
                startTime: "09:00",
                endTime: "17:00",
              },
            ],
          }
        }
        return day
      }),
    )
  }

  const updateTimeSlot = (dayId: string, slotId: string, field: "startTime" | "endTime", value: string) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            slots: day.slots.map((slot) => {
              if (slot.id === slotId) {
                return {
                  ...slot,
                  [field]: value,
                }
              }
              return slot
            }),
          }
        }
        return day
      }),
    )
  }

  const removeTimeSlot = (dayId: string, slotId: string) => {
    setAvailability((prev) =>
      prev.map((day) => {
        if (day.id === dayId) {
          return {
            ...day,
            slots: day.slots.filter((slot) => slot.id !== slotId),
          }
        }
        return day
      }),
    )
  }

  const addUnavailableDate = () => {
    if (date && !unavailableDates.some((d) => d.toDateString() === date.toDateString())) {
      setUnavailableDates([...unavailableDates, date])
      setDate(undefined)
    }
  }

  const removeUnavailableDate = (dateToRemove: Date) => {
    setUnavailableDates(unavailableDates.filter((d) => d.toDateString() !== dateToRemove.toDateString()))
  }

  const saveAvailability = () => {
    // In a real app, you would save the availability to your backend
    alert("Availability saved successfully!")
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manage Availability</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
            <CardDescription>Set your regular working hours for each day of the week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {availability.map((day) => (
              <div key={day.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{day.day}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => addTimeSlot(day.id)}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add Time Slot
                  </Button>
                </div>

                {day.slots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Not available</p>
                ) : (
                  day.slots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <Select
                          value={slot.startTime}
                          onValueChange={(value) => updateTimeSlot(day.id, slot.id, "startTime", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span>to</span>
                        <Select
                          value={slot.endTime}
                          onValueChange={(value) => updateTimeSlot(day.id, slot.id, "endTime", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => (
                              <SelectItem key={i} value={`${String(i).padStart(2, "0")}:00`}>
                                {`${String(i).padStart(2, "0")}:00`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-500"
                        onClick={() => removeTimeSlot(day.id, slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unavailable Dates</CardTitle>
            <CardDescription>Mark specific dates when you're not available</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="date-picker">Select date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      disabled={(date) => {
                        // Disable dates in the past and already selected dates
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        return date < today || unavailableDates.some((d) => d.toDateString() === date.toDateString())
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center gap-2 mb-0.5">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="recurring" className="text-sm">
                  Recurring
                </Label>
              </div>
              <Button
                type="button"
                onClick={addUnavailableDate}
                disabled={!date}
                className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24  hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
              >
                Add
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Unavailable dates:</h4>
              {unavailableDates.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No dates selected</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unavailableDates.map((date, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {format(date, "PPP")}
                      <button
                        type="button"
                        className="ml-1 text-gray-500 hover:text-gray-700"
                        onClick={() => removeUnavailableDate(date)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-gray-500">Note: Unavailable dates will override your regular weekly schedule.</p>
          </CardFooter>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={saveAvailability}
          className="bg-[#4e968f] hover:bg-[#43847e] border border-[#43847e] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.1)]"
        >
          Save Availability
        </Button>
      </div>
    </div>
  )
}
