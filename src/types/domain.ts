export type AvailabilityStatus = 'Pronta Entrega' | 'Sob Encomenda' | 'Locação & Venda';

export type QuoteStatus = 'Novo' | 'Em Análise' | 'Proposta Enviada' | 'Aprovado' | 'Arquivado';

export interface ProductSpec {
  label: string;
  value: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
  productCount?: number;
}

export interface Brand {
  id: number;
  slug: string;
  name: string;
  country: string;
  specialty: string;
  authorizedStatus: string;
  description: string;
  imageUrl: string;
  productCount?: number;
}

export interface Product {
  id: number;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  brandId: number;
  brandSlug: string;
  brandName: string;
  priceBrl: number | null;
  availability: AvailabilityStatus;
  featured: boolean;
  imageUrl: string;
  specs: ProductSpec[];
  inBox: string[];
  warrantyMonths: number;
  createdAt: string;
}

export interface QuoteItem {
  productId: number;
  sku: string;
  name: string;
  brandName: string;
  quantity: number;
  priceBrl: number | null;
}

export interface QuoteRequest {
  id: number;
  protocol: string;
  customerName: string;
  companyName: string;
  documentId: string;
  email: string;
  phone: string;
  projectType: string;
  timeline: string;
  notes: string;
  items: QuoteItem[];
  status: QuoteStatus;
  adminNotes: string;
  createdAt: string;
}

export interface AdminAuthStatus {
  configured: boolean;
  mode: 'env' | 'db' | 'setup';
}

export interface DatabaseStatusInfo {
  engine: string;
  storagePath: string;
  externalDatabaseConfigured: boolean;
  smtpConfigured: boolean;
  crmWebhookConfigured: boolean;
  seo: {
    searchConsoleConfigured: boolean;
    ga4Configured: boolean;
    gtmConfigured: boolean;
    sitemapPath: string;
    robotsPath: string;
  };
  counts: {
    products: number;
    inStockProducts: number;
    categories: number;
    brands: number;
    totalQuotes: number;
    pendingQuotes: number;
  };
}
