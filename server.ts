import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAdminAuthStatus,
  issueAdminToken,
  requireAdminAuth,
  setupInitialAdminPasscode,
  verifyAdminLogin,
} from './server/auth.ts';
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
} from './server/db.ts';
import {generateRobotsTxt, generateSitemapXml, injectSeoIntoHtml, resolveBaseUrl} from './server/seo.ts';
import type {AvailabilityStatus, QuoteItem, QuoteStatus} from './src/types/domain.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

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

async function startServer() {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Public Health & Catalog Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ok: true, service: 'videoweb-center'});
  });

  app.get('/api/categories', (_req, res) => {
    res.json({categories: listCategories()});
  });

  app.get('/api/brands', (_req, res) => {
    res.json({brands: listBrands()});
  });

  app.get('/api/products', (req, res) => {
    const categoria = typeof req.query.categoria === 'string' ? req.query.categoria : undefined;
    const marca = typeof req.query.marca === 'string' ? req.query.marca : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const disponibilidade = typeof req.query.disponibilidade === 'string' ? req.query.disponibilidade : undefined;
    const featured = req.query.featured === 'true' ? true : undefined;
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;

    const products = listProducts({categoria, marca, q, disponibilidade, featured, sort});
    res.json({products});
  });

  app.get('/api/products/:slug', (req, res) => {
    const result = getProductBySlug(req.params.slug);
    if (!result) {
      res.status(404).json({error: 'Equipamento não encontrado.'});
      return;
    }
    res.json(result);
  });

  app.post('/api/quotes', (req, res) => {
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

    const created = createQuote({
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
  });

  // Admin Auth Endpoints
  app.get('/api/admin/auth-status', (_req, res) => {
    res.json(getAdminAuthStatus());
  });

  app.post('/api/admin/setup', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const result = setupInitialAdminPasscode(passcode);
    if (!result.ok) {
      res.status(409).json({error: result.error});
      return;
    }
    const session = issueAdminToken();
    res.status(201).json(session);
  });

  app.post('/api/admin/login', (req, res) => {
    const status = getAdminAuthStatus();
    if (!status.configured) {
      res.status(409).json({error: 'Defina a senha inicial do administrador antes de entrar.'});
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    if (!verifyAdminLogin(passcode)) {
      res.status(401).json({error: 'Credencial administrativa incorreta.'});
      return;
    }
    const session = issueAdminToken();
    res.json(session);
  });

  // Protected Admin Routes
  app.get('/api/admin/overview', requireAdminAuth, (_req, res) => {
    res.json({status: getDatabaseStatus()});
  });

  app.get('/api/admin/quotes', requireAdminAuth, (_req, res) => {
    res.json({quotes: listQuotes()});
  });

  app.patch('/api/admin/quotes/:id', requireAdminAuth, (req, res) => {
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

    const updated = updateQuoteStatus(id, status, adminNotes);
    if (!updated) {
      res.status(404).json({error: 'Orçamento não encontrado.'});
      return;
    }
    res.json({quote: updated});
  });

  app.post('/api/admin/products', requireAdminAuth, (req, res) => {
    const body = req.body as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const sku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : '';
    const slug = sanitizeSlug(typeof body.slug === 'string' && body.slug.trim() ? body.slug : name);
    const shortDescription = typeof body.shortDescription === 'string' ? body.shortDescription.trim() : '';
    const fullDescription = typeof body.fullDescription === 'string' ? body.fullDescription.trim() : '';
    const categoryId = Number(body.categoryId);
    const brandId = Number(body.brandId);
    const priceBrl = body.priceBrl === null || body.priceBrl === '' || body.priceBrl === undefined ? null : Number(body.priceBrl);
    const availability = String(body.availability || 'Pronta Entrega') as AvailabilityStatus;
    const featured = Boolean(body.featured);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
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

    const inBox = Array.isArray(body.inBox)
      ? body.inBox.map((x) => String(x).trim()).filter(Boolean)
      : [];

    try {
      const product = createProduct({
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
      const message = err instanceof Error && err.message.includes('UNIQUE')
        ? 'Já existe um equipamento com este SKU ou slug.'
        : 'Erro ao salvar equipamento no banco de dados.';
      res.status(400).json({error: message});
    }
  });

  app.put('/api/admin/products/:id', requireAdminAuth, (req, res) => {
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
    const priceBrl = body.priceBrl === null || body.priceBrl === '' || body.priceBrl === undefined ? null : Number(body.priceBrl);
    const availability = String(body.availability || 'Pronta Entrega') as AvailabilityStatus;
    const featured = Boolean(body.featured);
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
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

    const inBox = Array.isArray(body.inBox)
      ? body.inBox.map((x) => String(x).trim()).filter(Boolean)
      : [];

    try {
      const updated = updateProduct(id, {
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
      const message = err instanceof Error && err.message.includes('UNIQUE')
        ? 'Já existe outro equipamento com este SKU ou slug.'
        : 'Erro ao atualizar equipamento.';
      res.status(400).json({error: message});
    }
  });

  app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({error: 'ID de produto inválido.'});
      return;
    }
    const deleted = deleteProduct(id);
    if (!deleted) {
      res.status(404).json({error: 'Equipamento não encontrado.'});
      return;
    }
    res.json({ok: true});
  });

  app.post('/api/admin/categories', requireAdminAuth, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '/src/assets/images/prod_cinema_camera_1795521924293.jpg';
    const slug = sanitizeSlug(name);

    if (!name || !description || !slug || !isSafeImagePath(imageUrl)) {
      res.status(400).json({error: 'Dados da categoria inválidos.'});
      return;
    }
    try {
      const category = createCategory({slug, name, description, imageUrl});
      res.status(201).json({category});
    } catch {
      res.status(400).json({error: 'Categoria já existente ou dados inválidos.'});
    }
  });

  app.post('/api/admin/brands', requireAdminAuth, (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const country = typeof req.body?.country === 'string' ? req.body.country.trim() : '';
    const specialty = typeof req.body?.specialty === 'string' ? req.body.specialty.trim() : '';
    const authorizedStatus = typeof req.body?.authorizedStatus === 'string' ? req.body.authorizedStatus.trim() : 'Parceiro Oficial';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const slug = sanitizeSlug(name);

    if (!name || !country || !specialty || !description || !slug) {
      res.status(400).json({error: 'Preencha todos os campos da marca.'});
      return;
    }
    try {
      const brand = createBrand({slug, name, country, specialty, authorizedStatus, description});
      res.status(201).json({brand});
    } catch {
      res.status(400).json({error: 'Marca já cadastrada ou dados inválidos.'});
    }
  });

  // SEO Technical Endpoints: robots.txt, dynamic sitemap.xml, and canonical 301 redirects
  app.get('/robots.txt', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(generateRobotsTxt(baseUrl));
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = resolveBaseUrl(req);
    res.type('application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(generateSitemapXml(baseUrl));
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const reqPath = req.path;
    if (reqPath.startsWith('/api/') || reqPath.startsWith('/src/') || reqPath.startsWith('/@')) {
      next();
      return;
    }

    const querySuffix = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';

    // Normalize trailing slashes to prevent duplicate URLs
    if (reqPath.length > 1 && reqPath.endsWith('/')) {
      res.redirect(301, `${reqPath.slice(0, -1)}${querySuffix}`);
      return;
    }

    // Friendly legacy / intuitive path redirects
    const legacyRedirects: Record<string, string> = {
      '/produtos': '/catalogo',
      '/equipamentos': '/catalogo',
      '/contato': '/orcamento',
      '/engenharia': '/solucoes',
    };
    const mapped = legacyRedirects[reqPath.toLowerCase()];
    if (mapped) {
      res.redirect(301, `${mapped}${querySuffix}`);
      return;
    }

    next();
  });

  // Frontend serving: Vite middleware in development, static dist/ in production
  if (!IS_PROD) {
    const {createServer: createViteServer} = await import('vite');
    const vite = await createViteServer({
      server: {middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true'},
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      try {
        const indexPath = path.resolve(process.cwd(), 'index.html');
        const rawTemplate = fs.readFileSync(indexPath, 'utf-8');
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawTemplate);
        const {html, statusCode} = injectSeoIntoHtml(transformed, req);
        res.status(statusCode).set({'Content-Type': 'text/html; charset=utf-8'}).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '7d',
      })
    );
    app.get('*', (req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        const rawHtml = fs.readFileSync(indexFile, 'utf-8');
        const {html, statusCode} = injectSeoIntoHtml(rawHtml, req);
        res.status(statusCode).set({'Content-Type': 'text/html; charset=utf-8'}).end(html);
      } else {
        res.status(404).send('Build de produção não encontrado. Execute npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VideoWeb Center server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VideoWeb Center server:', err);
  process.exit(1);
});
