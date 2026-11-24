import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import type DatabaseType from 'better-sqlite3';
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
import {BRANDS_SEED, CATEGORIES_SEED, PRODUCTS_SEED} from './catalog-seed.ts';
import {
  isSupabaseConfigured,
  sbCreateBrand,
  sbCreateCategory,
  sbCreateProduct,
  sbCreateQuote,
  sbDeleteProduct,
  sbGetDatabaseStatus,
  sbGetProductBySlug,
  sbGetSetting,
  sbListBrands,
  sbListCategories,
  sbListProducts,
  sbListQuotes,
  sbSetSettingIfAbsent,
  sbUpdateProduct,
  sbUpdateQuoteStatus,
} from './supabase-store.ts';

const require = createRequire(import.meta.url);
const CATALOG_SEED_VERSION = 'v2-lojavideoweb-37brands';

let sqliteInstance: DatabaseType.Database | null = null;
let activeDbPath = '';

function resolveWritableDbPath(): string {
  if (process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/videoweb.db';
  }
  const localDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, {recursive: true});
    }
    fs.accessSync(localDir, fs.constants.W_OK);
    return path.join(localDir, 'videoweb.db');
  } catch {
    return '/tmp/videoweb.db';
  }
}

function getSqliteDb(): DatabaseType.Database {
  if (sqliteInstance) return sqliteInstance;

  const Database = require('better-sqlite3') as typeof DatabaseType;
  activeDbPath = resolveWritableDbPath();
  const db = new Database(activeDbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      country TEXT NOT NULL,
      specialty TEXT NOT NULL,
      authorized_status TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '/src/assets/images/prod_cinema_camera_1795521924293.jpg'
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_description TEXT NOT NULL,
      full_description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
      price_brl REAL,
      availability TEXT NOT NULL DEFAULT 'Pronta Entrega',
      featured INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL,
      specs_json TEXT NOT NULL DEFAULT '[]',
      in_box_json TEXT NOT NULL DEFAULT '[]',
      warranty_months INTEGER NOT NULL DEFAULT 24,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocol TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      company_name TEXT NOT NULL,
      document_id TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      project_type TEXT NOT NULL,
      timeline TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      items_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'Novo',
      admin_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Safe migration for pre-existing local SQLite databases missing brands.image_url
  const brandColumns = db.prepare('PRAGMA table_info(brands)').all() as Array<{name: string}>;
  if (!brandColumns.some((col) => col.name === 'image_url')) {
    db.exec(
      "ALTER TABLE brands ADD COLUMN image_url TEXT NOT NULL DEFAULT '/src/assets/images/prod_cinema_camera_1795521924293.jpg'"
    );
  }

  seedSqliteDatabase(db);
  sqliteInstance = db;
  return sqliteInstance;
}

function seedSqliteDatabase(db: DatabaseType.Database) {
  const versionRow = db
    .prepare("SELECT value FROM admin_settings WHERE key = 'catalog_seed_version'")
    .get() as {value: string} | undefined;

  if (versionRow?.value === CATALOG_SEED_VERSION) {
    return;
  }

  const upsertCategory = db.prepare(`
    INSERT INTO categories (slug, name, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      description = excluded.description,
      image_url = excluded.image_url,
      display_order = excluded.display_order
  `);

  const upsertBrand = db.prepare(`
    INSERT INTO brands (slug, name, country, specialty, authorized_status, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      country = excluded.country,
      specialty = excluded.specialty,
      authorized_status = excluded.authorized_status,
      description = excluded.description,
      image_url = excluded.image_url
  `);

  const getCategoryId = db.prepare('SELECT id FROM categories WHERE slug = ?');
  const getBrandId = db.prepare('SELECT id FROM brands WHERE slug = ?');

  const upsertProduct = db.prepare(`
    INSERT INTO products (
      slug, sku, name, short_description, full_description,
      category_id, brand_id, price_brl, availability, featured,
      image_url, specs_json, in_box_json, warranty_months
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      sku = excluded.sku,
      name = excluded.name,
      short_description = excluded.short_description,
      full_description = excluded.full_description,
      category_id = excluded.category_id,
      brand_id = excluded.brand_id,
      price_brl = excluded.price_brl,
      availability = excluded.availability,
      featured = excluded.featured,
      image_url = excluded.image_url,
      specs_json = excluded.specs_json,
      in_box_json = excluded.in_box_json,
      warranty_months = excluded.warranty_months
  `);

  const runSync = db.transaction(() => {
    for (const cat of CATEGORIES_SEED) {
      upsertCategory.run(cat.slug, cat.name, cat.description, cat.imageUrl, cat.displayOrder);
    }

    for (const brand of BRANDS_SEED) {
      upsertBrand.run(
        brand.slug,
        brand.name,
        brand.country,
        brand.specialty,
        brand.authorizedStatus,
        brand.description,
        brand.imageUrl
      );
    }

    for (const item of PRODUCTS_SEED) {
      const cat = getCategoryId.get(item.categorySlug) as {id: number} | undefined;
      const brand = getBrandId.get(item.brandSlug) as {id: number} | undefined;
      if (!cat || !brand) continue;

      upsertProduct.run(
        item.slug,
        item.sku,
        item.name,
        item.shortDescription,
        item.fullDescription,
        cat.id,
        brand.id,
        item.priceBrl,
        item.availability,
        item.featured ? 1 : 0,
        item.imageUrl,
        JSON.stringify(item.specs),
        JSON.stringify(item.inBox),
        item.warrantyMonths
      );
    }

    const quoteCount = (db.prepare('SELECT COUNT(*) AS count FROM quotes').get() as {count: number}).count;
    if (quoteCount === 0) {
      const insertQuote = db.prepare(`
        INSERT INTO quotes (
          protocol, customer_name, company_name, document_id, email, phone,
          project_type, timeline, notes, items_json, status, admin_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertQuote.run(
        'VW-2026-1001',
        'Henrique Vasconcelos',
        'Onda Branca Filmes Ltda.',
        '18.420.391/0001-55',
        'henrique@ondabranca.com.br',
        '(11) 98412-3390',
        'Compra de Equipamento',
        'Imediato (até 15 dias)',
        'Necessitamos de proposta formal com faturamento PJ para pacote Sony PXW-Z200 + transmissão sem fio Hollyland Pyro 7.',
        JSON.stringify([
          {
            productId: 2,
            sku: 'VW-SN-PXWZ200',
            name: 'Sony PXW-Z200 4K 1" CMOS XDCAM Camcorder',
            brandName: 'Sony',
            quantity: 2,
            priceBrl: null,
          },
          {
            productId: 3,
            sku: 'VW-HL-PYRO7K',
            name: 'Hollyland Pyro 7 Wireless Transceiver Monitor Kit (Set of Two)',
            brandName: 'Hollyland',
            quantity: 1,
            priceBrl: null,
          },
        ]),
        'Em Análise',
        'Engenharia confirmou disponibilidade em estoque SP. Proposta comercial em revisão.'
      );
    }

    db.prepare(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES ('catalog_seed_version', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run(CATALOG_SEED_VERSION);
  });

  runSync();
}

function mapProductRow(row: Record<string, unknown>): Product {
  let specs: ProductSpec[] = [];
  let inBox: string[] = [];
  try {
    specs = JSON.parse(String(row.specs_json || '[]')) as ProductSpec[];
  } catch {
    specs = [];
  }
  try {
    inBox = JSON.parse(String(row.in_box_json || '[]')) as string[];
  } catch {
    inBox = [];
  }

  return {
    id: Number(row.id),
    slug: String(row.slug),
    sku: String(row.sku),
    name: String(row.name),
    shortDescription: String(row.short_description),
    fullDescription: String(row.full_description),
    categoryId: Number(row.category_id),
    categorySlug: String(row.category_slug),
    categoryName: String(row.category_name),
    brandId: Number(row.brand_id),
    brandSlug: String(row.brand_slug),
    brandName: String(row.brand_name),
    priceBrl: row.price_brl === null || row.price_brl === undefined ? null : Number(row.price_brl),
    availability: String(row.availability) as AvailabilityStatus,
    featured: Boolean(row.featured),
    imageUrl: String(row.image_url),
    specs,
    inBox,
    warrantyMonths: Number(row.warranty_months),
    createdAt: String(row.created_at),
  };
}

function mapQuoteRow(row: Record<string, unknown>): QuoteRequest {
  let items: QuoteItem[] = [];
  try {
    items = JSON.parse(String(row.items_json || '[]')) as QuoteItem[];
  } catch {
    items = [];
  }
  return {
    id: Number(row.id),
    protocol: String(row.protocol),
    customerName: String(row.customer_name),
    companyName: String(row.company_name),
    documentId: String(row.document_id),
    email: String(row.email),
    phone: String(row.phone),
    projectType: String(row.project_type),
    timeline: String(row.timeline),
    notes: String(row.notes),
    items,
    status: String(row.status) as QuoteStatus,
    adminNotes: String(row.admin_notes),
    createdAt: String(row.created_at),
  };
}

export interface ProductQueryFilters {
  categoria?: string;
  marca?: string;
  q?: string;
  disponibilidade?: string;
  featured?: boolean;
  sort?: string;
}

export interface UpsertProductInput {
  slug: string;
  sku: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  categoryId: number;
  brandId: number;
  priceBrl: number | null;
  availability: AvailabilityStatus;
  featured: boolean;
  imageUrl: string;
  specs: ProductSpec[];
  inBox: string[];
  warrantyMonths: number;
}

export async function listCategories(): Promise<Category[]> {
  if (isSupabaseConfigured()) return sbListCategories();

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(p.id) AS product_count
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
       GROUP BY c.id
       ORDER BY c.display_order ASC, c.name ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description),
    imageUrl: String(r.image_url),
    displayOrder: Number(r.display_order),
    productCount: Number(r.product_count ?? 0),
  }));
}

export async function createCategory(input: {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder?: number;
}): Promise<Category> {
  if (isSupabaseConfigured()) return sbCreateCategory(input);

  const db = getSqliteDb();
  const info = db
    .prepare(
      `INSERT INTO categories (slug, name, description, image_url, display_order)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.slug, input.name, input.description, input.imageUrl, input.displayOrder ?? 10);

  const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return {
    id: Number(created.id),
    slug: String(created.slug),
    name: String(created.name),
    description: String(created.description),
    imageUrl: String(created.image_url),
    displayOrder: Number(created.display_order),
    productCount: 0,
  };
}

export async function listBrands(): Promise<Brand[]> {
  if (isSupabaseConfigured()) return sbListBrands();

  const db = getSqliteDb();
  const rows = db
    .prepare(
      `SELECT b.*, COUNT(p.id) AS product_count
       FROM brands b
       LEFT JOIN products p ON p.brand_id = b.id
       GROUP BY b.id
       ORDER BY b.name COLLATE NOCASE ASC`
    )
    .all() as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    name: String(r.name),
    country: String(r.country),
    specialty: String(r.specialty),
    authorizedStatus: String(r.authorized_status),
    description: String(r.description),
    imageUrl: String(r.image_url || '/src/assets/images/prod_cinema_camera_1795521924293.jpg'),
    productCount: Number(r.product_count ?? 0),
  }));
}

export async function createBrand(input: {
  slug: string;
  name: string;
  country: string;
  specialty: string;
  authorizedStatus: string;
  description: string;
  imageUrl: string;
}): Promise<Brand> {
  if (isSupabaseConfigured()) return sbCreateBrand(input);

  const db = getSqliteDb();
  const info = db
    .prepare(
      `INSERT INTO brands (slug, name, country, specialty, authorized_status, description, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.slug,
      input.name,
      input.country,
      input.specialty,
      input.authorizedStatus,
      input.description,
      input.imageUrl
    );

  const created = db.prepare('SELECT * FROM brands WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return {
    id: Number(created.id),
    slug: String(created.slug),
    name: String(created.name),
    country: String(created.country),
    specialty: String(created.specialty),
    authorizedStatus: String(created.authorized_status),
    description: String(created.description),
    imageUrl: String(created.image_url || '/src/assets/images/prod_cinema_camera_1795521924293.jpg'),
    productCount: 0,
  };
}

export async function listProducts(filters: ProductQueryFilters = {}): Promise<Product[]> {
  if (isSupabaseConfigured()) return sbListProducts(filters);

  const db = getSqliteDb();
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.categoria && filters.categoria !== 'todas') {
    conditions.push('c.slug = ?');
    params.push(filters.categoria);
  }
  if (filters.marca && filters.marca !== 'todas') {
    conditions.push('b.slug = ?');
    params.push(filters.marca);
  }
  if (filters.disponibilidade && filters.disponibilidade !== 'todos') {
    conditions.push('p.availability = ?');
    params.push(filters.disponibilidade);
  }
  if (filters.featured) {
    conditions.push('p.featured = 1');
  }
  if (filters.q && filters.q.trim().length > 0) {
    const pattern = `%${filters.q.trim()}%`;
    conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.short_description LIKE ? OR b.name LIKE ? OR c.name LIKE ?)');
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let orderBy = 'ORDER BY p.featured DESC, p.id ASC';
  if (filters.sort === 'price_asc') {
    orderBy = 'ORDER BY CASE WHEN p.price_brl IS NULL THEN 1 ELSE 0 END, p.price_brl ASC, p.name ASC';
  } else if (filters.sort === 'price_desc') {
    orderBy = 'ORDER BY CASE WHEN p.price_brl IS NULL THEN 1 ELSE 0 END, p.price_brl DESC, p.name ASC';
  } else if (filters.sort === 'name_asc') {
    orderBy = 'ORDER BY p.name ASC';
  }

  const sql = `
    SELECT
      p.*,
      c.slug AS category_slug,
      c.name AS category_name,
      b.slug AS brand_slug,
      b.name AS brand_name
    FROM products p
    INNER JOIN categories c ON c.id = p.category_id
    INNER JOIN brands b ON b.id = p.brand_id
    ${whereClause}
    ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
  return rows.map(mapProductRow);
}

export async function getProductBySlug(slug: string): Promise<{product: Product; related: Product[]} | null> {
  if (isSupabaseConfigured()) return sbGetProductBySlug(slug);

  const db = getSqliteDb();
  const row = db
    .prepare(
      `SELECT
         p.*,
         c.slug AS category_slug,
         c.name AS category_name,
         b.slug AS brand_slug,
         b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.slug = ?`
    )
    .get(slug) as Record<string, unknown> | undefined;

  if (!row) return null;

  const product = mapProductRow(row);
  const relatedRows = db
    .prepare(
      `SELECT
         p.*,
         c.slug AS category_slug,
         c.name AS category_name,
         b.slug AS brand_slug,
         b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.category_id = ? AND p.id != ?
       ORDER BY p.featured DESC, p.id ASC
       LIMIT 3`
    )
    .all(product.categoryId, product.id) as Array<Record<string, unknown>>;

  return {
    product,
    related: relatedRows.map(mapProductRow),
  };
}

export async function createProduct(input: UpsertProductInput): Promise<Product> {
  if (isSupabaseConfigured()) return sbCreateProduct(input);

  const db = getSqliteDb();
  const info = db
    .prepare(
      `INSERT INTO products (
        slug, sku, name, short_description, full_description,
        category_id, brand_id, price_brl, availability, featured,
        image_url, specs_json, in_box_json, warranty_months
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.slug,
      input.sku,
      input.name,
      input.shortDescription,
      input.fullDescription,
      input.categoryId,
      input.brandId,
      input.priceBrl,
      input.availability,
      input.featured ? 1 : 0,
      input.imageUrl,
      JSON.stringify(input.specs),
      JSON.stringify(input.inBox),
      input.warrantyMonths
    );

  const created = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, b.slug AS brand_slug, b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.id = ?`
    )
    .get(info.lastInsertRowid) as Record<string, unknown>;

  return mapProductRow(created);
}

export async function updateProduct(id: number, input: UpsertProductInput): Promise<Product | null> {
  if (isSupabaseConfigured()) return sbUpdateProduct(id, input);

  const db = getSqliteDb();
  const result = db
    .prepare(
      `UPDATE products SET
        slug = ?, sku = ?, name = ?, short_description = ?, full_description = ?,
        category_id = ?, brand_id = ?, price_brl = ?, availability = ?, featured = ?,
        image_url = ?, specs_json = ?, in_box_json = ?, warranty_months = ?
      WHERE id = ?`
    )
    .run(
      input.slug,
      input.sku,
      input.name,
      input.shortDescription,
      input.fullDescription,
      input.categoryId,
      input.brandId,
      input.priceBrl,
      input.availability,
      input.featured ? 1 : 0,
      input.imageUrl,
      JSON.stringify(input.specs),
      JSON.stringify(input.inBox),
      input.warrantyMonths,
      id
    );

  if (result.changes === 0) return null;

  const updated = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name, b.slug AS brand_slug, b.name AS brand_name
       FROM products p
       INNER JOIN categories c ON c.id = p.category_id
       INNER JOIN brands b ON b.id = p.brand_id
       WHERE p.id = ?`
    )
    .get(id) as Record<string, unknown>;

  return mapProductRow(updated);
}

export async function deleteProduct(id: number): Promise<boolean> {
  if (isSupabaseConfigured()) return sbDeleteProduct(id);

  const db = getSqliteDb();
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

export async function createQuote(input: {
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
  if (isSupabaseConfigured()) return sbCreateQuote(input);

  const db = getSqliteDb();
  const year = new Date().getFullYear();
  const count = (db.prepare('SELECT COUNT(*) AS count FROM quotes').get() as {count: number}).count;
  const randomSuffix = Math.floor(1000 + count + (Date.now() % 900));
  const protocol = `VW-${year}-${randomSuffix}`;

  const info = db
    .prepare(
      `INSERT INTO quotes (
        protocol, customer_name, company_name, document_id, email, phone,
        project_type, timeline, notes, items_json, status, admin_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Novo', '')`
    )
    .run(
      protocol,
      input.customerName,
      input.companyName,
      input.documentId,
      input.email,
      input.phone,
      input.projectType,
      input.timeline,
      input.notes,
      JSON.stringify(input.items)
    );

  const created = db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  return mapQuoteRow(created);
}

export async function listQuotes(): Promise<QuoteRequest[]> {
  if (isSupabaseConfigured()) return sbListQuotes();

  const db = getSqliteDb();
  const rows = db.prepare('SELECT * FROM quotes ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  return rows.map(mapQuoteRow);
}

export async function updateQuoteStatus(
  id: number,
  status: QuoteStatus,
  adminNotes: string
): Promise<QuoteRequest | null> {
  if (isSupabaseConfigured()) return sbUpdateQuoteStatus(id, status, adminNotes);

  const db = getSqliteDb();
  const result = db
    .prepare('UPDATE quotes SET status = ?, admin_notes = ? WHERE id = ?')
    .run(status, adminNotes, id);
  if (result.changes === 0) return null;
  const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as Record<string, unknown>;
  return mapQuoteRow(row);
}

export async function getSetting(key: string): Promise<string | null> {
  if (isSupabaseConfigured()) return sbGetSetting(key);

  const db = getSqliteDb();
  const row = db.prepare('SELECT value FROM admin_settings WHERE key = ?').get(key) as {value: string} | undefined;
  return row ? row.value : null;
}

export async function setSettingIfAbsent(key: string, value: string): Promise<boolean> {
  if (isSupabaseConfigured()) return sbSetSettingIfAbsent(key, value);

  const db = getSqliteDb();
  const result = db
    .prepare('INSERT OR IGNORE INTO admin_settings (key, value) VALUES (?, ?)')
    .run(key, value);
  return result.changes > 0;
}

export async function getDatabaseStatus(): Promise<DatabaseStatusInfo> {
  if (isSupabaseConfigured()) return sbGetDatabaseStatus();

  const db = getSqliteDb();
  const products = (db.prepare('SELECT COUNT(*) AS c FROM products').get() as {c: number}).c;
  const inStockProducts = (
    db.prepare("SELECT COUNT(*) AS c FROM products WHERE availability = 'Pronta Entrega'").get() as {c: number}
  ).c;
  const categories = (db.prepare('SELECT COUNT(*) AS c FROM categories').get() as {c: number}).c;
  const brands = (db.prepare('SELECT COUNT(*) AS c FROM brands').get() as {c: number}).c;
  const totalQuotes = (db.prepare('SELECT COUNT(*) AS c FROM quotes').get() as {c: number}).c;
  const pendingQuotes = (
    db.prepare("SELECT COUNT(*) AS c FROM quotes WHERE status IN ('Novo', 'Em Análise')").get() as {c: number}
  ).c;

  return {
    engine: 'SQLite WAL (better-sqlite3)',
    storagePath: activeDbPath || 'data/videoweb.db',
    externalDatabaseConfigured: false,
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
      products,
      inStockProducts,
      categories,
      brands,
      totalQuotes,
      pendingQuotes,
    },
  };
}
