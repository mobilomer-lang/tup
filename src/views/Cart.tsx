import { CartItem, Address } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Trash2, MapPin, CreditCard, Truck, ChevronRight, Clock, X, ShoppingBag, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import LocationPicker from '../components/LocationPicker';

export default function Cart({ cart, addresses, settings, onUpdateCart, onOrderSuccess, onGoToProfile, onUpdateAddresses, onShowToast }: { 
  cart: CartItem[], 
  addresses: Address[], 
  settings?: any,
  onUpdateCart: (cart: CartItem[]) => void,
  onOrderSuccess: () => void,
  onGoToProfile: () => void,
  onUpdateAddresses: (addresses: Address[]) => void,
  onShowToast?: (msg: string, type: 'success' | 'error') => void
}) {
  const [selectedAddress, setSelectedAddress] = useState<number | undefined>(addresses[0]?.id);
  const [paymentMethod, setPaymentMethod] = useState<'cash_at_door' | 'card_at_door'>('cash_at_door');
  const [hasEmptyDamacana, setHasEmptyDamacana] = useState(false);
  const [hasEmptyTup, setHasEmptyTup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Update selected address if addresses load later
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleOrder = async () => {
    if (!selectedAddress) {
      setShowLocationPicker(true);
      return;
    }
    setLoading(true);
    try {
      const address = addresses.find(a => a.id === selectedAddress);
      const itemsText = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
      
      await api.orders.create({
        items: cart.map(item => ({ product_id: item.id, quantity: item.quantity, price: item.price })),
        total_price: total,
        address_id: selectedAddress,
        payment_method: paymentMethod,
        has_empty_damacana: hasEmptyDamacana,
        has_empty_tup: hasEmptyTup
      });

      onUpdateCart([]);
      setShowSuccess(true);
    } catch (e: any) {
      console.error(e);
      onShowToast?.("Sipariş oluşturulurken bir hata oluştu: " + (e.message || "Bilinmeyen hata"), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="relative mb-8">
          <div className="w-48 h-48 bg-blue-50 rounded-full flex items-center justify-center relative overflow-hidden">
            <motion.div 
              initial={{ x: -100 }}
              animate={{ x: 0 }}
              transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              className="text-blue-600"
            >
              <Truck className="w-24 h-24" />
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-sm">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-4 h-4 bg-green-400 rounded-full animate-ping" />
          <div className="absolute bottom-4 left-0 w-3 h-3 bg-pink-400 rounded-full animate-bounce" />
          <div className="absolute top-1/4 left-0 w-2 h-2 bg-blue-400 rounded-full" />
        </div>

        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Teşekkürler</p>
        <h2 className="text-3xl font-black text-blue-900 mb-8">Siparişinizi Aldık</h2>

        <div className="w-full max-w-xs space-y-3">
          <button 
            onClick={onOrderSuccess}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-md shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            Siparişlerime Git <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Trash2 className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Sepetiniz Boş</h3>
        <p className="text-sm font-medium text-center px-12">Henüz sepetinize ürün eklemediniz.</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <h2 className="text-2xl font-bold text-slate-800">Sepetim</h2>

      {/* Cart Items */}
      <div className="space-y-4">
        {cart.map(item => (
          <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-20 h-20 bg-slate-50 rounded-md overflow-hidden">
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
              <p className="text-xs font-bold text-blue-600 mb-2">{item.price.toFixed(2)} ₺</p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => onUpdateCart(cart.map(i => i.id === item.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))}
                  className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-600"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold">{item.quantity}</span>
                <button 
                  onClick={() => onUpdateCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))}
                  className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button 
              onClick={() => onUpdateCart(cart.filter(i => i.id !== item.id))}
              className="p-2 text-red-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Address Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Teslimat Adresi</h3>
        <div className="space-y-3">
          {addresses.map(addr => (
            <button 
              key={addr.id}
              onClick={() => setSelectedAddress(addr.id)}
              className={cn(
                "w-full p-4 rounded-lg border text-left flex items-center gap-4 transition-all",
                selectedAddress === addr.id ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-100"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                selectedAddress === addr.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
              )}>
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{addr.title}</p>
                <p className="text-xs text-slate-400 line-clamp-1">{addr.address_text}</p>
              </div>
              {selectedAddress === addr.id && <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"><ChevronRight className="w-3 h-3 text-white" /></div>}
            </button>
          ))}
          {addresses.length === 0 && (
            <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center">
              <p className="text-sm text-slate-500 mb-4">Henüz kayıtlı bir adresiniz yok.</p>
              <button 
                onClick={() => onGoToProfile()} 
                className="text-blue-600 text-sm font-bold"
              >
                Profil sayfasından adres ekleyin
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Ödeme Yöntemi</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setPaymentMethod('cash_at_door')}
            className={cn(
              "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
              paymentMethod === 'cash_at_door' ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-100"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              paymentMethod === 'cash_at_door' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Kapıda Nakit</span>
          </button>
          <button 
            onClick={() => setPaymentMethod('card_at_door')}
            className={cn(
              "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
              paymentMethod === 'card_at_door' ? "bg-blue-50 border-blue-200 shadow-sm" : "bg-white border-slate-100"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              paymentMethod === 'card_at_door' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Kapıda Kart</span>
          </button>
        </div>
      </div>

      {/* Empty Container Return */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">İade Edilecek Boş Kap</h3>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setHasEmptyDamacana(!hasEmptyDamacana)}
            className={cn(
              "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
              hasEmptyDamacana ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-slate-100"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              hasEmptyDamacana ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Boş Damacana Var</span>
          </button>
          <button 
            onClick={() => setHasEmptyTup(!hasEmptyTup)}
            className={cn(
              "p-4 rounded-lg border flex flex-col items-center gap-2 transition-all",
              hasEmptyTup ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-white border-slate-100"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              hasEmptyTup ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400"
            )}>
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">Boş Tüp Var</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 space-y-4">
        <div className="flex justify-between text-sm font-medium text-slate-400">
          <span>Ara Toplam</span>
          <span>{total.toFixed(2)} ₺</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-slate-400">
          <span>Teslimat Ücreti</span>
          <span className="text-green-500 font-bold">ÜCRETSİZ</span>
        </div>
        <div className="h-px bg-slate-100" />
        <div className="flex justify-between text-lg font-bold text-slate-800">
          <span>Toplam</span>
          <span>{total.toFixed(2)} ₺</span>
        </div>
        <button 
          onClick={handleOrder}
          disabled={loading}
          className="w-full py-4 bg-blue-600 text-white font-bold rounded-md shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? "Sipariş Alınıyor..." : "Siparişi Tamamla"}
        </button>
      </div>
      
      <AnimatePresence>
        {showLocationPicker && (
          <LocationPicker 
            onClose={() => setShowLocationPicker(false)}
            onSelect={(newAddr) => {
              api.addresses.list()
                .then(onUpdateAddresses)
                .catch(err => console.error("Failed to update addresses in cart:", err));
              setSelectedAddress(newAddr.id);
              setShowLocationPicker(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
