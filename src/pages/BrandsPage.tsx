import {ArrowRight} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useSeo} from '../hooks/useSeo';
import type {Brand} from '../types/domain';

export function BrandsPage() {
  useSeo({
    title: 'Marcas Oficiais de Equipamentos Cinematográficos e Audiovisuais',
    description:
      'Fabricantes oficiais de câmeras profissionais, lentes cinematográficas e iluminação representados pela VideoWeb Center: ARRI, Sony, RED, ZEISS, Canon, Blackmagic, Sound Devices e Aputure.',
    canonicalPath: '/marcas',
    ogImage: '/src/assets/images/prod_cine_lenses_1795521925276.jpg',
    breadcrumbs: [
      {name: 'Início', path: '/'},
      {name: 'Marcas', path: '/marcas'},
    ],
  });

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/brands')
      .then((res) => res.json() as Promise<{brands: Brand[]}>)
      .then((data) => setBrands(data.brands))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl border-b border-zinc-800/80 pb-8">
        <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Parceiros Globais</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
          Distribuição Oficial e Suporte de Fábrica
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Todos os equipamentos comercializados pela VideoWeb Center contam com procedência certificada, garantia oficial no território nacional e atualização de firmware homologada.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {brands.map((brand) => (
            <article
              key={brand.id}
              className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-[#121216] p-6 sm:p-7"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
                  <span>
                    {brand.country} · {brand.authorizedStatus}
                  </span>
                  <span className="font-mono text-zinc-500 tabular-nums">
                    {brand.productCount ?? 0} produto(s)
                  </span>
                </div>

                <h2 className="mt-3 font-display text-2xl font-semibold text-zinc-100">{brand.name}</h2>
                <p className="mt-1 text-xs font-medium text-amber-400">{brand.specialty}</p>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">{brand.description}</p>
              </div>

              <div className="mt-6 border-t border-zinc-800/80 pt-4">
                <Link
                  to={`/catalogo?marca=${brand.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-100 hover:text-amber-400 transition-colors"
                >
                  <span>Explorar equipamentos {brand.name}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
