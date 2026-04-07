import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Truck, MapPin, Phone, MessageSquare, ChevronRight } from 'lucide-react';
import { User, Order } from '../types';
import { api } from '../lib/api';

// Fix for default marker icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Tracking({ user }: { user: User }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number }>({ lat: 36.6888, lng: 34.4258 }); // Mersin / Erdemli / Çeşmeli default

  useEffect(() => {
    loadOrders();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object' && data.type === 'courier_location' && selectedOrder?.courier_id === data.courierId) {
          setLocation({ lat: data.lat, lng: data.lng });
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message", e);
      }
    };
    return () => ws.close();
  }, [selectedOrder?.id]);

  const loadOrders = async () => {
    try {
      const allOrders = await api.orders.list();
      const active = allOrders.filter(o => ['pending', 'preparing', 'on_the_way'].includes(o.status));
      setOrders(active);
      if (active.length > 0 && !selectedOrder) {
        setSelectedOrder(active[0]);
      }
    } catch (e) {
      console.error("Failed to load orders for tracking:", e);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <Truck className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800">Aktif Siparişiniz Yok</h3>
        <p className="text-sm text-slate-400 font-medium max-w-[240px]">Şu anda takip edilebilecek aktif bir siparişiniz bulunmamaktadır.</p>
      </div>
    );
  }

  const destination: [number, number] | null = selectedOrder?.lat && selectedOrder?.lng 
    ? [selectedOrder.lat, selectedOrder.lng] 
    : null;

  return (
    <div className="space-y-6 -mx-6 -mt-6">
      <div className="h-[40vh] relative">
        <MapContainer 
          center={destination || [location.lat, location.lng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker position={[location.lat, location.lng]}>
            <Popup>Kurye Burada!</Popup>
          </Marker>
          {destination && (
            <Marker 
              position={destination}
              icon={L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })}
            >
              <Popup>Teslimat Adresi</Popup>
            </Marker>
          )}
        </MapContainer>
        <div className="absolute top-4 left-4 right-4 z-[1000]">
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-md shadow-lg border border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center text-white">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sipariş Durumu</p>
                <p className="text-sm font-black text-slate-800 uppercase">
                  {selectedOrder?.status === 'on_the_way' ? 'Kurye Yolda' : 'Hazırlanıyor'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tahmini Varış</p>
              <p className="text-sm font-black text-blue-600">12-15 dk</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Order Details */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded-md flex items-center justify-center text-slate-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Teslimat Adresi</h4>
                <p className="text-xs text-slate-400 font-medium line-clamp-1">{selectedOrder?.address_text}</p>
              </div>
            </div>
            <ChevronRight className="text-slate-300 w-5 h-5" />
          </div>

          <div className="h-px bg-slate-50" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-md flex items-center justify-center text-blue-600">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Kurye: Ahmet Y.</h4>
                <p className="text-xs text-slate-400 font-medium">4.8 ★ (120+ Sipariş)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-3 bg-slate-50 text-slate-400 rounded">
                <MessageSquare className="w-5 h-5" />
              </button>
              <button className="p-3 bg-green-50 text-green-600 rounded">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Other Active Orders */}
        {orders.length > 1 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Diğer Aktif Siparişler</h3>
            <div className="space-y-3">
              {orders.filter(o => o.id !== selectedOrder?.id).map(o => (
                <button 
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className="w-full bg-white p-4 rounded-md border border-slate-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 rounded flex items-center justify-center text-slate-400">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800">Sipariş #{o.id}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">{o.status}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-300 w-5 h-5" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
