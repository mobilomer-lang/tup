import React, { useState, useEffect } from 'react';
import { Address } from '../types';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, X, Locate, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icon issue
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function LocationPicker({ onClose, onSelect }: { onClose: () => void, onSelect: (address: Address) => void }) {
  const [addressText, setAddressText] = useState('');
  const [position, setPosition] = useState<[number, number]>([36.6888, 34.4258]); // Mersin Erdemli Çeşmeli default
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleGeocode = async () => {
    if (!addressText) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressText)}`);
      if (!res.ok) throw new Error("Geocoding failed");
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setPosition([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (e) {
      console.error("Geocoding error:", e);
    } finally {
      setSearching(false);
    }
  };

  const handleReverseGeocode = async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      if (data && data.display_name) {
        setAddressText(data.display_name);
      }
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const newAddress = await api.addresses.create({
        title: 'Konum',
        address_text: addressText,
        lat: position[0],
        lng: position[1]
      });
      setShowSuccess(true);
      setTimeout(() => {
        onSelect(newAddress);
      }, 2000);
    } catch (e: any) {
      console.error("Address creation error:", e);
      alert("Adres kaydedilirken bir hata oluştu: " + (e.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setPosition([latitude, longitude]);
          handleReverseGeocode(latitude, longitude);
        },
        (err) => {
          console.error("Geolocation error:", err);
          alert("Konumunuz alınamadı. Lütfen tarayıcı izinlerini kontrol edin.");
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between relative">
          <h3 className="text-xl font-bold text-slate-800">Adres Seç</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
          
          <AnimatePresence>
            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute inset-x-6 top-full mt-2 z-[100] bg-green-500 text-white p-4 rounded-2xl flex items-center gap-3 shadow-2xl border-2 border-white/20"
              >
                <CheckCircle className="w-6 h-6" />
                <p className="text-sm font-bold">Konumunuz başarı ile kaydedildi</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto relative no-scrollbar">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              onBlur={handleGeocode}
              placeholder="Adresinizi yazın veya haritadan seçin"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
            {searching && <div className="absolute right-3 top-3.5 w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </div>

          <div className="h-64 rounded-2xl overflow-hidden border border-slate-100 relative">
            <MapContainer center={position} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer 
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              />
              <Marker position={position} />
              <MapEvents onLocationSelect={(lat, lng) => {
                setPosition([lat, lng]);
                handleReverseGeocode(lat, lng);
              }} />
              <ChangeView center={position} />
            </MapContainer>
            <button 
              onClick={getCurrentLocation}
              className="absolute bottom-4 right-4 z-[1000] p-3 bg-white rounded-full shadow-lg text-blue-600 hover:bg-slate-50 transition-colors"
            >
              <Locate className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3">
            <MapPin className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-blue-900 leading-relaxed">
              {loading ? 'Adres belirleniyor...' : addressText || 'Haritadan bir nokta seçin'}
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-50">
          <button 
            onClick={handleSave}
            disabled={!addressText || loading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Bu Konumu Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
}
