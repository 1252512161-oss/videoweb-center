import {ArrowLeft, Check, Minus, Plus, ShieldCheck} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {MediaImage} from '../components/MediaImage';
import {ProductCard} from '../components/ProductCard';
import {useQuoteCart} from '../context/QuoteCartContext';
import {useSeo} from '../hooks/useSeo';
import {ApiRequestError, apiFetch} from '../lib/api';
import {formatBrl} from '../lib/format';
import type {Product} from '../types/domain';

export function ProductDetailPage() {
  const {slug} = useParams<{slug: string}>();
  const navigate = useNavigate();
  const {addItem} = useQuoteCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const targetSlug = slug;
    let active = true;
    async function loadProduct() {
      try {
        setLoading(true);
        setQuantity(1);
        const data = await apiFetch<{product: Product; related: Product[]}>(
          `/api/products/${encodeURIComponent(targetSlug)}`
        );
        if (!active) return;
        setProduct(data.product);
        setRelated(Array.isArray(data.related) ? data.related : []);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error('[VideoWeb ProductDetailPage] Error:', err);
        const isNotFound = err instanceof ApiRequestError && err.status === 404;
        setError(
          isNotFound
            ? 'Equipamento não encontrado no catálogo atual.'
            : 'Não foi possível carregar os detalhes deste equipamento no momento.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProduct();
    return () => {
      active = false;
    };
  }, [slug]);

  const jsonLd = useMemo(() => {
    if (!product) return null;
    const origin = window.location.origin;
    const productUrl = `${origin}/produto/${encodeURIComponent(product.slug)}`;
    const productImg = product.imageUrl.startsWith('http') ? product.imageUrl : `${origin}${product.imageUrl}`;

    const schema: Record<string, unknown> = {
      '@type': 'Product',
      name: product.name,
      sku: product.sku,
      category: product.categoryName,
      image: productImg,
      url: productUrl,
      brand: {'@type': 'Brand', name: product.brandName},
      description: product.fullDescription,
    };

    if (product.priceBrl !== null) {
      schema.offers = {
        '@type': 'Offer',
        url: productUrl,
        priceCurrency: 'BRL',
        price: product.priceBrl,
        availability:
          product.availability === 'Pronta Entrega'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/PreOrder',
      };
    }

    return schema;
  }, [product]);

  useSeo({
    title: product ? `${product.name} (${product.brandName})` : 'Detalhes do Equipamento',
    description: product?.shortDescription || 'Especificações técnicas e orçamento na VideoWeb Center.',
    canonicalPath: product ? `/produto/${product.slug}` : undefined,
    ogType: product ? 'product' : 'website',
    ogImage: product?.imageUrl,
    noindex: Boolean(error),
    breadcrumbs: product
      ? [
          {name: 'Início', path: '/'},
          {name: 'Catálogo', path: '/catalogo'},
          {name: product.categoryName, path: `/catalogo?categoria=${product.categorySlug}`},
          {name: product.name, path: `/produto/${product.slug}`},
        ]
      : undefined,
    jsonLd,
  });

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-zinc-100">{error || 'Equipamento não encontrado'}</h1>
        <Link
          to="/catalogo"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </div>
    );
  }

  const handleDirectQuote = () => {
    addItem(product, quantity);
    navigate('/orcamento');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <Link to="/" className="hover:text-zinc-100">
          Início
        </Link>
        <span aria-hidden="true">/</span>
        <Link to="/catalogo" className="hover:text-zinc-100">
          Catálogo
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/catalogo?categoria=${product.categorySlug}`} className="hover:text-zinc-100">
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-200 truncate">{product.name}</span>
      </nav>

      {/* Main Contiguous PDP Layout */}
      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Left: Product Photography */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
            <MediaImage src={product.imageUrl} alt={`${product.name} — ${product.brandName}`} aspectClass="aspect-[4/3]" priority />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-[#121216] px-5 py-3.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Garantia oficial de {product.warrantyMonths} meses no Brasil</span>
            </div>
            <span className="font-mono text-zinc-300">SKU: {product.sku}</span>
          </div>
        </div>

        {/* Right: Contiguous Purchase / Quote Module */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 rounded-lg border border-zinc-800 bg-[#121216] p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Link to={`/catalogo?marca=${product.brandSlug}`} className="font-semibold text-amber-400 hover:underline">
                {product.brandName}
              </Link>
              <span aria-hidden="true">·</span>
              <span>{product.categoryName}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl leading-tight">
              {product.name}
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-zinc-300">{product.fullDescription}</p>

            <div className="mt-6 border-y border-zinc-800 py-5">
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Valor referencial PJ / Faturado</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-zinc-100 tabular-nums">
                    {formatBrl(product.priceBrl)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Disponibilidade</p>
                  <p className="mt-1 text-sm font-medium text-amber-400">{product.availability}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">Quantidade para proposta</span>
                <div className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-zinc-400 hover:text-white cursor-pointer"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center font-mono text-sm text-zinc-100 tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    className="p-2.5 text-zinc-400 hover:text-white cursor-pointer"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addItem(product, quantity)}
                className="w-full rounded-md bg-amber-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 cursor-pointer"
              >
                Adicionar à Lista de Orçamento
              </button>

              <button
                type="button"
                onClick={handleDirectQuote}
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white cursor-pointer"
              >
                Solicitar Proposta Imediata
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specifications & Box Contents */}
      <div className="mt-14 grid grid-cols-1 gap-10 border-t border-zinc-800/80 pt-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Especificações Técnicas</h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-zinc-800 bg-[#121216]">
            <dl className="divide-y divide-zinc-800/80">
              {product.specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-1 gap-1 px-5 py-3.5 sm:grid-cols-12 sm:gap-4">
                  <dt className="text-xs font-medium text-zinc-400 sm:col-span-4">{spec.label}</dt>
                  <dd className="font-mono text-xs text-zinc-100 tabular-nums sm:col-span-8">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="lg:col-span-5">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Itens Inclusos na Configuração</h2>
          <ul className="mt-5 space-y-3 rounded-lg border border-zinc-800 bg-[#121216] p-6">
            {product.inBox.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-zinc-300">
                <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Related Equipment */}
      {related.length > 0 && (
        <section className="mt-16 border-t border-zinc-800/80 pt-12">
          <h2 className="font-display text-xl font-semibold text-zinc-100">Equipamentos Relacionados</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
