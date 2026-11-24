import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import type {Product, QuoteItem} from '../types/domain';

interface QuoteCartContextValue {
  items: QuoteItem[];
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearItems: () => void;
  totalItemsCount: number;
  estimatedSubtotal: number | null;
}

const QuoteCartContext = createContext<QuoteCartContextValue | null>(null);

export function QuoteCartProvider({children}: {children: ReactNode}) {
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const addItem = (product: Product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? {...i, quantity: Math.min(99, i.quantity + quantity)} : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          brandName: product.brandName,
          quantity: Math.max(1, quantity),
          priceBrl: product.priceBrl,
        },
      ];
    });
    setDrawerOpen(true);
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? {...i, quantity: Math.min(99, quantity)} : i))
    );
  };

  const removeItem = (productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const clearItems = () => {
    setItems([]);
  };

  const totalItemsCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const estimatedSubtotal = useMemo(() => {
    if (items.length === 0) return null;
    const hasUnpriced = items.some((i) => i.priceBrl === null);
    if (hasUnpriced) return null;
    return items.reduce((sum, item) => sum + (item.priceBrl ?? 0) * item.quantity, 0);
  }, [items]);

  return (
    <QuoteCartContext.Provider
      value={{
        items,
        drawerOpen,
        setDrawerOpen,
        addItem,
        updateQuantity,
        removeItem,
        clearItems,
        totalItemsCount,
        estimatedSubtotal,
      }}
    >
      {children}
    </QuoteCartContext.Provider>
  );
}

export function useQuoteCart(): QuoteCartContextValue {
  const ctx = useContext(QuoteCartContext);
  if (!ctx) {
    throw new Error('useQuoteCart must be used within QuoteCartProvider');
  }
  return ctx;
}
