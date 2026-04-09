import React, { useState, useEffect, useCallback } from 'react';
import { User, Product, Order, Address, CartItem } from './types';
import { api } from './lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  ShoppingCart, 
  ClipboardList, 
  User as UserIcon, 
  Truck, 
  LayoutDashboard, 
  LogOut,
  Plus,
  Minus,
  MapPin,
  ChevronRight,
  Bell,
  Search,
  Phone,
  Headset,
  Flame,
  Check,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { cn } from './lib/utils';
import Tracking from './views/Tracking';
import CustomerHome from './views/CustomerHome';
import CourierHome from './views/CourierHome';
import AdminHome from './views/AdminHome';
import Auth from './views/Auth';
import Cart from './views/Cart';
import Orders from './views/Orders';
import Profile from './views/Profile';
import PWAInstallPrompt from './components/PWAInstallPrompt';

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
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-md shadow-2xl flex items-center gap-3 min-w-[300px]",
        type === 'success' ? "bg-green-500 text-white" : "bg-red-500 text-white"
      )}
    >
      {type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
      <span className="text-sm font-bold">{message}</span>
    </motion.div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
      return null;
    }
  });
  const [view, setView] = useState<'home' | 'cart' | 'orders' | 'profile' | 'admin' | 'courier' | 'tracking'>(() => {
    try {
      const savedView = localStorage.getItem('currentView');
      if (savedView) return savedView as any;
      
      const saved = localStorage.getItem('user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'courier') return 'courier';
        if (u.role === 'admin' || u.role === 'super_admin') return 'admin';
      }
    } catch (e) {
      console.error("Failed to parse initial view state", e);
    }
    return 'home';
  });

  useEffect(() => {
    localStorage.setItem('currentView', view);
  }, [view]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const [showAuth, setShowAuth] = useState(false);

  const handleRepeatOrder = async () => {
    protectedAction(async () => {
      try {
        const orders = await api.orders.list();
        if (orders.length === 0) {
          showToast("Tekrarlanacak sipariş bulunamadı", "error");
          return;
        }
        
        const lastOrder = [...orders].sort((a, b) => b.id - a.id)[0];
        const details = await api.orders.get(lastOrder.id);
        
        if (!details.items || details.items.length === 0) {
          showToast("Sipariş içeriği boş", "error");
          return;
        }

        const newCartItems: CartItem[] = [];
        for (const item of details.items) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            newCartItems.push({
              ...product,
              quantity: item.quantity
            });
          }
        }

        if (newCartItems.length === 0) {
          showToast("Sipariş içeriğindeki ürünler artık mevcut değil", "error");
          return;
        }

        setCart(newCartItems);
        setView('cart');
        showToast("Sipariş sepete eklendi", "success");
      } catch (e) {
        console.error("Repeat order failed:", e);
        showToast("Sipariş tekrarlanamadı", "error");
      }
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (currentUser?: User | null) => {
    const activeUser = currentUser !== undefined ? currentUser : user;
    try {
      const [p, s] = await Promise.all([
        api.products.list(),
        api.admin.getSettings()
      ]);
      setProducts(p);
      setSettings(s);
      if (activeUser) {
        const a = await api.addresses.list();
        setAddresses(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (u: User, token: string) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', token);
    setShowAuth(false);
    loadData(u);
    if (u.role === 'courier') setView('courier');
    else if (u.role === 'admin' || u.role === 'super_admin') setView('admin');
    else setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedAddressId');
    setAddresses([]);
    setView('home');
  };

  const protectedAction = (action: () => void) => {
    if (!user) {
      setShowAuth(true);
    } else {
      action();
    }
  };

  const addToCart = (product: Product) => {
    protectedAction(() => {
      setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1 }];
      });
      showToast("Ürün sepetinize eklendi", "success");
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-x-hidden font-sans">
      <PWAInstallPrompt />
      <AnimatePresence>
        {showAuth && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <Auth onLogin={handleLogin} onClose={() => setShowAuth(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white sticky top-0 z-10 shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              {settings?.logo_url ? (
                <img src={settings.logo_url} className="w-full h-full object-contain" />
              ) : (
                <Truck className="text-blue-600 w-10 h-10" />
              )}
            </div>
            <h1 className="text-xl sm:text-[35px] font-bold text-slate-800 tracking-tight uppercase font-outfit leading-none">
              {settings?.app_name || 'kardelen'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
              <Headset className="w-6 h-6" />
            </button>
            {user && (
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* System Closed Banner */}
      {settings && settings.is_open === 0 && (
        <div className="bg-red-500 text-white px-6 py-3 text-center text-sm font-bold shadow-md animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <X className="w-5 h-5" />
            <span>Sistem şu anda kapalıdır. Yeni sipariş alınamamaktadır.</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-6 w-full max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (user?.role !== 'courier') && (
            <CustomerHome 
              products={products} 
              addresses={addresses} 
              onAddToCart={addToCart} 
              onRepeatOrder={handleRepeatOrder} 
              onUpdateAddresses={setAddresses}
            />
          )}
          {view === 'cart' && (
            <Cart 
              cart={cart} 
              addresses={addresses} 
              settings={settings}
              onUpdateCart={setCart} 
              onOrderSuccess={() => setView('orders')} 
              onGoToProfile={() => setView('profile')}
              onUpdateAddresses={setAddresses}
              onShowToast={showToast}
            />
          )}
          {view === 'orders' && user && (
            <Orders user={user} onShowToast={showToast} />
          )}
          {view === 'tracking' && user && (
            <Tracking user={user} />
          )}
          {view === 'profile' && user && (
            <Profile 
              user={user} 
              addresses={addresses} 
              onUpdateAddresses={setAddresses}
              onShowToast={showToast}
            />
          )}
          {view === 'courier' && user?.role === 'courier' && (
            <CourierHome user={user} onShowToast={showToast} />
          )}
          {view === 'admin' && (user?.role === 'admin' || user?.role === 'super_admin') && (
            <AdminHome user={user} onUpdateSettings={loadData} onShowToast={showToast} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 z-20 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex justify-around items-center">
          {!user || user.role === 'customer' ? (
            <>
              <NavButton active={view === 'home'} icon={<Home className="w-7 h-7" />} label="Ana Sayfa" onClick={() => setView('home')} />
              <NavButton active={view === 'orders'} icon={<ClipboardList className="w-7 h-7" />} label="Siparişler" onClick={() => protectedAction(() => setView('orders'))} />
              <div className="relative -top-10">
                <button 
                  onClick={() => setView('cart')}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all",
                    view === 'cart' ? "bg-blue-600 text-white scale-110 shadow-blue-200" : "bg-white text-blue-600"
                  )}
                >
                  <Flame className={cn("w-14 h-14", view === 'cart' ? "fill-white" : "fill-blue-600")} />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
              <NavButton active={view === 'tracking'} icon={<Truck className="w-7 h-7" />} label="Takip" onClick={() => protectedAction(() => setView('tracking'))} />
              <NavButton active={view === 'profile'} icon={<UserIcon className="w-7 h-7" />} label={user ? "Profil" : "Giriş"} onClick={() => protectedAction(() => setView('profile'))} />
            </>
          ) : user.role === 'courier' ? (
            <>
              <NavButton active={view === 'courier'} icon={<Truck className="w-7 h-7" />} label="Görevler" onClick={() => setView('courier')} />
              <NavButton active={view === 'orders'} icon={<ClipboardList className="w-7 h-7" />} label="Geçmiş" onClick={() => setView('orders')} />
              <NavButton active={view === 'profile'} icon={<UserIcon className="w-7 h-7" />} label="Profil" onClick={() => setView('profile')} />
            </>
          ) : (
            <>
              <NavButton active={view === 'home'} icon={<Home className="w-7 h-7" />} label="Ana Sayfa" onClick={() => setView('home')} />
              <NavButton active={view === 'admin'} icon={<LayoutDashboard className="w-7 h-7" />} label="Panel" onClick={() => setView('admin')} />
              <div className="relative -top-10">
                <button 
                  onClick={() => setView('cart')}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all",
                    view === 'cart' ? "bg-blue-600 text-white scale-110 shadow-blue-200" : "bg-white text-blue-600"
                  )}
                >
                  <Flame className={cn("w-14 h-14", view === 'cart' ? "fill-white" : "fill-blue-600")} />
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
              <NavButton active={view === 'orders'} icon={<ClipboardList className="w-7 h-7" />} label="Siparişler" onClick={() => setView('orders')} />
              <NavButton active={view === 'profile'} icon={<UserIcon className="w-7 h-7" />} label="Profil" onClick={() => setView('profile')} />
            </>
          )}
        </div>
      </nav>

      <AnimatePresence>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-blue-600" : "text-slate-400"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
