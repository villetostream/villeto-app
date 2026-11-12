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
  toDate?: Date
  fromYear?: number
  toYear?: number
}

export function DatePicker({
  date,
  setDate,
  placeholder = "Pick a date",
  className,
  disabled,
  fromDate,
  toDate,
  fromYear,
  toYear,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const startMonth = React.useMemo(() => {
    if (fromDate) return new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
    if (fromYear) return new Date(fromYear, 0, 1)
    return new Date(1950, 0, 1)
  }, [fromDate, fromYear])

  const endMonth = React.useMemo(() => {
    if (toDate) return new Date(toDate.getFullYear(), toDate.getMonth(), 1)
    if (toYear) return new Date(toYear, 11, 31)
    return new Date(new Date().getFullYear() + 30, 11, 31)
  }, [toDate, toYear])

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
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
          {date ? format(date, "MMM d, yyyy") : <span>{placeholder}</span>}
          <CalendarIcon className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={date}
          defaultMonth={date}
          startMonth={startMonth}
          endMonth={endMonth}
          onSelect={(d) => {
            setDate(d)
            setIsOpen(false)
          }}
          disabled={(d) => {
            if (fromDate && d < new Date(new Date(fromDate).setHours(0,0,0,0))) return true;
            if (toDate && d > new Date(new Date(toDate).setHours(23,59,59,999))) return true;
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
