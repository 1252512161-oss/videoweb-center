import {useEffect} from 'react';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface SeoOptions {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: 'website' | 'product';
  ogImage?: string;
  noindex?: boolean;
  nofollow?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>> | null;
}

export function useSeo({
  title,
  description,
  canonicalPath,
  ogType = 'website',
  ogImage = '/src/assets/images/hero_cinema_stage_1795521923981.jpg',
  noindex = false,
  nofollow = false,
  breadcrumbs,
  jsonLd,
}: SeoOptions) {
  useEffect(() => {
    const origin = window.location.origin;
    const fullTitle = title.includes('VideoWeb Center') ? title : `${title} | VideoWeb Center`;
    document.title = fullTitle;

    const resolvedPath = canonicalPath ?? window.location.pathname;
    const canonicalUrl = resolvedPath.startsWith('http') ? resolvedPath : `${origin}${resolvedPath}`;
    const absoluteOgImage = ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`;
    const robotsContent = `${noindex ? 'noindex' : 'index'}, ${nofollow ? 'nofollow' : 'follow'}`;

    const updateMeta = (selector: string, attrName: string, attrValue: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const updateLink = (rel: string, href: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    updateMeta('meta[name="description"]', 'name', 'description', description);
    updateMeta('meta[name="robots"]', 'name', 'robots', robotsContent);
    updateLink('canonical', canonicalUrl);

    updateMeta('meta[property="og:type"]', 'property', 'og:type', ogType);
    updateMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    updateMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    updateMeta('meta[property="og:description"]', 'property', 'og:description', description);
    updateMeta('meta[property="og:image"]', 'property', 'og:image', absoluteOgImage);

    updateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    updateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    updateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', absoluteOgImage);

    const graphItems: Array<Record<string, unknown>> = [];

    if (breadcrumbs && breadcrumbs.length > 0) {
      graphItems.push({
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.path.startsWith('http') ? b.path : `${origin}${b.path}`,
        })),
      });
    }

    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        graphItems.push(...jsonLd);
      } else {
        graphItems.push(jsonLd);
      }
    }

    const scriptId = 'dynamic-page-jsonld';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.remove();
    }

    if (graphItems.length > 0 && !noindex) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': graphItems,
      });
      document.head.appendChild(script);
    }

    return () => {
      const cleanup = document.getElementById(scriptId);
      if (cleanup) cleanup.remove();
    };
  }, [title, description, canonicalPath, ogType, ogImage, noindex, nofollow, breadcrumbs, jsonLd]);
}
