"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Upload, Image, Link, FileText } from "lucide-react";
import { CampaignType, CampaignFormData } from "@/types";

interface CreateCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CampaignFormData) => Promise<void>;
  availableUsers?: Array<{ id: string; fullName: string; email: string }>;
}

const campaignTypeOptions = [
  { value: CampaignType.HOURLY_KM, label: "Chương trình KM 1 giờ" },
  { value: CampaignType.DAILY_KM, label: "Chương trình KM 1 ngày" },
  { value: CampaignType.THREE_DAY_KM, label: "Chương trình KM trong 3 ngày" },
  { value: CampaignType.WEEKLY_SP, label: "Chương trình gửi SP 1 tuần / lần" },
  {
    value: CampaignType.WEEKLY_BBG,
    label: "Chương trình gửi BBG 1 tuần / lần",
  },
];

const weekDayOptions = [
  { value: 2, label: "Thứ 2" },
  { value: 3, label: "Thứ 3" },
  { value: 4, label: "Thứ 4" },
  { value: 5, label: "Thứ 5" },
  { value: 6, label: "Thứ 6" },
  { value: 7, label: "Thứ 7" },
];

interface ReminderItem {
  content: string;
  minutes: number;
}

export default function CreateCampaignModal({
  open,
  onOpenChange,
  onSubmit,
  availableUsers = [],
}: CreateCampaignModalProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    campaign_type: CampaignType.HOURLY_KM,
  });

  // Tab 1: Basic Info
  const [campaignName, setCampaignName] = useState("");
  const [selectedType, setSelectedType] = useState<CampaignType | "">("");

  // Tab 2: Schedule & Content
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [attachmentType, setAttachmentType] = useState<
    "image" | "link" | "file" | null
  >(null);
  const [attachmentData, setAttachmentData] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | "">("");
  const [timeOfDay, setTimeOfDay] = useState("");

  // Tab 3: Reminders (chỉ cho HOURLY_KM và DAILY_KM)
  const [reminders, setReminders] = useState<ReminderItem[]>([
    { content: "", minutes: 0 },
  ]);

  // Tab 4: Email Reports
  const [recipientsTo, setRecipientsTo] = useState("");
  const [recipientsCc, setRecipientsCc] = useState<string[]>([]);
  const [reportInterval, setReportInterval] = useState("");
  const [stopSendingTime, setStopSendingTime] = useState("");
  const [customEmails, setCustomEmails] = useState<string[]>([""]);

  // Tab 5: Import Customers
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [uploadedCustomers, setUploadedCustomers] = useState<
    Array<{
      phone_number: string;
      full_name: string;
      salutation?: string;
    }>
  >([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceedFromTab1 = campaignName.trim() && selectedType;
  const canProceedFromTab2 =
    messageContent.trim() &&
    (selectedType === CampaignType.HOURLY_KM ||
    selectedType === CampaignType.DAILY_KM
      ? startTime && endTime
      : selectedType === CampaignType.THREE_DAY_KM
      ? selectedDays.length > 0 && timeOfDay
      : selectedType === CampaignType.WEEKLY_SP ||
        selectedType === CampaignType.WEEKLY_BBG
      ? selectedDay && timeOfDay
      : false);

  const needsReminderTab =
    selectedType === CampaignType.HOURLY_KM ||
    selectedType === CampaignType.DAILY_KM;
  const canProceedFromTab3 =
    !needsReminderTab ||
    reminders.every((r) => r.content.trim() && r.minutes > 0);
  const canProceedFromTab4 = true; // Email tab is optional
  const canProceedFromTab5 = true; // Customer import is optional

  const resetForm = () => {
    setCurrentTab("basic");
    setCampaignName("");
    setSelectedType("");
    setStartTime("");
    setEndTime("");
    setMessageContent("");
    setAttachmentType(null);
    setAttachmentData("");
    setSelectedDays([]);
    setSelectedDay("");
    setTimeOfDay("");
    setReminders([{ content: "", minutes: 0 }]);
    setRecipientsTo("");
    setRecipientsCc([]);
    setReportInterval("");
    setStopSendingTime("");
    setCustomEmails([""]);
    setCustomerFile(null);
    setUploadedCustomers([]);
  };

  const handleTabChange = (tab: string) => {
    if (tab === "schedule" && !canProceedFromTab1) return;
    if (tab === "reminders" && !canProceedFromTab2) return;
    if (
      tab === "email" &&
      (!canProceedFromTab2 || (needsReminderTab && !canProceedFromTab3))
    )
      return;
    if (
      tab === "customers" &&
      (!canProceedFromTab2 ||
        (needsReminderTab && !canProceedFromTab3) ||
        !canProceedFromTab4)
    )
      return;
    setCurrentTab(tab);
  };

  const handleDaysChange = (days: (string | number)[]) => {
    const numericDays = days
      .map((d) => (typeof d === "string" ? parseInt(d) : d))
      .filter((d) => !isNaN(d));
    setSelectedDays(numericDays);

    // Auto-complete logic for 3-day promotion
    if (
      selectedType === CampaignType.THREE_DAY_KM &&
      numericDays.length === 1
    ) {
      const startDay = numericDays[0];
      if (startDay >= 2 && startDay <= 5) {
        // Thứ 2-5 có thể tạo 3 ngày liên tiếp
        const consecutiveDays = [startDay, startDay + 1, startDay + 2].filter(
          (d) => d <= 7
        );
        setSelectedDays(consecutiveDays);
      }
    }
  };

  const addReminder = () => {
    setReminders([...reminders, { content: "", minutes: 0 }]);
  };

  const removeReminder = (index: number) => {
    if (reminders.length > 1) {
      setReminders(reminders.filter((_, i) => i !== index));
    }
  };

  const updateReminder = (
    index: number,
    field: keyof ReminderItem,
    value: string | number
  ) => {
    const updated = reminders.map((reminder, i) =>
      i === index ? { ...reminder, [field]: value } : reminder
    );
    setReminders(updated);
  };

  const addCustomEmail = () => {
    setCustomEmails([...customEmails, ""]);
  };

  const removeCustomEmail = (index: number) => {
    if (customEmails.length > 1) {
      setCustomEmails(customEmails.filter((_, i) => i !== index));
    }
  };

  const updateCustomEmail = (index: number, value: string) => {
    const updated = customEmails.map((email, i) =>
      i === index ? value : email
    );
    setCustomEmails(updated);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachmentData(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomerFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setCustomerFile(file);

      // Parse CSV/Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const customers = lines
          .slice(1)
          .map((line) => {
            const columns = line.split(",");
            return {
              phone_number: columns[0]?.trim() || "",
              full_name: columns[1]?.trim() || "",
              salutation: columns[2]?.trim() || "",
            };
          })
          .filter((customer) => customer.phone_number && customer.full_name);

        setUploadedCustomers(customers);
      };
      reader.readAsText(file);
    }
  };

  const downloadSampleFile = () => {
    const csvContent =
      "phone_number,full_name,salutation\n0123456789,Nguyễn Văn A,Anh\n0987654321,Trần Thị B,Chị";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau_danh_sach_khach_hang.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    if (
      !canProceedFromTab1 ||
      !canProceedFromTab2 ||
      (needsReminderTab && !canProceedFromTab3)
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const campaignData: CampaignFormData = {
        name: campaignName,
        campaign_type: selectedType as CampaignType,
        messages: {
          type: "initial",
          text: messageContent,
          attachment:
            attachmentType && attachmentData
              ? {
                  type: attachmentType,
                  ...(attachmentType === "image" || attachmentType === "file"
                    ? {
                        base64: attachmentData,
                        ...(attachmentType === "file"
                          ? { filename: "attachment" }
                          : {}),
                      }
                    : { url: attachmentData }),
                }
              : null,
        } as any,
      };

      // Add schedule config
      if (
        selectedType === CampaignType.HOURLY_KM ||
        selectedType === CampaignType.DAILY_KM
      ) {
        campaignData.schedule_config = {
          type: "hourly",
          start_time: startTime,
          end_time: endTime,
          remind_after_minutes: reminders.length > 0 ? reminders[0].minutes : 0,
        };
      } else if (selectedType === CampaignType.THREE_DAY_KM) {
        campaignData.schedule_config = {
          type: "3_day",
          days_of_week: selectedDays,
          time_of_day: timeOfDay,
        };
      } else if (
        selectedType === CampaignType.WEEKLY_SP ||
        selectedType === CampaignType.WEEKLY_BBG
      ) {
        campaignData.schedule_config = {
          type: "weekly",
          day_of_week: selectedDay as number,
          time_of_day: timeOfDay,
        };
      }

      // Add reminders if applicable
      if (needsReminderTab) {
        campaignData.reminders = reminders.filter(
          (r) => r.content.trim() && r.minutes > 0
        );
      }

      // Add email reports if configured
      if (recipientsTo.trim() || customEmails.some((email) => email.trim())) {
        const allRecipients = [
          recipientsTo,
          ...customEmails.filter((email) => email.trim()),
        ]
          .filter(Boolean)
          .join(", ");

        campaignData.email_reports = {
          recipients_to: allRecipients,
          recipients_cc: recipientsCc,
          report_interval_minutes: reportInterval
            ? parseInt(reportInterval)
            : undefined,
          stop_sending_at_time: stopSendingTime || undefined,
          is_active: true,
          send_when_campaign_completed: false,
        };
      }

      // Add customer data if uploaded
      if (uploadedCustomers.length > 0) {
        campaignData.customers = uploadedCustomers;
      }

      await onSubmit(campaignData);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating campaign:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        style={{
          maxWidth: "60vw",
          height: "80vh",
          overflow: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <h1>Tạo Chiến Dịch Mới</h1>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={currentTab}
            onValueChange={handleTabChange}
            className="w-full h-full flex flex-col"
            style={{ minHeight: "60vh" }}
          >
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="basic">
                <Badge variant={canProceedFromTab1 ? "default" : "secondary"}>
                  1
                </Badge>
                <span className="ml-2">Thông tin cơ bản</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" disabled={!canProceedFromTab1}>
                <Badge variant={canProceedFromTab2 ? "default" : "secondary"}>
                  2
                </Badge>
                <span className="ml-2">Lịch trình</span>
              </TabsTrigger>
              {needsReminderTab && (
                <TabsTrigger value="reminders" disabled={!canProceedFromTab2}>
                  <Badge variant={canProceedFromTab3 ? "default" : "secondary"}>
                    3
                  </Badge>
                  <span className="ml-2">Nhắc lại</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="email"
                disabled={
                  !canProceedFromTab2 ||
                  (needsReminderTab && !canProceedFromTab3)
                }
              >
                <Badge variant="secondary">
                  {needsReminderTab ? "4" : "3"}
                </Badge>
                <span className="ml-2">Email báo cáo</span>
              </TabsTrigger>
              <TabsTrigger
                value="customers"
                disabled={
                  !canProceedFromTab2 ||
                  (needsReminderTab && !canProceedFromTab3) ||
                  !canProceedFromTab4
                }
              >
                <Badge variant="secondary">
                  {needsReminderTab ? "5" : "4"}
                </Badge>
                <span className="ml-2">Khách hàng</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto px-1">
              {/* Tab 1: Basic Information */}
              <TabsContent value="basic" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold">
                      Thông tin cơ bản
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Tên chương trình */}
                    <div className="space-y-1">
                      <Label
                        htmlFor="campaign-name"
                        className="text-sm font-medium"
                      >
                        Tên chương trình quảng cáo{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="campaign-name"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="Nhập tên chương trình..."
                        className="h-10"
                      />
                    </div>

                    {/* Loại chương trình */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Loại chương trình{" "}
                        <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {campaignTypeOptions.map((option) => {
                          const isSelected = selectedType === option.value;
                          const isDisabled =
                            selectedType && selectedType !== option.value;

                          return (
                            <div
                              key={option.value}
                              role="button"
                              aria-pressed={isSelected}
                              tabIndex={0}
                              onClick={() => {
                                if (!isDisabled) {
                                  setSelectedType(
                                    isSelected ? "" : option.value
                                  );
                                }
                              }}
                              className={`
                  rounded-lg border p-4 transition-all duration-200 select-none
                  ${isSelected ? "border-primary bg-primary/10" : ""}
                  ${
                    isDisabled
                      ? "border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed"
                      : "border-gray-200 hover:border-primary/60 hover:bg-gray-50 cursor-pointer"
                  }
                `}
                            >
                              <div className="font-medium text-sm">
                                {option.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Schedule & Content */}
              <TabsContent value="schedule" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cấu hình lịch trình</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(selectedType === CampaignType.HOURLY_KM ||
                      selectedType === CampaignType.DAILY_KM) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="start-time">Giờ bắt đầu gửi *</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time">Giờ dừng gửi *</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {selectedType === CampaignType.THREE_DAY_KM && (
                      <div className="space-y-4">
                        <div>
                          <Label>Chọn các thứ trong tuần *</Label>
                          <MultiSelectCombobox
                            options={weekDayOptions}
                            value={selectedDays}
                            onChange={handleDaysChange}
                            placeholder="Chọn các thứ..."
                          />
                        </div>
                        <div>
                          <Label htmlFor="time-of-day">
                            Thời gian gửi trong ngày *
                          </Label>
                          <Input
                            id="time-of-day"
                            type="time"
                            value={timeOfDay}
                            onChange={(e) => setTimeOfDay(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    {(selectedType === CampaignType.WEEKLY_SP ||
                      selectedType === CampaignType.WEEKLY_BBG) && (
                      <div className="space-y-4">
                        <div>
                          <Label>Chọn thứ trong tuần *</Label>
                          <Select
                            value={selectedDay.toString()}
                            onValueChange={(value) =>
                              setSelectedDay(parseInt(value))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn thứ..." />
                            </SelectTrigger>
                            <SelectContent>
                              {weekDayOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value.toString()}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="time-of-day">
                            Thời gian gửi trong ngày *
                          </Label>
                          <Input
                            id="time-of-day"
                            type="time"
                            value={timeOfDay}
                            onChange={(e) => setTimeOfDay(e.target.value)}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="message-content">
                        Nội dung gửi kèm thông điệp *
                      </Label>
                      <Textarea
                        id="message-content"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Nhập nội dung tin nhắn..."
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label>Đính kèm (tùy chọn)</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={
                            attachmentType === "image" ? "default" : "outline"
                          }
                          onClick={() =>
                            setAttachmentType(
                              attachmentType === "image" ? null : "image"
                            )
                          }
                        >
                          <Image className="h-4 w-4 mr-2" />
                          Ảnh
                        </Button>
                        <Button
                          type="button"
                          variant={
                            attachmentType === "link" ? "default" : "outline"
                          }
                          onClick={() =>
                            setAttachmentType(
                              attachmentType === "link" ? null : "link"
                            )
                          }
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Link
                        </Button>
                        <Button
                          type="button"
                          variant={
                            attachmentType === "file" ? "default" : "outline"
                          }
                          onClick={() =>
                            setAttachmentType(
                              attachmentType === "file" ? null : "file"
                            )
                          }
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          File
                        </Button>
                      </div>

                      {attachmentType === "image" && (
                        <div className="mt-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                          />
                          {attachmentData && (
                            <div className="mt-2">
                              <img
                                src={attachmentData}
                                alt="Preview"
                                className="max-w-xs max-h-32 object-contain"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {attachmentType === "link" && (
                        <div className="mt-2">
                          <Input
                            value={attachmentData}
                            onChange={(e) => setAttachmentData(e.target.value)}
                            placeholder="Nhập URL..."
                          />
                        </div>
                      )}

                      {attachmentType === "file" && (
                        <div className="mt-2">
                          <Input type="file" onChange={handleFileUpload} />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Reminders (only for HOURLY_KM and DAILY_KM) */}
              {needsReminderTab && (
                <TabsContent value="reminders" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cấu hình nhắc lại</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {reminders.map((reminder, index) => (
                        <div
                          key={index}
                          className="border p-4 rounded-lg space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">
                              Lần nhắc {index + 1}
                            </h4>
                            {reminders.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeReminder(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div>
                            <Label>Nội dung nhắc lại</Label>
                            <Textarea
                              value={reminder.content}
                              onChange={(e) =>
                                updateReminder(index, "content", e.target.value)
                              }
                              placeholder="Nhập nội dung nhắc lại..."
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label>Số phút khoảng cách</Label>
                            <Input
                              type="number"
                              value={reminder.minutes}
                              onChange={(e) =>
                                updateReminder(
                                  index,
                                  "minutes",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              placeholder="Nhập số phút..."
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addReminder}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm Lần Nhắc
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Tab 4: Email Reports */}
              <TabsContent value="email" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Cấu hình email báo cáo (tùy chọn)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Email hệ thống</Label>
                      <MultiSelectCombobox
                        options={availableUsers.map((user) => ({
                          value: user.email,
                          label: `${user.fullName} (${user.email})`,
                        }))}
                        value={recipientsCc}
                        onChange={(values) =>
                          setRecipientsCc(values.map((v) => v.toString()))
                        }
                        placeholder="Chọn email từ hệ thống..."
                      />
                    </div>

                    <div>
                      <Label>Email tùy chỉnh</Label>
                      {customEmails.map((email, index) => (
                        <div key={index} className="flex gap-2 mt-2">
                          <Input
                            value={email}
                            onChange={(e) =>
                              updateCustomEmail(index, e.target.value)
                            }
                            placeholder="Nhập email..."
                            type="email"
                          />
                          {customEmails.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCustomEmail(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomEmail}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm Email
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="report-interval">
                          Thời gian mỗi lần gửi report (phút)
                        </Label>
                        <Input
                          id="report-interval"
                          type="number"
                          value={reportInterval}
                          onChange={(e) => setReportInterval(e.target.value)}
                          placeholder="Ví dụ: 60"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stop-sending-time">
                          Thời gian dừng gửi mail
                        </Label>
                        <Input
                          id="stop-sending-time"
                          type="time"
                          value={stopSendingTime}
                          onChange={(e) => setStopSendingTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 5: Customer Import */}
              <TabsContent value="customers" className="space-y-4 mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Import danh sách khách hàng (tùy chọn)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          style={{ cursor: "pointer" }}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleCustomerFileUpload}
                        />
                      </div>
                    </div>

                    {uploadedCustomers.length > 0 && (
                      <div>
                        <Label>
                          Danh sách khách hàng đã tải (
                          {uploadedCustomers.length} khách hàng)
                        </Label>
                        <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                          <div className="grid grid-cols-3 gap-4 font-medium text-sm text-gray-600 pb-2 border-b">
                            <div>Số điện thoại</div>
                            <div>Tên khách hàng</div>
                            <div>Cách xưng hô</div>
                          </div>
                          {uploadedCustomers
                            .slice(0, 10)
                            .map((customer, index) => (
                              <div
                                key={index}
                                className="grid grid-cols-3 gap-4 py-2 text-sm border-b"
                              >
                                <div>{customer.phone_number}</div>
                                <div>{customer.full_name}</div>
                                <div>{customer.salutation || "--"}</div>
                              </div>
                            ))}
                          {uploadedCustomers.length > 10 && (
                            <div className="text-center text-sm text-gray-500 py-2">
                              ... và {uploadedCustomers.length - 10} khách hàng
                              khác
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">Lưu ý:</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>
                          • File phải có định dạng CSV hoặc Excel (.csv, .xlsx,
                          .xls)
                        </li>
                        <li>• Cột đầu tiên: Số điện thoại</li>
                        <li>• Cột thứ hai: Tên khách hàng</li>
                        <li>• Cột thứ ba: Cách xưng hô (tùy chọn)</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <DialogFooter className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            {currentTab !== "basic" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (currentTab === "schedule") setCurrentTab("basic");
                  else if (currentTab === "reminders")
                    setCurrentTab("schedule");
                  else if (currentTab === "email") {
                    setCurrentTab(needsReminderTab ? "reminders" : "schedule");
                  } else if (currentTab === "customers") setCurrentTab("email");
                }}
              >
                Quay lại
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>

            {currentTab === "basic" && canProceedFromTab1 && (
              <Button onClick={() => setCurrentTab("schedule")}>
                Tiếp tục
              </Button>
            )}

            {currentTab === "schedule" && canProceedFromTab2 && (
              <Button
                onClick={() =>
                  setCurrentTab(needsReminderTab ? "reminders" : "email")
                }
              >
                Tiếp tục
              </Button>
            )}

            {currentTab === "reminders" && canProceedFromTab3 && (
              <Button onClick={() => setCurrentTab("email")}>Tiếp tục</Button>
            )}

            {currentTab === "email" && (
              <Button onClick={() => setCurrentTab("customers")}>
                Tiếp tục
              </Button>
            )}

            {currentTab === "customers" && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Tạo chiến dịch"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
