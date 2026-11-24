import type {Request} from 'express';
import {getProductBySlug, listBrands, listCategories, listProducts} from './db.ts';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function safeJsonLdStringify(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export function resolveBaseUrl(req: Request): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  const forwardedProto = typeof req.headers['x-forwarded-proto'] === 'string'
    ? req.headers['x-forwarded-proto'].split(',')[0].trim()
    : req.protocol;
  const host = req.get('host') || 'localhost:3000';
  const proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? forwardedProto : 'https';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export function generateRobotsTxt(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

export async function generateSitemapXml(baseUrl: string): Promise<string> {
  const [categories, products] = await Promise.all([listCategories(), listProducts()]);
  const today = new Date().toISOString().split('T')[0];

  const urls: Array<{loc: string; lastmod: string; changefreq: string; priority: string}> = [
    {loc: `${baseUrl}/`, lastmod: today, changefreq: 'weekly', priority: '1.0'},
    {loc: `${baseUrl}/catalogo`, lastmod: today, changefreq: 'daily', priority: '0.9'},
    {loc: `${baseUrl}/marcas`, lastmod: today, changefreq: 'weekly', priority: '0.8'},
    {loc: `${baseUrl}/solucoes`, lastmod: today, changefreq: 'monthly', priority: '0.8'},
    {loc: `${baseUrl}/orcamento`, lastmod: today, changefreq: 'monthly', priority: '0.7'},
  ];

  for (const cat of categories) {
    urls.push({
      loc: `${baseUrl}/catalogo?categoria=${encodeURIComponent(cat.slug)}`,
      lastmod: today,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const prod of products) {
    const prodDate = prod.createdAt ? prod.createdAt.slice(0, 10) : today;
    urls.push({
      loc: `${baseUrl}/produto/${encodeURIComponent(prod.slug)}`,
      lastmod: /^\d{4}-\d{2}-\d{2}$/.test(prodDate) ? prodDate : today,
      changefreq: 'weekly',
      priority: '0.9',
    });
  }

  const itemsXml = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${escapeXml(u.lastmod)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${itemsXml}
</urlset>
`;
}

function buildCoreOrganizationSchemas(baseUrl: string) {
  return [
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'VideoWeb Center',
      url: baseUrl,
      email: 'financeiro@videowebcenter.com.br',
      telephone: '+55-11-98339-9639',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rua da Mooca, 2518, Sala 71',
        addressLocality: 'São Paulo',
        addressRegion: 'SP',
        postalCode: '03104-002',
        addressCountry: 'BR',
      },
      areaServed: 'BR',
    },
    {
      '@type': 'LocalBusiness',
      '@id': `${baseUrl}/#localbusiness`,
      name: 'VideoWeb Center – Equipamentos Audiovisuais e Engenharia Broadcast',
      url: baseUrl,
      image: `${baseUrl}/src/assets/images/editorial_showroom_lab_1795521926922.jpg`,
      telephone: '+55-11-98339-9639',
      email: 'financeiro@videowebcenter.com.br',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rua da Mooca, 2518, Sala 71',
        addressLocality: 'São Paulo',
        addressRegion: 'SP',
        postalCode: '03104-002',
        addressCountry: 'BR',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'VideoWeb Center',
      inLanguage: 'pt-BR',
      publisher: {'@id': `${baseUrl}/#organization`},
      potentialAction: {
        '@type': 'SearchAction',
        target: `${baseUrl}/catalogo?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];
}

interface RouteSeoPayload {
  statusCode: number;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: string;
  ogImage: string;
  jsonLdGraph: Array<Record<string, unknown>>;
}

export async function resolveRouteSeo(req: Request): Promise<RouteSeoPayload> {
  const baseUrl = resolveBaseUrl(req);
  const pathOnly = req.path || '/';
  const defaultOgImage = `${baseUrl}/src/assets/images/hero_cinema_stage_1795521923981.jpg`;
  const coreSchemas = buildCoreOrganizationSchemas(baseUrl);

  if (pathOnly === '/') {
    return {
      statusCode: 200,
      title: 'VideoWeb Center – Câmeras Profissionais e Equipamentos Audiovisuais',
      description:
        'Distribuidora oficial de câmeras de cinema, câmeras profissionais de vídeo, lentes cinematográficas, iluminação e equipamentos audiovisuais para produtoras em São Paulo e todo o Brasil.',
      canonical: `${baseUrl}/`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: defaultOgImage,
      jsonLdGraph: [
        ...coreSchemas,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/` }],
        },
      ],
    };
  }

  if (pathOnly === '/catalogo') {
    const catSlug = typeof req.query.categoria === 'string' ? req.query.categoria : '';
    const brandSlug = typeof req.query.marca === 'string' ? req.query.marca : '';
    const [categories, brands] = await Promise.all([listCategories(), listBrands()]);
    const matchedCat = categories.find((c) => c.slug === catSlug);
    const matchedBrand = brands.find((b) => b.slug === brandSlug);

    let title = 'Catálogo de Equipamentos Cinematográficos e Audiovisuais | VideoWeb Center';
    let description =
      'Câmeras profissionais de vídeo, câmeras de cinema, lentes cinematográficas, iluminação cinematográfica e acessórios para produção audiovisual com orçamento técnico.';
    let canonical = `${baseUrl}/catalogo`;

    if (matchedCat) {
      title = `${matchedCat.name} – Equipamentos Audiovisuais | VideoWeb Center`;
      description = matchedCat.description;
      canonical = `${baseUrl}/catalogo?categoria=${encodeURIComponent(matchedCat.slug)}`;
    } else if (matchedBrand) {
      title = `Equipamentos ${matchedBrand.name} – Distribuidor Oficial | VideoWeb Center`;
      description = matchedBrand.description;
      canonical = `${baseUrl}/catalogo?marca=${encodeURIComponent(matchedBrand.slug)}`;
    }

    return {
      statusCode: 200,
      title,
      description,
      canonical,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: matchedCat ? `${baseUrl}${matchedCat.imageUrl}` : defaultOgImage,
      jsonLdGraph: [
        ...coreSchemas,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/`},
            {'@type': 'ListItem', position: 2, name: 'Catálogo', item: `${baseUrl}/catalogo`},
          ],
        },
      ],
    };
  }

  if (pathOnly.startsWith('/produto/')) {
    const slug = decodeURIComponent(pathOnly.slice('/produto/'.length)).replace(/\/+$/, '');
    const found = slug ? await getProductBySlug(slug) : null;
    if (!found) {
      return {
        statusCode: 404,
        title: 'Equipamento não encontrado | VideoWeb Center',
        description: 'O equipamento solicitado não foi encontrado no catálogo atual da VideoWeb Center.',
        canonical: `${baseUrl}/catalogo`,
        robots: 'noindex, follow',
        ogType: 'website',
        ogImage: defaultOgImage,
        jsonLdGraph: coreSchemas,
      };
    }

    const {product} = found;
    const productUrl = `${baseUrl}/produto/${encodeURIComponent(product.slug)}`;
    const productImage = product.imageUrl.startsWith('http') ? product.imageUrl : `${baseUrl}${product.imageUrl}`;

    const productSchema: Record<string, unknown> = {
      '@type': 'Product',
      name: product.name,
      sku: product.sku,
      category: product.categoryName,
      description: product.fullDescription,
      image: productImage,
      url: productUrl,
      brand: {'@type': 'Brand', name: product.brandName},
    };

    if (product.priceBrl !== null) {
      productSchema.offers = {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'BRL',
        price: product.priceBrl,
        availability:
          product.availability === 'Pronta Entrega'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/PreOrder',
        seller: {'@id': `${baseUrl}/#organization`},
      };
    }

    return {
      statusCode: 200,
      title: `${product.name} (${product.brandName}) | VideoWeb Center`,
      description: product.shortDescription,
      canonical: productUrl,
      robots: 'index, follow',
      ogType: 'product',
      ogImage: productImage,
      jsonLdGraph: [
        ...coreSchemas,
        productSchema,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/`},
            {'@type': 'ListItem', position: 2, name: 'Catálogo', item: `${baseUrl}/catalogo`},
            {
              '@type': 'ListItem',
              position: 3,
              name: product.categoryName,
              item: `${baseUrl}/catalogo?categoria=${encodeURIComponent(product.categorySlug)}`,
            },
            {'@type': 'ListItem', position: 4, name: product.name, item: productUrl},
          ],
        },
      ],
    };
  }

  if (pathOnly === '/marcas') {
    return {
      statusCode: 200,
      title: 'Marcas Oficiais de Equipamentos Audiovisuais e Broadcast | VideoWeb Center',
      description:
        'Fabricantes oficiais representados pela VideoWeb Center: Blackmagic Design, Sony, Canon, Panasonic, Hollyland, Datavideo, Aputure, DJI, Sennheiser, Shure, RODE, Yamaha, Fujinon, Marshall, LiveU, Kiloview e mais.',
      canonical: `${baseUrl}/marcas`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: `${baseUrl}/src/assets/images/brand_ptz_broadcast_camera_1795524444970.jpg`,
      jsonLdGraph: [
        ...coreSchemas,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/`},
            {'@type': 'ListItem', position: 2, name: 'Marcas', item: `${baseUrl}/marcas`},
          ],
        },
      ],
    };
  }

  if (pathOnly === '/solucoes') {
    return {
      statusCode: 200,
      title: 'Engenharia de Estúdios e Equipamentos para Produtoras | VideoWeb Center',
      description:
        'Soluções turnkey para produtoras, emissoras e estúdios: integração 12G-SDI, iluminação cinematográfica, colimação óptica e acessórios para produção audiovisual.',
      canonical: `${baseUrl}/solucoes`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: `${baseUrl}/src/assets/images/editorial_showroom_lab_1795521926922.jpg`,
      jsonLdGraph: [
        ...coreSchemas,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/`},
            {'@type': 'ListItem', position: 2, name: 'Soluções', item: `${baseUrl}/solucoes`},
          ],
        },
      ],
    };
  }

  if (pathOnly === '/orcamento') {
    return {
      statusCode: 200,
      title: 'Solicitar Orçamento Técnico e Contato | VideoWeb Center',
      description:
        'Solicite proposta comercial para câmeras profissionais, lentes cinematográficas e projetos audiovisuais na VideoWeb Center em São Paulo.',
      canonical: `${baseUrl}/orcamento`,
      robots: 'index, follow',
      ogType: 'website',
      ogImage: defaultOgImage,
      jsonLdGraph: [
        ...coreSchemas,
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {'@type': 'ListItem', position: 1, name: 'Início', item: `${baseUrl}/`},
            {'@type': 'ListItem', position: 2, name: 'Orçamento', item: `${baseUrl}/orcamento`},
          ],
        },
      ],
    };
  }

  if (pathOnly === '/admin') {
    return {
      statusCode: 200,
      title: 'Área Administrativa | VideoWeb Center',
      description: 'Painel administrativo restrito da VideoWeb Center.',
      canonical: `${baseUrl}/admin`,
      robots: 'noindex, nofollow',
      ogType: 'website',
      ogImage: defaultOgImage,
      jsonLdGraph: [],
    };
  }

  return {
    statusCode: 404,
    title: 'Página não encontrada (404) | VideoWeb Center',
    description: 'O endereço acessado não existe na VideoWeb Center.',
    canonical: `${baseUrl}/`,
    robots: 'noindex, follow',
    ogType: 'website',
    ogImage: defaultOgImage,
    jsonLdGraph: coreSchemas,
  };
}

export async function injectSeoIntoHtml(html: string, req: Request): Promise<{html: string; statusCode: number}> {
  const seo = await resolveRouteSeo(req);

  const verificationToken = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const ga4Id = (process.env.GA4_MEASUREMENT_ID || '').trim();
  const gtmId = (process.env.GTM_ID || '').trim();

  const extraTags: string[] = [];
  extraTags.push(`<meta name="robots" content="${escapeHtmlAttr(seo.robots)}" />`);
  extraTags.push(`<link rel="canonical" href="${escapeHtmlAttr(seo.canonical)}" />`);
  extraTags.push(`<meta property="og:url" content="${escapeHtmlAttr(seo.canonical)}" />`);
  extraTags.push(`<meta property="og:image" content="${escapeHtmlAttr(seo.ogImage)}" />`);
  extraTags.push(`<meta name="twitter:image" content="${escapeHtmlAttr(seo.ogImage)}" />`);

  if (verificationToken) {
    extraTags.push(`<meta name="google-site-verification" content="${escapeHtmlAttr(verificationToken)}" />`);
  }

  if (/^G-[A-Z0-9]+$/i.test(ga4Id)) {
    const safeGa = escapeHtmlAttr(ga4Id);
    extraTags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${safeGa}"></script>`);
    extraTags.push(
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${safeGa}');</script>`
    );
  }

  if (/^GTM-[A-Z0-9]+$/i.test(gtmId)) {
    const safeGtm = escapeHtmlAttr(gtmId);
    extraTags.push(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${safeGtm}');</script>`
    );
  }

  const jsonLdScript =
    seo.jsonLdGraph.length > 0
      ? `<script id="ssr-seo-jsonld" type="application/ld+json">${safeJsonLdStringify({
          '@context': 'https://schema.org',
          '@graph': seo.jsonLdGraph,
        })}</script>`
      : '';

  let updated = html;
  updated = updated.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(seo.title)}</title>`);
  updated = updated.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${escapeHtmlAttr(seo.ogType)}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtmlAttr(seo.title)}" />`
  );
  updated = updated.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtmlAttr(seo.title)}" />`
  );
  updated = updated.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtmlAttr(seo.description)}" />`
  );
  updated = updated.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, jsonLdScript);
  updated = updated.replace('</head>', `    ${extraTags.join('\n    ')}\n  </head>`);

  return {html: updated, statusCode: seo.statusCode};
}
