import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, Phone, Truck, X, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth({ onLogin, onClose, settings: initialSettings }: { onLogin: (user: User, token: string) => void, onClose?: () => void, settings?: any }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    if (!settings) {
      api.admin.getSettings().then(setSettings).catch(console.error);
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const res = await api.auth.login({ phone, password });
        onLogin(res.user, res.token);
      } else {
        const res = await api.auth.register({ name, phone, password });
        onLogin(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-start sm:items-center justify-center relative overflow-y-auto font-sans py-4 sm:py-20">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
          alt="Corporate Background"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-blue-900/80 backdrop-blur-[2px]"></div>
      </div>

      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all border border-white/10"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[440px] z-10 p-6"
      >
        <div className="flex flex-col items-center mb-4 sm:mb-8">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-lg flex items-center justify-center shadow-2xl mb-4 sm:mb-6 p-4 border-4 border-white/20"
          >
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Truck className="text-blue-600 w-12 h-12" />
            )}
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase mb-1 sm:mb-2 drop-shadow-lg">
            {settings?.app_name || 'KARDELEN'}
          </h1>
          <p className="text-blue-100/80 font-medium tracking-wide text-sm uppercase">
            Kurumsal Çözümler & Güvenilir Hizmet
          </p>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white/95 backdrop-blur-xl rounded-lg p-6 sm:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_40px_rgba(37,99,235,0.15)] border border-white/40 ring-1 ring-black/5"
        >
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Hoş Geldiniz' : 'Aramıza Katılın'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              {isLogin ? 'Devam etmek için lütfen giriş yapın.' : 'Yeni bir hesap oluşturarak başlayın.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-sm border border-red-100 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                {error}
              </motion.div>
            )}

            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Ad Soyad</label>
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-medium"
                    placeholder="Ad Soyad"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Telefon Numarası</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-medium"
                  placeholder="05XX XXX XX XX"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Şifre</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-slate-800 font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 bg-blue-700 text-white font-bold rounded-sm shadow-lg hover:bg-blue-800 transition-all flex items-center justify-center gap-3 group mt-4 uppercase tracking-widest text-sm border-b-4 border-blue-900 active:border-b-0 active:translate-y-1"
            >
              <span>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="pt-2 text-center">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-slate-500 text-sm font-bold hover:text-blue-600 transition-colors"
              >
                {isLogin ? (
                  <>Henüz hesabınız yok mu? <span className="text-blue-600">Kayıt Ol</span></>
                ) : (
                  <>Zaten hesabınız var mı? <span className="text-blue-600">Giriş Yap</span></>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
