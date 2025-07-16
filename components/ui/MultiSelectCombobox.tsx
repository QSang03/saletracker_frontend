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
  value: (string | number)[];
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
  const [open, setOpen] = React.useState(false);
  const comboboxRef = React.useRef<HTMLDivElement>(null);

  const handleSelect = (val: string | number) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
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
        {value.length === 0
          ? placeholder
          : options
              .filter((opt) => value.includes(opt.value))
              .map((opt) => opt.label)
              .join(", ")}
        <span className="ml-2">&#9662;</span>
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-full bg-white border rounded shadow">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  onSelect={() => handleSelect(opt.value)}
                  className={value.includes(opt.value) ? "bg-blue-100" : ""}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(opt.value)}
                    readOnly
                    className="mr-2"
                  />
                  {opt.label}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </div>
      )}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {options
            .filter((opt) => value.includes(opt.value))
            .map((opt) => (
              <span
                key={opt.value}
                className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs flex items-center"
              >
                {opt.label}
                <button
                  type="button"
                  className="ml-1 text-xs"
                  onClick={() => handleSelect(opt.value)}
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
