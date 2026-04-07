import { Order, User } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, CheckCircle, MapPin, Navigation, Phone, DollarSign, Power, ClipboardList, X, User as UserIcon, ShoppingBag, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function CourierHome({ user, onShowToast }: { user: User, onShowToast?: (msg: string, type: 'success' | 'error') => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
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

  const handleStatusUpdate = async (orderId: number, status: string, courierId?: number, paymentMethod?: string, other?: any) => {
    setIsUpdating(true);
    try {
      await api.orders.updateStatus(orderId, status, courierId || user.id, paymentMethod, other);
      await loadOrders();
      if (status === 'delivered' && onShowToast) {
        onShowToast('Sipariş başarıyla teslim edildi!', 'success');
      }
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await api.orders.get(orderId);
        setSelectedOrder(updated);
      }
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast('Güncelleme sırasında bir hata oluştu', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const openOrderDetails = async (orderId: number) => {
    try {
      const details = await api.orders.get(orderId);
      setSelectedOrder(details);
    } catch (e) {
      console.error(e);
    }
  };

  const activeOrders = orders.filter(o => o.courier_id === user.id && o.status !== 'delivered' && o.status !== 'cancelled');
  const pendingOrders = orders.filter(o => !o.courier_id && o.status === 'pending');
  const deliveredOrders = orders.filter(o => o.courier_id === user.id && o.status === 'delivered');
  const dailyEarnings = deliveredOrders.reduce((acc, o) => acc + o.total_price, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      {/* Courier Status */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isOnline ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400")}>
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Kurye Paneli</h3>
            <p className={cn("text-xs font-bold uppercase tracking-wider", isOnline ? "text-green-500" : "text-slate-400")}>
              {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsOnline(!isOnline)}
          className={cn("p-3 rounded-2xl transition-all", isOnline ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500")}
        >
          <Power className="w-6 h-6" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg shadow-blue-200">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-xs text-blue-100 font-medium mb-1">Günlük Kazanç</p>
          <h4 className="text-2xl font-bold">{dailyEarnings.toFixed(2)} ₺</h4>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-4 text-slate-400">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-400 font-medium mb-1">Teslim Edilen</p>
          <h4 className="text-2xl font-bold text-slate-800">{deliveredOrders.length}</h4>
        </div>
      </div>

      {/* Active Tasks */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Aktif Görevler</h3>
        {activeOrders.length === 0 ? (
          <div className="bg-slate-50 p-8 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
            <p className="text-sm font-medium">Şu an aktif bir göreviniz yok.</p>
          </div>
        ) : (
          activeOrders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 
                    onClick={() => openOrderDetails(order.id)}
                    className="text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    Sipariş #{order.id}
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">{order.customer_name}</p>
                </div>
                <span className={cn("text-xs font-bold px-3 py-1 rounded-full", order.status === 'on_the_way' ? "bg-indigo-50 text-indigo-500" : "bg-blue-50 text-blue-500")}>
                  {order.status === 'on_the_way' ? 'Yolda' : 'Kabul Edildi'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-500">
                <MapPin className="w-5 h-5 text-blue-500" />
                <span className="text-xs font-medium">{order.address_text}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {
                    if (order.lat && order.lng) {
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.lat},${order.lng}&travelmode=driving`, '_blank');
                    } else {
                      onShowToast?.('Bu sipariş için konum bilgisi bulunamadı', 'error');
                    }
                  }}
                  className="py-3 bg-blue-50 text-blue-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-100 transition-all"
                >
                  <Navigation className="w-4 h-4" /> Navigasyon
                </button>
                <a 
                  href={`tel:${order.customer_phone}`}
                  className="py-3 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <Phone className="w-4 h-4" /> Müşteriyi Ara
                </a>
              </div>
              {order.status === 'on_the_way' ? (
                <button 
                  onClick={() => handleStatusUpdate(order.id, 'delivered')}
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg hover:bg-green-700 transition-all"
                >
                  Teslim Ettim
                </button>
              ) : (
                <button 
                  onClick={() => handleStatusUpdate(order.id, 'on_the_way')}
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
                >
                  Yola Çıktım
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pending Orders */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Yeni Siparişler</h3>
        {pendingOrders.map(order => (
          <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 
                  onClick={() => openOrderDetails(order.id)}
                  className="text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                >
                  Yeni Sipariş #{order.id}
                </h4>
                <p className="text-xs text-slate-400 font-medium">{order.customer_name}</p>
              </div>
              <span className="text-sm font-bold text-blue-600">{order.total_price.toFixed(2)} ₺</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <MapPin className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-medium">{order.address_text}</span>
            </div>
            <button 
              onClick={() => handleStatusUpdate(order.id, 'accepted')}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
            >
              Siparişi Kabul Et
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100">
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
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
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
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 border border-slate-100 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-slate-600 leading-relaxed">{selectedOrder.address_text}</span>
                      </div>
                      {selectedOrder.lat && selectedOrder.lng && (
                        <button 
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedOrder.lat},${selectedOrder.lng}&travelmode=driving`, '_blank')}
                          className="w-full py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl flex items-center justify-center gap-2 shadow-sm hover:bg-blue-700 transition-all uppercase tracking-wider"
                        >
                          <Navigation className="w-3 h-3" /> Navigasyon Başlat
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş İçeriği</h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
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

                {/* Status Update Section for Courier */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum Güncelle</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {(selectedOrder.status === 'accepted' || (selectedOrder.status === 'pending' && selectedOrder.courier_id === user.id)) && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'on_the_way')}
                        disabled={isUpdating}
                        className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                      >
                        Yola Çıktım
                      </button>
                    )}
                    {selectedOrder.status === 'on_the_way' && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
                        disabled={isUpdating}
                        className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                      >
                        Teslim Ettim
                      </button>
                    )}
                    {(selectedOrder.status === 'pending' && !selectedOrder.courier_id) && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedOrder.id, 'accepted')}
                        disabled={isUpdating}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        Siparişi Kabul Et
                      </button>
                    )}
                  </div>
                </div>

                {/* Deposit Info */}
                {(selectedOrder.has_empty_damacana === 1 || selectedOrder.has_empty_tup === 1) && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">İade Bilgileri</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedOrder.has_empty_damacana === 1 && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                          <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
                            <ShoppingBag className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-amber-700">Boş Damacana Alınacak</span>
                        </div>
                      )}
                      {selectedOrder.has_empty_tup === 1 && (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                          <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-amber-700">Boş Tüp Alınacak</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-8 py-3 bg-slate-800 text-white font-bold rounded-2xl shadow-lg hover:bg-slate-900 transition-all"
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
