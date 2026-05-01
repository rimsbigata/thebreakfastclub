"use client"

import React from "react"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className }: DatePickerProps) {
  const date = value ? new Date(value) : null

  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date.toISOString().split('T')[0])
    } else {
      onChange('')
    }
  }

  return (
    <ReactDatePicker
      selected={date}
      onChange={handleChange}
      placeholderText={placeholder}
      className={cn(
        "w-full h-10 px-3 py-2 text-sm font-black border-2 rounded-md bg-background",
        className
      )}
      dateFormat="MMMM d, yyyy"
    />
  )
}
