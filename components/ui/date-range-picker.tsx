"use client";

import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

interface Props {
  initialDateRange: DateRange;
  onUpdate: (range: { range: DateRange }) => void;
  locale?: "vi" | "en";
  align?: "start" | "center" | "end";
  showCompare?: boolean;
}

export function DateRangePicker({
  initialDateRange,
  onUpdate,
  locale = "vi",
  align = "start",
}: Props) {
  const [date, setDate] = React.useState<DateRange>(initialDateRange);
  const dateFnsLocale = locale === "vi" ? vi : enUS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date.from ? (
            date.to ? (
              <>
                {format(date.from, "dd/MM/yyyy", { locale: dateFnsLocale })} -{" "}
                {format(date.to, "dd/MM/yyyy", { locale: dateFnsLocale })}
              </>
            ) : (
              format(date.from, "dd/MM/yyyy", { locale: dateFnsLocale })
            )
          ) : (
            <span>Chọn khoảng ngày</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          locale={dateFnsLocale}
          initialFocus
          mode="range"
          defaultMonth={date.from}
          selected={date}
          onSelect={(range) => {
            setDate(range as DateRange);
            onUpdate({ range: range as DateRange });
          }}
          numberOfMonths={2}
        />

        {/* Nút chọn nhanh */}
        <div className="border-t mt-2 px-3 pt-2 pb-3 space-y-2">
          <p className="text-sm text-muted-foreground">Chọn nhanh:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                setDate({ from: today, to: today });
                onUpdate({ range: { from: today, to: today } });
              }}
            >
              Hôm nay
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const start = new Date(today);
                start.setDate(today.getDate() - today.getDay());
                const end = new Date(start);
                end.setDate(start.getDate() + 6);
                setDate({ from: start, to: end });
                onUpdate({ range: { from: start, to: end } });
              }}
            >
              Tuần này
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                setDate({ from: start, to: end });
                onUpdate({ range: { from: start, to: end } });
              }}
            >
              Tháng này
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date();
                const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const end = new Date(today.getFullYear(), today.getMonth(), 0);
                setDate({ from: start, to: end });
                onUpdate({ range: { from: start, to: end } });
              }}
            >
              Tháng trước
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
