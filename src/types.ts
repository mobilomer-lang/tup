export type Role = 'customer' | 'courier' | 'admin' | 'super_admin';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  phone?: string;
}

export interface Product {
  id: number;
  name: string;
  category: 'water' | 'gas' | 'pet';
  price: number;
  stock: number;
  image_url: string;
  description: string;
  is_active?: number;
}

export interface Address {
  id: number;
  user_id: number;
  title: string;
  address_text: string;
  lat?: number;
  lng?: number;
}

export interface Campaign {
  id: number;
  title: string;
  description: string;
  image_url: string;
  gradient: string;
  is_active: number;
  sort_order: number;
  expires_at: string;
  badge: string;
  type: 'general' | 'loyalty' | 'limited';
}

export interface Order {
  id: number;
  user_id: number;
  courier_id?: number;
  status: 'pending' | 'accepted' | 'on_the_way' | 'delivered' | 'cancelled';
  total_price: number;
  payment_method: string;
  address_id: number;
  created_at: string;
  customer_name?: string;
  address_text?: string;
  lat?: number;
  lng?: number;
  has_empty_damacana?: number;
  has_empty_tup?: number;
  items?: any[];
  customer_phone?: string;
}

export interface CartItem extends Product {
  quantity: number;
}
