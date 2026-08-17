import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  setDate: (date?: Date) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  fromDate?: Date
}

export function DatePicker({ date, setDate, placeholder = "Pick a date", className, disabled, fromDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-between text-left font-normal h-10 px-3",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={fromDate ? (d) => d < fromDate : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
