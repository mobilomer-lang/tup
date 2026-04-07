import { User, Address } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, MapPin, Phone, Mail, Plus, Trash2, ChevronRight, Settings, ShieldCheck, Bell, ShoppingBag, Package, X } from 'lucide-react';
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

export default function Profile({ user, addresses, onUpdateAddresses, onShowToast }: { 
  user: User, 
  addresses: Address[], 
  onUpdateAddresses: (addr: Address[]) => void,
  onShowToast?: (msg: string, type: 'success' | 'error') => void
}) {
  const [showAddAddress, setShowAddAddress] = useState(addresses.length === 0);
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCoords, setNewCoords] = useState<[number, number] | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [deposits, setDeposits] = useState<{ category: string, count: number }[]>([]);

  React.useEffect(() => {
    api.deposits.list().then(setDeposits).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (newCoords) {
      handleReverseGeocode(newCoords[0], newCoords[1]);
    }
  }, [newCoords]);

  const handleReverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      if (data && data.display_name) {
        setNewAddress(data.display_name);
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addresses.create({ 
        title: newTitle, 
        address_text: newAddress,
        lat: newCoords ? newCoords[0] : undefined,
        lng: newCoords ? newCoords[1] : undefined
      });
      const updated = await api.addresses.list();
      onUpdateAddresses(updated);
      setShowAddAddress(false);
      setNewTitle('');
      setNewAddress('');
      setNewCoords(null);
      onShowToast?.('Adres başarıyla eklendi', 'success');
    } catch (e) {
      console.error(e);
      onShowToast?.('Adres eklenirken bir hata oluştu', 'error');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    try {
      await api.addresses.delete(id);
      const updated = await api.addresses.list();
      onUpdateAddresses(updated);
      onShowToast?.('Adres başarıyla silindi', 'success');
    } catch (e) {
      console.error(e);
      onShowToast?.('Adres silinirken bir hata oluştu', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Profilim</h2>
        <button className="p-2 bg-slate-100 text-slate-600 rounded">
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white p-8 rounded-md shadow-sm border border-slate-100 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-blue-50 rounded-md flex items-center justify-center text-blue-600 mb-6 relative">
          <UserIcon className="w-12 h-12" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{user.name}</h3>
        <p className="text-sm font-medium text-slate-400 mb-6 capitalize">{user.role.replace('_', ' ')}</p>
        
        <div className="w-full grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-4 rounded-lg text-left">
            <Mail className="w-4 h-4 text-blue-600 mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">E-posta</p>
            <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-left">
            <Phone className="w-4 h-4 text-blue-600 mb-2" />
            <p className="text-[10px] text-slate-400 font-bold uppercase">Telefon</p>
            <p className="text-xs font-bold text-slate-800">{user.phone || 'Eklenmemiş'}</p>
          </div>
        </div>
      </div>

      {/* Deposits */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800">Depozitolarım</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center text-blue-600 mb-3">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Damacana</p>
            <p className="text-2xl font-black text-slate-800">
              {deposits.find(d => d.category === 'damacana')?.count || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-100 shadow-sm flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-md flex items-center justify-center text-amber-600 mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Tüp</p>
            <p className="text-2xl font-black text-slate-800">
              {deposits.find(d => d.category === 'tup')?.count || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Addresses */}
      {user.role !== 'courier' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Adreslerim</h3>
            <button 
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="p-2 bg-blue-50 text-blue-600 rounded"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showAddAddress && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleAddAddress}
              className="bg-white p-6 rounded-lg border border-blue-100 shadow-sm space-y-4"
            >
              <input 
                type="text" 
                placeholder="Adres Başlığı (örn: Ev, İş)" 
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <textarea 
                placeholder={loadingAddress ? "Adres alınıyor..." : "Tam Adres"} 
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none text-sm"
                required
                disabled={loadingAddress}
              />
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Haritadan Konum Seç (Opsiyonel)</p>
                <div className="h-48 rounded-md overflow-hidden border border-slate-100 relative">
                  <MapContainer 
                    center={[36.6888, 34.4258]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer 
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    />
                    <LocationMarker position={newCoords} setPosition={setNewCoords} />
                  </MapContainer>
                  {newCoords && (
                    <button 
                      type="button"
                      onClick={() => setNewCoords(null)}
                      className="absolute top-2 right-2 z-[1000] p-1.5 bg-white/80 backdrop-blur-sm text-red-500 rounded-lg shadow-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {newCoords && (
                  <p className="text-[10px] text-blue-600 font-bold px-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Konum seçildi: {newCoords[0].toFixed(4)}, {newCoords[1].toFixed(4)}
                  </p>
                )}
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded shadow-lg">
                Adresi Kaydet
              </button>
            </motion.form>
          )}

          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className="bg-white p-4 rounded-lg border border-slate-100 flex items-center gap-4 group">
                <div className="w-12 h-12 bg-slate-50 rounded-md flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-800">{addr.title}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{addr.address_text}</p>
                </div>
                <button 
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {addresses.length === 0 && !showAddAddress && (
              <p className="text-center text-sm text-slate-400 py-4">Henüz kayıtlı adresiniz yok.</p>
            )}
          </div>
        </div>
      )}

      {/* Settings List */}
      <div className="bg-white rounded-md shadow-sm border border-slate-100 overflow-hidden">
        <SettingItem icon={<Bell className="w-5 h-5" />} label="Bildirim Ayarları" />
        <SettingItem icon={<ShieldCheck className="w-5 h-5" />} label="Güvenlik ve Şifre" />
        <SettingItem icon={<Phone className="w-5 h-5" />} label="Yardım ve Destek" />
      </div>
    </motion.div>
  );
}

function SettingItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-800">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300" />
    </button>
  );
}
