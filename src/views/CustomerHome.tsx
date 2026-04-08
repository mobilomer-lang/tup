import React, { useState, useEffect, useRef } from 'react';
import { Product, Address, Campaign } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, ChevronRight, Plus, ShoppingCart, Star, Clock, X, Navigation, Locate, CheckCircle, Phone } from 'lucide-react';
import { cn } from '../lib/utils';
import LocationPicker from '../components/LocationPicker';

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const expiryDate = new Date(expiresAt);
      if (isNaN(expiryDate.getTime())) {
        clearInterval(timer);
        setTimeLeft(null);
        return;
      }
      
      const now = new Date().getTime();
      const distance = expiryDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft(null);
      } else {
        setTimeLeft({
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-white">
      <Clock className="w-3 h-3" />
      <span>{String(timeLeft.h).padStart(2, '0')}:{String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}</span>
    </div>
  );
}

export default function CustomerHome({ products, addresses, onAddToCart, onRepeatOrder, onUpdateAddresses }: { 
  products: Product[], 
  addresses: Address[], 
  onAddToCart: (p: Product) => void,
  onRepeatOrder: () => void,
  onUpdateAddresses: (addresses: Address[]) => void
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.campaigns.list()
      .then(setCampaigns)
      .catch(err => console.error("Failed to load campaigns:", err));
    api.admin.getSettings()
      .then(setSettings)
      .catch(err => console.error("Failed to load settings:", err));
    
    // Load persisted address
    const savedAddressId = localStorage.getItem('selectedAddressId');
    if (savedAddressId && addresses.length > 0) {
      const found = addresses.find(a => a.id === parseInt(savedAddressId));
      if (found) setSelectedAddress(found);
    }
  }, [addresses]);

  // Automatic banner rotation
  useEffect(() => {
    if (campaigns.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveBanner(prev => {
        const next = (prev + 1) % campaigns.length;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: next * scrollRef.current.offsetWidth,
            behavior: 'smooth'
          });
        }
        return next;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns.length]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const index = Math.round(scrollRef.current.scrollLeft / scrollRef.current.offsetWidth);
      setActiveBanner(index);
    }
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    if (address?.id) {
      localStorage.setItem('selectedAddressId', address.id.toString());
    }
    setShowLocationPicker(false);
    
    // Update global addresses state
    api.addresses.list()
      .then(onUpdateAddresses)
      .catch(err => console.error("Failed to update addresses:", err));
  };

  const displayAddress = selectedAddress || (addresses.length > 0 ? addresses[0] : null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 -mx-6 -mt-6"
    >
      {/* Address Selector */}
      <div className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="max-w-[180px]">
            <p className="text-[11px] text-slate-800 font-bold leading-tight line-clamp-1">
              {displayAddress ? displayAddress.address_text : 'Konum seçilmedi'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Teslimat adresiniz.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowLocationPicker(true)}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded"
        >
          Değiştir
        </button>
      </div>

      <AnimatePresence>
        {showLocationPicker && (
          <LocationPicker 
            onClose={() => setShowLocationPicker(false)} 
            onSelect={handleAddressSelect} 
          />
        )}
      </AnimatePresence>

      <div className="px-4 space-y-4">
        {/* Campaign Slider */}
        <div className="relative group">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 pb-2"
          >
            {campaigns.map((campaign, idx) => (
              <div 
                key={campaign.id}
                className="min-w-full snap-center"
              >
                <div className={cn(
                  "relative h-48 sm:aspect-[3/1] sm:h-auto rounded-sm overflow-hidden shadow-lg border border-white/20",
                  campaign.gradient || "bg-slate-900"
                )}>
                  {campaign.image_url && (
                    <img 
                      src={campaign.image_url} 
                      alt={campaign.title} 
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover sm:object-contain z-0"
                    />
                  )}
                  <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/20 to-transparent z-10">
                    <div className="flex items-center justify-between mb-2">
                      {campaign.badge && (
                        <div className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-2 py-1 rounded border border-white/30">
                          {campaign.badge}
                        </div>
                      )}
                      {campaign.type === 'limited' && (
                        <div className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                          Sınırlı Süre
                        </div>
                      )}
                    </div>
                    
                    <h3 
                      className="text-xl sm:text-2xl font-black text-white leading-none tracking-tighter mb-1 sm:mb-2 uppercase"
                      style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }}
                    >
                      {campaign.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-bold text-white/90 leading-tight max-w-[180px] sm:max-w-[200px]">
                      {campaign.description}
                    </p>

                    <div className="mt-2 sm:mt-4 flex items-center justify-between">
                      {campaign.expires_at && <CountdownTimer expiresAt={campaign.expires_at} />}
                      <button className="bg-white text-blue-900 text-[9px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm">
                        İNCELE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Dots */}
          {campaigns.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {campaigns.map((_, i) => (
                <div 
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    activeBanner === i ? "bg-white w-4" : "bg-white/40"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Action Button: Repeat Order */}
        <button 
          onClick={onRepeatOrder}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded text-white shadow-md flex items-center justify-center gap-2"
        >
          <span className="text-base font-bold">Son Siparişimi Tekrarla</span>
        </button>

        {/* Secondary Actions */}
        <div className="w-full">
          <a 
            href={`tel:${(settings?.contact_phone || '444 42 44').replace(/\s/g, '')}`}
            className="w-full bg-white py-3 rounded-sm border border-slate-200 shadow-sm text-blue-900 font-black text-[21px] flex items-center justify-center gap-3 hover:bg-slate-50 transition-colors"
          >
            <span className="text-xs font-bold text-blue-950 uppercase tracking-wider [text-shadow:1px_1px_2px_rgba(0,0,0,0.3)]">Müşteri Hizmetleri</span>
            <div className="flex items-center gap-2">
              <Phone className="w-6 h-6 text-green-500 fill-green-500" />
              {settings?.contact_phone || '444 42 44'}
            </div>
          </a>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map(product => (
            <motion.div 
              key={product.id}
              whileTap={{ scale: 0.98 }}
              className="group bg-white p-3 rounded-md shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-md transition-all"
            >
              <div className="w-full aspect-square mb-3 flex items-center justify-center bg-slate-50 rounded-md overflow-hidden p-2 sm:p-4 group-hover:bg-slate-100 transition-colors">
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <h4 className="text-[11px] font-bold text-slate-800 mb-0.5">{product.name}</h4>
              <p className="text-[13px] font-black text-blue-900 mb-2">{product.price.toFixed(2)} ₺</p>
              <button 
                onClick={() => onAddToCart(product)}
                className="w-full py-1.5 bg-blue-600 text-white text-[11px] font-black rounded-md shadow-sm hover:bg-blue-700 transition-all uppercase"
              >
                Sepete Ekle
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
