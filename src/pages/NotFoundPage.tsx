import {ArrowLeft} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useSeo} from '../hooks/useSeo';

export function NotFoundPage() {
  useSeo({
    title: 'Página não encontrada (404)',
    description: 'A página solicitada não existe ou foi movida na plataforma da VideoWeb Center.',
    canonicalPath: '/',
    noindex: true,
    nofollow: false,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
      <p className="font-mono text-xs font-semibold tracking-wider text-amber-400 uppercase">Erro 404</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl">
        Página não encontrada
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-lg mx-auto">
        O endereço acessado não está disponível ou foi atualizado. Explore nosso catálogo completo de câmeras de cinema, lentes cinematográficas e equipamentos audiovisuais.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para a Página Inicial</span>
        </Link>
        <Link
          to="/catalogo"
          className="inline-flex items-center rounded-md border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-zinc-500 hover:text-white transition-colors"
        >
          Explorar Catálogo
        </Link>
      </div>
    </div>
  );
}
