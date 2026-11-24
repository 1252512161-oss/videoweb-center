import {Menu, ShoppingBag, X} from 'lucide-react';
import {useState} from 'react';
import {Link, NavLink, useNavigate} from 'react-router-dom';
import {useQuoteCart} from '../context/QuoteCartContext';

const NAV_ITEMS = [
  {to: '/', label: 'Início', end: true},
  {to: '/catalogo', label: 'Catálogo', end: false},
  {to: '/marcas', label: 'Marcas', end: false},
  {to: '/solucoes', label: 'Soluções', end: false},
];

export function Navbar() {
  const {totalItemsCount, setDrawerOpen} = useQuoteCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handlePrimaryAction = () => {
    if (totalItemsCount > 0) {
      setDrawerOpen(true);
    } else {
      navigate('/orcamento');
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="font-display text-lg font-semibold tracking-tight text-zinc-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded-sm"
        >
          VideoWeb Center
        </Link>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({isActive}) =>
                `text-sm font-medium whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
                  isActive
                    ? 'text-zinc-100 border-amber-500'
                    : 'text-zinc-400 border-transparent hover:text-zinc-100 hover:border-zinc-700'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: 1 primary action + mobile menu trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryAction}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-amber-400 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
          >
            {totalItemsCount > 0 ? (
              <>
                <ShoppingBag className="h-3.5 w-3.5" />
                <span className="tabular-nums">Orçamento ({totalItemsCount})</span>
              </>
            ) : (
              <span>Solicitar Orçamento</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-md border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-[#09090B] px-4 py-4">
          <nav className="flex flex-col gap-1" aria-label="Menu móvel">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({isActive}) =>
                  `px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive ? 'bg-zinc-900 text-amber-400' : 'text-zinc-300 hover:bg-zinc-900/60 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link
              to="/orcamento"
              onClick={() => setMobileOpen(false)}
              className="mt-2 px-3 py-2.5 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-900/60 hover:text-white"
            >
              Contato & Formulário de Orçamento
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
