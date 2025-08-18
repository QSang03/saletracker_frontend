"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSalePersonas } from "@/hooks/contact-list/useSalePersonas";
import type { SalesPersona } from "@/types/auto-reply";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Brain,
  Search,
  AlertTriangle,
  Copy,
  Download,
  Upload,
  Sparkles,
  Check,
  Wand2,
  Zap,
  Heart,
  User,
  MessageCircle,
  Target,
  Coffee,
  Library,
  Edit3,
  Palette,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import type { AlertType } from "@/components/ui/loading/ServerResponseAlert";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_PROMPT_LENGTH = 2000;

import templatesData from "./template.json";

// Map icon name from JSON to actual icon component
const iconMap: Record<string, any> = {
  Zap,
  Brain,
  Heart,
  Sparkles,
  Target,
  Coffee,
};

// Build preset templates by attaching icon components
const presetTemplates = (templatesData as any[]).map((t) => ({
  ...t,
  icon: iconMap[t.icon] || Sparkles,
}));

export default function PersonasManagerModal({ open, onClose }: Props) {
  const { personas, fetchPersonas, setPersonas } = useSalePersonas(false);
  const { currentUser } = useCurrentUser();
  const [editing, setEditing] = useState<SalesPersona | null>(null);
  const [form, setForm] = useState<{ name: string; personaPrompt: string }>({
    name: "",
    personaPrompt: "",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<SalesPersona | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [serverAlert, setServerAlert] = useState<
    { type: AlertType; message: string } | null
  >(null);
  const [justSaved, setJustSaved] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [activeTab, setActiveTab] = useState("library");

  useEffect(() => {
    if (open) fetchPersonas();
  }, [open, fetchPersonas]);

  useEffect(() => {
    if (!editing) {
      setForm({ name: "", personaPrompt: "" });
      setError("");
      setSelectedTemplate(null);
    }
  }, [editing]);

  useEffect(() => {
    const words = form.personaPrompt
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWordCount(words.length);
  }, [form.personaPrompt]);

  // ✅ Enhanced filter with advanced search
  const filteredPersonas = personas.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.personaPrompt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startAdd = () => {
  setEditing(null);
  setIsCreating(true);
  setForm({ name: "", personaPrompt: "" });
    setError("");
    setSelectedTemplate(null);
    setActiveTab("form");
  };

  const startEdit = (p: SalesPersona) => {
  setEditing(p);
  setIsCreating(false);
    setForm({ name: p.name, personaPrompt: p.personaPrompt });
    setError("");
    setSelectedTemplate(null);
    setActiveTab("form");
  };

  const applyTemplate = (
    template: (typeof presetTemplates)[0],
    index: number
  ) => {
  // Put modal into "create" mode so Save button becomes active
  setEditing(null);
  setIsCreating(true);
  setForm({ name: template.name, personaPrompt: template.prompt });
    setSelectedTemplate(index);
    setError("");
    setActiveTab("form");

    // ✅ Auto focus to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const save = async () => {
    if (!currentUser?.id) return;
    if (!form.name.trim()) {
      const msg = "Vui lòng nhập tên persona";
      setError(msg);
      setServerAlert({ type: "error", message: msg });
      return;
    }
    if (!form.personaPrompt.trim()) {
      const msg = "Vui lòng nhập mô tả tính cách";
      setError(msg);
      setServerAlert({ type: "error", message: msg });
      return;
    }
    if (form.personaPrompt.length > MAX_PROMPT_LENGTH) {
      const msg = `Mô tả không được vượt quá ${MAX_PROMPT_LENGTH} ký tự`;
      setError(msg);
      setServerAlert({ type: "error", message: msg });
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editing && editing.personaId) {
        const { data } = await api.patch<SalesPersona>(
          `auto-reply/personas/${editing.personaId}`,
          { ...form, userId: currentUser.id }
        );
        setPersonas((prev) =>
          prev.map((p) => (p.personaId === data.personaId ? data : p))
        );
          // Notify other components that personas changed (update)
          try {
            window.dispatchEvent(
              new CustomEvent("personas:changed", { detail: { action: "update", persona: data } })
            );
          } catch (e) {}
      } else {
        const { data } = await api.post<SalesPersona>(`auto-reply/personas`, {
          ...form,
          userId: currentUser.id,
        });
        setPersonas((prev) => [data, ...prev]);
        // Notify other components that personas changed
        try {
          window.dispatchEvent(
            new CustomEvent("personas:changed", { detail: { action: "create", persona: data } })
          );
        } catch (e) {}
      }

      // ✅ Success animation + global alert
      setServerAlert({ type: "success", message: "Lưu persona thành công" });
      setJustSaved(true);
      setTimeout(() => {
        setEditing(null);
        setIsCreating(false);
        setJustSaved(false);
        setActiveTab("library");
      }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Có lỗi xảy ra khi lưu";
      setError(msg);
      setServerAlert({ type: "error", message: msg });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (p: SalesPersona) => {
    setDeleteConfirm(p);
  };

  // ✅ Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!currentUser?.id || !deleteConfirm) return;

    try {
      await api.delete(
        `auto-reply/personas/${deleteConfirm.personaId}?userId=${currentUser.id}`
      );
      setPersonas((prev) =>
        prev.filter((x) => x.personaId !== deleteConfirm.personaId)
      );
      setDeleteConfirm(null);
  setServerAlert({ type: "success", message: "Xóa persona thành công" });
      // Notify other components that personas changed (delete)
      try {
        window.dispatchEvent(
          new CustomEvent("personas:changed", { detail: { action: "delete", personaId: deleteConfirm.personaId } })
        );
      } catch (e) {}
    } catch (err: any) {
  const msg = err?.response?.data?.message || "Có lỗi xảy ra khi xóa";
  setError(msg);
  setServerAlert({ type: "error", message: msg });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
  };

  // Clear form and reset modal to library tab. Use when user cancels form whether
  // they were in edit/create mode or typed manually without `editing` state.
  const handleCancel = () => {
    setEditing(null);
    setForm({ name: "", personaPrompt: "" });
    setError("");
    setSelectedTemplate(null);
    setActiveTab("library");
  };

  const duplicatePersona = (p: SalesPersona) => {
  setEditing(null);
  setIsCreating(true);
  setForm({ name: `${p.name} (Bản sao)`, personaPrompt: p.personaPrompt });
  setActiveTab("form");
  };

  return (
    <>
      {/* Global server response alert (success/error) */}
      {serverAlert && (
        <ServerResponseAlert
          type={serverAlert.type}
          message={serverAlert.message}
          onClose={() => setServerAlert(null)}
        />
      )}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        {/* ✅ FIXED: Modal với background trắng đồng bộ */}
        <DialogContent className="!max-w-7xl !max-h-[95vh] !h-[95vh] flex flex-col overflow-hidden bg-white border border-gray-200 shadow-2xl">
          {/* ✅ FIXED: Header với background trắng */}
          <DialogHeader className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
            <DialogTitle className="flex items-center justify-between">
              <motion.div
                className="flex items-center gap-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Quản lý AI Personas
                  </div>
                  <div className="text-sm text-gray-600 font-normal">
                    Tạo tính cách AI độc đáo cho từng phong cách bán hàng
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-700 border-purple-200"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  {personas.length} personas
                </Badge>
                <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  ✨ Advanced Tabs
                </div>
              </motion.div>
            </DialogTitle>
          </DialogHeader>

          {/* ✅ FIXED: TABS với size đồng bộ */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="flex-shrink-0 grid w-full grid-cols-3 bg-white border-b border-gray-200 h-14">
              <TabsTrigger
                value="library"
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:border-purple-300 hover:bg-gray-50 transition-all duration-200 h-full"
              >
                <Library className="w-4 h-4" />
                Thư viện Personas
              </TabsTrigger>
              <TabsTrigger
                value="form"
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 data-[state=active]:border-blue-300 hover:bg-gray-50 transition-all duration-200 h-full"
              >
                <Edit3 className="w-4 h-4" />
                {editing?.personaId ? "Chỉnh sửa" : "Tạo Persona"}
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="flex items-center gap-2 px-4 py-3 text-sm font-semibold data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=active]:border-emerald-300 hover:bg-gray-50 transition-all duration-200 h-full"
              >
                <Palette className="w-4 h-4" />
                Templates Chi tiết
              </TabsTrigger>
            </TabsList>

            {/* ✅ TAB 1: THÔNG TIN PERSONAS */}
            <TabsContent value="library" className="flex-1 overflow-hidden p-6">
              <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                  <motion.div
                    className="flex items-center gap-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">
                        Thư viện Personas
                      </div>
                      <div className="text-xs text-gray-500">
                        {filteredPersonas.length} trong số {personas.length}
                      </div>
                    </div>
                  </motion.div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={startAdd}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Tạo mới
                      </span>
                    </Button>
                  </div>
                </div>

                {/* ✅ Enhanced Search */}
                <div className="relative mb-6 flex-shrink-0">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm personas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 bg-white border-gray-300 focus:border-purple-400 transition-all duration-300"
                  />
                  {searchTerm && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                {/* ✅ Personas List */}
                <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0 p-3">
                  <AnimatePresence>
                    {filteredPersonas.length === 0 ? (
                      <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Brain className="w-10 h-10 text-purple-400" />
                        </div>
                        <div className="text-base font-medium text-gray-600 mb-2">
                          {searchTerm
                            ? "Không tìm thấy persona phù hợp"
                            : "Chưa có persona nào"}
                        </div>
                        <div className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                          {searchTerm
                            ? "Thử từ khóa khác hoặc tạo persona mới phù hợp với nhu cầu"
                            : "Tạo persona đầu tiên để AI có thể hiểu và phản hồi theo phong cách của bạn"}
                        </div>
                        {!searchTerm && (
                          <Button
                            onClick={startAdd}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Tạo persona đầu tiên
                          </Button>
                        )}
                      </motion.div>
                    ) : (
                      filteredPersonas.map((p, index) => (
                        <motion.div
                          key={p.personaId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "group relative bg-white rounded-xl p-4 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] border",
                            editing?.personaId === p.personaId
                              ? "ring-2 ring-purple-400 shadow-xl bg-purple-50 border-purple-200"
                              : "hover:bg-gray-50 border-gray-200"
                          )}
                          onClick={() => startEdit(p)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
                                  <User className="w-4 h-4 text-white" />
                                </div>
                                <div className="font-semibold text-gray-800 truncate group-hover:text-purple-700 transition-colors">
                                  {p.name}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-3">
                                {p.personaPrompt}
                              </div>
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1 text-gray-500">
                                  <MessageCircle className="w-3 h-3" />
                                  {p.personaPrompt.length} ký tự
                                </div>
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Brain className="w-3 h-3" />
                                  {
                                    p.personaPrompt.trim().split(/\s+/).length
                                  }{" "}
                                  từ
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  duplicatePersona(p);
                                }}
                                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                title="Sao chép"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(p);
                                }}
                                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete(p);
                                }}
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>

                          {/* ✅ Editing indicator */}
                          {editing?.personaId === p.personaId && (
                            <div className="absolute top-2 right-2">
                              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse shadow-lg"></div>
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* ✅ TAB 2: TẠO/SỬA PERSONA */}
            <TabsContent value="form" className="flex-1 overflow-hidden p-6">
              <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col">
                <motion.div
                  className="flex items-center gap-4 mb-6 flex-shrink-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    {editing && editing.personaId ? (
                      <Pencil className="w-5 h-5 text-white" />
                    ) : (
                      <Plus className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-lg">
                      {editing && editing.personaId
                        ? "Chỉnh sửa Persona"
                        : "Tạo Persona Mới"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {editing && editing.personaId
                        ? "Cập nhật thông tin persona"
                        : "Thiết lập tính cách AI cho phong cách riêng"}
                    </div>
                  </div>

                  {justSaved && (
                    <motion.div
                      className="ml-auto flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", duration: 0.5 }}
                    >
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Đã lưu!</span>
                    </motion.div>
                  )}
                </motion.div>

                {/* ✅ FIXED: Form content với scroll riêng */}
                <div className="flex-1 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0 p-6">
                  {/* ✅ Enhanced Error Display */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div className="text-sm text-red-700 font-medium">
                          {error}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setError("")}
                          className="ml-auto h-6 w-6 p-0 hover:bg-red-100"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ✅ FIXED: Name Field với background rõ ràng */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                      <User className="w-4 h-4" />
                      Tên persona
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((v) => ({ ...v, name: e.target.value }))
                      }
                      placeholder="VD: 🔥 Nhiệt tình & Năng động, 🧠 Chuyên gia Tư vấn..."
                      className="bg-white border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-300 text-base px-4 py-3"
                    />
                  </motion.div>

                  {/* ✅ FIXED: Prompt Field với background rõ ràng */}
                  <motion.div
                    className="flex-1 flex flex-col"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Mô tả tính cách
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-4 text-xs">
                        <div
                          className={cn(
                            "px-3 py-1 rounded-full transition-colors",
                            form.personaPrompt.length > MAX_PROMPT_LENGTH
                              ? "bg-red-100 text-red-600 border border-red-300"
                              : form.personaPrompt.length >
                                MAX_PROMPT_LENGTH * 0.8
                              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                              : "bg-gray-100 text-gray-600 border border-gray-300"
                          )}
                        >
                          {form.personaPrompt.length}/{MAX_PROMPT_LENGTH} ký tự
                        </div>
                        <div className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 border border-blue-300">
                          {wordCount} từ
                        </div>
                      </div>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      value={form.personaPrompt}
                      onChange={(e) =>
                        setForm((v) => ({
                          ...v,
                          personaPrompt: e.target.value,
                        }))
                      }
                      placeholder="Mô tả chi tiết về tính cách AI:

🎯 Phong cách giao tiếp: Thân thiện, chuyên nghiệp, nhiệt tình...
💬 Cách chào hỏi và kết thúc cuộc trò chuyện  
🎨 Sử dụng emoji và ngôn ngữ như thế nào
🔍 Cách hiểu và phản hồi với khách hàng
🛍️ Phương pháp gợi ý và tư vấn sản phẩm
⚡ Xử lý tình huống khó khăn như thế nào

Ví dụ: 'Bạn là một nhân viên bán hàng chuyên nghiệp và thân thiện. Luôn chào khách lịch sự với emoji phù hợp 😊, lắng nghe kỹ nhu cầu trước khi tư vấn, và đưa ra những gợi ý sản phẩm chính xác nhất...'"
                      className="bg-white border-2 border-gray-300 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-300 resize-none text-base leading-relaxed min-h-[400px] px-4 py-3"
                      rows={18}
                    />

                    {/* ✅ Enhanced Writing Tips */}
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Mẹo viết persona hiệu quả
                      </div>
                      <div className="text-xs text-blue-600 space-y-1">
                        <div>
                          • <strong>Phong cách giao tiếp:</strong> Mô tả rõ
                          giọng điệu, cách sử dụng emoji
                        </div>
                        <div>
                          • <strong>Cách tiếp cận khách:</strong> Thân thiện,
                          chuyên nghiệp hay sáng tạo
                        </div>
                        <div>
                          • <strong>Quy trình tư vấn:</strong> Cách hiểu nhu cầu
                          và đề xuất sản phẩm
                        </div>
                        <div>
                          • <strong>Xử lý tình huống:</strong> Phản ứng với
                          khiếu nại, từ chối, hoặc khó khăn
                        </div>
                        <div>
                          • <strong>Cá tính riêng:</strong> Điều gì làm persona
                          này độc đáo và đáng nhớ
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* ✅ Enhanced Action Buttons */}
                  <motion.div
                    className="flex justify-end gap-3 pt-6 border-t border-gray-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                  >
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={saving}
                      className="bg-white hover:bg-gray-50 border-gray-300"
                    >
                      <span className="flex items-center gap-2">
                        <X className="w-4 h-4 mr-2" />
                        Hủy
                      </span>
                    </Button>
                    <Button
                      onClick={save}
                      disabled={
                        saving ||
                        !form.name.trim() ||
                        !form.personaPrompt.trim()
                      }
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
                    >
                      {saving ? (
                        <>
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang lưu...
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-2">
                            <Save className="w-4 h-4 mr-2" />
                            {editing?.personaId ? "Cập nhật" : "Tạo mới"}
                          </span>
                        </>
                      )}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </TabsContent>

            {/* ✅ TAB 3: TEMPLATES CHI TIẾT - FIXED SCROLLING */}
            <TabsContent
              value="templates"
              className="flex-1 overflow-hidden p-6"
            >
              <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-lg p-6 flex flex-col">
                <motion.div
                  className="flex items-center gap-4 mb-6 flex-shrink-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-lg">
                      Templates Chi tiết
                    </div>
                    <div className="text-sm text-gray-500">
                      Chọn template để bắt đầu nhanh với personas có sẵn
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-emerald-100 text-emerald-700"
                  >
                    {presetTemplates.length} templates
                  </Badge>
                </motion.div>

                {/* ✅ FIXED: Templates với scroll tự do */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 min-h-0 p-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
                    {presetTemplates.map((template, index) => {
                      const Icon = template.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "group p-6 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.005]",
                            selectedTemplate === index
                              ? `bg-gradient-to-br ${template.color} text-white border-transparent shadow-2xl scale-[1.005]`
                              : "bg-white hover:bg-gray-50 border-gray-200 hover:border-emerald-300"
                          )}
                          onClick={() => applyTemplate(template, index)}
                        >
                          <div className="flex items-start gap-4 mb-4">
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                selectedTemplate === index
                                  ? "bg-white/20"
                                  : `bg-gradient-to-r ${template.color}`
                              )}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div
                                className={cn(
                                  "font-semibold text-lg mb-1",
                                  selectedTemplate === index
                                    ? "text-white"
                                    : "text-gray-800"
                                )}
                              >
                                {template.name}
                              </div>
                              <div
                                className={cn(
                                  "text-sm opacity-80",
                                  selectedTemplate === index
                                    ? "text-white"
                                    : "text-gray-600"
                                )}
                              >
                                {template.category}
                              </div>
                            </div>
                          </div>

                          <div
                            className={cn(
                              "text-sm leading-relaxed mb-4",
                              selectedTemplate === index
                                ? "text-white"
                                : "text-gray-700"
                            )}
                          >
                            {template.description}
                          </div>

                          <div
                            className={cn(
                              "text-xs font-mono leading-relaxed max-h-40 overflow-y-auto scrollbar-thin p-3 rounded-lg border no-scrollbar-content",
                              selectedTemplate === index
                                ? "text-white/90 bg-white/10 border-white/20"
                                : "text-gray-600 bg-gray-50 border-gray-200"
                            )}
                            style={{
                              msOverflowStyle: "none",
                              scrollbarWidth: "none",
                            }}
                          >
                            {template.prompt}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/20">
                            <div
                              className={cn(
                                "text-xs",
                                selectedTemplate === index
                                  ? "text-white/80"
                                  : "text-gray-500"
                              )}
                            >
                              {template.prompt.length} ký tự •{" "}
                              {template.prompt.trim().split(/\s+/).length} từ
                            </div>
                            <Button
                              size="sm"
                              variant={
                                selectedTemplate === index
                                  ? "secondary"
                                  : "outline"
                              }
                              className={cn(
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                                selectedTemplate === index &&
                                  "opacity-100 bg-white/20 hover:bg-white/30 text-white border-white/30"
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                applyTemplate(template, index);
                              }}
                            >
                              <span className="flex items-center gap-2">
                                <Wand2 className="w-3 h-3 mr-1" />
                                Sử dụng
                              </span>
                            </Button>
                          </div>

                          {selectedTemplate === index && (
                            <motion.div
                              className="absolute top-4 right-4"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", duration: 0.3 }}
                            >
                              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Inline style to hide webkit scrollbar for template content */}
          <style>{`.no-scrollbar-content { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-content::-webkit-scrollbar { display: none; }`}</style>

          {/* ✅ FIXED: Footer với background trắng */}
          <DialogFooter className="flex-shrink-0 bg-white border-t border-gray-200 p-6">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-full">
                  💡 Personas chi tiết giúp AI hiểu sâu và phản hồi chính xác
                  hơn
                </div>
                <Badge variant="outline" className="text-xs bg-gray-50">
                  Tabbed v4.0
                </Badge>
              </div>
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-white hover:bg-gray-50 border-gray-300"
              >
                Đóng
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ ConfirmDialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="🗑️ Xác nhận xóa persona"
        message={
          <div className="space-y-3">
            <div className="text-base">
              Bạn có chắc chắn muốn xóa persona{" "}
              <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                "{deleteConfirm?.name}"
              </span>{" "}
              không?
            </div>
            <div className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-200">
              ⚠️ Tất cả dữ liệu liên quan sẽ bị mất vĩnh viễn và không thể khôi
              phục.
            </div>
          </div>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Xóa persona"
        cancelText="Hủy bỏ"
      />
    </>
  );
}

