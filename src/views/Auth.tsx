import React, { useState } from 'react';
import { api } from '../lib/api';
import { User } from '../types';
import { motion } from 'motion/react';
import { Mail, Lock, User as UserIcon, Phone, Truck, X } from 'lucide-react';

export default function Auth({ onLogin, onClose }: { onLogin: (user: User, token: string) => void, onClose?: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

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
    <div className="min-h-screen bg-blue-600/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white relative">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-4">
            <Truck className="text-blue-600 w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold">Su & Tüp</h1>
          <p className="text-blue-100">Hızlı ve güvenilir teslimat</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-2xl text-slate-800">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </h2>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          {!isLogin && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-600 mb-1">Ad Soyad</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ad Soyad"
                  required
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Telefon</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="05000000000"
                required
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-600 mb-1">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-colors mb-4"
          >
            {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>

          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-slate-500 text-sm font-medium"
          >
            {isLogin ? 'Hesabınız yok mu? Kayıt Ol' : 'Zaten hesabınız var mı? Giriş Yap'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
