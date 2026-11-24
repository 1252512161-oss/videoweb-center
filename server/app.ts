import express, {type NextFunction, type Request, type Response} from 'express';
import type {AvailabilityStatus, QuoteItem, QuoteStatus} from '../src/types/domain.ts';
import {
  getAdminAuthStatus,
  issueAdminToken,
  requireAdminAuth,
  setupInitialAdminPasscode,
  verifyAdminLogin,
} from './auth.ts';
import {
  createBrand,
  createCategory,
  createProduct,
  createQuote,
  deleteProduct,
  getDatabaseStatus,
  getProductBySlug,
  listBrands,
  listCategories,
  listProducts,
  listQuotes,
  updateProduct,
  updateQuoteStatus,
} from './db.ts';
import {generateRobotsTxt, generateSitemapXml, resolveBaseUrl} from './seo.ts';
import {isSupabaseConfigured} from './supabase-store.ts';

const VALID_AVAILABILITIES: AvailabilityStatus[] = ['Pronta Entrega', 'Sob Encomenda', 'Locação & Venda'];
const VALID_QUOTE_STATUSES: QuoteStatus[] = ['Novo', 'Em Análise', 'Proposta Enviada', 'Aprovado', 'Arquivado'];

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isSafeImagePath(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('/src/assets/images/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export function createApiApp() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Public Health & Catalog Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'videoweb-center',
      storage: isSupabaseConfigured() ? 'supabase' : 'sqlite',
      runtime: process.env.VERCEL === '1' ? 'vercel-serverless' : 'node-server',
    });
  });

  app.get(
    '/api/categories',
    asyncHandler(async (_req, res) => {
      const categories = await listCategories();
      res.json({categories});
    })
  );

  app.get(
    '/api/brands',
    asyncHandler(async (_req, res) => {
      const brands = await listBrands();
      res.json({brands});
    })
  );

  app.get(
    '/api/products',
    asyncHandler(async (req, res) => {
      const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : undefined;
      const marca = typeof req.query.marca === 'string' ? req.query.marca : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const disponibilidade = typeof req.query.disponibilidade === 'string' ? req.query.disponibilidade : undefined;
      const featured = req.query.featured === 'true' ? true : undefined;
      const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;

      const products = await listProducts({categoria, marca, q, disponibilidade, featured, sort});
      res.json({products});
    })
  );

  app.get(
    '/api/products/:slug',
    asyncHandler(async (req, res) => {
      const result = await getProductBySlug(String(req.params.slug || ''));
      if (!result) {
        res.status(404).json({error: 'Equipamento não encontrado.'});
        return;
      }
      res.json(result);
    })
  );

  app.post(
    '/api/quotes',
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
      const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
      const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const projectType = typeof body.projectType === 'string' ? body.projectType.trim() : '';
      const timeline = typeof body.timeline === 'string' ? body.timeline.trim() : '';
      const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

      if (customerName.length < 3) {
        res.status(400).json({error: 'Informe seu nome completo (mínimo 3 caracteres).'});
        return;
      }
      if (companyName.length < 2) {
        res.status(400).json({error: 'Informe o nome da produtora, emissora ou empresa.'});
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({error: 'Informe um endereço de e-mail válido.'});
        return;
      }
      if (phone.replace(/\D/g, '').length < 8) {
        res.status(400).json({error: 'Informe um telefone ou WhatsApp válido com DDD.'});
        return;
      }
      if (!projectType || !timeline) {
        res.status(400).json({error: 'Selecione o tipo de projeto e o prazo estimado.'});
        return;
      }

      const rawItems = Array.isArray(body.items) ? body.items : [];
      const items: QuoteItem[] = rawItems
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item) => ({
          productId: Number(item.productId || 0),
          sku: String(item.sku || '').slice(0, 60),
          name: String(item.name || '').slice(0, 160),
          brandName: String(item.brandName || '').slice(0, 80),
          quantity: Math.max(1, Math.min(999, Number(item.quantity || 1))),
          priceBrl: item.priceBrl === null || item.priceBrl === undefined ? null : Number(item.priceBrl),
        }))
        .filter((item) => item.name.length > 0);

      const created = await createQuote({
        customerName,
        companyName,
        documentId,
        email,
        phone,
        projectType,
        timeline,
        notes,
        items,
      });

      res.status(201).json({quote: created});
    })
  );

  // Admin Auth Endpoints
  app.get(
    '/api/admin/auth-status',
    asyncHandler(async (_req, res) => {
      const status = await getAdminAuthStatus();
      res.json(status);
    })
  );

  app.post(
    '/api/admin/setup',
    asyncHandler(async (req, res) => {
      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
      const result = await setupInitialAdminPasscode(passcode);
      if (!result.ok) {
        res.status(409).json({error: result.error});
        return;
      }
      const session = issueAdminToken();
      res.status(201).json(session);
    })
  );

  app.post(
    '/api/admin/login',
    asyncHandler(async (req, res) => {
      const status = await getAdminAuthStatus();
      if (!status.configured) {
        res.status(409).json({error: 'Defina a senha inicial do administrador antes de entrar.'});
        return;
      }
      const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
      const valid = await verifyAdminLogin(passcode);
      if (!valid) {
        res.status(401).json({error: 'Credencial administrativa incorreta.'});
        return;
      }
      const session = issueAdminToken();
      res.json(session);
    })
  );

  // Protected Admin Routes
  app.get(
    '/api/admin/overview',
    requireAdminAuth,
    asyncHandler(async (_req, res) => {
      const status = await getDatabaseStatus();
      res.json({status});
    })
  );

  app.get(
    '/api/admin/quotes',
    requireAdminAuth,
    asyncHandler(async (_req, res) => {
      const quotes = await listQuotes();
      res.json({quotes});
    })
  );

  app.patch(
    '/api/admin/quotes/:id',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      const status = String(req.body?.status || '') as QuoteStatus;
      const adminNotes = typeof req.body?.adminNotes === 'string' ? req.body.adminNotes.trim() : '';

      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({error: 'Identificador de orçamento inválido.'});
        return;
      }
      if (!VALID_QUOTE_STATUSES.includes(status)) {
        res.status(400).json({error: 'Status de orçamento inválido.'});
        return;
      }

      const updated = await updateQuoteStatus(id, status, adminNotes);
      if (!updated) {
        res.status(404).json({error: 'Orçamento não encontrado.'});
        return;
      }
      res.json({quote: updated});
    })
  );

  app.post(
    '/api/admin/products',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
      const slug = sanitizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : name);
      const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
      const fullDescription = typeof body.fullDescription === 'string' ? body.fullDescription.trim() : '';
      const categoryId = Number(body.categoryId);
      const brandId = Number(body.brandId);
      const priceBrl =
        body.priceBrl === null || body.priceBrl === '' || body.priceBrl === undefined ? null : Number(body.priceBrl);
      const availability = String(body.availability || 'Pronta Entrega') as AvailabilityStatus;
      const featured = Boolean(body.featured);
      const imageUrl =
        typeof body.imageUrl === 'string'
          ? body.imageUrl.trim()
          : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
      const warrantyMonths = Math.max(3, Math.min(60, Number(body.warrantyMonths || 24)));

      if (!name || !sku || !slug || !shortDescription || !fullDescription) {
        res.status(400).json({error: 'Preencha todos os campos obrigatórios do equipamento.'});
        return;
      }
      if (!Number.isInteger(categoryId) || !Number.isInteger(brandId)) {
        res.status(400).json({error: 'Selecione uma categoria e uma marca válidas.'});
        return;
      }
      if (!VALID_AVAILABILITIES.includes(availability)) {
        res.status(400).json({error: 'Disponibilidade inválida.'});
        return;
      }
      if (!isSafeImagePath(imageUrl)) {
        res.status(400).json({error: 'URL de imagem inválida.'});
        return;
      }

      const specs = Array.isArray(body.specs)
        ? body.specs
            .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
            .map((s) => ({label: String(s.label || '').trim(), value: String(s.value || '').trim()}))
            .filter((s) => s.label && s.value)
        : [];

      const inBox = Array.isArray(body.inBox) ? body.inBox.map((x) => String(x).trim()).filter(Boolean) : [];

      try {
        const product = await createProduct({
          slug,
          sku,
          name,
          shortDescription,
          fullDescription,
          categoryId,
          brandId,
          priceBrl: priceBrl !== null && Number.isFinite(priceBrl) ? priceBrl : null,
          availability,
          featured,
          imageUrl,
          specs,
          inBox,
          warrantyMonths,
        });
        res.status(201).json({product});
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        const message =
          msg.includes('UNIQUE') || msg.includes('duplicate')
            ? 'Já existe um equipamento com este SKU ou slug.'
            : 'Erro ao salvar equipamento no banco de dados.';
        res.status(400).json({error: message});
      }
    })
  );

  app.put(
    '/api/admin/products/:id',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({error: 'ID de produto inválido.'});
        return;
      }

      const body = req.body as Record<string, unknown>;
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
      const slug = sanitizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : name);
      const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
      const fullDescription = typeof body.fullDescription === 'string' ? body.fullDescription.trim() : '';
      const categoryId = Number(body.categoryId);
      const brandId = Number(body.brandId);
      const priceBrl =
        body.priceBrl === null || body.priceBrl === '' || body.priceBrl === undefined ? null : Number(body.priceBrl);
      const availability = String(body.availability || 'Pronta Entrega') as AvailabilityStatus;
      const featured = Boolean(body.featured);
      const imageUrl =
        typeof body.imageUrl === 'string'
          ? body.imageUrl.trim()
          : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
      const warrantyMonths = Math.max(3, Math.min(60, Number(body.warrantyMonths || 24)));

      if (!name || !sku || !slug || !shortDescription || !fullDescription) {
        res.status(400).json({error: 'Preencha todos os campos obrigatórios do equipamento.'});
        return;
      }
      if (!VALID_AVAILABILITIES.includes(availability) || !isSafeImagePath(imageUrl)) {
        res.status(400).json({error: 'Parâmetros de disponibilidade ou imagem inválidos.'});
        return;
      }

      const specs = Array.isArray(body.specs)
        ? body.specs
            .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
            .map((s) => ({label: String(s.label || '').trim(), value: String(s.value || '').trim()}))
            .filter((s) => s.label && s.value)
        : [];

      const inBox = Array.isArray(body.inBox) ? body.inBox.map((x) => String(x).trim()).filter(Boolean) : [];

      try {
        const updated = await updateProduct(id, {
          slug,
          sku,
          name,
          shortDescription,
          fullDescription,
          categoryId,
          brandId,
          priceBrl: priceBrl !== null && Number.isFinite(priceBrl) ? priceBrl : null,
          availability,
          featured,
          imageUrl,
          specs,
          inBox,
          warrantyMonths,
        });
        if (!updated) {
          res.status(404).json({error: 'Equipamento não encontrado.'});
          return;
        }
        res.json({product: updated});
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        const message =
          msg.includes('UNIQUE') || msg.includes('duplicate')
            ? 'Já existe outro equipamento com este SKU ou slug.'
            : 'Erro ao atualizar equipamento.';
        res.status(400).json({error: message});
      }
    })
  );

  app.delete(
    '/api/admin/products/:id',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({error: 'ID de produto inválido.'});
        return;
      }
      const deleted = await deleteProduct(id);
      if (!deleted) {
        res.status(404).json({error: 'Equipamento não encontrado.'});
        return;
      }
      res.json({ok: true});
    })
  );

  app.post(
    '/api/admin/categories',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      const imageUrl =
        typeof req.body?.imageUrl === 'string'
          ? req.body.imageUrl.trim()
          : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
      const slug = sanitizeSlug(name);

      if (!name || !description || !slug || !isSafeImagePath(imageUrl)) {
        res.status(400).json({error: 'Dados da categoria inválidos.'});
        return;
      }
      try {
        const category = await createCategory({slug, name, description, imageUrl});
        res.status(201).json({category});
      } catch {
        res.status(400).json({error: 'Categoria já existente ou dados inválidos.'});
      }
    })
  );

  app.post(
    '/api/admin/brands',
    requireAdminAuth,
    asyncHandler(async (req, res) => {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
      const country = typeof req.body?.country === 'string' ? req.body.country.trim() : '';
      const specialty = typeof req.body?.specialty === 'string' ? req.body.specialty.trim() : '';
      const authorizedStatus =
        typeof req.body?.authorizedStatus === 'string' ? req.body.authorizedStatus.trim() : 'Parceiro Oficial';
      const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
      const imageUrl =
        typeof req.body?.imageUrl === 'string' && req.body.imageUrl.trim()
          ? req.body.imageUrl.trim()
          : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
      const slug = sanitizeSlug(name);

      if (!name || !country || !specialty || !description || !slug || !isSafeImagePath(imageUrl)) {
        res.status(400).json({error: 'Preencha todos os campos da marca e selecione uma imagem válida.'});
        return;
      }
      try {
        const brand = await createBrand({slug, name, country, specialty, authorizedStatus, description, imageUrl});
        res.status(201).json({brand});
      } catch {
        res.status(400).json({error: 'Marca já cadastrada ou dados inválidos.'});
      }
    })
  );

  // SEO Technical Endpoints: robots.txt and dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateRobotsTxt(baseUrl));
  });

  app.get(
    '/sitemap.xml',
    asyncHandler(async (req, res) => {
      const baseUrl = resolveBaseUrl(req);
      const xml = await generateSitemapXml(baseUrl);
      res.type('application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.send(xml);
    })
  );

  // Structured API error handler (never expose internal stack traces)
  app.use('/api', (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(`[VideoWeb API Error] ${req.method} ${req.originalUrl}:`, err);
    if (!res.headersSent) {
      res.status(500).json({error: 'Serviço temporariamente indisponível. Tente novamente em instantes.'});
    }
  });

  return app;
}
