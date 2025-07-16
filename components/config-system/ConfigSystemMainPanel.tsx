"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getAccessToken } from "@/lib/auth";

// ...existing code...

const SECTION_TITLES: Record<string, string> = {
  system: "HỆ THỐNG",
  debt: "CÔNG NỢ",
  sale: "KINH DOANH",
  holiday: "LỊCH NGHỈ",
  transaction: "GIAO DỊCH"
  // Thêm các section khác nếu cần
};

const SECTION_ALLOWED = ["system", "debt", "sale", "transaction"];

interface ConfigSystemMainPanelProps {
  allConfigs: any[];
  onConfirm?: (message: string, onConfirm: () => void) => void;
  onSaved?: (result: { success: boolean; message: string }) => void;
}

export default function ConfigSystemMainPanel({ allConfigs, onConfirm, onSaved }: ConfigSystemMainPanelProps) {
  // Group configs by section
  const sectionConfigs = allConfigs?.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const [fields, setFields] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);

  useEffect(() => {
    if (editingKey === null) {
      const obj: Record<string, string> = {};
      allConfigs?.forEach((item) => {
        obj[item.name] = item.value;
      });
      setFields(obj);
    }
  }, [allConfigs]);

  const handleInputChange = (key: string, value: string) => {
    if (editingKey && editingKey !== key) {
      alert("Bạn chưa lưu giá trị đã sửa đổi trước đó!");
      return;
    }
    setEditingKey(key);
    setFields(f => ({ ...f, [key]: value }));
  };

  const handleSave = (config: any) => {
    const doSave = async () => {
      try {
        const token = getAccessToken ? getAccessToken() : localStorage.getItem("access_token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/${config.section}/${config.name}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ value: fields[config.name] }),
          }
        );
        if (!res.ok) throw new Error("Lưu cấu hình thất bại");
        setEditingKey(null);
        if (onSaved) onSaved({ success: true, message: `Đã lưu cấu hình \"${config.display_name}\" với giá trị: ${fields[config.name]}` });
      } catch {
        if (onSaved) onSaved({ success: false, message: "Lưu cấu hình thất bại!" });
      }
    };
    if (onConfirm) {
      onConfirm(`Bạn có chắc chắn muốn lưu cấu hình \"${config.display_name}\"?`, doSave);
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn lưu cấu hình \"${config.display_name}\"?`)) doSave();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-8 space-y-10">
      {Object.entries(sectionConfigs || {})
        .filter(([section]) => SECTION_ALLOWED.includes(section))
        .map(([section, configs]) => (
          <div key={section}>
            <motion.h2
              className="text-lg font-bold mb-4 bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent"
              style={{ backgroundSize: "200% auto" }}
              animate={{
                backgroundPosition: ["0% center", "100% center"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            >
              {SECTION_TITLES[section] || section}
            </motion.h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.isArray(configs) && configs.filter((config: any) => config.type === "number").map((config: any) => (
                <div
                  key={config.name}
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-white rounded-lg shadow-sm border p-4"
                >
                  <div className="flex-1 font-medium text-gray-800">{config.display_name}</div>
                  <Input
                    type={config.type}
                    value={fields[config.name] ?? ""}
                    onChange={e => handleInputChange(config.name, e.target.value)}
                    className="w-full md:w-24"
                    disabled={editingKey !== null && editingKey !== config.name}
                  />
                  <Button
                    size="sm"
                    className="mt-2 md:mt-0"
                    onClick={() => handleSave(config)}
                    disabled={editingKey !== null && editingKey !== config.name}
                  >
                    Lưu
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}