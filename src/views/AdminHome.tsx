import React, { useState, useEffect, useCallback } from 'react';
import { Order, User, Campaign, Product } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Package, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag,
  ChevronRight,
  Plus,
  PlusCircle,
  Minus,
  ChevronDown,
  MapPin,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Check,
  X,
  GripVertical,
  Truck,
  Phone,
  User as UserIcon,
  Upload,
  ClipboardList,
  Megaphone,
  History,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Orders from './Orders';
import LocationPicker from '../components/LocationPicker';

function Toast({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px]",
        type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
      )}
    >
      {type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="text-sm font-bold">{message}</span>
    </motion.div>
  );
}

function UserManager({ role, onShowToast }: { role: 'customer' | 'courier', onShowToast: (msg: string, type: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [depositUser, setDepositUser] = useState<{ user: User, balances: any[], movements: any[] } | null>(null);
  const [adjustingDeposit, setAdjustingDeposit] = useState<{ category: 'damacana' | 'tup', quantity: number, description: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [role]);

  const loadUsers = async () => {
    try {
      const data = role === 'customer' ? await api.admin.getUsers() : await api.admin.getCouriers();
      setUsers(data);
    } catch (e) {
      console.error("Failed to load users:", e);
      onShowToast('Kullanıcılar yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name || !editing.phone) {
      onShowToast('Lütfen tüm alanları doldurun', 'error');
      return;
    }
    try {
      if (editing.id) {
        if (role === 'customer') {
          await api.admin.updateUser(editing.id, editing);
        } else {
          await api.admin.updateCourier(editing.id, editing);
        }
      } else {
        await api.admin.createCourier(editing);
      }
      onShowToast('İşlem başarıyla tamamlandı', 'success');
      setEditing(null);
      loadUsers();
    } catch (e: any) {
      onShowToast(e.message || 'Bir hata oluştu', 'error');
    }
  };

  const loadDeposits = async (user: User) => {
    try {
      const data = await api.deposits.adminGetUserDeposits(user.id);
      setDepositUser({ user, ...data });
    } catch (e) {
      onShowToast('Depozito bilgileri yüklenemedi', 'error');
    }
  };

  const handleAdjustDeposit = async () => {
    if (!depositUser || !adjustingDeposit) return;
    try {
      await api.deposits.adminAdjust(depositUser.user.id, {
        category: adjustingDeposit.category,
        quantity: adjustingDeposit.quantity,
        type: 'manual_adjustment',
        description: adjustingDeposit.description
      });
      onShowToast('Depozito güncellendi', 'success');
      setAdjustingDeposit(null);
      loadDeposits(depositUser.user);
    } catch (e) {
      onShowToast('Depozito güncellenirken hata oluştu', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      if (role === 'customer') {
        await api.admin.deleteUser(id);
      } else {
        await api.admin.deleteCourier(id);
      }
      onShowToast('Kullanıcı silindi', 'success');
      loadUsers();
    } catch (e) {
      onShowToast('Kullanıcı silinirken bir hata oluştu', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">{role === 'customer' ? 'Müşteri Yönetimi' : 'Kurye Yönetimi'}</h3>
        {role === 'courier' && (
          <button 
            onClick={() => setEditing({ name: '', phone: '', role: 'courier' })}
            className="p-2 bg-blue-600 text-white rounded-sm shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {users.map((u) => (
          <div key={u.id} className="bg-white p-4 rounded-md border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-sm flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-800">{u.name}</h4>
              <p className="text-[10px] text-slate-400 font-medium">{u.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              {role === 'customer' && (
                <button 
                  onClick={() => loadDeposits(u)}
                  className="p-2 text-amber-600 bg-amber-50 rounded-sm hover:bg-amber-100 transition-colors"
                  title="Depozito Yönetimi"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setEditing(u)} className="p-2 text-blue-700 bg-blue-50 rounded-sm">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingId(u.id)} className="p-2 text-red-700 bg-red-50 rounded-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {depositUser && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-lg p-8 space-y-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-sm flex items-center justify-center text-amber-600">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{depositUser.user.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">Depozito Takibi</p>
                  </div>
                </div>
                <button onClick={() => setDepositUser(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {['damacana', 'tup'].map(cat => {
                  const balance = Math.max(0, depositUser.balances.find(b => b.category === cat)?.count || 0);
                  return (
                    <div key={cat} className="bg-slate-50 p-4 rounded-md border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">{cat === 'damacana' ? 'Damacana' : 'Tüp'}</p>
                        <p className="text-2xl font-black text-slate-800">{balance}</p>
                      </div>
                      <button 
                        onClick={() => setAdjustingDeposit({ category: cat as any, quantity: 0, description: '' })}
                        className="p-2 bg-white text-blue-600 rounded-sm border border-slate-200 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Hareket Geçmişi</h4>
                <div className="bg-slate-50 rounded-md overflow-hidden border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-100/50">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Kategori</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Miktar</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Açıklama</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Tarih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {depositUser.movements
                        .filter(m => {
                          // Filter out movements that might be confusing or too old
                          // For now, let's just show the last 20 movements
                          return true; 
                        })
                        .slice(0, 20)
                        .map((m, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-700 capitalize">{m.category}</td>
                            <td className={cn("px-4 py-3 text-xs font-black", m.quantity > 0 ? "text-green-600" : "text-red-600")}>
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 font-medium">{m.description || '-'}</td>
                            <td className="px-4 py-3 text-[10px] font-medium text-slate-400">
                              {new Date(m.created_at).toLocaleDateString('tr-TR')}
                            </td>
                          </tr>
                        ))}
                      {depositUser.movements.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">Hareket bulunamadı</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adjustingDeposit && (
          <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-lg p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Depozito Düzenle</h3>
                <button onClick={() => setAdjustingDeposit(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-md border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Kategori</p>
                  <p className="text-sm font-bold text-slate-800 capitalize">{adjustingDeposit.category}</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Miktar (Ekle: +, Çıkar: -)</label>
                  <input 
                    type="number" 
                    value={adjustingDeposit.quantity || ''} 
                    onChange={e => setAdjustingDeposit({ ...adjustingDeposit, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase">Açıklama</label>
                  <textarea 
                    value={adjustingDeposit.description} 
                    onChange={e => setAdjustingDeposit({ ...adjustingDeposit, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none h-24 text-sm"
                    placeholder="İşlem nedeni..."
                  />
                </div>

                <button 
                  onClick={handleAdjustDeposit}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-md shadow-lg"
                >
                  Güncelle
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-lg p-8 space-y-6 shadow-2xl border-2 border-red-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Kullanıcıyı Sil?</h3>
                <p className="text-sm text-slate-400 font-medium">Bu kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-sm"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={() => {
                    handleDelete(deletingId);
                    setDeletingId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-sm shadow-lg shadow-red-100"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-lg sm:rounded-lg p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">{editing.id ? (role === 'customer' ? 'Müşteriyi Düzenle' : 'Kuryeyi Düzenle') : 'Yeni Kurye'}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ad Soyad</label>
                  <input 
                    type="text" 
                    value={editing.name} 
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Telefon</label>
                  <input 
                    type="tel" 
                    value={editing.phone} 
                    onChange={e => setEditing({ ...editing, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="05000000000"
                  />
                </div>
                {!editing.id && role === 'courier' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Şifre</label>
                  <input 
                    type="password" 
                    value={editing.password || ''}
                    onChange={e => setEditing({ ...editing, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                )}
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-md shadow-lg"
              >
                Kaydet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ManualOrder({ onShowToast }: { onShowToast: (msg: string, type: 'success' | 'error') => void }) {
  const [customers, setCustomers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [orderType, setOrderType] = useState<'existing' | 'new'>('existing');
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product, quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash_at_door' | 'card_at_door'>('cash_at_door');
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersData, productsData] = await Promise.all([
          api.admin.getUsers(),
          api.products.adminList()
        ]);
        setCustomers(usersData);
        setProducts(productsData.filter(p => p.is_active));
      } catch (e) {
        onShowToast('Veriler yüklenemedi', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p));
    } else {
      setSelectedProducts([...selectedProducts, { product, quantity: 1 }]);
    }
  };

  const handleRemoveProduct = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product.id === productId) {
        return { ...p, quantity: Math.max(1, p.quantity + delta) };
      }
      return p;
    }));
  };

  const totalPrice = selectedProducts.reduce((sum, p) => sum + (p.product.price * p.quantity), 0);

  const handleSubmit = async () => {
    if (orderType === 'existing' && !selectedCustomer) {
      onShowToast('Lütfen bir müşteri seçin', 'error');
      return;
    }
    if (orderType === 'new' && (!newCustomer.name || !newCustomer.phone || !newCustomer.address)) {
      onShowToast('Lütfen yeni müşteri bilgilerini eksiksiz girin', 'error');
      return;
    }
    if (selectedProducts.length === 0) {
      onShowToast('Lütfen en az bir ürün seçin', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const orderData = {
        user_id: orderType === 'existing' ? selectedCustomer?.id : null,
        customer_details: orderType === 'new' ? {
          name: newCustomer.name,
          phone: newCustomer.phone,
          address_text: newCustomer.address
        } : null,
        items: selectedProducts.map(p => ({
          product_id: p.product.id,
          quantity: p.quantity,
          price: p.product.price
        })),
        total_price: totalPrice,
        payment_method: paymentMethod
      };

      await api.admin.createManualOrder(orderData);
      onShowToast('Sipariş başarıyla oluşturuldu', 'success');
      
      // Reset form
      setSelectedCustomer(null);
      setNewCustomer({ name: '', phone: '', address: '' });
      setSelectedProducts([]);
      setOrderType('existing');
    } catch (e: any) {
      onShowToast(e.message || 'Sipariş oluşturulamadı', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800">Manuel Sipariş Oluştur</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setOrderType('existing')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                orderType === 'existing' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Mevcut Müşteri
            </button>
            <button 
              onClick={() => setOrderType('new')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                orderType === 'new' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
              )}
            >
              Yeni Müşteri
            </button>
          </div>

          {orderType === 'existing' ? (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase">Müşteri Seçin</label>
              <div className="relative">
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none appearance-none"
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === Number(e.target.value));
                    setSelectedCustomer(customer || null);
                  }}
                >
                  <option value="">Müşteri Seçin...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              {selectedCustomer && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-sm font-bold text-blue-900">{selectedCustomer.name}</p>
                  <p className="text-xs text-blue-600 font-medium">{selectedCustomer.phone}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Müşteri Adı</label>
                <input 
                  type="text" 
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="Ad Soyad"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Telefon Numarası</label>
                <input 
                  type="text" 
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  placeholder="05XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Adres</label>
                <div className="space-y-2">
                  <textarea 
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none h-24"
                    placeholder="Açık adres..."
                  />
                  <button 
                    onClick={() => setShowLocationPicker(true)}
                    className="flex items-center gap-2 text-blue-600 text-xs font-bold hover:text-blue-700 transition-colors"
                  >
                    <MapPin className="w-4 h-4" />
                    Haritadan Konum Seç
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showLocationPicker && (
            <LocationPicker 
              onClose={() => setShowLocationPicker(false)}
              onSelect={(addr) => {
                setNewCustomer(prev => ({ ...prev, address: addr.address_text }));
                setShowLocationPicker(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* Product Selection */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase">Ürün Ekle</label>
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => (
                <button 
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-left hover:border-blue-200 transition-all group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{product.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{product.price.toFixed(2)} ₺</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase">Seçili Ürünler</label>
            <div className="space-y-3">
              {selectedProducts.map(item => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{item.product.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{(item.product.price * item.quantity).toFixed(2)} ₺</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-slate-100">
                      <button onClick={() => handleUpdateQuantity(item.product.id, -1)} className="p-1 text-slate-400 hover:text-blue-600"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => handleUpdateQuantity(item.product.id, 1)} className="p-1 text-slate-400 hover:text-blue-600"><Plus className="w-3 h-3" /></button>
                    </div>
                    <button onClick={() => handleRemoveProduct(item.product.id)} className="p-2 text-red-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              {selectedProducts.length === 0 && (
                <p className="text-center py-8 text-xs text-slate-400 font-medium">Henüz ürün seçilmedi</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Toplam Tutar</span>
              <span className="text-lg font-black text-blue-600">{totalPrice.toFixed(2)} ₺</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setPaymentMethod('cash_at_door')}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-bold border transition-all",
                  paymentMethod === 'cash_at_door' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-400"
                )}
              >
                Kapıda Nakit
              </button>
              <button 
                onClick={() => setPaymentMethod('card_at_door')}
                className={cn(
                  "py-3 rounded-xl text-[10px] font-bold border transition-all",
                  paymentMethod === 'card_at_door' ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-100 text-slate-400"
                )}
              >
                Kapıda Kart
              </button>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {submitting ? "Sipariş Oluşturuluyor..." : "Siparişi Onayla ve Oluştur"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppSettings({ onUpdate, onShowToast }: { onUpdate: () => void, onShowToast: (msg: string, type: 'success' | 'error') => void }) {
  const [settings, setSettings] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.admin.getSettings()
      .then(setSettings)
      .catch(err => console.error("Failed to load settings in AppSettings:", err));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    if (file.size > 1024 * 1024) {
      onShowToast('Logo boyutu 1MB\'dan küçük olmalıdır', 'error');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logo_url: reader.result as string });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      onShowToast('Logo işlenirken bir hata oluştu', 'error');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.admin.updateSettings(settings);
      onShowToast('Ayarlar başarıyla kaydedildi', 'success');
      onUpdate();
    } catch (e) {
      onShowToast('Ayarlar kaydedilirken bir hata oluştu', 'error');
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800">Uygulama Ayarları</h3>
      
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Uygulama Adı</label>
          <input 
            type="text" 
            value={settings.app_name || ''} 
            onChange={e => setSettings({ ...settings, app_name: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Uygulama Logosu</label>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden">
              {settings.logo_url ? (
                <img src={settings.logo_url} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-8 h-8 text-slate-300" />
              )}
            </div>
            <div className="flex-1">
              <input 
                type="file" 
                id="logo-upload" 
                className="hidden" 
                onChange={handleLogoUpload}
                accept="image/*"
              />
              <label 
                htmlFor="logo-upload"
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold cursor-pointer",
                  uploading && "opacity-50"
                )}
              >
                {uploading ? <div className="w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                Logo Değiştir
              </label>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">Önerilen boyut: 512x512px. PNG veya SVG.</p>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">İletişim Telefonu</label>
          <input 
            type="text" 
            value={settings.contact_phone || ''} 
            onChange={e => setSettings({ ...settings, contact_phone: e.target.value })}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
            placeholder="444 42 44"
          />
        </div>

        <button 
          onClick={handleSave}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg"
        >
          Değişiklikleri Kaydet
        </button>
      </div>
    </div>
  );
}

function ProductManager({ onShowToast }: { onShowToast: (msg: string, type: 'success' | 'error') => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [movements, setMovements] = useState<{ sales: any[], stock: any[] } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [showStockReport, setShowStockReport] = useState(false);
  const [stockEditing, setStockEditing] = useState<{ product: Product, mode: 'entry' | 'reduction' | 'correction', amount: number, description: string, correctionType: 'increase' | 'decrease' } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadMovements = async (product: Product) => {
    setSelectedProduct(product);
    setLoadingMovements(true);
    try {
      const data = await api.products.getMovements(product.id);
      setMovements(data);
    } catch (e) {
      onShowToast('Hareketler yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await api.products.adminList();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products:", e);
      onShowToast('Ürünler yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    if (file.size > 1024 * 1024) {
      alert('Dosya boyutu 1MB\'dan küçük olmalıdır');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditing({ ...editing, image_url: reader.result as string });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      alert('Yükleme hatası');
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.products.update(editing.id, editing);
      } else {
        await api.products.create(editing);
      }
      onShowToast('Ürün başarıyla kaydedildi', 'success');
      setEditing(null);
      loadProducts();
    } catch (e) {
      onShowToast('Ürün kaydedilirken bir hata oluştu', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.products.delete(id);
      onShowToast('Ürün silindi', 'success');
      loadProducts();
    } catch (e) {
      onShowToast('Ürün silinirken bir hata oluştu', 'error');
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      // @ts-ignore
      await api.products.update(p.id, { ...p, is_active: p.is_active ? 0 : 1 });
      onShowToast('Ürün durumu güncellendi', 'success');
      loadProducts();
    } catch (e) {
      console.error("Failed to toggle product status:", e);
      onShowToast('Ürün durumu güncellenirken bir hata oluştu', 'error');
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockEditing) return;
    const { product, mode, amount, description, correctionType } = stockEditing;
    
    let finalQuantity = amount;
    let type = 'manual_adjustment';
    
    if (mode === 'reduction') {
      finalQuantity = -amount;
      type = 'manual_adjustment';
    } else if (mode === 'correction') {
      finalQuantity = correctionType === 'increase' ? amount : -amount;
      type = 'manual_adjustment';
    } else if (mode === 'entry') {
      type = 'manual_adjustment';
    }

    try {
      await api.products.adjustStock(product.id, {
        quantity: finalQuantity,
        type,
        description: description || (mode === 'entry' ? 'Stok Girişi' : mode === 'reduction' ? 'Stok Azaltma' : 'Stok Düzeltme')
      });
      onShowToast('İşlem tamamlandı', 'success');
      setStockEditing(null);
      loadProducts();
    } catch (e) {
      onShowToast('Stok güncellenirken bir hata oluştu', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-800">Ürün Yönetimi</h3>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowStockReport(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-md hover:bg-slate-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Stok Raporu</span>
          </button>
          <button 
            onClick={() => setEditing({ name: '', category: 'water', price: 0, stock: 0, description: '', image_url: '' })}
            className="p-2 bg-blue-600 text-white rounded-md shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white p-4 rounded-lg border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div 
              className="flex items-center gap-4 flex-1 cursor-pointer w-full"
              onClick={() => loadMovements(p)}
            >
              <div className="w-12 h-12 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100 shrink-0">
                {p.image_url ? <img src={p.image_url} className="w-full h-full object-contain" /> : <Package className="w-6 h-6" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800 truncate">{p.name}</h4>
                  {/* @ts-ignore */}
                  {!p.is_active && <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase">Pasif</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-[10px] text-blue-700 font-bold">{p.price.toFixed(2)} ₺</p>
                  <p className="text-[10px] text-slate-400 font-medium">Stok: {p.stock}</p>
                  <p className="text-[10px] text-slate-400 font-medium uppercase">{p.category}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
              <button 
                onClick={() => toggleActive(p)} 
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
                  // @ts-ignore
                  p.is_active ? "bg-green-500" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    // @ts-ignore
                    p.is_active ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
              <button 
                onClick={() => setStockEditing({ product: p, mode: 'entry', amount: 0, description: '', correctionType: 'increase' })} 
                className="p-2 text-amber-600 bg-amber-50 rounded-md hover:bg-amber-100 transition-colors"
                title="Stok Yönetimi"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(p)} className="p-2 text-blue-700 bg-blue-50 rounded-md">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingId(p.id)} className="p-2 text-red-600 bg-red-50 rounded-md">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {stockEditing && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-xl p-6 sm:p-8 shadow-2xl h-auto max-h-[90vh] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-md flex items-center justify-center text-amber-600">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Stok Yönetimi</h3>
                    <p className="text-xs text-slate-400 font-medium">{stockEditing.product.name}</p>
                  </div>
                </div>
                <button onClick={() => setStockEditing(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 flex flex-col gap-6">
                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-100 rounded-lg">
                    {(['entry', 'reduction', 'correction'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setStockEditing({ ...stockEditing, mode: m })}
                        className={cn(
                          "flex-1 py-2 text-[10px] font-black uppercase rounded-md transition-all",
                          stockEditing.mode === m ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"
                        )}
                      >
                        {m === 'entry' ? 'Stok Girişi' : m === 'reduction' ? 'Stok Azaltma' : 'Stok Düzeltme'}
                      </button>
                    ))}
                  </div>

                  {stockEditing.mode === 'correction' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStockEditing({ ...stockEditing, correctionType: 'increase' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                          stockEditing.correctionType === 'increase' ? "border-green-600 bg-green-50 text-green-700" : "border-slate-100 text-slate-400"
                        )}
                      >
                        Arttır (+)
                      </button>
                      <button
                        onClick={() => setStockEditing({ ...stockEditing, correctionType: 'decrease' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                          stockEditing.correctionType === 'decrease' ? "border-red-600 bg-red-50 text-red-700" : "border-slate-100 text-slate-400"
                        )}
                      >
                        Azalt (-)
                      </button>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase">Miktar</label>
                    <input 
                      type="number" 
                      value={stockEditing.amount || ''} 
                      onChange={e => setStockEditing({ ...stockEditing, amount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none font-bold"
                      placeholder="0"
                    />
                  </div>

                  {(stockEditing.mode === 'reduction' || stockEditing.mode === 'correction') && (
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase">Açıklama</label>
                      <textarea 
                        value={stockEditing.description} 
                        onChange={e => setStockEditing({ ...stockEditing, description: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none h-20 text-sm"
                        placeholder="İşlem nedeni..."
                      />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleStockAdjustment}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100"
                >
                  İşlemi Tamamla
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStockReport && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center text-blue-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Stok Raporu</h3>
                    <p className="text-xs text-slate-400 font-medium">Tüm ürünlerin güncel stok durumları</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStockReport(false)}
                  className="p-2 bg-slate-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="bg-slate-50 rounded-lg overflow-hidden border border-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-100/50">
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Ürün</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Kategori</th>
                        <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {products.map((p) => (
                        <tr key={p.id} className="hover:bg-white transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs font-bold text-slate-700">{p.name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-200/50 px-1.5 py-0.5 rounded">
                              {p.category === 'water' ? 'Su' : p.category === 'gas' ? 'Tüp' : 'Pet'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              "text-xs font-black",
                              p.stock <= 5 ? "text-red-600" : p.stock <= 15 ? "text-amber-600" : "text-green-600"
                            )}>
                              {p.stock}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setShowStockReport(false)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg shadow-blue-100"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(selectedProduct || loadingMovements) && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-md flex items-center justify-center text-blue-600">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{selectedProduct?.name}</h3>
                    <p className="text-xs text-slate-400 font-medium">Satış ve Stok Hareketleri</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedProduct(null);
                    setMovements(null);
                  }}
                  className="p-2 bg-slate-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {loadingMovements ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400 font-bold">Hareketler yükleniyor...</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-8">
                  {/* Satış Hareketleri */}
                  <section className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Satış Hareketleri
                    </h4>
                    <div className="bg-slate-50 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Müşteri</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Adet</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Ödeme</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Tarih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movements?.sales.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">Henüz satış hareketi yok</td>
                            </tr>
                          ) : (
                            movements?.sales.map((s, i) => (
                              <tr key={i} className="hover:bg-white/50 transition-colors">
                                <td className="px-4 py-3 text-xs font-bold text-slate-700">{s.customer_name}</td>
                                <td className="px-4 py-3 text-xs font-black text-blue-600">{s.quantity}</td>
                                <td className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">
                                  {s.payment_method === 'cash_on_delivery' ? 'Kapıda Nakit' : 
                                   s.payment_method === 'card_on_delivery' ? 'Kapıda Kart' : 
                                   s.payment_method === 'online' ? 'Online' : s.payment_method}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-medium text-slate-400">
                                  {new Date(s.created_at).toLocaleDateString('tr-TR')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Stok Hareketleri */}
                  <section className="space-y-4">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Stok Hareketleri (Manuel)
                    </h4>
                    <div className="bg-slate-50 rounded-lg overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Tür</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Miktar</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Açıklama</th>
                            <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Tarih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {movements?.stock.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-400 font-medium">Henüz stok hareketi yok</td>
                            </tr>
                          ) : (
                            movements?.stock.map((s, i) => (
                              <tr key={i} className="hover:bg-white/50 transition-colors">
                                <td className="px-4 py-3 text-xs font-bold text-slate-700">
                                  {s.type === 'manual_adjustment' ? 'Manuel Düzenleme' : s.type}
                                </td>
                                <td className={cn("px-4 py-3 text-xs font-black", s.quantity > 0 ? "text-green-600" : "text-red-600")}>
                                  {s.quantity > 0 ? `+${s.quantity}` : s.quantity}
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 font-medium italic">
                                  {s.description || '-'}
                                </td>
                                <td className="px-4 py-3 text-[10px] font-medium text-slate-400">
                                  {new Date(s.created_at).toLocaleDateString('tr-TR')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl border-2 border-red-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Ürünü Sil?</h3>
                <p className="text-sm text-slate-400 font-medium">Bu ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-lg"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={() => {
                    handleDelete(deletingId);
                    setDeletingId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg shadow-lg shadow-red-100"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-xl sm:rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">{editing.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 pr-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ürün Adı</label>
                  <input 
                    type="text" 
                    value={editing.name || ''} 
                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kategori</label>
                    <select 
                      value={editing.category || 'water'} 
                      onChange={e => setEditing({ ...editing, category: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="water">Su</option>
                      <option value="gas">Tüp</option>
                      <option value="pet">Pet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fiyat (₺)</label>
                    <input 
                      type="number" 
                      value={editing.price || 0} 
                      onChange={e => setEditing({ ...editing, price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stok Miktarı</label>
                  <input 
                    type="number" 
                    value={editing.stock || 0} 
                    onChange={e => setEditing({ ...editing, stock: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Açıklama</label>
                  <textarea 
                    value={editing.description || ''} 
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-md focus:ring-2 focus:ring-blue-600 outline-none h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Görsel</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-md border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {editing.image_url ? <img src={editing.image_url} className="w-full h-full object-contain" /> : <ImageIcon className="w-6 h-6 text-slate-300" />}
                    </div>
                    <div className="flex-1 w-full">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="product-image-upload"
                      />
                      <label 
                        htmlFor="product-image-upload"
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md text-xs font-bold cursor-pointer",
                          uploading && "opacity-50"
                        )}
                      >
                        {uploading ? <div className="w-3 h-3 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-3 h-3" />}
                        Görsel Seç
                      </label>
                      <input 
                        type="text" 
                        value={editing.image_url || ''} 
                        onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                        className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-sm text-[10px] outline-none"
                        placeholder="Veya URL yapıştırın"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg shadow-lg"
              >
                Kaydet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CampaignManager({ onShowToast }: { onShowToast: (msg: string, type: 'success' | 'error') => void }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Partial<Campaign> | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width / height > MAX_WIDTH / MAX_HEIGHT) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setEditing({ ...editing, image_url: dataUrl });
          setUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (e) {
      onShowToast('Resim işlenirken bir hata oluştu', 'error');
      setUploading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      const data = await api.campaigns.adminList();
      setCampaigns(data);
    } catch (e) {
      console.error("Failed to load campaigns:", e);
      onShowToast('Kampanyalar yüklenirken bir hata oluştu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      if (editing.id) {
        await api.campaigns.update(editing.id, editing);
      } else {
        await api.campaigns.create(editing);
      }
      onShowToast('Kampanya başarıyla kaydedildi', 'success');
      setEditing(null);
      loadCampaigns();
    } catch (e) {
      onShowToast('Kampanya kaydedilirken bir hata oluştu', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.campaigns.delete(id);
      onShowToast('Kampanya silindi', 'success');
      loadCampaigns();
    } catch (e) {
      onShowToast('Kampanya silinirken bir hata oluştu', 'error');
    }
  };

  const toggleActive = async (c: Campaign) => {
    try {
      await api.campaigns.update(c.id, { ...c, is_active: c.is_active ? 0 : 1 });
      loadCampaigns();
    } catch (e) {
      console.error("Failed to toggle campaign status:", e);
      onShowToast('Kampanya durumu güncellenirken bir hata oluştu', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">Kampanya Yönetimi</h3>
        <button 
          onClick={() => setEditing({ title: '', description: '', is_active: 1, sort_order: 0, type: 'general', gradient: 'from-blue-600 to-blue-400' })}
          className="p-2 bg-blue-600 text-white rounded-xl shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100">
              {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-800">{c.title}</h4>
                {!c.is_active && <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full uppercase">Pasif</span>}
              </div>
              <p className="text-[10px] text-slate-400 font-medium line-clamp-1">{c.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => toggleActive(c)} className={cn("p-2 rounded-lg transition-colors", c.is_active ? "text-green-600 bg-green-50" : "text-slate-400 bg-slate-50")}>
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(c)} className="p-2 text-blue-700 bg-blue-50 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => setDeletingId(c.id)} className="p-2 text-red-600 bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-lg p-8 space-y-6 shadow-2xl border-2 border-red-100"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Kampanyayı Sil?</h3>
                <p className="text-sm text-slate-400 font-medium">Bu kampanyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
                >
                  Vazgeç
                </button>
                <button 
                  onClick={() => {
                    handleDelete(deletingId);
                    setDeletingId(null);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-100"
                >
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-md rounded-t-lg sm:rounded-lg p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">{editing.id ? 'Kampanyayı Düzenle' : 'Yeni Kampanya'}</h3>
                <button onClick={() => setEditing(null)} className="p-2 bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Başlık</label>
                  <input 
                    type="text" 
                    value={editing.title || ''} 
                    onChange={e => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Açıklama</label>
                  <textarea 
                    value={editing.description || ''} 
                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none h-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase">Görsel</label>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Önerilen: 1200x400 px (3:1)</span>
                    </div>
                    <div className="relative group">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="campaign-image-upload"
                      />
                      <label 
                        htmlFor="campaign-image-upload"
                        className={cn(
                          "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-colors",
                          uploading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {uploading ? (
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-blue-700" />
                        )}
                        <span className="text-xs font-bold text-slate-600">
                          {editing.image_url ? 'Değiştir' : 'Yükle'}
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Görsel URL (Manuel)</label>
                    <input 
                      type="text" 
                      value={editing.image_url || ''} 
                      onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Badge (Örn: pH 8.3)</label>
                    <input 
                      type="text" 
                      value={editing.badge || ''} 
                      onChange={e => setEditing({ ...editing, badge: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Gradient (Tailwind Classes)</label>
                  <input 
                    type="text" 
                    value={editing.gradient || ''} 
                    onChange={e => setEditing({ ...editing, gradient: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    placeholder="from-blue-600 to-blue-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tip</label>
                    <select 
                      value={editing.type || 'general'} 
                      onChange={e => setEditing({ ...editing, type: e.target.value as any })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    >
                      <option value="general">Genel</option>
                      <option value="loyalty">Sadakat</option>
                      <option value="limited">Sınırlı Süre</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Bitiş Tarihi</label>
                    <input 
                      type="datetime-local" 
                      value={editing.expires_at ? editing.expires_at.slice(0, 16) : ''} 
                      onChange={e => setEditing({ ...editing, expires_at: new Date(e.target.value).toISOString() })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg"
              >
                Kaydet
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminHome({ user, onUpdateSettings, onShowToast }: { user: User, onUpdateSettings: () => void | Promise<void>, onShowToast?: (msg: string, type: 'success' | 'error') => void }) {
  const [activeTab, setActiveTab] = useState<'stats' | 'products' | 'campaigns' | 'customers' | 'couriers' | 'settings' | 'orders'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    } else {
      setToast({ message, type });
    }
  }, [onShowToast]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.admin.getStats();
      setStats(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Pzt', sales: 4000 },
    { name: 'Sal', sales: 3000 },
    { name: 'Çar', sales: 2000 },
    { name: 'Per', sales: 2780 },
    { name: 'Cum', sales: 1890 },
    { name: 'Cmt', sales: 2390 },
    { name: 'Paz', sales: 3490 },
  ];

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Yönetim Paneli</h2>
          <p className="text-sm text-slate-400 font-medium">Hoş geldin, {user.name}</p>
        </div>
        <button className="p-2 bg-blue-50 text-blue-700 rounded-xl" onClick={() => setActiveTab('settings')}>
          <Settings className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2">
        {[
          { id: 'stats', label: 'İstatistikler', icon: <BarChart3 className="w-6 h-6" /> },
          { id: 'orders', label: 'Siparişler', icon: <ClipboardList className="w-6 h-6" /> },
          { id: 'manual_order', label: 'Sipariş Ekle', icon: <PlusCircle className="w-6 h-6" /> },
          { id: 'products', label: 'Ürünler', icon: <Package className="w-6 h-6" /> },
          { id: 'campaigns', label: 'Kampanyalar', icon: <Megaphone className="w-6 h-6" /> },
          { id: 'customers', label: 'Müşteriler', icon: <Users className="w-6 h-6" /> },
          { id: 'couriers', label: 'Kuryeler', icon: <Truck className="w-6 h-6" /> },
          { id: 'settings', label: 'Ayarlar', icon: <Settings className="w-6 h-6" /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "aspect-square w-full sm:w-[110px] flex flex-col items-center justify-center gap-2 rounded-[18px] border transition-all duration-300",
              activeTab === tab.id 
                ? "bg-white border-blue-500 shadow-lg shadow-blue-50 scale-[1.02]" 
                : "bg-white border-slate-100 text-slate-400 hover:border-blue-200 shadow-sm"
            )}
          >
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
              activeTab === tab.id ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
            )}>
              {tab.icon}
            </div>
            <span className={cn(
              "text-[10px] sm:text-sm font-poppins font-bold text-center px-1",
              activeTab === tab.id ? "text-blue-600" : "text-slate-700"
            )}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === 'stats' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard 
                icon={<DollarSign className="w-5 h-5" />} 
                label="Toplam Ciro" 
                value={`${stats?.totalRevenue?.toFixed(2) || '0.00'} ₺`} 
                color="bg-blue-600" 
                trend="+12%"
              />
              <StatCard 
                icon={<ShoppingBag className="w-5 h-5" />} 
                label="Siparişler" 
                value={stats?.totalOrders || '0'} 
                color="bg-blue-500" 
                trend="+5%"
              />
            </div>

            {/* Sales Chart */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">Satış Grafiği</h3>
                <select className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-lg outline-none">
                  <option>Haftalık</option>
                  <option>Aylık</option>
                </select>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f8fafc' }}
                    />
                    <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">En Çok Satanlar</h3>
                <button className="text-blue-700 text-sm font-bold flex items-center gap-1">
                  Tümünü Gör <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {stats?.topProducts?.map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-sm font-bold text-slate-400">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                        <p className="text-xs text-slate-400 font-medium">{p.total_sold} Satış</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-800">{(p.total_sold * 12).toFixed(2)} ₺</p>
                      <p className="text-[10px] text-green-500 font-bold">Popüler</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : activeTab === 'orders' ? (
          <Orders user={user} onShowToast={showToast} />
        ) : activeTab === 'manual_order' ? (
          <ManualOrder onShowToast={showToast} />
        ) : activeTab === 'products' ? (
          <ProductManager onShowToast={showToast} />
        ) : activeTab === 'campaigns' ? (
          <CampaignManager onShowToast={showToast} />
        ) : activeTab === 'customers' ? (
          <UserManager role="customer" onShowToast={showToast} />
        ) : activeTab === 'couriers' ? (
          <UserManager role="courier" onShowToast={showToast} />
        ) : (
          <AppSettings onUpdate={onUpdateSettings} onShowToast={showToast} />
        )}
      </div>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color, trend }: { icon: React.ReactNode, label: string, value: string | number, color: string, trend: string }) {
  return (
    <div className={cn("p-6 rounded-3xl text-white shadow-lg w-full max-w-sm mx-auto", color)}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        {trend !== '0' && <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full">{trend}</span>}
      </div>
      <p className="text-xs text-white/80 font-medium mb-1">{label}</p>
      <h4 className="text-xl font-bold">{value}</h4>
    </div>
  );
}
