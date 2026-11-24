import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createApiApp} from './server/app.ts';
import {injectSeoIntoHtml} from './server/seo.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = createApiApp();

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

    if (reqPath.length > 1 && reqPath.endsWith('/')) {
      res.redirect(301, `${reqPath.slice(0, -1)}${querySuffix}`);
      return;
    }

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
        const {html, statusCode} = await injectSeoIntoHtml(transformed, req);
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
    app.get('*', async (req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        const rawHtml = fs.readFileSync(indexFile, 'utf-8');
        const {html, statusCode} = await injectSeoIntoHtml(rawHtml, req);
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
