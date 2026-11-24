import type {
  AvailabilityStatus,
  Brand,
  Category,
  DatabaseStatusInfo,
  Product,
  ProductSpec,
  QuoteItem,
  QuoteRequest,
  QuoteStatus,
} from '../src/types/domain.ts';
import type {ProductQueryFilters, UpsertProductInput} from './db.ts';

function getSupabaseConfig(): {url: string; serviceKey: string} | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return {url, serviceKey};
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

async function sbRequest<T>(
  pathWithQuery: string,
  options: {
    method?: string;
    body?: unknown;
    prefer?: string;
  } = {}
): Promise<T> {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error('Supabase não configurado no ambiente.');
  }

  const headers: Record<string, string> = {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
    'Content-Type': 'application/json',
  };
  if (options.prefer) {
    headers.Prefer = options.prefer;
  }

  const res = await fetch(`${cfg.url}/rest/v1/${pathWithQuery}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Supabase HTTP ${res.status}: ${errText}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function mapSupabaseProduct(row: Record<string, unknown>): Product {
  const cat = (row.categories as Record<string, unknown> | null) ?? {};
  const brand = (row.brands as Record<string, unknown> | null) ?? {};

  const rawSpecs = Array.isArray(row.specs_json) ? row.specs_json : [];
  const rawInBox = Array.isArray(row.in_box_json) ? row.in_box_json : [];

  return {
    id: Number(row.id),
    slug: String(row.slug),
    sku: String(row.sku),
    name: String(row.name),
    shortDescription: String(row.short_description),
    fullDescription: String(row.full_description),
    categoryId: Number(row.category_id),
    categorySlug: String(cat.slug ?? ''),
    categoryName: String(cat.name ?? ''),
    brandId: Number(row.brand_id),
    brandSlug: String(brand.slug ?? ''),
    brandName: String(brand.name ?? ''),
    priceBrl: row.price_brl === null || row.price_brl === undefined ? null : Number(row.price_brl),
    availability: String(row.availability) as AvailabilityStatus,
    featured: Boolean(row.featured),
    imageUrl: String(row.image_url),
    specs: rawSpecs as ProductSpec[],
    inBox: rawInBox.map(String),
    warrantyMonths: Number(row.warranty_months ?? 24),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapSupabaseQuote(row: Record<string, unknown>): QuoteRequest {
  const items = Array.isArray(row.items_json) ? (row.items_json as QuoteItem[]) : [];
  return {
    id: Number(row.id),
    protocol: String(row.protocol),
    customerName: String(row.customer_name),
    companyName: String(row.company_name),
    documentId: String(row.document_id ?? ''),
    email: String(row.email),
    phone: String(row.phone),
    projectType: String(row.project_type),
    timeline: String(row.timeline),
    notes: String(row.notes ?? ''),
    items,
    status: String(row.status) as QuoteStatus,
    adminNotes: String(row.admin_notes ?? ''),
    createdAt: String(row.created_at ?? ''),
  };
}

export async function sbListCategories(): Promise<Category[]> {
  const [cats, prods] = await Promise.all([
    sbRequest<Array<Record<string, unknown>>>('categories?select=*&order=display_order.asc,name.asc'),
    sbRequest<Array<{category_id: number}>>('products?select=category_id'),
  ]);

  const counts = new Map<number, number>();
  for (const p of prods) {
    counts.set(Number(p.category_id), (counts.get(Number(p.category_id)) ?? 0) + 1);
  }

  return cats.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    imageUrl: String(r.image_url),
    displayOrder: Number(r.display_order ?? 0),
    productCount: counts.get(Number(r.id)) ?? 0,
  }));
}

export async function sbCreateCategory(input: {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder?: number;
}): Promise<Category> {
  const rows = await sbRequest<Array<Record<string, unknown>>>('categories', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      image_url: input.imageUrl,
      display_order: input.displayOrder ?? 10,
    },
  });
  const r = rows[0];
  return {
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    imageUrl: String(r.image_url),
    displayOrder: Number(r.display_order ?? 10),
    productCount: 0,
  };
}

export async function sbListBrands(): Promise<Brand[]> {
  const [brands, prods] = await Promise.all([
    sbRequest<Array<Record<string, unknown>>>('brands?select=*&order=name.asc'),
    sbRequest<Array<{brand_id: number}>>('products?select=brand_id'),
  ]);

  const counts = new Map<number, number>();
  for (const p of prods) {
    counts.set(Number(p.brand_id), (counts.get(Number(p.brand_id)) ?? 0) + 1);
  }

  return brands.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    country: String(r.country),
    specialty: String(r.specialty),
    authorizedStatus: String(r.authorized_status),
    description: String(r.description),
    imageUrl: String(r.image_url || '/src/assets/images/prod_cinema_camera_1795521924293.jpg'),
    productCount: counts.get(Number(r.id)) ?? 0,
  }));
}

export async function sbCreateBrand(input: {
  slug: string;
  name: string;
  country: string;
  specialty: string;
  authorizedStatus: string;
  description: string;
  imageUrl: string;
}): Promise<Brand> {
  const rows = await sbRequest<Array<Record<string, unknown>>>('brands', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      slug: input.slug,
      name: input.name,
      country: input.country,
      specialty: input.specialty,
      authorized_status: input.authorizedStatus,
      description: input.description,
      image_url: input.imageUrl,
    },
  });
  const r = rows[0];
  return {
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    country: String(r.country),
    specialty: String(r.specialty),
    authorizedStatus: String(r.authorized_status),
    description: String(r.description),
    imageUrl: String(r.image_url || '/src/assets/images/prod_cinema_camera_1795521924293.jpg'),
    productCount: 0,
  };
}

export async function sbListProducts(filters: ProductQueryFilters = {}): Promise<Product[]> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(
    'products?select=*,categories(slug,name),brands(slug,name)&order=featured.desc,id.asc'
  );
  let products = rows.map(mapSupabaseProduct);

  if (filters.categoria && filters.categoria !== 'todas') {
    products = products.filter((p) => p.categorySlug === filters.categoria);
  }
  if (filters.marca && filters.marca !== 'todas') {
    products = products.filter((p) => p.brandSlug === filters.marca);
  }
  if (filters.disponibilidade && filters.disponibilidade !== 'todos') {
    products = products.filter((p) => p.availability === filters.disponibilidade);
  }
  if (filters.featured) {
    products = products.filter((p) => p.featured);
  }
  if (filters.q && filters.q.trim().length > 0) {
    const needle = filters.q.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.sku.toLowerCase().includes(needle) ||
        p.shortDescription.toLowerCase().includes(needle) ||
        p.brandName.toLowerCase().includes(needle) ||
        p.categoryName.toLowerCase().includes(needle)
    );
  }

  if (filters.sort === 'price_asc') {
    products.sort((a, b) => (a.priceBrl ?? Number.MAX_SAFE_INTEGER) - (b.priceBrl ?? Number.MAX_SAFE_INTEGER));
  } else if (filters.sort === 'price_desc') {
    products.sort((a, b) => (b.priceBrl ?? -1) - (a.priceBrl ?? -1));
  } else if (filters.sort === 'name_asc') {
    products.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  return products;
}

export async function sbGetProductBySlug(slug: string): Promise<{product: Product; related: Product[]} | null> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(
    `products?slug=eq.${encodeURIComponent(slug)}&select=*,categories(slug,name),brands(slug,name)&limit=1`
  );
  if (rows.length === 0) return null;
  const product = mapSupabaseProduct(rows[0]);

  const relatedRows = await sbRequest<Array<Record<string, unknown>>>(
    `products?category_id=eq.${product.categoryId}&id=neq.${product.id}&select=*,categories(slug,name),brands(slug,name)&order=featured.desc,id.asc&limit=3`
  );
  return {
    product,
    related: relatedRows.map(mapSupabaseProduct),
  };
}

export async function sbCreateProduct(input: UpsertProductInput): Promise<Product> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(
    'products?select=*,categories(slug,name),brands(slug,name)',
    {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        slug: input.slug,
        sku: input.sku,
        name: input.name,
        short_description: input.shortDescription,
        full_description: input.fullDescription,
        category_id: input.categoryId,
        brand_id: input.brandId,
        price_brl: input.priceBrl,
        availability: input.availability,
        featured: input.featured,
        image_url: input.imageUrl,
        specs_json: input.specs,
        in_box_json: input.inBox,
        warranty_months: input.warrantyMonths,
      },
    }
  );
  return mapSupabaseProduct(rows[0]);
}

export async function sbUpdateProduct(id: number, input: UpsertProductInput): Promise<Product | null> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(
    `products?id=eq.${id}&select=*,categories(slug,name),brands(slug,name)`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        slug: input.slug,
        sku: input.sku,
        name: input.name,
        short_description: input.shortDescription,
        full_description: input.fullDescription,
        category_id: input.categoryId,
        brand_id: input.brandId,
        price_brl: input.priceBrl,
        availability: input.availability,
        featured: input.featured,
        image_url: input.imageUrl,
        specs_json: input.specs,
        in_box_json: input.inBox,
        warranty_months: input.warrantyMonths,
      },
    }
  );
  if (rows.length === 0) return null;
  return mapSupabaseProduct(rows[0]);
}

export async function sbDeleteProduct(id: number): Promise<boolean> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(`products?id=eq.${id}`, {
    method: 'DELETE',
    prefer: 'return=representation',
  });
  return rows.length > 0;
}

export async function sbCreateQuote(input: {
  customerName: string;
  companyName: string;
  documentId: string;
  email: string;
  phone: string;
  projectType: string;
  timeline: string;
  notes: string;
  items: QuoteItem[];
}): Promise<QuoteRequest> {
  const year = new Date().getFullYear();
  const suffix = Math.floor(1000 + (Date.now() % 8999));
  const protocol = `VW-${year}-${suffix}`;

  const rows = await sbRequest<Array<Record<string, unknown>>>('quotes', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      protocol,
      customer_name: input.customerName,
      company_name: input.companyName,
      document_id: input.documentId,
      email: input.email,
      phone: input.phone,
      project_type: input.projectType,
      timeline: input.timeline,
      notes: input.notes,
      items_json: input.items,
      status: 'Novo',
      admin_notes: '',
    },
  });
  return mapSupabaseQuote(rows[0]);
}

export async function sbListQuotes(): Promise<QuoteRequest[]> {
  const rows = await sbRequest<Array<Record<string, unknown>>>('quotes?select=*&order=id.desc');
  return rows.map(mapSupabaseQuote);
}

export async function sbUpdateQuoteStatus(
  id: number,
  status: QuoteStatus,
  adminNotes: string
): Promise<QuoteRequest | null> {
  const rows = await sbRequest<Array<Record<string, unknown>>>(`quotes?id=eq.${id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {status, admin_notes: adminNotes},
  });
  if (rows.length === 0) return null;
  return mapSupabaseQuote(rows[0]);
}

export async function sbGetSetting(key: string): Promise<string | null> {
  const rows = await sbRequest<Array<{value: string}>>(
    `admin_settings?key=eq.${encodeURIComponent(key)}&select=value&limit=1`
  );
  return rows[0]?.value ?? null;
}

export async function sbSetSettingIfAbsent(key: string, value: string): Promise<boolean> {
  const existing = await sbGetSetting(key);
  if (existing !== null) return false;
  await sbRequest('admin_settings', {
    method: 'POST',
    prefer: 'resolution=ignore-duplicates',
    body: {key, value},
  });
  return true;
}

export async function sbGetDatabaseStatus(): Promise<DatabaseStatusInfo> {
  const [products, categories, brands, quotes] = await Promise.all([
    sbRequest<Array<{availability: string}>>('products?select=availability'),
    sbRequest<Array<{id: number}>>('categories?select=id'),
    sbRequest<Array<{id: number}>>('brands?select=id'),
    sbRequest<Array<{status: string}>>('quotes?select=status'),
  ]);

  return {
    engine: 'Supabase PostgreSQL (REST API)',
    storagePath: 'Supabase Cloud Database (RLS Ativo)',
    externalDatabaseConfigured: true,
    smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_HOST.trim().length > 0),
    crmWebhookConfigured: Boolean(process.env.CRM_WEBHOOK_URL && process.env.CRM_WEBHOOK_URL.trim().length > 0),
    seo: {
      searchConsoleConfigured: Boolean(
        process.env.GOOGLE_SITE_VERIFICATION && process.env.GOOGLE_SITE_VERIFICATION.trim().length > 0
      ),
      ga4Configured: /^G-[A-Z0-9]+$/i.test((process.env.GA4_MEASUREMENT_ID || '').trim()),
      gtmConfigured: /^GTM-[A-Z0-9]+$/i.test((process.env.GTM_ID || '').trim()),
      sitemapPath: '/sitemap.xml',
      robotsPath: '/robots.txt',
    },
    counts: {
      products: products.length,
      inStockProducts: products.filter((p) => p.availability === 'Pronta Entrega').length,
      categories: categories.length,
      brands: brands.length,
      totalQuotes: quotes.length,
      pendingQuotes: quotes.filter((q) => q.status === 'Novo' || q.status === 'Em Análise').length,
    },
  };
}
