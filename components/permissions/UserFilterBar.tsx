"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterParams } from "../../types";
import { useState } from "react";

const ALL_VALUE = "all";
const statuses = ["active", "inactive"];

interface UserFilterBarProps {
  onFilterChange: (filters: FilterParams) => void;
  className?: string;
  availableRoles: string[];
  availableDepartments: string[];
}

export default function UserFilterBar({
  onFilterChange,
  className,
  availableRoles,
  availableDepartments,
}: UserFilterBarProps) {
  const [filters, setFilters] = useState<FilterParams>({
    search: "",
    role: ALL_VALUE,
    department: ALL_VALUE,
    status: ALL_VALUE,
  });

  const updateField = (field: keyof FilterParams, value: string) => {
    const updated = { ...filters, [field]: value };
    setFilters(updated);

    const filterForParent = { ...updated };
    if (filterForParent.role === ALL_VALUE) filterForParent.role = undefined;
    if (filterForParent.department === ALL_VALUE) filterForParent.department = undefined;
    if (filterForParent.status === ALL_VALUE) filterForParent.status = undefined;

    onFilterChange(filterForParent);
  };

  const resetFilters = () => {
    const reset = {
      search: "",
      role: ALL_VALUE,
      department: ALL_VALUE,
      status: ALL_VALUE,
    };
    setFilters(reset);
    onFilterChange({});
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-4", className)}>
      <div className="flex flex-col flex-1 min-w-[220px]">
        <label className="text-sm font-medium text-muted-foreground mb-1">
          Tên hoặc username
        </label>
        <Input
          placeholder="Nhập tên hoặc email"
          value={filters.search}
          onChange={(e) => updateField("search", e.target.value)}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-[220px]">
        <label className="text-sm font-medium text-muted-foreground mb-1">
          Vai trò
        </label>
        <Select
          value={filters.role || ALL_VALUE}
          onValueChange={(val) => updateField("role", val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả</SelectItem>
            {availableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col flex-1 min-w-[220px]">
        <label className="text-sm font-medium text-muted-foreground mb-1">
          Phòng ban
        </label>
        <Select
          value={filters.department || ALL_VALUE}
          onValueChange={(val) => updateField("department", val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn phòng ban" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả</SelectItem>
            {availableDepartments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col flex-1 min-w-[220px]">
        <label className="text-sm font-medium text-muted-foreground mb-1">
          Trạng thái
        </label>
        <Select
          value={filters.status || ALL_VALUE}
          onValueChange={(val) => updateField("status", val)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Chọn trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Tất cả</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5">
        <Button variant="gradient" onClick={resetFilters}>
          Xóa bộ lọc
        </Button>
      </div>
    </div>
  );
}
