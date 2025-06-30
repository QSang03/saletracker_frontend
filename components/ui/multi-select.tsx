"use client";

import * as React from "react";

interface MultiSelectProps {
  values: string[];
  onValuesChange: (values: string[]) => void;
  children: React.ReactNode;
}

export function MultiSelect({ values, onValuesChange, children }: MultiSelectProps) {
  return <div>{children}</div>;
}

export function MultiSelectTrigger({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function MultiSelectValue({ placeholder }: { placeholder: string }) {
  return <span>{placeholder}</span>;
}

export function MultiSelectContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function MultiSelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return <div data-value={value}>{children}</div>;
}
