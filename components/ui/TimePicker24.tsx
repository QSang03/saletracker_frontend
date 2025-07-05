"use client";
import React, { useRef } from "react";
import { Input } from "@/components/ui/input";

interface TimePicker24Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker24({ value, onChange, className }: TimePicker24Props) {
  const [hour = "", minute = ""] = value.split(":");
  const minuteRef = useRef<HTMLInputElement>(null);

  const formatValue = (val: string, max: number): string => {
    const cleaned = val.replace(/\D/g, "").slice(0, 2);
    if (!cleaned) return "";
    const num = parseInt(cleaned, 10);
    return isNaN(num) || num > max ? "" : cleaned;
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatValue(e.target.value, 23);
    if (val.length === 2) minuteRef.current?.focus();
    onChange(`${val}${minute !== undefined && minute !== "" ? `:${minute}` : ""}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatValue(e.target.value, 59);
    onChange(`${hour || "00"}:${val}`);
  };

  return (
    <div
      className={`inline-flex items-center justify-center rounded-md border border-input bg-white px-3 py-1 shadow-sm ${className || ""}`}
    >
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="HH"
        value={hour}
        onChange={handleHourChange}
        maxLength={2}
        className="w-14 text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
        aria-label="Giờ"
      />
      <span className="mx-1 text-gray-500 text-base font-medium">:</span>
      <Input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="MM"
        value={minute}
        onChange={handleMinuteChange}
        maxLength={2}
        className="w-14 text-center border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
        aria-label="Phút"
      />
    </div>
  );
}