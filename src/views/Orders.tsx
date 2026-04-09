import { Order, User } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Clock, Truck, CheckCircle, XCircle, MapPin, ChevronRight, ChevronLeft, Filter, X, ShoppingBag, Package, Phone, CreditCard, User as UserIcon, Edit2, Save } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import Tracking from './Tracking';
import { cn } from '../lib/utils';

export default function Orders({ user, onShowToast }: { user: User, onShowToast?: (msg: string, type: 'success' | 'error') => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [adminFilter, setAdminFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const itemsPerPage = 20;

  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isCourier = user.role === 'courier';

  useEffect(() => {
    loadOrders();
    if (isAdmin) {
      api.admin.getCouriers()
        .then(setCouriers)
        .catch(err => console.error("Failed to load couriers:", err));
    }
    const interval = setInterval(loadOrders, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.orders.list();
      setOrders(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];

    if (isCourier) {
      result = result.filter(o => o.courier_id === user.id);
    }

    if (isAdmin) {
      if (adminFilter === 'active') {
        result = result.filter(o => ['pending', 'accepted', 'on_the_way'].includes(o.status));
      } else if (adminFilter === 'delivered') {
        result = result.filter(o => o.status === 'delivered');
      } else if (adminFilter === 'cancelled') {
        result = result.filter(o => o.status === 'cancelled');
      }

      // Sort: Active first (pending > accepted > on_the_way), then delivered, then cancelled
      const statusOrder = {
        'pending': 0,
        'accepted': 1,
        'on_the_way': 2,
        'delivered': 3,
        'cancelled': 4
      };

      result.sort((a, b) => {
        const orderA = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
        const orderB = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return b.id - a.id; // Newest first for same status
      });
    } else {
      result.sort((a, b) => b.id - a.id);
    }

    return result;
  }, [orders, isAdmin, isCourier, user.id, adminFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(start, start + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  const handleStatusUpdate = async (orderId: number, status: string, courierId?: number, paymentMethod?: string, other?: any) => {
    try {
      setIsUpdating(true);
      await api.orders.updateStatus(orderId, status, courierId, paymentMethod, other);
      if (onShowToast) onShowToast('Sipariş güncellendi', 'success');
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await api.orders.get(orderId);
        setSelectedOrder(updated);
      }
    } catch (e) {
      if (onShowToast) onShowToast('Güncelleme hatası', 'error');
      else alert('Güncelleme hatası');
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = async (orderId: number) => {
    if (!isAdmin && !isCourier) return;
    try {
      const details = await api.orders.get(orderId);
      setSelectedOrder(details);
    } catch (e) {
      if (onShowToast) onShowToast('Sipariş detayları alınamadı', 'error');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { icon: <Clock className="w-5 h-5" />, label: 'Bekliyor', color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'accepted': return { icon: <CheckCircle className="w-5 h-5" />, label: 'Kabul Edildi', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'on_the_way': return { icon: <Truck className="w-5 h-5" />, label: 'Yolda', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'delivered': return { icon: <CheckCircle className="w-5 h-5" />, label: 'Teslim Edildi', color: 'text-green-500', bg: 'bg-green-50' };
      case 'cancelled': return { icon: <XCircle className="w-5 h-5" />, label: 'İptal Edildi', color: 'text-red-500', bg: 'bg-red-50' };
      default: return { icon: <Clock className="w-5 h-5" />, label: 'Bekliyor', color: 'text-slate-500', bg: 'bg-slate-50' };
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6"
    >
      <AnimatePresence mode="wait">
        {showTracking ? (
          <motion.div 
            key="tracking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Canlı Takip</h3>
              <button 
                onClick={() => setShowTracking(false)} 
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
              <Tracking user={user} />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-800">
                {isAdmin ? 'Tüm Siparişler' : isCourier ? 'Sipariş Geçmişi' : 'Siparişlerim'}
              </h2>
              
              {isAdmin && (
                <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-100 shadow-sm">
                  <button 
                    onClick={() => { setAdminFilter('all'); setCurrentPage(1); }}
                    className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", adminFilter === 'all' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50")}
                  >
                    Tümü
                  </button>
                  <button 
                    onClick={() => { setAdminFilter('active'); setCurrentPage(1); }}
                    className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", adminFilter === 'active' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50")}
                  >
                    Aktif
                  </button>
                  <button 
                    onClick={() => { setAdminFilter('delivered'); setCurrentPage(1); }}
                    className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", adminFilter === 'delivered' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50")}
                  >
                    Teslim Edildi
                  </button>
                  <button 
                    onClick={() => { setAdminFilter('cancelled'); setCurrentPage(1); }}
                    className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", adminFilter === 'cancelled' ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-50")}
                  >
                    İptal Edilenler
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Sipariş</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Müşteri / Adres</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tutar</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedOrders.map(order => {
                const status = getStatusInfo(order.status);
                return (
                  <tr 
                    key={order.id} 
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", status.bg, status.color)}>
                          {status.icon}
                        </div>
                        <div>
                          <p 
                            onClick={() => openOrderDetails(order.id)}
                            className={cn(
                              "text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors",
                              (isAdmin || isCourier) && "cursor-pointer"
                            )}
                          >
                            #{order.id}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(order.created_at).toLocaleDateString('tr-TR')} {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {(order.has_empty_damacana === 1 || order.has_empty_tup === 1) && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {order.has_empty_damacana === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-tighter">Boş Damacana</span>}
                              {order.has_empty_tup === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-tighter">Boş Tüp</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="max-w-[200px]">
                        {isAdmin && (
                          <p 
                            onClick={() => openOrderDetails(order.id)}
                            className={cn(
                              "text-sm font-bold text-blue-700 mb-0.5 hover:text-blue-800 transition-colors",
                              (isAdmin || isCourier) && "cursor-pointer"
                            )}
                          >
                            {order.customer_name}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="text-[11px] font-medium truncate">{order.address_text}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold", status.bg, status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{order.total_price.toFixed(2)} ₺</p>
                      {isAdmin ? (
                        <select 
                          value={order.payment_method} 
                          onChange={(e) => handleStatusUpdate(order.id, order.status, order.courier_id, e.target.value)}
                          className="text-[10px] font-bold text-slate-500 uppercase bg-transparent border-none focus:ring-0 cursor-pointer p-0"
                        >
                          <option value="cash_at_door">Kapıda Nakit</option>
                          <option value="card_at_door">Kapıda Kart</option>
                        </select>
                      ) : (
                        <p className="text-[10px] text-slate-400 font-medium uppercase">
                          {order.payment_method === 'cash_at_door' ? 'Kapıda Nakit' : 
                           order.payment_method === 'card_at_door' ? 'Kapıda Kart' : order.payment_method}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col gap-2 items-end">
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <select 
                              value={order.courier_id || ''} 
                              onChange={(e) => handleStatusUpdate(order.id, order.status, Number(e.target.value))}
                              className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none"
                            >
                              <option value="">Kurye Ata</option>
                              {couriers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <select 
                              value={order.status} 
                              onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.courier_id)}
                              className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none"
                            >
                              <option value="pending">Bekliyor</option>
                              <option value="accepted">Kabul Edildi</option>
                              <option value="on_the_way">Yolda</option>
                              <option value="delivered">Teslim Edildi</option>
                              <option value="cancelled">İptal Et</option>
                            </select>
                          </div>
                        )}

                        {isCourier && order.courier_id === user.id && order.status !== 'delivered' && order.status !== 'cancelled' && (
                          <div className="flex items-center gap-2">
                            {order.status === 'on_the_way' ? (
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'delivered')}
                                className="px-4 py-2 bg-green-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-green-700 transition-all"
                              >
                                Teslim Ettim
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStatusUpdate(order.id, 'on_the_way')}
                                className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-indigo-700 transition-all"
                              >
                                Yola Çıktım
                              </button>
                            )}
                          </div>
                        )}

                        {!isAdmin && !isCourier && ['preparing', 'on_way', 'on_the_way'].includes(order.status) && (
                          <button 
                            onClick={() => setShowTracking(true)}
                            className="px-4 py-2 bg-blue-50 text-blue-700 text-[10px] font-bold rounded flex items-center gap-1.5"
                          >
                            <Truck className="w-3 h-3" /> Takip Et
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                    Sipariş bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-50">
          {paginatedOrders.map(order => {
            const status = getStatusInfo(order.status);
            return (
              <div key={order.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", status.bg, status.color)}>
                      {status.icon}
                    </div>
                    <div>
                      <p 
                        onClick={() => openOrderDetails(order.id)}
                        className={cn(
                          "text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors",
                          (isAdmin || isCourier) && "cursor-pointer"
                        )}
                      >
                        #{order.id}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(order.created_at).toLocaleDateString('tr-TR')} {new Date(order.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-800">{order.total_price.toFixed(2)} ₺</p>
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold", status.bg, status.color)}>
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {isAdmin && (
                    <p 
                      onClick={() => openOrderDetails(order.id)}
                      className="text-sm font-bold text-blue-700 cursor-pointer"
                    >
                      {order.customer_name}
                    </p>
                  )}
                  <div className="flex items-start gap-1.5 text-slate-500">
                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-relaxed">{order.address_text}</span>
                  </div>
                  {(order.has_empty_damacana === 1 || order.has_empty_tup === 1) && (
                    <div className="flex flex-wrap gap-1">
                      {order.has_empty_damacana === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-tighter">Boş Damacana</span>}
                      {order.has_empty_tup === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black rounded uppercase tracking-tighter">Boş Tüp</span>}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <select 
                      value={order.courier_id || ''} 
                      onChange={(e) => handleStatusUpdate(order.id, order.status, Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none"
                    >
                      <option value="">Kurye Ata</option>
                      {couriers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select 
                      value={order.status} 
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value, order.courier_id)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none"
                    >
                      <option value="pending">Bekliyor</option>
                      <option value="accepted">Kabul Edildi</option>
                      <option value="on_the_way">Yolda</option>
                      <option value="delivered">Teslim Edildi</option>
                      <option value="cancelled">İptal Et</option>
                    </select>
                  </div>
                )}

                {isCourier && order.courier_id === user.id && order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="pt-2">
                    {order.status === 'on_the_way' ? (
                      <button 
                        onClick={() => handleStatusUpdate(order.id, 'delivered')}
                        className="w-full py-3 bg-green-600 text-white text-xs font-bold rounded shadow-lg hover:bg-green-700 transition-all"
                      >
                        Teslim Ettim
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleStatusUpdate(order.id, 'on_the_way')}
                        className="w-full py-3 bg-indigo-600 text-white text-xs font-bold rounded shadow-lg hover:bg-indigo-700 transition-all"
                      >
                        Yola Çıktım
                      </button>
                    )}
                  </div>
                )}

                {!isAdmin && !isCourier && ['preparing', 'on_way', 'on_the_way'].includes(order.status) && (
                  <button 
                    onClick={() => setShowTracking(true)}
                    className="w-full py-3 bg-blue-50 text-blue-700 text-xs font-bold rounded flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" /> Takip Et
                  </button>
                )}
              </div>
            );
          })}
          {paginatedOrders.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium">
              Sipariş bulunamadı.
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-medium text-center sm:text-left">
              Toplam <span className="text-slate-800 font-bold">{filteredAndSortedOrders.length}</span> kayıttan <span className="text-slate-800 font-bold">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedOrders.length)}</span> arası gösteriliyor
            </p>
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 sm:pb-0 no-scrollbar">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-2 bg-white border border-slate-200 rounded shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  // Show only a few page buttons around current page on mobile
                  const isNear = Math.abs(currentPage - (i + 1)) <= 1;
                  const isEnd = i === 0 || i === totalPages - 1;
                  if (!isNear && !isEnd && totalPages > 5) {
                    if (i === 1 || i === totalPages - 2) return <span key={i} className="text-slate-300 px-1">...</span>;
                    return null;
                  }
                  
                  return (
                    <button 
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-8 h-8 text-xs font-bold rounded shrink-0 transition-all",
                        currentPage === i + 1 ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-100"
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-2 bg-white border border-slate-200 rounded shrink-0 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-md flex items-center justify-center shadow-lg shadow-blue-100">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Sipariş Detayı #{selectedOrder.id}</h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {new Date(selectedOrder.created_at).toLocaleString('tr-TR')}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Customer & Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Müşteri Bilgileri</h4>
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-100 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 border border-slate-100">
                          <UserIcon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{selectedOrder.customer_name}</span>
                      </div>
                      <a href={`tel:${selectedOrder.customer_phone}`} className="flex items-center gap-3 hover:bg-white/80 p-1 rounded-lg transition-colors">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-green-600 border border-slate-100">
                          <Phone className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-slate-700 underline decoration-green-200 decoration-2 underline-offset-4">{selectedOrder.customer_phone}</span>
                      </a>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teslimat Adresi</h4>
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-100 flex gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 border border-slate-100 shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 leading-relaxed">{selectedOrder.address_text}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş İçeriği</h4>
                  <div className="bg-slate-50 rounded-md border border-slate-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/50 border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase">Ürün</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-center">Adet</th>
                          <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-right">Fiyat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items?.map((item, idx) => (
                          <tr key={idx} className="bg-white/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <img src={item.image_url} alt={item.product_name} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                                <span className="text-xs font-bold text-slate-700">{item.product_name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs font-black text-slate-800 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-xs font-black text-blue-600 text-right">{item.price.toFixed(2)} ₺</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100/30">
                          <td colSpan={2} className="px-4 py-3 text-xs font-black text-slate-800">Toplam</td>
                          <td className="px-4 py-3 text-sm font-black text-blue-600 text-right">{selectedOrder.total_price.toFixed(2)} ₺</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Edit Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş Yönetimi</h4>
                  
                  {isAdmin && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Durum</label>
                        <select 
                          value={selectedOrder.status}
                          onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value, selectedOrder.courier_id, selectedOrder.payment_method)}
                          disabled={isUpdating}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="accepted">Kabul Edildi</option>
                          <option value="on_the_way">Yolda</option>
                          <option value="delivered">Teslim Edildi</option>
                          <option value="cancelled">İptal Edildi</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Kurye</label>
                        <select 
                          value={selectedOrder.courier_id || ''}
                          onChange={(e) => handleStatusUpdate(selectedOrder.id, selectedOrder.status, Number(e.target.value), selectedOrder.payment_method)}
                          disabled={isUpdating}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                          <option value="">Kurye Seçin</option>
                          {couriers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ödeme</label>
                        <select 
                          value={selectedOrder.payment_method}
                          onChange={(e) => handleStatusUpdate(selectedOrder.id, selectedOrder.status, selectedOrder.courier_id, e.target.value)}
                          disabled={isUpdating}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                        >
                          <option value="cash_at_door">Kapıda Nakit</option>
                          <option value="card_at_door">Kapıda Kart</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tutar (₺)</label>
                        <div className="relative">
                          <input 
                            type="number"
                            step="0.01"
                            defaultValue={selectedOrder.total_price}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val !== selectedOrder.total_price) {
                                handleStatusUpdate(selectedOrder.id, selectedOrder.status, selectedOrder.courier_id, selectedOrder.payment_method, { total_price: val });
                              }
                            }}
                            disabled={isUpdating}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {isCourier && selectedOrder.courier_id === user.id && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                    <div className="grid grid-cols-1 gap-3">
                      {selectedOrder.status === 'on_the_way' ? (
                        <button 
                          onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
                          disabled={isUpdating}
                          className="w-full py-4 bg-green-600 text-white font-bold rounded-md shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                        >
                          Teslim Ettim
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStatusUpdate(selectedOrder.id, 'on_the_way')}
                          disabled={isUpdating}
                          className="w-full py-4 bg-indigo-600 text-white font-bold rounded-md shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                          Yola Çıktım
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded flex items-center justify-center border", selectedOrder.has_empty_damacana ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-400 border-slate-200")}>
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Boş Damacana</span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleStatusUpdate(selectedOrder.id, selectedOrder.status, selectedOrder.courier_id, selectedOrder.payment_method, { has_empty_damacana: !selectedOrder.has_empty_damacana })}
                          disabled={isUpdating}
                          className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all", selectedOrder.has_empty_damacana ? "bg-red-50 text-red-600" : "bg-blue-600 text-white shadow-lg shadow-blue-100")}
                        >
                          {selectedOrder.has_empty_damacana ? 'Kaldır' : 'Ekle'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded flex items-center justify-center border", selectedOrder.has_empty_tup ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-400 border-slate-200")}>
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">Boş Tüp</span>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleStatusUpdate(selectedOrder.id, selectedOrder.status, selectedOrder.courier_id, selectedOrder.payment_method, { has_empty_tup: !selectedOrder.has_empty_tup })}
                          disabled={isUpdating}
                          className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all", selectedOrder.has_empty_tup ? "bg-red-50 text-red-600" : "bg-blue-600 text-white shadow-lg shadow-blue-100")}
                        >
                          {selectedOrder.has_empty_tup ? 'Kaldır' : 'Ekle'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-8 py-3 bg-slate-800 text-white font-bold rounded-md shadow-lg hover:bg-slate-900 transition-all"
                >
                  Kapat
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
