import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '../features/catalog/api/catalog.api';
import { ShoppingCart, Search, Plus, Minus, Trash2, Tag, ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { api } from '../lib/api';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';
import { UnitSelectionModal } from '../features/sales/components/UnitSelectionModal';
import { CardSkeleton } from '../components/ui/Loading';

// POS Catalog API hook
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
  const { data: fetchedCategories } = useCategories();
  const products = catalogData?.data || [];

  const [cart, setCart] = useState<any[]>(() => {
    const saved = localStorage.getItem('pos_cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);
  const [selectingUnitFor, setSelectingUnitFor] = useState<{product: any, variant: any} | null>(null);
  
  const [discount, setDiscount] = useState<number>(0);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const handleVariantClick = (product: any, variant: any) => {
    if (!variant.units || variant.units.length === 0) return;
    
    if (variant.units.length === 1) {
      addToCart(product, variant, variant.units[0]);
    } else {
      setSelectingUnitFor({ product, variant });
    }
  };

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
        maxStock: Number(variant.baseStockQuantity) || 0,
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

  const [selectedCategory, setSelectedCategory] = useState('All');

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const hasStockError = cart.some(item => {
    const product = products.find((p: any) => p.id === item.productId);
    const variant = product?.variants?.find((v: any) => v.id === item.variantId);
    const maxStock = variant ? (Number(variant.baseStockQuantity) || 0) : (item.maxStock ?? Infinity);
    return item.quantity > maxStock;
  });

  const handleApplyDiscount = () => {
    const val = Number(discountInput);
    if (!isNaN(val) && val >= 0 && val <= cartSubtotal) {
      setDiscount(val);
    }
    setIsEditingDiscount(false);
  };

  // Extract categories from API or fallback
  const categories = ['All', ...(fetchedCategories?.map(c => c.name) || Array.from(new Set<string>(products.map((p: any) => p.categoryName || 'Uncategorized'))))];

  const filteredProducts = products.filter((p: any) => {
    if (selectedCategory !== 'All' && p.categoryName !== selectedCategory && (p.categoryName || 'Uncategorized') !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="h-full w-full p-4 lg:p-6 overflow-hidden bg-[var(--color-bg-base)]">
      <div className="h-full w-full flex flex-row rounded-3xl shadow-lg border border-[var(--color-border)] overflow-hidden bg-white">
        
        {/* Left Panel: Product Catalog (65%) */}
        <div className="flex-[6.5] min-w-0 flex flex-col relative h-full bg-[#F7F6F4]/50 border-r border-[var(--color-border)]">
          {/* Sticky Header: Search and Categories */}
          <div className="sticky top-0 z-10 bg-[#F7F6F4]/80 backdrop-blur-md px-6 pt-6 pb-4 border-b border-[var(--color-border)]/55">
            <div className="relative w-full h-[46px]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-full pl-11 pr-4 bg-white border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none text-gray-900 transition-all placeholder:text-gray-400 text-sm shadow-sm"
              />
            </div>

            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-2 mt-4 pb-1">
              {categories.map((cat) => {
                // Strip trailing space + digits (from seed script) for premium display
                const cleanCatName = cat.replace(/\s+\d+$/, '');
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#D97706] text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-[var(--color-border)] hover:bg-gray-50'
                    }`}
                  >
                    {cleanCatName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
            {isLoading ? (
              <CardSkeleton count={8} />
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <ShoppingBag className="w-10 h-10 opacity-30" />
                <p className="text-sm font-semibold">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredProducts.map((product: any) => (
                  product.variants.map((variant: any) => {
                    const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                    const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                    const stock = Number(variant.baseStockQuantity) || 0;
                    const hasStock = stock > 0;
                    
                    return (
                      <div 
                        key={variant.id}
                        onClick={() => handleVariantClick(product, variant)}
                        className="group bg-white p-3 rounded-2xl border border-[var(--color-border)] shadow-sm cursor-pointer hover:shadow-md hover:border-[#D97706] transition-all duration-200 flex flex-col h-full relative overflow-hidden"
                      >
                        {/* Image / Icon container */}
                        <div className="w-full aspect-[4/3] bg-[#F7F6F4] rounded-xl mb-3 flex items-center justify-center overflow-hidden transition-colors group-hover:bg-amber-50/40 relative">
                          {(() => {
                            const posImageUrl = product.imageUrl || variant.imageUrl || product.variants?.[0]?.imageUrl;
                            return posImageUrl ? (
                              <img 
                                src={posImageUrl} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                                alt={product.name} 
                              />
                            ) : (
                              <Package className="w-9 h-9 text-gray-400/80 transition-transform group-hover:scale-105" />
                            );
                          })()}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            hasStock 
                              ? 'bg-green-50 text-green-700 border-green-200/50' 
                              : 'bg-rose-50 text-rose-700 border-rose-200/50'
                          }`}>
                            {hasStock ? `${stock} left` : 'Out of stock'}
                          </div>
                        </div>

                        {/* Name and description */}
                        <div className="flex-1 min-h-[46px]">
                          <div className="font-bold text-sm text-gray-900 truncate leading-tight" title={product.name}>
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 font-medium mt-1">
                            {variant.name === 'Default' ? 'Standard Pack' : variant.name}
                          </div>
                        </div>

                        {/* Price footer */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100/80">
                          <span className="text-sm font-bold text-[#D97706]">
                            KSh {priceToDisplay.toLocaleString()}
                          </span>
                          
                          {/* Stock status indicator dot */}
                          <div 
                            className={`w-2 h-2 rounded-full ${hasStock ? 'bg-green-500' : 'bg-rose-500'}`} 
                            title={hasStock ? 'In stock' : 'Out of stock'}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Checkout / Current Order (35%, fixed, min-w-330px) */}
        <div className="flex-[3.5] min-w-[330px] bg-[#1C1F24] flex flex-col h-full shrink-0">
          
          {/* Header */}
          <div className="p-5 shrink-0 flex flex-col gap-4 border-b border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
                <ShoppingCart className="w-5 h-5 text-[#D97706]" />
                Current Order
              </div>
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])}
                  className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  Clear Order
                </button>
              )}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-hide">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="p-4 bg-white/5 rounded-full border border-white/5 text-[#D97706]/40">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-sm text-zinc-300">Your cart is empty</p>
                  <p className="text-xs text-zinc-500 mt-1">Select products from the catalog to build an order</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cart.map((item) => {
                  const product = products.find((p: any) => p.id === item.productId);
                  const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                  const maxStock = variant ? (Number(variant.baseStockQuantity) || 0) : (item.maxStock ?? Infinity);
                  const isOverStock = item.quantity > maxStock;

                  return (
                  <div 
                    key={item.unitId} 
                    className={`flex flex-col p-4 border rounded-2xl transition-all group ${isOverStock ? 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20' : 'bg-white/5 border-white/5 hover:bg-white/8'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="pr-3 flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 font-medium">
                          {variantNameText(item)}
                        </div>
                        {isOverStock && (
                          <div className="text-red-400 text-xs mt-1.5 font-semibold">
                            Exceeds stock limit ({maxStock} available)
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-[#D97706] text-sm shrink-0">
                        KSh {(item.quantity * item.sellingPrice).toLocaleString()}
                      </div>
                    </div>
                    
                    {/* Quantity Adjustment Row */}
                    <div className="flex items-center justify-between mt-4.5 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2.5">
                        <button 
                          onClick={() => updateQuantity(item.unitId, -1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-bold text-sm w-7 text-center text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.unitId, 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.unitId)} 
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cart Summary & Action Footer */}
          <div className="p-5 bg-white/5 border-t border-white/5 shadow-2xl">
            <div className="flex flex-col gap-3.5 mb-5">
              
              {/* Subtotal */}
              <div className="flex justify-between items-center text-sm text-zinc-400 font-medium">
                <span>Subtotal</span>
                <span className="text-zinc-200">KSh {cartSubtotal.toLocaleString()}</span>
              </div>
              
              {/* Discount Row (Interactive Design) */}
              {isEditingDiscount ? (
                <div className="flex justify-between items-center text-sm text-zinc-400">
                  <span className="font-medium">Discount</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-500 font-bold">KSh</span>
                    <input
                      type="number"
                      autoFocus
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
                      onBlur={handleApplyDiscount}
                      className="w-24 bg-white/5 text-white border border-white/10 rounded-xl px-2.5 py-1.5 outline-none text-right focus:border-[#D97706] text-xs font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div 
                  className="flex justify-between items-center text-sm text-zinc-400 cursor-pointer hover:text-white transition-all group"
                  onClick={() => {
                    setDiscountInput(discount > 0 ? discount.toString() : '');
                    setIsEditingDiscount(true);
                  }}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <Tag className="w-3.5 h-3.5 text-[#D97706]" />
                    Discount <span className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-500 transition-opacity">(edit)</span>
                  </span>
                  <span className={discount > 0 ? "text-amber-500 font-bold" : "font-medium"}>
                    {discount > 0 ? `- KSh ${discount.toLocaleString()}` : '—'}
                  </span>
                </div>
              )}
              
              {/* Grand Total */}
              <div className="flex justify-between items-end border-t border-white/5 pt-4 mt-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Grand Total</span>
                <span className="text-2xl font-extrabold text-white tracking-tight leading-none">
                  KSh {cartTotal.toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Pay Button */}
            <button 
              disabled={cart.length === 0 || hasStockError}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full h-13.5 bg-gradient-to-r from-[#D97706] to-[#B45309] disabled:from-zinc-800 disabled:to-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-2xl transition-all shadow-md shadow-[#D97706]/10 flex justify-center items-center gap-1.5 cursor-pointer"
            >
              <span>{hasStockError ? 'Stock Exceeded' : 'Proceed To Payment'}</span>
              {!hasStockError && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        totalAmount={cartTotal}
        discountAmount={discount}
        onSuccess={() => {
          setCart([]);
          setDiscount(0);
          setIsCheckoutOpen(false);
        }}
      />

      {selectingUnitFor && (
        <UnitSelectionModal
          isOpen={true}
          onClose={() => setSelectingUnitFor(null)}
          product={selectingUnitFor.product}
          variant={selectingUnitFor.variant}
          onAddToCart={(p, v, u) => {
            addToCart(p, v, u);
          }}
        />
      )}
    </div>
  );
};

// Helper for displaying variant name if it's not default
function variantNameText(item: any) {
  if (item.variantName === 'Default') return item.unitName;
  return `${item.variantName} • ${item.unitName}`;
}
