import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type CartContextType = {
  skus: string[];
  ready: boolean;
  add: (sku: string) => void;
  remove: (sku: string) => void;
  clear: () => void;
};
const CartContext = createContext<CartContextType | null>(null);
export function CartProvider({ children }: { children: ReactNode }) {
  const [skus, setSkus] = useState<string[]>([]),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('igh_bag') || '[]');
      if (Array.isArray(saved))
        setSkus([...new Set(saved.filter((s): s is string => typeof s === 'string'))].slice(0, 20));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem('igh_bag', JSON.stringify(skus));
  }, [skus, ready]);
  return (
    <CartContext.Provider
      value={{
        skus,
        ready,
        add: (sku) => setSkus((s) => (s.includes(sku) ? s : [...s, sku].slice(0, 20))),
        remove: (sku) => setSkus((s) => s.filter((x) => x !== sku)),
        clear: () => setSkus([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('Missing CartProvider');
  return ctx;
}
