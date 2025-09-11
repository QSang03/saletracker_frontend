"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "lucide-react";
import ContactProfileModal from "@/components/contact-list/zalo/contacts/modals/ContactProfileModal";
import { useContactsPaginated } from "@/hooks/contact-list/useContactsPaginated";
import { Button } from "@/components/ui/button";

export default function CustomerConfigPage() {
  // Reuse contacts hook to pick a contact to configure
  const { items: contacts, loading } = useContactsPaginated();
  const [selectedContactId, setSelectedContactId] = useState<number | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const [manualId, setManualId] = useState<string>("");

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Cấu hình khách hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Thông tin</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="border rounded px-3 py-2"
                  disabled={loading || contacts.length === 0}
                  value={selectedContactId ?? ''}
                  onChange={(e) =>
                    setSelectedContactId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Chọn khách hàng...</option>
                  {contacts.map((c) => (
                    <option key={c.contactId} value={c.contactId}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Button
                  disabled={!selectedContactId}
                  onClick={() => selectedContactId && setOpen(true)}
                >
                  Mở cấu hình
                </Button>

                {/* Fallback: open by ID when list is empty */}
                <input
                  type="number"
                  inputMode="numeric"
                  className="border rounded px-3 py-2 w-[160px]"
                  placeholder="Nhập ID khách hàng"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <Button
                  variant="secondary"
                  disabled={!manualId}
                  onClick={() => {
                    const id = Number(manualId);
                    if (!Number.isFinite(id)) return;
                    setSelectedContactId(id);
                    setOpen(true);
                  }}
                >
                  Mở bằng ID
                </Button>
              </div>

              {contacts.length === 0 && !loading && (
                <div className="text-sm text-gray-500 mt-4">
                  Chưa có khách hàng trong danh sách. Vui lòng thêm hoặc đồng bộ trước khi cấu hình.
                </div>
              )}

              {/* Reuse the same UI as modal content in-page by mounting modal inline */}
              {selectedContactId !== null && (
                <ContactProfileModal
                  open={open}
                  onClose={() => setOpen(false)}
                  contactId={selectedContactId}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
