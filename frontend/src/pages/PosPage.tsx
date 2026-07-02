import React, { useState, useEffect } from 'react';
import { useCategories, useProducts } from '../features/catalog/api/catalog.api';
import { ShoppingCart, Search, Plus, Minus, Trash2, Tag, ArrowRight, Package, ShoppingBag, X } from 'lucide-react';
import { api } from '../lib/api';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';
import { UnitSelectionModal } from '../features/sales/components/UnitSelectionModal';
import { CardSkeleton } from '../components/ui/Loading';

export const PosPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const { data: fetchedCategories } = useCategories();

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

  const hasStockError = false;

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
    if (p.isActive === false) return false;
    if (selectedCategory !== 'All' && p.categoryName !== selectedCategory && (p.categoryName || 'Uncategorized') !== selectedCategory) return false;
    
    // Client-side search matching by product name, variant name, or SKU
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.variants?.some((v: any) => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (!matchesSearch) return false;

    // Check if the product has at least one active variant
    if (!p.variants?.some((v: any) => v.isActive !== false)) return false;
    return true;
  });

  return (
    <div className="h-full w-full bg-[#F7F6F4] relative overflow-hidden">
      
      {/* Product Catalog - Full Width */}
      <div className="w-full h-full flex flex-col relative overflow-hidden">
        {/* Sticky Header: Search and Categories */}
        <div className="sticky top-0 z-10 bg-[#F7F6F4]/90 backdrop-blur-md px-4 lg:px-8 pt-6 pb-4 border-b border-black/5">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-[400px] h-[46px] shrink-0">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-full pl-11 pr-4 bg-white border-transparent rounded-full focus:ring-2 focus:ring-[#D97706] focus:border-transparent outline-none text-gray-900 transition-all placeholder:text-gray-400 text-sm shadow-sm"
              />
            </div>
            
            <div className="flex overflow-x-auto whitespace-nowrap scrollbar-hide gap-2 w-full md:w-auto pb-1 md:pb-0">
              {categories.map((cat) => {
                const cleanCatName = cat.replace(/\s+\d+$/, '');
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                    }`}
                  >
                    {cleanCatName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 scrollbar-hide pb-32">
          {isLoading ? (
            <CardSkeleton count={10} />
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <p className="text-base font-semibold">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6">
              {filteredProducts.map((product: any) => (
                product.variants.filter((v: any) => v.isActive !== false).map((variant: any) => {
                  const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                  const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                  const stock = Number(variant.baseStockQuantity) || 0;
                  const hasStock = stock > 0;
                  
                  return (
                    <div 
                      key={variant.id}
                      onClick={() => handleVariantClick(product, variant)}
                      className="group bg-white p-3 rounded-3xl cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full relative overflow-hidden"
                    >
                      {/* Image / Icon container */}
                      <div className="w-full aspect-square bg-[#F7F6F4] rounded-2xl mb-3 flex items-center justify-center overflow-hidden relative group-hover:bg-gray-50 transition-colors">
                        {(() => {
                          const posImageUrl = product.imageUrl || variant.imageUrl || product.variants?.[0]?.imageUrl;
                          return posImageUrl ? (
                            <img 
                              src={posImageUrl} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={product.name} 
                            />
                          ) : (
                            <Package className="w-10 h-10 text-gray-300 transition-transform duration-500 group-hover:scale-110" />
                          );
                        })()}
                        <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${
                          hasStock 
                            ? 'bg-white/80 text-gray-800' 
                            : 'bg-rose-50/90 text-rose-700'
                        }`}>
                          {hasStock ? `${stock} in stock` : 'Sold out'}
                        </div>
                      </div>

                      {/* Name and description */}
                      <div className="flex-1 px-1">
                        <div className="font-bold text-sm text-gray-900 leading-snug line-clamp-2" title={product.name}>
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-1">
                          {variant.name === 'Default' ? 'Standard' : variant.name}
                        </div>
                      </div>

                      {/* Price footer */}
                      <div className="px-1 mt-3 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-gray-900">
                          KSh {priceToDisplay.toLocaleString()}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white transition-colors text-gray-400">
                           <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Button (Visible when cart is closed) */}
      <div 
        className={`fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-30 transition-all duration-300 transform ${isCartOpen ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}
      >
        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-full shadow-2xl hover:shadow-black/20 flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group border border-gray-800 cursor-pointer"
        >
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-2.5 -right-2.5 bg-[#D97706] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </div>
          <div className="flex flex-col items-start border-l border-white/20 pl-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Current Order</span>
            <span className="text-sm font-extrabold">KSh {cartTotal.toLocaleString()}</span>
          </div>
        </button>
      </div>

      {/* Cart Backdrop Overlay */}
      <div 
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsCartOpen(false)} 
      />

      {/* Sliding Cart Drawer (Right Side) */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[#1C1F24] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Cart Header */}
        <div className="p-6 shrink-0 flex justify-between items-center border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-none">Your Cart</h2>
              <p className="text-xs text-zinc-400 mt-1">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors px-3 py-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(false)}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="p-6 bg-white/5 rounded-full border border-white/5 text-zinc-600">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <p className="font-bold text-base text-zinc-300">Your cart is empty</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-[250px]">Select products from the catalog to build your customer's order.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((item) => {
                const product = products.find((p: any) => p.id === item.productId);
                const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                const maxStock = variant ? (Number(variant.baseStockQuantity) || 0) : (item.maxStock ?? Infinity);
                const isOverStock = false; // Add real logic here if needed

                return (
                <div 
                  key={item.unitId} 
                  className="flex flex-col p-4 rounded-2xl transition-all group bg-white/[0.03] hover:bg-white/[0.06] border border-white/5"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-3 flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1.5 font-medium flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-white/10 rounded-md">{variantNameText(item)}</span>
                        <span>@ KSh {item.sellingPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="font-extrabold text-white text-sm shrink-0">
                      KSh {(item.quantity * item.sellingPrice).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Quantity Adjustment Row */}
                  <div className="flex items-center justify-between mt-5">
                    <div className="flex items-center bg-white/5 rounded-xl border border-white/5 p-1">
                      <button 
                        onClick={() => updateQuantity(item.unitId, -1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-sm w-10 text-center text-white">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.unitId, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.unitId)} 
                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
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
        <div className="p-6 bg-white/[0.02] border-t border-white/5 backdrop-blur-xl">
          <div className="flex flex-col gap-4 mb-6">
            
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
                    className="w-24 bg-white/5 text-white border border-white/10 rounded-xl px-2.5 py-1.5 outline-none text-right focus:border-[#D97706] text-sm font-bold transition-colors"
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
                <span className="flex items-center gap-2 font-medium">
                  <div className="p-1 rounded bg-white/5 group-hover:bg-[#D97706]/20 transition-colors">
                    <Tag className="w-3.5 h-3.5 group-hover:text-[#D97706]" />
                  </div>
                  Discount <span className="opacity-0 group-hover:opacity-100 text-[10px] text-amber-500 transition-opacity ml-1">(edit)</span>
                </span>
                <span className={discount > 0 ? "text-amber-500 font-bold" : "font-medium"}>
                  {discount > 0 ? `- KSh ${discount.toLocaleString()}` : 'Add discount'}
                </span>
              </div>
            )}
            
            {/* Grand Total */}
            <div className="flex justify-between items-end border-t border-white/10 pt-5 mt-2">
              <span className="text-sm font-bold text-zinc-400">Total</span>
              <span className="text-3xl font-extrabold text-white tracking-tight leading-none">
                KSh {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Pay Button */}
          <button 
            disabled={cart.length === 0 || hasStockError}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-14 bg-[#D97706] hover:bg-[#B45309] disabled:bg-zinc-800 disabled:text-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl transition-all shadow-lg shadow-[#D97706]/20 hover:shadow-[#D97706]/40 flex justify-center items-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            <span>{hasStockError ? 'Stock Exceeded' : 'Proceed to Checkout'}</span>
            {!hasStockError && <ArrowRight className="w-5 h-5" />}
          </button>
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
