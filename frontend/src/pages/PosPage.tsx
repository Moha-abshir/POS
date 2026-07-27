import React, { useState, useEffect } from 'react';
import { useCategories, useProducts } from '../features/catalog/api/catalog.api';
import { ShoppingCart, Search, Plus, Minus, Trash2, Tag, ArrowRight, Package, ShoppingBag, X, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { CheckoutModal } from '../features/sales/components/CheckoutModal';
import { UnitSelectionModal } from '../features/sales/components/UnitSelectionModal';
import { ReceiptModal } from '../features/sales/components/ReceiptModal';
import { CardSkeleton } from '../components/ui/Loading';
import toast from 'react-hot-toast';

export const PosPage = () => {
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.data;
    },
  });
  const productMode = meData?.business?.productMode || 'ADVANCED';

  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null);
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
  const [priceViolations, setPriceViolations] = useState<any[]>([]);
  const [activeCartEditItem, setActiveCartEditItem] = useState<any | null>(null);
  
  const [discount, setDiscount] = useState<number>(0);
  const [isEditingDiscount, setIsEditingDiscount] = useState(false);
  const [discountInput, setDiscountInput] = useState('');

  const handleVariantClick = (product: any, variant: any) => {
    if (!variant.units || variant.units.length === 0) return;
    
    if (variant.units.length === 1) {
      setActiveCartEditItem({
        product,
        variant,
        unit: variant.units[0],
        quantity: 1,
        sellingPrice: Number(variant.units[0].sellingPrice),
        isEditingExisting: false
      });
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
        minimumPrice: unit.minimumPrice !== undefined && unit.minimumPrice !== null ? Number(unit.minimumPrice) : null,
        maxStock: Number(variant.baseStockQuantity) || 0,
      }];
    });
  };

  const updateItemPrice = (unitId: string, newPrice: number) => {
    setCart((prev) => prev.map(item => {
      if (item.unitId === unitId) {
        return { ...item, sellingPrice: newPrice };
      }
      return item;
    }));
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

  const handleCheckoutClick = () => {
    const violations = cart.filter(item => item.minimumPrice !== null && item.sellingPrice < item.minimumPrice);
    if (violations.length > 0) {
      setPriceViolations(violations);
    } else {
      setIsCheckoutOpen(true);
    }
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
                className="w-full h-full pl-11 pr-4 bg-white border border-gray-200 rounded-full focus:ring-1 focus:ring-black focus:border-black outline-none text-gray-900 transition-all placeholder:text-gray-400 text-sm shadow-sm"
              />
            </div>
            
            {productMode !== 'SIMPLE' && (
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
            )}
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
            productMode === 'SIMPLE' ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <tr>
                      <th scope="col" className="px-6 py-4">Product Name</th>
                      <th scope="col" className="px-6 py-4">Item Code / SKU</th>
                      <th scope="col" className="px-6 py-4 text-right">Price</th>
                      <th scope="col" className="px-6 py-4 text-center">Stock</th>
                      <th scope="col" className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700">
                    {filteredProducts.map((product: any) => (
                      product.variants.filter((v: any) => v.isActive !== false).map((variant: any) => {
                        const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                        const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                        const stock = Number(variant.baseStockQuantity) || 0;
                        const hasStock = stock > 0;

                        return (
                          <tr 
                            key={variant.id}
                            onClick={() => handleVariantClick(product, variant)}
                            className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                          >
                            <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 font-mono text-gray-500 font-semibold">
                              {variant.sku || '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-extrabold text-gray-900 text-sm">
                              KSh {priceToDisplay.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                hasStock 
                                  ? 'bg-green-50 text-green-700 border-green-100' 
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {hasStock ? `${stock} in stock` : 'Sold out'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-center">
                                <button 
                                  onClick={() => handleVariantClick(product, variant)}
                                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white text-gray-400 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ))}
                  </tbody>
                </table>
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
            )
          )}
        </div>
      </div>

      {/* Floating Cart Button (Visible when cart is closed) */}
      <div 
        className={`fixed bottom-[88px] right-6 lg:bottom-8 lg:right-8 z-30 ${isCartOpen ? 'hidden' : 'block'}`}
      >
        <button
          onClick={() => setIsCartOpen(true)}
          className="bg-black hover:bg-black text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-4 transition-all hover:scale-105 active:scale-95 group border border-black cursor-pointer"
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
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsCartOpen(false)} 
      />

      {/* Sliding Cart Drawer (Right Side) */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[420px] bg-[var(--color-bg-surface)] border-l border-[var(--color-border)] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Cart Header */}
        <div className="p-6 shrink-0 flex justify-between items-center border-b border-[var(--color-border)] bg-[var(--color-bg-base)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent-subtle)] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <h2 className="text-[var(--color-text-primary)] font-bold text-lg leading-none">Your Cart</h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-xs font-bold text-[var(--color-text-secondary)] hover:text-red-500 transition-colors px-3 py-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button 
              onClick={() => setIsCartOpen(false)}
              className="w-10 h-10 rounded-full bg-[var(--color-bg-sunken)] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="p-6 bg-[var(--color-bg-sunken)] rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <div>
                <p className="font-bold text-base text-[var(--color-text-primary)]">Your cart is empty</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1 max-w-[250px]">Select products from the catalog to build your customer's order.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {cart.map((item) => {
                const product = products.find((p: any) => p.id === item.productId);
                const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                const maxStock = variant ? (Number(variant.baseStockQuantity) || 0) : (item.maxStock ?? Infinity);
                const isOverStock = false; // Add real logic here if needed

                return (
                <div 
                  key={item.unitId} 
                  className="flex flex-col p-2.5 rounded-xl transition-all group bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)]"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-2 flex-1 min-w-0">
                      <div className="font-bold text-[var(--color-text-primary)] text-xs truncate" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5 font-medium flex items-center gap-1.5">
                        <span>{variantNameText(item)}</span>
                        <span>•</span>
                        <span>{item.quantity} x KSh {item.sellingPrice.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="font-extrabold text-[var(--color-text-primary)] text-xs shrink-0 text-right">
                      KSh {(item.quantity * item.sellingPrice).toLocaleString()}
                    </div>
                  </div>
                  
                  {/* Bottom Actions: Edit Pencil + Delete Trash */}
                  <div className="flex items-center justify-end mt-2 gap-1.5 pt-1.5 border-t border-[var(--color-border)]/30">
                    <button 
                      onClick={() => {
                        const product = products.find((p: any) => p.id === item.productId);
                        const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                        const unit = variant?.units?.find((u: any) => u.id === item.unitId);
                        if (product && variant && unit) {
                          setActiveCartEditItem({
                            product,
                            variant,
                            unit,
                            quantity: item.quantity,
                            sellingPrice: item.sellingPrice,
                            isEditingExisting: true,
                            cartUnitId: item.unitId
                          });
                        }
                      }} 
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all cursor-pointer"
                      title="Edit price & quantity"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button 
                      onClick={() => removeFromCart(item.unitId)} 
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Summary & Action Footer */}
        <div className="p-6 bg-[var(--color-bg-base)] border-t border-[var(--color-border)]">
          <div className="flex flex-col gap-4 mb-6">
            
            {/* Subtotal */}
            <div className="flex justify-between items-center text-sm text-[var(--color-text-secondary)] font-medium">
              <span>Subtotal</span>
              <span className="text-[var(--color-text-primary)] font-bold">KSh {cartSubtotal.toLocaleString()}</span>
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
                    className="w-24 bg-white text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl px-2.5 py-1.5 outline-none text-right focus:border-[#D97706] text-sm font-bold transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div 
                className="flex justify-between items-center text-sm text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)] transition-all group"
                onClick={() => {
                  setDiscountInput(discount > 0 ? discount.toString() : '');
                  setIsEditingDiscount(true);
                }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <div className="p-1 rounded bg-[var(--color-bg-sunken)] group-hover:bg-[var(--color-accent-subtle)] transition-colors">
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
            <div className="flex justify-between items-end border-t border-[var(--color-border)] pt-5 mt-2">
              <span className="text-sm font-bold text-[var(--color-text-secondary)]">Total</span>
              <span className="text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight leading-none">
                KSh {cartTotal.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Pay Button */}
          <button 
            disabled={cart.length === 0 || hasStockError}
            onClick={handleCheckoutClick}
            className="w-full h-14 bg-black hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-2xl transition-all shadow-lg flex justify-center items-center gap-2 cursor-pointer active:scale-[0.98]"
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
        onSuccess={(saleData) => {
          setCart([]);
          setDiscount(0);
          setIsCheckoutOpen(false);
          const sId = saleData?.id || saleData?.localId;
          if (sId) {
            setCompletedSaleId(sId);
          }
        }}
      />

      <ReceiptModal
        saleId={completedSaleId}
        onClose={() => setCompletedSaleId(null)}
      />

      {selectingUnitFor && (
        <UnitSelectionModal
          isOpen={true}
          onClose={() => setSelectingUnitFor(null)}
          product={selectingUnitFor.product}
          variant={selectingUnitFor.variant}
          onAddToCart={(p, v, u) => {
            setSelectingUnitFor(null);
            setActiveCartEditItem({
              product: p,
              variant: v,
              unit: u,
              quantity: 1,
              sellingPrice: Number(u.sellingPrice),
              isEditingExisting: false
            });
          }}
        />
      )}

      {/* Price Violations Modal */}
      {priceViolations.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setPriceViolations([])} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[450px] m-4 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-red-600 flex items-center gap-2">
                ⚠️ Price Violation Alert
              </h2>
              <button onClick={() => setPriceViolations([])} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                The following products have been priced below their configured <strong>Minimum Price</strong>. Please correct the selling prices to proceed.
              </p>
              
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {priceViolations.map((item) => (
                  <div key={item.unitId} className="p-3 bg-gray-50 border border-red-100 rounded-xl space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-gray-900 text-xs truncate max-w-[200px]" title={item.productName}>
                          {item.productName}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {variantNameText(item)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          Min: KSh {item.minimumPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] text-gray-600 font-medium">New Price:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-400">KSh</span>
                        <input
                          type="number"
                          min={item.minimumPrice}
                          step="0.01"
                          value={item.sellingPrice}
                          onChange={(e) => {
                            const newPrice = Number(e.target.value);
                            updateItemPrice(item.unitId, newPrice);
                            setPriceViolations(prev => prev.map(violation => 
                              violation.unitId === item.unitId ? { ...violation, sellingPrice: newPrice } : violation
                            ));
                          }}
                          className="w-24 h-8 px-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setPriceViolations([])} 
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => {
                  const remaining = cart.filter(item => item.minimumPrice !== null && item.sellingPrice < item.minimumPrice);
                  if (remaining.length === 0) {
                    setPriceViolations([]);
                    setIsCheckoutOpen(true);
                  } else {
                    setPriceViolations(remaining);
                    toast.error('Some products are still priced below their minimum price.');
                  }
                }}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors"
              >
                Resolve & Checkout
              </button>
            </div>
          </div>
        </div>
      )}
      {activeCartEditItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px]" onClick={() => setActiveCartEditItem(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[400px] m-4 flex flex-col transition-all duration-300">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {activeCartEditItem.isEditingExisting ? 'Edit Item Details' : 'Add to Cart'}
              </h2>
              <button onClick={() => setActiveCartEditItem(null)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-gray-900">{activeCartEditItem.product.name}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {activeCartEditItem.variant.name === 'Default' ? 'Standard' : activeCartEditItem.variant.name} • {activeCartEditItem.unit.name}
                </p>
              </div>

              {/* Price inputs */}
              <div className="grid grid-cols-2 gap-3">
                {/* Minimum Price */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Min Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KSh</span>
                    <input
                      type="text"
                      readOnly
                      value={activeCartEditItem.unit.minimumPrice ? Number(activeCartEditItem.unit.minimumPrice).toLocaleString() : 'N/A'}
                      className="w-full h-10 pl-9 pr-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 text-sm font-bold cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                {/* Selling Price */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Selling Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">KSh</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={activeCartEditItem.sellingPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setActiveCartEditItem(prev => prev ? { ...prev, sellingPrice: val } : null);
                      }}
                      className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-black focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>
              {activeCartEditItem.unit.minimumPrice && activeCartEditItem.sellingPrice < Number(activeCartEditItem.unit.minimumPrice) && (
                <p className="text-[10px] text-red-500 font-medium mt-1">
                  ⚠️ Selling price cannot be below minimum price (KSh {Number(activeCartEditItem.unit.minimumPrice).toLocaleString()})
                </p>
              )}

              {/* Quantity selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Quantity</label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 w-fit">
                  <button 
                    type="button"
                    onClick={() => setActiveCartEditItem(prev => prev ? { ...prev, quantity: Math.max(1, prev.quantity - 1) } : null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-all cursor-pointer shadow-sm"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={activeCartEditItem.quantity}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      setActiveCartEditItem(prev => prev ? { ...prev, quantity: val } : null);
                    }}
                    className="w-12 text-center bg-transparent border-none text-gray-900 text-sm font-bold outline-none"
                  />
                  <button 
                    type="button"
                    onClick={() => setActiveCartEditItem(prev => prev ? { ...prev, quantity: prev.quantity + 1 } : null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-gray-900 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3 rounded-b-2xl">
              <button 
                type="button" 
                onClick={() => setActiveCartEditItem(null)} 
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="button"
                disabled={activeCartEditItem.unit.minimumPrice && activeCartEditItem.sellingPrice < Number(activeCartEditItem.unit.minimumPrice)}
                onClick={() => {
                  if (activeCartEditItem.isEditingExisting && activeCartEditItem.cartUnitId) {
                    setCart(prev => prev.map(item => 
                      item.unitId === activeCartEditItem.cartUnitId 
                        ? { ...item, sellingPrice: activeCartEditItem.sellingPrice, quantity: activeCartEditItem.quantity }
                        : item
                    ));
                  } else {
                    setCart(prev => {
                      const existing = prev.find(item => item.unitId === activeCartEditItem.unit.id);
                      if (existing) {
                        return prev.map(item => 
                          item.unitId === activeCartEditItem.unit.id 
                            ? { ...item, quantity: activeCartEditItem.quantity, sellingPrice: activeCartEditItem.sellingPrice } 
                            : item
                        );
                      }
                      return [...prev, {
                        productId: activeCartEditItem.product.id,
                        productName: activeCartEditItem.product.name,
                        variantId: activeCartEditItem.variant.id,
                        variantName: activeCartEditItem.variant.name,
                        unitId: activeCartEditItem.unit.id,
                        unitName: activeCartEditItem.unit.name,
                        quantity: activeCartEditItem.quantity,
                        sellingPrice: activeCartEditItem.sellingPrice,
                        minimumPrice: activeCartEditItem.unit.minimumPrice ? Number(activeCartEditItem.unit.minimumPrice) : null,
                        maxStock: Number(activeCartEditItem.variant.baseStockQuantity) || 0,
                      }];
                    });
                  }
                  setActiveCartEditItem(null);
                }}
                className="px-5 py-2.5 bg-black hover:bg-black text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {activeCartEditItem.isEditingExisting ? 'Save Changes' : 'Add to Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for displaying variant name if it's not default
function variantNameText(item: any) {
  if (item.variantName === 'Default') return item.unitName;
  return `${item.variantName} • ${item.unitName}`;
}
