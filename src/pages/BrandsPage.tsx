import {ArrowRight, RefreshCw, Search} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {MediaImage} from '../components/MediaImage';
import {useSeo} from '../hooks/useSeo';
import {apiFetch} from '../lib/api';
import type {Brand} from '../types/domain';

export function BrandsPage() {
  useSeo({
    title: 'Marcas Oficiais de Equipamentos Audiovisuais e Broadcast',
    description:
      'Fabricantes oficiais representados pela VideoWeb Center: Blackmagic Design, Sony, Canon, Panasonic, Hollyland, Datavideo, Aputure, DJI, Sennheiser, Shure, RODE, Yamaha, Fujinon, Marshall, LiveU, Kiloview e mais.',
    canonicalPath: '/marcas',
    ogImage: '/src/assets/images/brand_ptz_broadcast_camera_1795524444970.jpg',
    breadcrumbs: [
      {name: 'Início', path: '/'},
      {name: 'Marcas', path: '/marcas'},
    ],
  });

  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadBrands() {
      try {
        setLoading(true);
        const data = await apiFetch<{brands: Brand[]}>('/api/brands');
        if (!active) return;
        setBrands(Array.isArray(data.brands) ? data.brands : []);
        setError(null);
      } catch (err) {
        if (!active) return;
        console.error('[VideoWeb BrandsPage] Error loading brands:', err);
        setError('Não foi possível carregar a lista de marcas oficiais no momento.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadBrands();
    return () => {
      active = false;
    };
  }, [retryCount]);

  const filteredBrands = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.specialty.toLowerCase().includes(q) ||
        b.country.toLowerCase().includes(q)
    );
  }, [brands, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 border-b border-zinc-800/80 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Parceiros Globais & Nacionais</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl text-balance">
            Distribuição Oficial e Suporte de Fábrica
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Todos os equipamentos comercializados pela VideoWeb Center contam com procedência certificada, garantia oficial no território nacional e consultoria técnica especializada.
          </p>
        </div>

        <div className="w-full lg:w-80 shrink-0">
          <label htmlFor="brand-filter" className="sr-only">
            Filtrar marcas por nome ou especialidade
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              id="brand-filter"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar marca ou especialidade..."
              className="w-full rounded-md border border-zinc-800 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {!loading && !error && brands.length > 0 && (
        <div className="mt-5 flex items-center justify-between text-xs text-zinc-400">
          <span className="font-mono tabular-nums">
            {filteredBrands.length} de {brands.length} fabricante(s) exibido(s)
          </span>
          {searchTerm.trim() !== '' && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {error && !loading && (
        <div className="mt-8 flex flex-col gap-4 rounded-lg border border-zinc-800 bg-[#121216] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-zinc-100">Marcas temporariamente indisponíveis</h2>
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
              Solicitar Orçamento
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : !error && filteredBrands.length === 0 ? (
        <div className="mt-10 rounded-lg border border-zinc-800 bg-[#121216] p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-zinc-100">
            {brands.length === 0 ? 'Nenhuma marca cadastrada no momento' : 'Nenhuma marca encontrada para esta busca'}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Consulte nossa equipe técnica para cotação de fabricantes específicos sob encomenda.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {searchTerm.trim() !== '' && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Mostrar todas as marcas
              </button>
            )}
            <Link
              to="/orcamento"
              className="rounded-md border border-zinc-700 px-4 py-2 text-xs font-medium text-zinc-200 hover:text-white"
            >
              Falar com Engenharia
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <article
              key={brand.id}
              className="group flex flex-col justify-between overflow-hidden rounded-lg border border-zinc-800 bg-[#121216] transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700"
            >
              <Link to={`/catalogo?marca=${brand.slug}`} className="block overflow-hidden bg-zinc-950">
                <MediaImage
                  src={brand.imageUrl}
                  alt={`Equipamentos profissionais ${brand.name} distribuídos pela VideoWeb Center`}
                  aspectClass="aspect-[4/3]"
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </Link>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                    <span>
                      {brand.country} · {brand.authorizedStatus}
                    </span>
                    <span className="font-mono text-zinc-500 tabular-nums">
                      {brand.productCount ?? 0} item(ns)
                    </span>
                  </div>

                  <h2 className="mt-3 font-display text-xl font-semibold text-zinc-100">{brand.name}</h2>
                  <p className="mt-1 text-xs font-medium text-amber-400">{brand.specialty}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400 line-clamp-3">{brand.description}</p>
                </div>

                <div className="mt-5 border-t border-zinc-800/80 pt-4">
                  <Link
                    to={`/catalogo?marca=${brand.slug}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-100 hover:text-amber-400 transition-colors"
                  >
                    <span>Explorar equipamentos {brand.name}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
