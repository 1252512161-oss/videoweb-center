import {ArrowRight, ShieldCheck, Sliders, Wrench} from 'lucide-react';
import {motion} from 'motion/react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {MediaImage} from '../components/MediaImage';
import {ProductCard} from '../components/ProductCard';
import {useSeo} from '../hooks/useSeo';
import type {Brand, Category, Product} from '../types/domain';

export function HomePage() {
  useSeo({
    title: 'VideoWeb Center – Câmeras Profissionais e Equipamentos Audiovisuais',
    description:
      'Distribuidora oficial de câmeras de cinema, câmeras profissionais de vídeo, lentes cinematográficas, iluminação e equipamentos audiovisuais para produtoras no Brasil.',
    canonicalPath: '/',
    breadcrumbs: [{name: 'Início', path: '/'}],
  });

  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        const [prodRes, catRes, brandRes] = await Promise.all([
          fetch('/api/products?featured=true'),
          fetch('/api/categories'),
          fetch('/api/brands'),
        ]);
        if (!prodRes.ok || !catRes.ok || !brandRes.ok) {
          throw new Error('Falha ao carregar dados do catálogo.');
        }
        const [prodJson, catJson, brandJson] = await Promise.all([
          prodRes.json() as Promise<{products: Product[]}>,
          catRes.json() as Promise<{categories: Category[]}>,
          brandRes.json() as Promise<{brands: Brand[]}>,
        ]);
        if (!active) return;
        setFeaturedProducts(prodJson.products);
        setCategories(catJson.categories);
        setBrands(brandJson.brands);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-[#09090B] text-zinc-100">
      {/* 1. Cinema Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/80">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
            <motion.div
              initial={{opacity: 0, y: 12}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.45, ease: [0.16, 1, 0.3, 1]}}
              className="flex flex-col justify-center lg:col-span-5"
            >
              <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">
                Engenharia Audiovisual & Cinema Digital
              </p>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl leading-[1.08] text-balance">
                Câmeras profissionais de vídeo, cinema e equipamentos audiovisuais.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-zinc-400 max-w-xl">
                Distribuidora oficial de câmeras de cinema, lentes cinematográficas, iluminação cinematográfica e acessórios para produção audiovisual, atendendo produtoras e emissoras com laboratório próprio em São Paulo.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/catalogo"
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0"
                >
                  <span>Explorar Catálogo</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/solucoes"
                  className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900/80 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-white whitespace-nowrap shrink-0"
                >
                  Engenharia de Estúdios
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{opacity: 0, scale: 0.99}}
              animate={{opacity: 1, scale: 1}}
              transition={{duration: 0.55, ease: [0.16, 1, 0.3, 1]}}
              className="lg:col-span-7"
            >
              <div className="relative h-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                <MediaImage
                  src="/src/assets/images/hero_cinema_stage_1795521923981.jpg"
                  alt="Câmera de cinema digital 8K com lente cinematográfica anamórfica em estúdio da VideoWeb Center"
                  aspectClass="aspect-[16/9] lg:h-full"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090B]/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-300">
                  <span>ARRI ALEXA 35 · Master Anamorphic 50mm</span>
                  <span className="font-mono text-zinc-400">Showroom Técnico Mooca · SP</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* 4-Column Proof Strip */}
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-zinc-800/80 pt-8 lg:grid-cols-4">
            <div>
              <p className="font-mono text-2xl font-semibold text-zinc-100 tabular-nums">+380</p>
              <p className="mt-1 text-xs text-zinc-400">Estúdios e unidades móveis integrados no Brasil</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-zinc-100 tabular-nums">8</p>
              <p className="mt-1 text-xs text-zinc-400">Fabricantes globais com distribuição oficial</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-zinc-100 tabular-nums">48h</p>
              <p className="mt-1 text-xs text-zinc-400">SLA médio em laboratório óptico e eletrônica</p>
            </div>
            <div>
              <p className="font-mono text-2xl font-semibold text-zinc-100 tabular-nums">100%</p>
              <p className="mt-1 text-xs text-zinc-400">Nota fiscal nacional e garantia de fábrica</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Collection Grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Seleção Técnica</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl text-balance">
              Equipamentos em Destaque
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-amber-400 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Ver catálogo completo</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {error && (
          <div className="mt-8 rounded-lg border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="h-96 animate-pulse rounded-lg border border-zinc-800 bg-zinc-900/50" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Categories Editorial Band */}
      <section className="border-y border-zinc-800/80 bg-[#0D0D10]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Departamentos</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl text-balance">
              Arquitetura completa da captação ao sinal no ar.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/catalogo?categoria=${cat.slug}`}
                className="group flex flex-col justify-between rounded-lg border border-zinc-800 bg-[#121216] overflow-hidden transition-colors hover:border-amber-500/60"
              >
                <MediaImage
                  src={cat.imageUrl}
                  alt={cat.name}
                  aspectClass="aspect-[4/3]"
                  className="transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="p-4">
                  <h3 className="font-display text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">{cat.description}</p>
                  <p className="mt-3 font-mono text-xs text-zinc-500 tabular-nums">
                    {cat.productCount ?? 0} equipamento(s)
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Engineering Showroom & Lab Proof */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7">
            <div className="h-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              <MediaImage
                src="/src/assets/images/editorial_showroom_lab_1795521926922.jpg"
                alt="Laboratório óptico e showroom de testes da VideoWeb Center com câmera sobre trilhos e carta de resolução"
                aspectClass="aspect-[16/9] lg:h-full"
              />
            </div>
          </div>

          <div className="flex flex-col justify-center lg:col-span-5 space-y-6">
            <div>
              <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">
                Laboratório & Integração
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl text-balance">
                Equipamentos para produtoras testados em bancada óptica.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                Nossa sede na região da Mooca reúne showroom privativo com pista de colimação para lentes cinematográficas PL/LPL, suíte de controle 12G-SDI/NDI e bancada eletrônica certificada pelos fabricantes.
              </p>
            </div>

            <div className="space-y-4 border-t border-zinc-800 pt-5">
              <div className="flex items-start gap-3">
                <Sliders className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Colimação & Backfocus Certificado</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Ajuste fino de flange focal e projeção MTF em câmeras Large Format e Super 35.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Projetos Turnkey Broadcast & Corporativo</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Diagramação de racks, roteamento de fibra óptica, acústica e comissionamento in loco.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Importação Direta & Faturamento PJ</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Assessoria fiscal completa, suporte a editais, produtoras e emissoras públicas ou privadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Link
                to="/orcamento"
                className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
              >
                <span>Agendar Demonstração Técnica</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Official Brands Strip */}
      <section className="border-t border-zinc-800/80 bg-[#0D0D10]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium tracking-wider text-zinc-400 uppercase">
              Representação Oficial Autorizada
            </p>
            <Link to="/marcas" className="text-xs font-medium text-amber-400 hover:text-amber-300">
              Conhecer todas as marcas →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                to={`/catalogo?marca=${brand.slug}`}
                className="flex items-center justify-center rounded-md border border-zinc-800/80 bg-zinc-900/40 px-3 py-3.5 text-center font-display text-xs font-semibold tracking-wide text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
              >
                {brand.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
