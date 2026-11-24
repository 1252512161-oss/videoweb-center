import {ArrowRight, Minus, Plus, Trash2, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {useQuoteCart} from '../context/QuoteCartContext';
import {formatBrl} from '../lib/format';

export function QuoteDrawer() {
  const {items, drawerOpen, setDrawerOpen, updateQuantity, removeItem, estimatedSubtotal} = useQuoteCart();
  const navigate = useNavigate();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Lista de Orçamento">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setDrawerOpen(false)}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-[#0E0E11] text-zinc-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold text-zinc-100">Lista de Orçamento</h2>
            <p className="text-xs text-zinc-400">
              {items.length === 0 ? 'Nenhum equipamento adicionado' : `${items.length} item(ns) para proposta`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors cursor-pointer"
            aria-label="Fechar painel de orçamento"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <p className="text-sm text-zinc-400 max-w-xs">
                Selecione câmeras, lentes ou sistemas broadcast no catálogo para montar uma solicitação de proposta comercial.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  navigate('/catalogo');
                }}
                className="mt-5 rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-800/80">
              {items.map((item) => (
                <li key={item.productId} className="py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-400">
                        {item.brandName} · <span className="font-mono">{item.sku}</span>
                      </p>
                      <p className="mt-1 text-sm font-medium text-zinc-100 leading-snug">{item.name}</p>
                      <p className="mt-1 font-mono text-xs text-amber-400 tabular-nums">
                        {formatBrl(item.priceBrl)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="rounded p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors cursor-pointer"
                      aria-label={`Remover ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Quantidade</span>
                    <div className="inline-flex items-center rounded-md border border-zinc-800 bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                        aria-label="Diminuir quantidade"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-mono text-xs text-zinc-100 tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-1.5 text-zinc-400 hover:text-white cursor-pointer"
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-zinc-800 px-6 py-5 bg-zinc-950/60">
          {items.length > 0 && (
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Estimativa referencial</span>
              <span className="font-mono font-semibold text-zinc-100 tabular-nums">
                {estimatedSubtotal !== null ? formatBrl(estimatedSubtotal) : 'Sob consulta'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(false);
              navigate('/orcamento');
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <span>Avançar para Solicitação de Proposta</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}
