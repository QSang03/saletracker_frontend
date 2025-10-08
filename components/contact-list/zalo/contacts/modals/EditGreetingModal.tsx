"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, MessageSquare, User, Clock, Info, X } from 'lucide-react';
import { ContactWithGreeting } from '@/hooks/contact-list/useContactsWithGreeting';

interface EditGreetingModalProps {
  open: boolean;
  onClose: () => void;
  contact: ContactWithGreeting | null;
  onSave: (data: {
    salutation?: string;
    greetingMessage?: string;
    greetingIsActive?: number;
  }) => Promise<void>;
}

export default function EditGreetingModal({
  open,
  onClose,
  contact,
  onSave,
}: EditGreetingModalProps) {
  const [salutation, setSalutation] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [defaultGreeting, setDefaultGreeting] = useState<string>('');
  const [allowCustomMessage, setAllowCustomMessage] = useState<boolean>(true);
  const [loadingDefault, setLoadingDefault] = useState(false);

  // Fetch default greeting and allowCustomMessage from auto-greeting config
  useEffect(() => {
    const fetchDefaultGreeting = async () => {
      try {
        setLoadingDefault(true);
        // Use axios api instance to auto-include Bearer token
        const { api } = await import('@/lib/api');
        const response = await api.get('/auto-greeting/config');
        setDefaultGreeting(response.data.messageTemplate || '');
        setAllowCustomMessage(response.data.allowCustomMessage ?? true);
      } catch (error) {
        console.error('Error fetching default greeting:', error);
      } finally {
        setLoadingDefault(false);
      }
    };

    if (open) {
      fetchDefaultGreeting();
    }
  }, [open]);

  useEffect(() => {
    if (contact) {
      setSalutation(contact.salutation || '');
      setGreetingMessage(contact.greetingMessage || '');
      setIsActive(contact.greetingIsActive === 1);
      setSaving(false);
    }
  }, [contact]);

  const handleSave = async () => {
    if (!contact || saving) return;

    setSaving(true);
    try {
      await onSave({
        salutation: salutation.trim(),
        greetingMessage: greetingMessage.trim(),
        greetingIsActive: isActive ? 1 : 0,
      });
      // Don't do anything here - parent will close modal
    } catch (error) {
      console.error('Failed to save greeting:', error);
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !saving) {
        onClose();
      }
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, saving, onClose]);

  if (!open || !contact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        onClick={handleClose}
      />
      
      {/* Modal Content */}
  <div className="relative bg-white rounded-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto m-4 animate-in zoom-in-95 fade-in-0 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={saving}
          className="absolute top-6 right-6 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Cấu hình lời chào</h2>
                <p className="text-sm text-gray-500 mt-1">{contact.name}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4 py-4">
          {/* Contact Info */}
          {(contact.greetingLastMessageDate || contact.greetingConversationType) && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-900 mb-2">
                <Info className="w-4 h-4" />
                Thông tin khách hàng
              </div>
              <div className="space-y-1.5 text-sm text-gray-700">
                {contact.greetingLastMessageDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">Tin nhắn cuối:</span>
                    <span className="font-medium">
                      {new Date(contact.greetingLastMessageDate).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
                {contact.greetingConversationType && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-600">Loại hội thoại:</span>
                    <span className="font-medium">
                      {contact.greetingConversationType === 'group' ? 'Nhóm' : 'Cá nhân'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Salutation */}
          <div className="space-y-2">
            <Label htmlFor="salutation" className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Xưng hô
            </Label>
            <Input
              id="salutation"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="VD: Anh, Chị, Bạn..."
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500">
              Cách xưng hô khi gửi tin nhắn đến khách hàng này
            </p>
          </div>

          {/* Greeting Message */}
          <div className="space-y-2">
            <Label htmlFor="greetingMessage" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              Lời chào {allowCustomMessage ? '(tùy chỉnh)' : '(mặc định)'}
            </Label>
            <Textarea
              id="greetingMessage"
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              placeholder={
                allowCustomMessage
                  ? "Nhập lời chào tùy chỉnh cho khách hàng này..."
                  : "Hệ thống đang sử dụng lời chào mặc định"
              }
              className="rounded-lg min-h-[120px]"
              disabled={!allowCustomMessage}
            />
            {!allowCustomMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <span>⚠️</span>
                  <span>
                    Hệ thống đang sử dụng lời chào mặc định. Không thể chỉnh sửa.
                  </span>
                </div>
              </div>
            )}
            {allowCustomMessage && !greetingMessage && defaultGreeting && (
              <div className="text-xs p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                  <Info className="w-3 h-3" />
                  Lời chào mặc định sẽ được sử dụng:
                </div>
                <p className="text-blue-600 italic">"{defaultGreeting}"</p>
              </div>
            )}
            {allowCustomMessage && (
              <p className="text-xs text-gray-500">
                Để trống để sử dụng lời chào mặc định của hệ thống
              </p>
            )}
            {!allowCustomMessage && defaultGreeting && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700">
                  <strong>Lời chào mặc định:</strong> {defaultGreeting}
                </div>
              </div>
            )}
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div className="space-y-1">
              <Label className="font-medium">Kích hoạt gửi lời chào</Label>
              <p className="text-xs text-gray-500">
                Bật/tắt tính năng gửi lời chào tự động cho khách hàng này
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              className="data-[state=checked]:bg-green-500"
            />
          </div>

          {/* Preview */}
          {(salutation || greetingMessage || defaultGreeting) && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Xem trước tin nhắn
                {(!greetingMessage || !allowCustomMessage) && defaultGreeting && (
                  <span className="text-xs font-normal text-blue-600 ml-2">(Lời chào mặc định)</span>
                )}
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border border-blue-100">
                {salutation && <span className="font-medium">{salutation},</span>}
                {allowCustomMessage && greetingMessage ? (
                  <>
                    {salutation && '\n'}
                    {greetingMessage}
                  </>
                ) : defaultGreeting ? (
                  <>
                    {salutation && '\n'}
                    <span className="italic text-blue-600">{defaultGreeting}</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
          </div>
          
          {/* Footer */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="rounded-lg"
            >
              Hủy
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                'Lưu thay đổi'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
