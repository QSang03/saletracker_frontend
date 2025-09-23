import * as React from "react";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";

export interface Option {
  label: string;
  value: string | number;
}

interface MultiSelectComboboxProps {
  options: Option[];
  value: (string | number)[] | any; // accept any, normalize internally
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  className?: string; // ✅ Cho phép truyền className từ bên ngoài
}

export const MultiSelectCombobox = React.memo(function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = "Chọn...",
  className = "", // ✅ Mặc định rỗng
}: MultiSelectComboboxProps) {
  // Normalize value to array
  const normalizedValue: (string | number)[] = Array.isArray(value)
    ? value as (string | number)[]
    : typeof value === 'string'
      ? value.split(',').map(v => v.trim()).filter(Boolean)
      : [];
  const [open, setOpen] = React.useState(false);
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  const handleSelect = (val: string | number) => {
    if (normalizedValue.includes(val)) {
      onChange(normalizedValue.filter((v) => v !== val));
    } else {
      onChange([...normalizedValue, val]);
    }
  };

  // Đóng combobox khi click outside
  React.useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        comboboxRef.current &&
        !comboboxRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={comboboxRef} className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={() => setOpen((o) => !o)}
      >
    {normalizedValue.length === 0
          ? placeholder
          : options
      .filter((opt) => normalizedValue.includes(opt.value))
              .map((opt) => String(opt.label))
              .join(", ")}
        <span className="ml-2">&#9662;</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border rounded shadow">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              {options.map((opt, index) => (
                <CommandItem
                  key={`${String(opt.value)}-${index}`}
                  onSelect={() => handleSelect(opt.value)}
                  className={normalizedValue.includes(opt.value) ? "bg-blue-100" : ""}
                >
                  <input
                    type="checkbox"
                    checked={normalizedValue.includes(opt.value)}
                    readOnly
                    className="mr-2"
                  />
                  {String(opt.label)}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}

  {normalizedValue.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {options
    .filter((opt) => normalizedValue.includes(opt.value))
            .map((opt) => (
              <span
                key={opt.value}
                className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs flex items-center"
              >
                {opt.label}
                <button
                  type="button"
                  className="ml-1 text-xs hover:text-red-600 focus:outline-none cursor-pointer"
                  aria-label={`Bỏ chọn ${opt.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(opt.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelect(opt.value);
                    }
                  }}
                >
                  ×
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
});
