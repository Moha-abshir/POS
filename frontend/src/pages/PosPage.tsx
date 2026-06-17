import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Search, CreditCard, Banknote, Plus, Minus, X } from 'lucide-react';
import { api } from '../lib/api';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';

// TODO: Replace with proper catalog API hook if available
const usePosCatalog = (search?: string) => {
  return useQuery({
    queryKey: ['pos-catalog', search],
    queryFn: async () => {
      const { data } = await api.get('/catalog/products', { params: { search, limit: 100 } });
      return data;
    }
  });
};

export const PosPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { data: catalogData, isLoading } = usePosCatalog(searchTerm);
  const products = catalogData?.data || [];

  const [cart, setCart] = useState<any[]>([]);

  const addToCart = (product: any, variant: any, unit: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.unitId === unit.id);
      if (existing) {
        return prev.map((item) => 
          item.unitId === unit.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        unitId: unit.id,
        unitName: unit.name,
        quantity: 1,
        sellingPrice: Number(unit.sellingPrice),
      }];
    });
  };

  const updateQuantity = (unitId: string, delta: number) => {
    setCart((prev) => prev.map(item => {
      if (item.unitId === unitId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (unitId: string) => {
    setCart((prev) => prev.filter(item => item.unitId !== unitId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);

  return (
    <div className="h-full w-full p-6 max-w-[1600px] mx-auto flex gap-6 flex-col lg:flex-row overflow-hidden">
      {/* Left Side: Product Catalog */}
      <div className="flex-1 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-bg-surface)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Point of Sale</h1>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Select products to add to current order</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-muted)] w-5 h-5" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent outline-none text-[var(--color-text-primary)] transition-all placeholder:text-[var(--color-text-muted)]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-sunken)]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p>Loading catalog...</p>
              </div>
            </div>
          ) : products.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
               <p>No products found in catalog.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product: any) => (
                product.variants.map((variant: any) => (
                  variant.units.map((unit: any) => (
                    <div 
                      key={unit.id}
                      onClick={() => addToCart(product, variant, unit)}
                      className="group bg-[var(--color-bg-surface)] p-5 rounded-xl border border-[var(--color-border)] cursor-pointer hover:border-[var(--color-accent)] hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-transparent group-hover:bg-[var(--color-accent)] transition-colors"></div>
                      <div className="flex-1 mb-3">
                        <div className="font-semibold text-[var(--color-text-primary)] leading-tight mb-1">{product.name}</div>
                        <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-sunken)] inline-block px-2 py-1 rounded-md border border-[var(--color-border)]">
                          {variant.name} &middot; {unit.name}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="font-bold text-[var(--color-accent)] text-lg">
                          KSh {Number(unit.sellingPrice).toLocaleString()}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center group-hover:bg-[var(--color-accent)] group-hover:text-white transition-colors text-[var(--color-text-muted)]">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  ))
                ))
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Shopping Cart */}
      <div className="w-full lg:w-[420px] shrink-0 bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-2xl flex flex-col shadow-sm overflow-hidden">
        <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--color-accent)]/10 rounded-xl flex items-center justify-center text-[var(--color-accent)]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Current Order</h2>
              <p className="text-xs text-[var(--color-text-secondary)]">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])}
              className="text-xs text-[var(--color-text-secondary)] hover:text-red-500 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-bg-base)]">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
              <div className="w-20 h-20 bg-[var(--color-bg-sunken)] rounded-full flex items-center justify-center mb-4 border border-[var(--color-border-subtle)]">
                <ShoppingCart className="w-8 h-8 text-[var(--color-text-muted)] opacity-50" />
              </div>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 text-center max-w-[200px]">Select products from the catalog to start an order.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.unitId} className="flex flex-col p-4 bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border)] shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="pr-2">
                      <div className="font-semibold text-[var(--color-text-primary)] text-sm leading-tight">{item.productName}</div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1">{item.variantName} ({item.unitName})</div>
                    </div>
                    <button onClick={() => removeFromCart(item.unitId)} className="text-[var(--color-text-muted)] hover:text-red-500 transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
                    <div className="font-bold text-[var(--color-text-primary)]">
                      KSh {(item.quantity * item.sellingPrice).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 bg-[var(--color-bg-sunken)] border border-[var(--color-border)] rounded-lg p-1">
                      <button 
                        onClick={() => updateQuantity(item.unitId, -1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-[var(--color-text-secondary)] transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center text-[var(--color-text-primary)]">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.unitId, 1)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-[var(--color-text-secondary)] transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--color-border)] bg-[var(--color-bg-surface)] shrink-0">
          <div className="flex justify-between items-center mb-6">
            <span className="text-[var(--color-text-secondary)] font-medium">Total Amount</span>
            <span className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
              <span className="text-xl text-[var(--color-text-muted)] mr-1">KSh</span>
              {cartTotal.toLocaleString()}
            </span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-[var(--color-accent)] text-white py-4 rounded-xl font-bold text-lg hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100 disabled:cursor-not-allowed transition-all shadow-lg shadow-[var(--color-accent)]/20 flex justify-center items-center gap-2"
          >
            Checkout <CreditCard className="w-5 h-5" />
          </button>
        </div>
      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalAmount={cartTotal}
        onSuccess={() => setCart([])}
      />
    </div>
  );
};
