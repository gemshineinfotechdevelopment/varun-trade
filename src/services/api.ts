/**
 * Centralized API Service for Crackers Shop Billing Application with Separate Price Lists
 */

const getApiBaseUrl = (): string => {
  const rawUrl = (
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (rawUrl) {
    const sanitized = rawUrl.replace(/\/+$/, '');
    return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:5004/api';
  }

  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export type PriceListType = '90_PERCENT' | 'CUSTOM';

export interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
  error?: string;
  message?: string;
}

export interface PriceListItem {
  _id?: string;
  id?: string;
  slNo?: number;
  sku: string;
  productName: string;
  itemName?: string;
  category: string;
  priceListType: PriceListType;
  rate: number; // Rate / MRP
  discountPercentage: number;
  discountAmount: number;
  netRate: number; // Selling Net Rate
  quantity: number; // Count / Quantity
  unit: string; // Per / PCS
  stock?: number;
  active: boolean;
  batchName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomDiscountItem {
  _id?: string;
  id?: string;
  percentage: number;
  label?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface SalesSummaryData {
  totalBills: number;
  totalSales: number;
  totalDiscountGiven: number;
  ninetyMode: {
    billsCount: number;
    totalSales: number;
  };
  customMode: {
    billsCount: number;
    totalSales: number;
    breakdown: Record<string, { count: number; total: number }>;
  };
}

// Generic Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const token = typeof window !== 'undefined' ? localStorage.getItem('dheeksha_auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let json: any = {};
    const text = await response.text();
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: text };
      }
    }

    if (!response.ok) {
      throw new Error(json.error || json.message || `HTTP error! Status: ${response.status}`);
    }

    return json.data !== undefined ? json.data : json;
  } catch (error) {
    console.error(`[API Error] Request to ${endpoint} failed:`, error);
    throw error;
  }
}

// Customers API
export const CustomersApi = {
  getAll: () => request<any[]>('/customers'),
  getById: (id: string) => request<any>(`/customers/${id}`),
  create: (data: any) => request<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/customers/${id}`, { method: 'DELETE' }),
};

// Companies API
export const CompaniesApi = {
  getAll: () => request<any[]>('/companies'),
  getById: (id: string) => request<any>(`/companies/${id}`),
  create: (data: any) => request<any>('/companies', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/companies/${id}`, { method: 'DELETE' }),
};

// Products Catalog API (Master inventory items)
export const ProductsApi = {
  getAll: () => request<any[]>('/products'),
  getById: (id: string) => request<any>(`/products/${id}`),
  create: (data: any) => request<any>('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/products/${id}`, { method: 'DELETE' }),
};

// Categories API
export const CategoriesApi = {
  getAll: () => request<any[]>('/categories'),
  getById: (id: string) => request<any>(`/categories/${id}`),
  create: (data: any) => request<any>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/categories/${id}`, { method: 'DELETE' }),
  clearAll: () => request<any>('/categories/clear/all', { method: 'DELETE' }),
};

// Custom Discounts Configuration API
export const CustomDiscountsApi = {
  getAll: () => request<CustomDiscountItem[]>('/custom-discounts'),
  create: (data: Partial<CustomDiscountItem>) =>
    request<CustomDiscountItem>('/custom-discounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CustomDiscountItem>) =>
    request<CustomDiscountItem>(`/custom-discounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/custom-discounts/${id}`, { method: 'DELETE' }),
};

// Price Lists API (Strictly separated 90% and Custom price list documents)
export const PriceListsApi = {
  getByType: (type: PriceListType, params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    query.append('type', type);
    if (params?.category && params.category !== 'ALL') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    return request<PriceListItem[]>(`/price-lists?${query.toString()}`);
  },
  getBillingProducts: (priceListType: PriceListType, search?: string, category?: string) => {
    const query = new URLSearchParams();
    query.append('priceListType', priceListType);
    if (search) query.append('search', search);
    if (category && category !== 'ALL') query.append('category', category);
    return request<PriceListItem[]>(`/price-lists/billing/products?${query.toString()}`);
  },
  import: (data: { priceListType: PriceListType; items: any[]; batchName?: string; replaceExisting?: boolean }) =>
    request<any>('/price-lists/import', { method: 'POST', body: JSON.stringify(data) }),
  create: (data: Partial<PriceListItem>) =>
    request<PriceListItem>('/price-lists', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<PriceListItem>) =>
    request<PriceListItem>(`/price-lists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/price-lists/${id}`, { method: 'DELETE' }),
  clearAll: (type: PriceListType) => request<any>(`/price-lists/clear/all?type=${type}`, { method: 'DELETE' }),
};

// Billing / Particulars API
export const ParticularsApi = {
  getAll: (params?: { customerName?: string; priceListType?: string; pricingMode?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.customerName && params.customerName !== 'ALL') query.append('customerName', params.customerName);
    const mode = params?.priceListType || params?.pricingMode;
    if (mode && mode !== 'ALL') query.append('priceListType', mode);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return request<any[]>(`/particulars${queryString ? `?${queryString}` : ''}`);
  },
  getSalesSummary: () => request<SalesSummaryData>('/particulars/reports/summary'),
  getNextBillNo: () => request<{ nextBillNo: string }>('/particulars/next-bill-no'),
  getById: (id: string) => request<any>(`/particulars/${id}`),
  create: (data: any) => request<any>('/particulars', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/particulars/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/particulars/${id}`, { method: 'DELETE' }),
  uploadPdf: (id: string, pdfData: string, pdfName: string) =>
    request<any>(`/particulars/${id}/pdf`, {
      method: 'POST',
      body: JSON.stringify({ pdfData, pdfName }),
    }),
  deletePdf: (id: string) =>
    request<any>(`/particulars/${id}/pdf`, {
      method: 'DELETE',
    }),
};

// Account / Ledger API
export const AccountsApi = {
  getAll: (customerName?: string) =>
    request<any[]>(`/accounts${customerName && customerName !== 'ALL' ? `?customerName=${encodeURIComponent(customerName)}` : ''}`),
  addCredit: (data: { customerName: string; companyName: string; creditAmount: string; date: string }) =>
    request<any>('/accounts/credit', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/accounts/${id}`, { method: 'DELETE' }),
};

// Auth API
export const AuthApi = {
  login: (credentials: { username: string; password: string }) =>
    request<{ token: string; user: { username: string; role: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<any>('/auth/me'),
};

// Health Check API
export const HealthApi = {
  check: () => request<{ status: string; message: string; timestamp: string }>('/health'),
};
