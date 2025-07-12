"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface FilterSectionProps {
  range: DateRange | undefined;
  setRange: (range: DateRange | undefined) => void;
  timeRange: "week" | "month" | "quarter";
  setTimeRange: (value: "week" | "month" | "quarter") => void;
  presets?: Array<{
    label: string;
    key: "week" | "month" | "quarter";
    calc: () => DateRange;
  }>;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  range,
  setRange,
  timeRange,
  setTimeRange,
  presets = [
    {
      label: "7 ngày qua",
      key: "week",
      calc: () => {
        const to = new Date();
        const from = addDays(to, -6);
        return { from, to };
      },
    },
    {
      label: "Tháng này",
      key: "month",
      calc: () => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { from, to };
      },
    },
    {
      label: "Quý này",
      key: "quarter",
      calc: () => {
        const now = new Date();
        const q = Math.floor(now.getMonth() / 3);
        const from = new Date(now.getFullYear(), q * 3, 1);
        const to = new Date(now.getFullYear(), q * 3 + 3, 0);
        return { from, to };
      },
    },
  ],
}) => {
  React.useEffect(() => {
    setTimeRange("week");
    const defaultPreset = presets.find((p) => p.key === "week");
    if (defaultPreset) setRange(defaultPreset.calc());
  }, []);

  // Khi thay đổi timeRange, tự động sync lại range
  React.useEffect(() => {
    const preset = presets.find((p) => p.key === timeRange);
    if (preset) setRange(preset.calc());
  }, [timeRange]);

  // Function để clear selection
  const handleClearSelection = () => {
    setRange(undefined);
    setTimeRange("week");
  };

  const isInvalid = range?.from && range?.to && range.from > range.to;

  return (
    <Card className="mb-8 gap-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Bộ lọc thời gian nâng cao
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Calendar + Combobox (bên trái trên lg) */}
          <div className="flex flex-col sm:flex-row gap-4 lg:w-1/2">
            {/* Calendar */}
            <div className="flex-1">
              <Label className="mb-2">Khoảng ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left",
                      !range && "text-muted-foreground"
                    )}
                  >
                    {range?.from ? (
                      range.to ? (
                        `${format(range.from, "PP")} — ${format(
                          range.to,
                          "PP"
                        )}`
                      ) : (
                        format(range.from, "PP")
                      )
                    ) : (
                      <span>Chọn ngày</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    numberOfMonths={2}
                    defaultMonth={range?.from}
                  />
                </PopoverContent>
              </Popover>
              {isInvalid && (
                <p className="text-sm text-red-600 mt-1">
                  Ngày "Từ" phải trước hoặc bằng ngày "Đến".
                </p>
              )}
            </div>

            {/* Combobox */}
            <div className="flex-1">
              <Label className="mb-2">Khoảng tự động</Label>
              <Command>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {presets.find((p) => p.key === timeRange)?.label ||
                        "Chọn khoảng"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <CommandInput placeholder="Chọn khoảng..." />
                    <CommandEmpty>Không tìm thấy</CommandEmpty>
                    <CommandGroup>
                      {presets.map((p) => (
                        <CommandItem
                          key={p.key}
                          onSelect={() => setTimeRange(p.key)}
                        >
                          {p.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </PopoverContent>
                </Popover>
              </Command>
            </div>
          </div>

            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="
                  h-8 px-3 
                  text-muted-foreground hover:text-destructive
                  hover:bg-destructive/10
                  transition-all duration-200
                  rounded-md
                  flex items-center gap-1.5
                "
              >
                <span className="flex items-center gap-1.5">
                  <X className="h-4 w-4" />
                  <span className="text-xs font-medium">Xóa bộ lọc</span>
                </span>
              </Button>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
