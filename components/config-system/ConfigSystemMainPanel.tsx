"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import { getAccessToken } from "@/lib/auth";

const SECTION_TITLES: Record<string, string> = {
  system: "HỆ THỐNG",
  debt: "CÔNG NỢ",
  holiday: "LỊCH NGHỈ",
  transaction: "GIAO DỊCH",
  campaign: "CHIẾN DỊCH KINH DOANH",
  customer_greeting: "CHÀO KHÁCH HÀNG",
  auto_reply: "TRẢ LỜI TỰ ĐỘNG",
  order_v2: "ĐƠN HÀNG V2",
  semantic_index: "CHỈ MỤC NGỮ NGHĨA",
  zalo_contact_sync: "ĐỒNG BỘ DANH BẠ ZALO",
  zalo_conversation_name_updater: "CẬP NHẬT TÊN CUỘC TRÒ CHUYỆN ZALO",
  product_management: "QUẢN LÝ SẢN PHẨM",
  zalo_chat: "CHAT ZALO",
  // Thêm các section khác nếu cần
};

const SECTION_ALLOWED = ["system", "debt", "campaign", "transaction", "customer_greeting", "auto_reply", "order_v2", "semantic_index", "zalo_contact_sync", "zalo_conversation_name_updater", "product_management", "zalo_chat"];

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
  const [searchTerm, setSearchTerm] = useState<string>("");

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
      <div className="mb-4">
        <Input
          placeholder="Tìm kiếm section (tiêu đề hoặc key)..."
          value={searchTerm}
          onChange={(e: any) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>
      {Object.entries(sectionConfigs || {})
        .filter(([section]) => SECTION_ALLOWED.includes(section))
        .filter(([section]) => {
          if (!searchTerm) return true;
          const term = searchTerm.toLowerCase();
          const title = (SECTION_TITLES[section] || section).toLowerCase();
          const key = section.toLowerCase();
          return title.includes(term) || key.includes(term);
        })
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
            <div className="space-y-6">
              {/* Toggle Fields (hidden for system section) */}
              {section !== "system" && Array.isArray(configs) && configs.some((config: any) => config.type === "toggle") && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Cài đặt bật/tắt</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {configs.filter((config: any) => config.type === "toggle").map((config: any) => (
                      <div
                        key={config.name}
                        className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4"
                      >
                        <div className="font-medium text-gray-800 text-sm">{config.display_name}</div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={String(fields[config.name]) === "1"}
                            onCheckedChange={(checked) => handleInputChange(config.name, checked ? "1" : "0")}
                            disabled={editingKey !== null && editingKey !== config.name}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(config)}
                            disabled={editingKey !== null && editingKey !== config.name}
                          >
                            Lưu
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Number Fields */}
              {Array.isArray(configs) && configs.filter((config: any) => config.type === "number").length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Cài đặt số</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {configs.filter((config: any) => config.type === "number").map((config: any) => (
                      <div
                        key={config.name}
                        className="flex flex-col gap-2 bg-white rounded-lg shadow-sm border p-4"
                      >
                        <div className="font-medium text-gray-800 text-sm">{config.display_name}</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={fields[config.name] ?? ""}
                            onChange={e => handleInputChange(config.name, e.target.value)}
                            className="flex-1"
                            disabled={editingKey !== null && editingKey !== config.name}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(config)}
                            disabled={editingKey !== null && editingKey !== config.name}
                          >
                            Lưu
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Fields */}
              {Array.isArray(configs) && configs.filter((config: any) => config.type === "text").length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-600 mb-3">Cài đặt văn bản</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {configs.filter((config: any) => config.type === "text").map((config: any) => (
                      <div
                        key={config.name}
                        className="flex flex-col gap-2 bg-white rounded-lg shadow-sm border p-4"
                      >
                        <div className="font-medium text-gray-800 text-sm">{config.display_name}</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={fields[config.name] ?? ""}
                            onChange={e => handleInputChange(config.name, e.target.value)}
                            className="flex-1"
                            disabled={editingKey !== null && editingKey !== config.name}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSave(config)}
                            disabled={editingKey !== null && editingKey !== config.name}
                          >
                            Lưu
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}