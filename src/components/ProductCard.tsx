import {Plus} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useQuoteCart} from '../context/QuoteCartContext';
import {formatBrl} from '../lib/format';
import type {Product} from '../types/domain';
import {MediaImage} from './MediaImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({product}: ProductCardProps) {
  const {addItem} = useQuoteCart();

  return (
    <article className="group flex flex-col justify-between rounded-lg border border-zinc-800/90 bg-[#121216] overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-zinc-700">
      <div>
        <Link to={`/produto/${product.slug}`} className="block overflow-hidden bg-zinc-950">
          <MediaImage
            src={product.imageUrl}
            alt={product.name}
            aspectClass="aspect-[4/3]"
            className="transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>

        <div className="p-5">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-300">{product.brandName}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{product.categoryName}</span>
          </div>

          <h3 className="mt-2 font-display text-base font-semibold text-zinc-100 leading-snug">
            <Link to={`/produto/${product.slug}`} className="hover:text-amber-400 transition-colors">
              {product.name}
            </Link>
          </h3>

          <p className="mt-2 text-sm text-zinc-400 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-800/70 px-5 py-3.5">
        <div>
          <p className="font-mono text-sm font-semibold text-zinc-100 tabular-nums">
            {formatBrl(product.priceBrl)}
          </p>
          <p className="text-xs text-zinc-500">{product.availability}</p>
        </div>

        <button
          type="button"
          onClick={() => addItem(product, 1)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-100 transition-colors hover:border-amber-500 hover:bg-amber-500 hover:text-zinc-950 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Orçar</span>
        </button>
      </div>
    </article>
  );
}
