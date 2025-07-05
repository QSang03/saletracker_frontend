"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const CONFIG_FIELDS = [
  { key: "cnoThreads", label: "Tổng luồng chạy CNO-GD", type: "number", section: "system" },
  { key: "cnoBatch", label: "Tổng xử lý số lượng hội thoại 1 lần GD", type: "number", section: "system" },
  { key: "cnoRest", label: "Thời gian nghỉ khi xử lý GD", type: "number", section: "system" },
  { key: "apiRetry", label: "Số lần thử lại api GD", type: "number", section: "system" },
  { key: "apiInterval", label: "Thời gian xử lý api lặp lại GD", type: "number", section: "system" },
  { key: "cnoCheckBatch", label: "Khối lượng tin nhắn để check CNO-GD", type: "number", section: "system" },
  { key: "cnoTimeout", label: "Thời gian timeout của luồng CNO-GD", type: "number", section: "system" },
  { key: "saleCampaignRest", label: "Thời gian nghỉ sale_campaign", type: "number", section: "debt" },
  { key: "saleCustomerRest", label: "Thời gian nghỉ giữa từng khách hàng", type: "number", section: "debt" },
  { key: "saleRest", label: "Thời gian nghỉ chung của sale", type: "number", section: "debt" },
  { key: "saleCustomerCount", label: "Số lượng khách mỗi sale gửi", type: "number", section: "debt" },
  { key: "delayLink", label: "Thời gian delay link", type: "number", section: "debt" },
  { key: "delayText", label: "Thời gian delay text", type: "number", section: "debt" },
];

const SECTION_TITLES: Record<string, string> = {
  system: "HỆ THỐNG",
  debt: "CÔNG NỢ",
};

interface ConfigSystemMainPanelProps {
  allConfigs: any[];
}

export default function ConfigSystemMainPanel({ allConfigs }: ConfigSystemMainPanelProps) {
  // Map giá trị mặc định từ allConfigs nếu có, nếu không thì lấy mặc định cứng
  const getDefaultValue = (key: string) => {
    const found = allConfigs?.find((item) => item.name === key);
    return found ? found.value : defaultValues[key];
  };

  // Giá trị mặc định fallback
  const defaultValues: Record<string, string> = {
    cnoThreads: "3",
    cnoBatch: "300",
    cnoRest: "300",
    apiRetry: "5",
    apiInterval: "5",
    cnoCheckBatch: "1",
    cnoTimeout: "30",
    saleCampaignRest: "5",
    saleCustomerRest: "1",
    saleRest: "5",
    saleCustomerCount: "8",
    delayLink: "15",
    delayText: "5",
  };

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    CONFIG_FIELDS.forEach((f) => {
      obj[f.key] = getDefaultValue(f.key);
    });
    return obj;
  });

  // Khi allConfigs thay đổi thì cập nhật lại state
  useEffect(() => {
    const obj: Record<string, string> = {};
    CONFIG_FIELDS.forEach((f) => {
      obj[f.key] = getDefaultValue(f.key);
    });
    setFields(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allConfigs]);

  const handleSave = async (key: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/${CONFIG_FIELDS.find(f => f.key === key)?.section}/${key}`,
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
      alert(`Đã lưu cấu hình "${CONFIG_FIELDS.find(f => f.key === key)?.label}" với giá trị: ${fields[key]}`);
    } catch {
      alert("Lưu cấu hình thất bại!");
    }
  };

  const sections = Array.from(new Set(CONFIG_FIELDS.map(f => f.section)));

  return (
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
                  type={field.type}
                  value={fields[field.key]}
                  onChange={e => setFields(f => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full md:w-24"
                />
                <Button
                  size="sm"
                  className="mt-2 md:mt-0"
                  onClick={() => handleSave(field.key)}
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