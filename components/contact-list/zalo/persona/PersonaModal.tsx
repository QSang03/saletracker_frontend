"use client";
import React, { useEffect, useState } from 'react';
import { useSalePersona } from '@/hooks/contact-list/useSalePersona';
import type { SalesPersona } from '@/types/auto-reply';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { 
  User, 
  Brain, 
  Sparkles, 
  Save, 
  X, 
  Loader2,
  MessageCircle,
  Star,
  Zap,
  Heart,
  Smile,
  AlertCircle
} from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const PersonaModal: React.FC<Props> = ({ open, onClose }) => {
  const { persona, fetchPersona, upsertPersona, loading } = useSalePersona();
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const [form, setForm] = useState<Pick<SalesPersona, 'name' | 'personaPrompt'>>({ name: '', personaPrompt: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) fetchPersona(); }, [open, fetchPersona]);
  useEffect(() => {
    if (persona) setForm({ name: persona.name, personaPrompt: persona.personaPrompt });
  }, [persona]);

  const handleSave = async () => {
    setError(null);
    if (!form.name || form.name.trim().length < 2) {
      setError('Tên tối thiểu 2 ký tự');
      return;
    }
    if (form.personaPrompt.length > 20000) {
      setError('Persona Prompt quá dài');
      return;
    }
    try {
      setSaving(true);
      await upsertPersona(form);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-purple-50/95 via-white/95 to-pink-50/95 backdrop-blur-xl border-0 shadow-2xl">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5 pointer-events-none"></div>
        
        <DialogHeader className="relative">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur-sm opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-2xl">
                <User className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Persona của Sale
              </DialogTitle>
              <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Tạo tính cách độc đáo cho AI Assistant
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-500">
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-full p-8 shadow-xl">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              </div>
            </div>
            <div className="ml-6">
              <h3 className="text-lg font-semibold text-gray-800">Đang tải persona...</h3>
              <p className="text-gray-500 text-sm">Vui lòng chờ trong giây lát</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative">
            {/* Name Field */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl group-focus-within:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-xl">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Tên Persona
                </Label>
                <div className="relative">
                  <Input
                    disabled={zaloDisabled}
                    value={form.name}
                    onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
                    placeholder="VD: Thạch - Giọng điệu nhiệt tình"
                    className="h-12 bg-white/50 border-purple-200 focus:border-purple-400 focus:ring-purple-400 rounded-2xl text-base transition-all duration-300 pl-12"
                  />
                  <Smile className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <span>Độ dài:</span>
                  <span className={`font-medium ${form.name.length < 2 ? 'text-red-500' : 'text-green-500'}`}>
                    {form.name.length}/2 ký tự tối thiểu
                  </span>
                </div>
              </div>
            </div>

            {/* Persona Prompt Field */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-xl group-focus-within:blur-2xl transition-all duration-500"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl p-6 shadow-xl">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <MessageCircle className="w-5 h-5 text-blue-500" />
                  Persona Prompt (mô tả tính cách)
                </Label>
                <div className="relative">
                  <Textarea
                    disabled={zaloDisabled}
                    value={form.personaPrompt}
                    onChange={e => setForm(v => ({ ...v, personaPrompt: e.target.value }))}
                    rows={10}
                    placeholder="Viết mô tả cách chào hỏi, phong cách, ưu tiên đề xuất, cách xử lý từ chối..."
                    className="bg-white/50 border-blue-200 focus:border-blue-400 focus:ring-blue-400 rounded-2xl text-base resize-none transition-all duration-300 leading-relaxed"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <span>Độ dài:</span>
                      <span className={`font-medium ${form.personaPrompt.length > 20000 ? 'text-red-500' : 'text-blue-500'}`}>
                        {form.personaPrompt.length}/20000 ký tự
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Heart className="w-4 h-4" />
                    <span>Hãy thể hiện cá tính riêng</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 backdrop-blur-sm border border-emerald-200/50 rounded-3xl p-6 shadow-lg">
              <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5" />
                Gợi ý tạo Persona hiệu quả
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-emerald-700">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Mô tả cách chào hỏi và giọng điệu</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Định nghĩa phong cách giao tiếp</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Ưu tiên và chiến lược bán hàng</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Cách xử lý phản đối khách hàng</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="relative mt-8">
          <div className="flex gap-4 w-full justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-white/50 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-6 h-12 rounded-2xl"
            >
              <X className="w-4 h-4 mr-2" />
              Đóng
            </Button>
            <Button 
              disabled={zaloDisabled || saving} 
              onClick={handleSave}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group px-8 h-12 rounded-2xl"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" />
                  Lưu Persona
                </>
              )}
            </Button>
          </div>
        </DialogFooter>

        {/* Decorative Elements */}
        <div className="absolute top-6 right-6 opacity-20 pointer-events-none">
          <div className="flex gap-2">
            <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
            <Zap className="w-5 h-5 text-pink-500 animate-bounce" />
          </div>
        </div>
        <div className="absolute bottom-6 left-6 opacity-10 pointer-events-none">
          <Brain className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PersonaModal;
