import {RefreshCw, RotateCcw, Search} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {ProductCard} from '../components/ProductCard';
import {useSeo} from '../hooks/useSeo';
import {apiFetch} from '../lib/api';
import type {Brand, Category, Product} from '../types/domain';

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoriaParam = searchParams.get('categoria') || 'todas';
  const marcaParam = searchParams.get('marca') || 'todas';
  const disponParam = searchParams.get('disponibilidade') || 'todos';
  const sortParam = searchParams.get('sort') || 'featured';
  const qParam = searchParams.get('q') || '';

  const [searchInput, setSearchInput] = useState(qParam);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const activeCategory = categories.find((c) => c.slug === categoriaParam);
  const activeBrand = brands.find((b) => b.slug === marcaParam);

  useSeo({
    title: activeCategory
      ? `${activeCategory.name} – Equipamentos Audiovisuais`
      : activeBrand
      ? `Equipamentos ${activeBrand.name} – Distribuidor Oficial`
      : 'Catálogo de Câmeras Profissionais e Equipamentos Cinematográficos',
    description: activeCategory
      ? activeCategory.description
      : activeBrand
      ? activeBrand.description
      : 'Câmeras de cinema, câmeras profissionais de vídeo, lentes cinematográficas, iluminação cinematográfica e acessórios para produção audiovisual.',
    canonicalPath: activeCategory
      ? `/catalogo?categoria=${encodeURIComponent(activeCategory.slug)}`
      : activeBrand
      ? `/catalogo?marca=${encodeURIComponent(activeBrand.slug)}`
      : '/catalogo',
    ogImage: activeCategory?.imageUrl || '/src/assets/images/prod_cinema_camera_1795521924293.jpg',
    noindex: qParam.trim().length > 0,
    breadcrumbs: [
      {name: 'Início', path: '/'},
      {name: 'Catálogo', path: '/catalogo'},
    ],
  });

  useEffect(() => {
    setSearchInput(qParam);
  }, [qParam]);

  useEffect(() => {
    Promise.all([
      apiFetch<{categories: Category[]}>('/api/categories'),
      apiFetch<{brands: Brand[]}>('/api/brands'),
    ])
      .then(([catJson, brandJson]) => {
        setCategories(Array.isArray(catJson.categories) ? catJson.categories : []);
        setBrands(Array.isArray(brandJson.brands) ? brandJson.brands : []);
      })
      .catch((err) => {
        console.error('[VideoWeb CatalogPage] Error loading taxonomies:', err);
      });
  }, [retryCount]);

  useEffect(() => {
    let active = true;
    async function fetchCatalog() {
      try {
        setLoading(true);
        const query = new URLSearchParams();
        if (categoriaParam !== 'todas') query.set('categoria', categoriaParam);
        if (marcaParam !== 'todas') query.set('marca', marcaParam);
        if (disponParam !== 'todos') query.set('disponibilidade', disponParam);
        if (sortParam !== 'featured') query.set('sort', sortParam);
        if (qParam.trim()) query.set('q', qParam.trim());

        const data = await apiFetch<{products: Product[]}>(`/api/products?${query.toString()}`);
        if (!active) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error('[VideoWeb CatalogPage] Error fetching products:', err);
        setError('Não foi possível consultar o catálogo no momento. Tente novamente ou solicite atendimento técnico.');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCatalog();
    return () => {
      active = false;
    };
  }, [categoriaParam, marcaParam, disponParam, sortParam, qParam, retryCount]);

  const updateFilter = (key: string, value: string, defaultVal: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === defaultVal || !value.trim()) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput, '');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-zinc-800/80 pb-8">
        <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Portfólio Técnico</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          {activeCategory
            ? activeCategory.name
            : activeBrand
            ? `Equipamentos ${activeBrand.name}`
            : 'Catálogo de Equipamentos Audiovisuais'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Filtre câmeras profissionais, lentes cinematográficas, iluminação e acessórios para produção audiovisual por fabricante ou disponibilidade. Consulte também nossas{' '}
          <Link to="/marcas" className="text-zinc-200 underline decoration-zinc-700 hover:text-amber-400">
            marcas oficiais
          </Link>{' '}
          e{' '}
          <Link to="/solucoes" className="text-zinc-200 underline decoration-zinc-700 hover:text-amber-400">
            soluções de engenharia
          </Link>
          .
        </p>

        {/* Category Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateFilter('categoria', 'todas', 'todas')}
            className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              categoriaParam === 'todas'
                ? 'bg-amber-500 text-zinc-950 font-semibold'
                : 'border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateFilter('categoria', cat.slug, 'todas')}
              className={`rounded-md px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                categoriaParam === cat.slug
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search & Secondary Filters */}
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-12">
          <form onSubmit={handleSearchSubmit} className="md:col-span-5 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '' && qParam !== '') {
                    updateFilter('q', '', '');
                  }
                }}
                placeholder="Buscar por modelo, SKU ou recurso..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Buscar
            </button>
          </form>

          <div className="md:col-span-3">
            <select
              aria-label="Filtrar por marca"
              value={marcaParam}
              onChange={(e) => updateFilter('marca', e.target.value, 'todas')}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="todas">Todas as marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Filtrar por disponibilidade"
              value={disponParam}
              onChange={(e) => updateFilter('disponibilidade', e.target.value, 'todos')}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="todos">Disponibilidade</option>
              <option value="Pronta Entrega">Pronta Entrega</option>
              <option value="Sob Encomenda">Sob Encomenda</option>
              <option value="Locação & Venda">Locação & Venda</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              aria-label="Ordenar equipamentos"
              value={sortParam}
              onChange={(e) => updateFilter('sort', e.target.value, 'featured')}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
            >
              <option value="featured">Destaques</option>
              <option value="price_asc">Menor valor</option>
              <option value="price_desc">Maior valor</option>
              <option value="name_asc">Ordem A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
        <span className="font-mono tabular-nums">
          {loading ? 'Carregando catálogo...' : `${products.length} equipamento(s) encontrado(s)`}
        </span>
        {(categoriaParam !== 'todas' || marcaParam !== 'todas' || disponParam !== 'todos' || qParam !== '') && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Limpar filtros</span>
          </button>
        )}
      </div>

      {/* Error State */}
      {error && !loading && (
        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-zinc-800 bg-[#121216] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-zinc-100">Não foi possível carregar o catálogo</h2>
            <p className="mt-1 text-xs text-zinc-400">{error}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setRetryCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Tentar novamente</span>
            </button>
            <Link
              to="/orcamento"
              className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white"
            >
              Falar com Engenharia
            </Link>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="h-96 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : !error && products.length === 0 ? (
        <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-zinc-100">Nenhum equipamento encontrado</h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
            {categoriaParam !== 'todas' || marcaParam !== 'todas' || disponParam !== 'todos' || qParam !== ''
              ? 'Nenhum item corresponde aos filtros aplicados. Limpe os filtros ou solicite cotação personalizada.'
              : 'O catálogo está sem itens publicados no momento. Solicite atendimento direto com nossa equipe comercial.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {(categoriaParam !== 'todas' || marcaParam !== 'todas' || disponParam !== 'todos' || qParam !== '') && (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Mostrar todos os equipamentos
              </button>
            )}
            <Link
              to="/orcamento"
              className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white"
            >
              Solicitar Cotação Sob Encomenda
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
