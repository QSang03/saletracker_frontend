"use client";
import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useContacts } from '@/hooks/contact-list/useContacts';
import { useKeywordRoutes } from '@/hooks/contact-list/useKeywordRoutes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import { 
  Key, 
  Users, 
  ShoppingCart, 
  Sparkles,
  Check,
  X,
  Globe,
  UserCheck,
  Tags,
  Plus,
  Search,
  List,
  Trash2,
  Eye,
  EyeOff,
  Target,
  Zap
} from 'lucide-react';
import type { AutoReplyProduct } from '@/types/auto-reply';

export default function KeywordsModal({ open, onClose }: { open: boolean; onClose: () => void; }) {
  const [products, setProducts] = useState<AutoReplyProduct[]>([]);
  const { contacts, fetchContacts } = useContacts();
  const { routes, fetchRoutes, createRoute, createBulk, updateRoute, deleteRoute } = useKeywordRoutes(undefined);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const [keyword, setKeyword] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [applyAllContacts, setApplyAllContacts] = useState(true);
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());

  useEffect(() => { 
    if (open) { 
      // Load all products once for selection
      api.get<AutoReplyProduct[]>('auto-reply/products')
        .then(({ data }) => setProducts(data || []))
        .catch(() => setProducts([]));
      fetchContacts(); 
      fetchRoutes(); 
    } 
  }, [open, fetchContacts, fetchRoutes]);

  const toggle = (set: Set<number>, id: number) => {
    const n = new Set(set);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  };

  const save = async () => {
    if (zaloDisabled) return;
    const productIds = Array.from(selectedProducts);
    if (!productIds.length || !keyword.trim()) return;
    if (applyAllContacts) {
      await createRoute({ 
        keyword: keyword.trim(), 
        contactId: null, 
        routeProducts: productIds.map(pid => ({ productId: pid, priority: 0, active: true })) 
      });
    } else {
      const contactIds = Array.from(selectedContacts);
      if (!contactIds.length) return;
      await createBulk({ 
        keyword: keyword.trim(), 
        contactIds, 
        productIds, 
        defaultPriority: 0, 
        active: true 
      });
    }
    setKeyword('');
    setSelectedProducts(new Set());
    setSelectedContacts(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="!max-w-[95vw] xl:!max-w-[90vw] 2xl:!max-w-[85vw] max-h-[95vh] overflow-hidden bg-gradient-to-br from-yellow-50/95 via-white/95 to-green-50/95 backdrop-blur-xl border-0 shadow-2xl">
        {/* Decorative Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/3 via-green-500/3 to-blue-500/3 pointer-events-none"></div>
        
        <DialogHeader className="relative pb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-green-500 rounded-3xl blur-sm opacity-40 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-yellow-500 to-green-500 p-4 rounded-3xl">
                <Key className="w-8 h-8 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-3xl xl:text-4xl font-bold bg-gradient-to-r from-yellow-600 to-green-600 bg-clip-text text-transparent mb-2">
                Keywords cho Sale
              </DialogTitle>
              <p className="text-gray-500 text-lg leading-relaxed">Thiết lập từ khóa để tự động gợi ý sản phẩm phù hợp</p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 relative">
          {/* Keyword Input & Products Section */}
          <div className="xl:col-span-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/8 to-green-500/8 rounded-[2rem] blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-[2rem] shadow-xl overflow-hidden">
              {/* Header with Keyword Input */}
              <div className="bg-gradient-to-r from-yellow-500 to-green-500 px-8 py-6">
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-3">
                    <Search className="w-6 h-6 text-white" />
                    <span className="font-semibold text-white text-lg">Thiết lập Keywords</span>
                  </div>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Keyword Input */}
                  <div className="flex-1 relative">
                    <Input
                      disabled={zaloDisabled}
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      placeholder="Nhập từ khóa (VD: iphone, laptop, túi xách...)"
                      className="h-12 bg-white/90 border-0 rounded-2xl text-base px-12 placeholder:text-gray-400"
                    />
                    <Target className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-600" />
                  </div>
                  
                  {/* Global Switch */}
                  <div className="flex items-center gap-3 bg-white/25 rounded-2xl px-5 py-3">
                    <Switch 
                      disabled={zaloDisabled} 
                      checked={applyAllContacts} 
                      onCheckedChange={(v) => setApplyAllContacts(!!v)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                    <span className="text-white text-base font-medium flex items-center gap-2">
                      {applyAllContacts ? <Globe className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                      {applyAllContacts ? 'Áp dụng GLOBAL' : 'Chọn khách hàng'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Products Content */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-gray-800 text-lg">Chọn sản phẩm gợi ý</span>
                  <div className="ml-auto bg-green-100 rounded-full px-3 py-1">
                    <span className="text-green-700 text-sm font-medium">{selectedProducts.size}/{products.length}</span>
                  </div>
                </div>
                
                <div className="max-h-[45vh] overflow-auto rounded-2xl border border-gray-200/50">
                  <Table>
                    <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                      <TableRow className="border-b-2 border-gray-200/50">
                        <TableHead className="text-center w-20 h-14">
                          <div className="flex items-center justify-center">
                            <Check className="w-5 h-5 text-green-500" />
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 text-base h-14">
                          <div className="flex items-center gap-3">
                            <Tags className="w-5 h-5" />
                            Mã sản phẩm
                          </div>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 text-base h-14">Tên sản phẩm</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map(p => (
                        <TableRow 
                          key={p.productId}
                          className={`hover:bg-green-50/60 transition-colors duration-200 h-16 cursor-pointer ${
                            selectedProducts.has(p.productId) ? 'bg-green-50/40 border-l-4 border-l-green-500' : ''
                          }`}
                          onClick={() => !zaloDisabled && setSelectedProducts(prev => toggle(prev, p.productId))}
                        >
                          <TableCell className="text-center py-4">
                            <Checkbox 
                              disabled={zaloDisabled} 
                              checked={selectedProducts.has(p.productId)} 
                              onCheckedChange={() => setSelectedProducts(prev => toggle(prev, p.productId))}
                              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 w-5 h-5" 
                            />
                          </TableCell>
                          <TableCell className="font-mono text-base font-medium text-green-600 py-4">{p.code}</TableCell>
                          <TableCell className="font-medium text-base py-4 leading-relaxed">{p.name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Section */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 to-purple-500/8 rounded-[2rem] blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-[2rem] shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-6">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-white" />
                  <span className="font-semibold text-white text-lg">Chọn khách hàng</span>
                </div>
              </div>

              {/* Content */}
              {!applyAllContacts ? (
                <div className="p-6">
                  <div className="max-h-[45vh] overflow-auto rounded-2xl border border-gray-200/50">
                    <Table>
                      <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                        <TableRow className="border-b-2 border-gray-200/50">
                          <TableHead className="text-center w-20 h-14">
                            <div className="flex items-center justify-center">
                              <Check className="w-5 h-5 text-green-500" />
                            </div>
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700 text-base h-14">Tên khách hàng</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map(c => (
                          <TableRow 
                            key={c.contactId}
                            className={`hover:bg-blue-50/60 transition-colors duration-200 h-16 cursor-pointer ${
                              selectedContacts.has(c.contactId) ? 'bg-blue-50/40 border-l-4 border-l-blue-500' : ''
                            }`}
                            onClick={() => !zaloDisabled && setSelectedContacts(prev => toggle(prev, c.contactId))}
                          >
                            <TableCell className="text-center py-4">
                              <Checkbox 
                                disabled={zaloDisabled} 
                                checked={selectedContacts.has(c.contactId)} 
                                onCheckedChange={() => setSelectedContacts(prev => toggle(prev, c.contactId))}
                                className="data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 w-5 h-5" 
                              />
                            </TableCell>
                            <TableCell className="font-medium text-base py-4">{c.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mb-6">
                    <Globe className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Áp dụng Global</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">Keywords sẽ áp dụng cho tất cả khách hàng</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Existing Routes Section */}
        <div className="mt-8 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/8 to-pink-500/8 rounded-[2rem] blur-xl group-hover:blur-2xl transition-all duration-500"></div>
          <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-[2rem] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6">
              <div className="flex items-center gap-4">
                <List className="w-6 h-6 text-white" />
                <span className="font-semibold text-white text-lg">Danh sách Keywords hiện có</span>
                <div className="ml-auto bg-white/25 rounded-full px-4 py-2">
                  <span className="text-white text-sm font-medium">{routes.length} keywords</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="max-h-80 overflow-auto rounded-2xl border border-gray-200/50">
                <Table>
                  <TableHeader className="bg-gray-50/60 sticky top-0 z-10">
                    <TableRow className="border-b-2 border-gray-200/50">
                      <TableHead className="font-semibold text-gray-700 text-base h-14">
                        <div className="flex items-center gap-2">
                          <Key className="w-5 h-5" />
                          Keyword
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-base h-14">Phạm vi</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-base h-14">Trạng thái</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 text-base h-14">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map(r => (
                      <TableRow key={r.routeId} className="hover:bg-purple-50/30 transition-colors duration-200 h-16">
                        <TableCell className="font-medium text-base py-4">{r.keyword}</TableCell>
                        <TableCell className="text-center py-4">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                            r.contactId === null 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {r.contactId === null ? <Globe className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            {r.contactId === null ? 'GLOBAL' : `Contact #${r.contactId}`}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <div className="flex items-center justify-center">
                            <Switch 
                              disabled={zaloDisabled} 
                              checked={r.active} 
                              onCheckedChange={() => updateRoute(r.routeId, { active: !r.active })}
                              className="data-[state=checked]:bg-green-500"
                            />
                            {r.active ? (
                              <Eye className="w-4 h-4 text-green-500 ml-2" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400 ml-2" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <Button 
                            disabled={zaloDisabled} 
                            variant="ghost" 
                            onClick={() => deleteRoute(r.routeId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-10 px-4 rounded-xl transition-all duration-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex justify-center gap-6 my-6">
          <div className="bg-white/85 backdrop-blur-sm rounded-3xl px-6 py-4 shadow-lg border border-white/60">
            <div className="flex items-center gap-3 text-base">
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Keyword:</span>
              <span className="font-bold text-yellow-600">{keyword || 'Chưa nhập'}</span>
            </div>
          </div>
          <div className="bg-white/85 backdrop-blur-sm rounded-3xl px-6 py-4 shadow-lg border border-white/60">
            <div className="flex items-center gap-3 text-base">
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Sản phẩm:</span>
              <span className="font-bold text-green-600">{selectedProducts.size}</span>
            </div>
          </div>
          {!applyAllContacts && (
            <div className="bg-white/85 backdrop-blur-sm rounded-3xl px-6 py-4 shadow-lg border border-white/60">
              <div className="flex items-center gap-3 text-base">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">Khách hàng:</span>
                <span className="font-bold text-blue-600">{selectedContacts.size}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="relative pt-8">
          <div className="flex gap-6 w-full justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-white/60 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-8 py-3 h-14 text-base rounded-2xl"
            >
              <X className="w-5 h-5 mr-3" />
              Đóng
            </Button>
            <Button 
              disabled={zaloDisabled || !keyword.trim() || selectedProducts.size === 0} 
              onClick={save}
              className="bg-gradient-to-r from-yellow-500 to-green-500 hover:from-yellow-600 hover:to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 group px-10 py-3 h-14 text-base rounded-2xl disabled:opacity-50"
            >
              <Plus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
              Tạo Keyword
            </Button>
          </div>
        </DialogFooter>

        {/* Decorative Elements */}
        <div className="absolute top-6 right-6 opacity-15 pointer-events-none">
          <div className="flex gap-2">
            <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
            <Key className="w-6 h-6 text-green-500 animate-bounce" />
          </div>
        </div>
        <div className="absolute bottom-6 left-6 opacity-8 pointer-events-none">
          <Zap className="w-8 h-8 text-purple-500 animate-pulse" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
