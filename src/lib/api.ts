import { User, Product, Order, Address, Role, Campaign } from "../types";

const API_BASE = "/api";

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let error = "An error occurred";
    try {
      const data = await res.json();
      error = data.error || error;
    } catch (e) {
      // If not JSON, use status text
      error = await res.text() || res.statusText;
    }
    throw new Error(error);
  }
  return res.json();
};

export const api = {
  auth: {
    login: async (data: any) => {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    register: async (data: any) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    changePassword: async (data: any) => {
      const res = await fetch(`${API_BASE}/user/change-password`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  products: {
    list: async (): Promise<Product[]> => {
      const res = await fetch(`${API_BASE}/products`, { headers: getHeaders() });
      return handleResponse(res);
    },
    adminList: async (): Promise<Product[]> => {
      const res = await fetch(`${API_BASE}/admin/products`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: Partial<Product>) => {
      const res = await fetch(`${API_BASE}/admin/products`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: number, data: Partial<Product>) => {
      const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/products/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getMovements: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/products/${id}/movements`, { headers: getHeaders() });
      return handleResponse(res);
    },
    adjustStock: async (id: number, data: { quantity: number, type: string, description?: string }) => {
      const res = await fetch(`${API_BASE}/admin/products/${id}/stock`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  deposits: {
    list: async (): Promise<{ category: string, count: number }[]> => {
      const res = await fetch(`${API_BASE}/user/deposits`, { headers: getHeaders() });
      return handleResponse(res);
    },
    adminGetUserDeposits: async (userId: number): Promise<{ balances: { category: string, count: number }[], movements: any[] }> => {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/deposits`, { headers: getHeaders() });
      return handleResponse(res);
    },
    adminAdjust: async (userId: number, data: { category: string, quantity: number, type: string, description?: string }) => {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/deposits`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
  campaigns: {
    list: async (): Promise<Campaign[]> => {
      const res = await fetch(`${API_BASE}/campaigns`);
      return handleResponse(res);
    },
    adminList: async (): Promise<Campaign[]> => {
      const res = await fetch(`${API_BASE}/admin/campaigns`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: Partial<Campaign>) => {
      const res = await fetch(`${API_BASE}/admin/campaigns`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    update: async (id: number, data: Partial<Campaign>) => {
      const res = await fetch(`${API_BASE}/admin/campaigns/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/campaigns/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    upload: async (file: File): Promise<{ imageUrl: string }> => {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      return handleResponse(res);
    },
  },
  orders: {
    list: async (): Promise<Order[]> => {
      const res = await fetch(`${API_BASE}/orders`, { headers: getHeaders() });
      return handleResponse(res);
    },
    get: async (id: number): Promise<Order & { items: any[], customer_phone?: string }> => {
      const res = await fetch(`${API_BASE}/orders/${id}`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateStatus: async (id: number, status: string, courier_id?: number, payment_method?: string, other?: any) => {
      const res = await fetch(`${API_BASE}/orders/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status, courier_id, payment_method, ...other }),
      });
      return handleResponse(res);
    },
  },
  addresses: {
    list: async (): Promise<Address[]> => {
      const res = await fetch(`${API_BASE}/addresses`, { headers: getHeaders() });
      return handleResponse(res);
    },
    create: async (data: any) => {
      const res = await fetch(`${API_BASE}/addresses`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    delete: async (id: number) => {
      const res = await fetch(`${API_BASE}/addresses/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
  },
  admin: {
    getStats: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
      return handleResponse(res);
    },
    getUsers: async () => {
      const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
      return handleResponse(res);
    },
    updateUser: async (id: number, data: any) => {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    getCouriers: async () => {
      const res = await fetch(`${API_BASE}/admin/couriers`, { headers: getHeaders() });
      return handleResponse(res);
    },
    createCourier: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/couriers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    updateCourier: async (id: number, data: any) => {
      const res = await fetch(`${API_BASE}/admin/couriers/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    deleteUser: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/users/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    deleteCourier: async (id: number) => {
      const res = await fetch(`${API_BASE}/admin/couriers/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      return handleResponse(res);
    },
    getSettings: async () => {
      const res = await fetch(`${API_BASE}/settings`);
      return handleResponse(res);
    },
    updateSettings: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
    createManualOrder: async (data: any) => {
      const res = await fetch(`${API_BASE}/admin/orders/manual`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      return handleResponse(res);
    },
  },
};
