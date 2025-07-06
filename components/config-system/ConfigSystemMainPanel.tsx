"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getAccessToken } from "@/lib/auth";

const CONFIG_FIELDS = [
  // SYSTEM
  { key: "system_cnoThreads", label: "Tổng luồng chạy CNO-GD", type: "number", section: "system" },
  { key: "system_cnoBatch", label: "Tổng xử lý số lượng hội thoại 1 lần GD", type: "number", section: "system" },
  { key: "system_cnoRest", label: "Thời gian nghỉ khi xử lý GD", type: "number", section: "system" },
  { key: "system_apiRetry", label: "Số lần thử lại api GD", type: "number", section: "system" },
  { key: "system_apiInterval", label: "Thời gian xử lý api lặp lại GD", type: "number", section: "system" },
  { key: "system_cnoCheckBatch", label: "Khối lượng tin nhắn để check CNO-GD", type: "number", section: "system" },
  { key: "system_cnoTimeout", label: "Thời gian timeout của luồng CNO-GD", type: "number", section: "system" },
  // SALE
  { key: "sale_campaignRest", label: "Thời gian nghỉ sale_campaign", type: "number", section: "sale" },
  { key: "sale_customerRest", label: "Thời gian nghỉ giữa từng khách hàng", type: "number", section: "sale" },
  { key: "sale_rest", label: "Thời gian nghỉ chung của sale", type: "number", section: "sale" },
  { key: "sale_customerCount", label: "Số lượng khách mỗi sale gửi", type: "number", section: "sale" },
  { key: "sale_delayLink", label: "Thời gian delay link", type: "number", section: "sale" },
  { key: "sale_delayText", label: "Thời gian delay text", type: "number", section: "sale" },
];

const SECTION_TITLES: Record<string, string> = {
  system: "HỆ THỐNG",
  debt: "CÔNG NỢ",
  sale: "KINH DOANH",
};

interface ConfigSystemMainPanelProps {
  allConfigs: any[];
  onConfirm?: (message: string, onConfirm: () => void) => void;
  onSaved?: (result: { success: boolean; message: string }) => void;
}

export default function ConfigSystemMainPanel({ allConfigs, onConfirm, onSaved }: ConfigSystemMainPanelProps) {
  // Map giá trị mặc định từ allConfigs nếu có, nếu không thì lấy mặc định cứng
  const getDefaultValue = (key: string) => {
    const found = allConfigs?.find((item) => item.name === key);
    return found ? found.value : "";
  };

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    CONFIG_FIELDS.forEach((f) => {
      obj[f.key] = getDefaultValue(f.key);
    });
    return obj;
  });
  // Track which field is being edited
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // Khi allConfigs thay đổi thì cập nhật lại state (reset nếu không đang edit)
  useEffect(() => {
    if (editingKey === null) {
      const obj: Record<string, string> = {};
      CONFIG_FIELDS.forEach((f) => {
        obj[f.key] = getDefaultValue(f.key);
      });
      setFields(obj);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConfigs]);

  const handleInputChange = (key: string, value: string) => {
    if (editingKey && editingKey !== key) {
      alert("Bạn chưa lưu giá trị đã sửa đổi trước đó!");
      return;
    }
    setEditingKey(key);
    setFields(f => ({ ...f, [key]: value }));
  };

  const handleSave = (key: string) => {
    const field = CONFIG_FIELDS.find(f => f.key === key);
    if (!field) return;
    const doSave = async () => {
      try {
        const token = getAccessToken ? getAccessToken() : localStorage.getItem("access_token");
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/${field.section}/${key}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ value: fields[key] }),
          }
        );
        if (!res.ok) throw new Error("Lưu cấu hình thất bại");
        setEditingKey(null);
        if (onSaved) onSaved({ success: true, message: `Đã lưu cấu hình \"${field.label}\" với giá trị: ${fields[key]}` });
      } catch {
        if (onSaved) onSaved({ success: false, message: "Lưu cấu hình thất bại!" });
      }
    };
    if (onConfirm) {
      onConfirm(`Bạn có chắc chắn muốn lưu cấu hình \"${field.label}\"?`, doSave);
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn lưu cấu hình \"${field.label}\"?`)) doSave();
    }
  };

  const sections = Array.from(new Set(CONFIG_FIELDS.map(f => f.section)));

  // Hiển thị alert giống modal công nợ
  return (
    <>
      <div className="w-full max-w-7xl mx-auto py-8 space-y-10">
        {sections.map(section => (
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
              {CONFIG_FIELDS.filter(f => f.section === section).map(field => (
                <div
                  key={field.key}
                  className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-white rounded-lg shadow-sm border p-4"
                >
                  <div className="flex-1 font-medium text-gray-800">{field.label}</div>
                  <Input
                    type={field.type === "text" ? "text" : field.type}
                    value={fields[field.key]}
                    onChange={e => handleInputChange(field.key, e.target.value)}
                    className="w-full md:w-24"
                    disabled={editingKey !== null && editingKey !== field.key}
                  />
                  <Button
                    size="sm"
                    className="mt-2 md:mt-0"
                    onClick={() => handleSave(field.key)}
                    disabled={editingKey !== null && editingKey !== field.key}
                  >
                    Lưu
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}