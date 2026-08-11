import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
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

  // Input value state (instant UI reaction)
  const [searchInputVal, setSearchInputVal] = useState('');
  // Deferred search query (prevents input typing lag)
  const deferredSearchTerm = useDeferredValue(searchInputVal);

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

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const rowRefs = useRef<{ [key: number]: HTMLTableRowElement | HTMLDivElement | null }>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

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

  // Extract categories
  const categories = ['All', ...(fetchedCategories?.map(c => c.name) || Array.from(new Set<string>(products.map((p: any) => p.categoryName || 'Uncategorized'))))];

  // Pre-index product search keys for 1,800+ catalog items (lightning fast matching)
  const indexedItems = useMemo(() => {
    const items: { product: any; variant: any; searchStr: string }[] = [];
    products.forEach((product: any) => {
      if (product.isActive === false) return;
      const prodName = (product.name || '').toLowerCase();
      const catName = (product.categoryName || 'Uncategorized').toLowerCase();

      product.variants?.forEach((variant: any) => {
        if (variant.isActive === false) return;
        const varName = (variant.name || '').toLowerCase();
        const sku = (variant.sku || '').toLowerCase();

        items.push({
          product,
          variant,
          searchStr: `${prodName} ${sku} ${varName} ${catName}`
        });
      });
    });
    return items;
  }, [products]);

  // Fast filtered & limited list of items (max 100 for instant 60fps rendering)
  const flatItems = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();
    let filtered = indexedItems;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((item) => (item.product.categoryName || 'Uncategorized') === selectedCategory);
    }

    if (query) {
      filtered = filtered.filter((item) => item.searchStr.includes(query));
    }

    return filtered.slice(0, 100);
  }, [indexedItems, deferredSearchTerm, selectedCategory]);

  // Only auto-select row 0 when user actively types a search query; reset to -1 when search is empty
  useEffect(() => {
    if (deferredSearchTerm.trim() !== '') {
      setSelectedIndex(0);
    } else {
      setSelectedIndex(-1);
    }
  }, [deferredSearchTerm, selectedCategory]);

  // Scroll focused element into view
  useEffect(() => {
    if (selectedIndex >= 0) {
      const el = rowRefs.current[selectedIndex];
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // When Add to Cart modal opens, auto-focus quantity input first and select text
  useEffect(() => {
    if (activeCartEditItem) {
      const timer = setTimeout(() => {
        if (quantityInputRef.current) {
          quantityInputRef.current.focus();
          quantityInputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [activeCartEditItem?.product?.id, activeCartEditItem?.variant?.id, activeCartEditItem?.unit?.id]);

  // Global Type-to-Search: any printable key typed anywhere on the POS page focuses the search bar
  useEffect(() => {
    const handleGlobalTypeToSearch = (e: KeyboardEvent) => {
      // If any modal is active or discount editing is active, don't hijack focus
      if (activeCartEditItem || selectingUnitFor || isCheckoutOpen || priceViolations.length > 0 || isEditingDiscount) {
        return;
      }

      // Ignore shortcut keys (e.g. Ctrl+C, Alt+Tab, Cmd+R)
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      // Check if user is currently typing in an input or textarea
      const activeEl = document.activeElement;
      const isEditingField = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT'
      );

      // If focus is already in an input element, do nothing
      if (isEditingField) return;

      // Direct printable characters (letters, numbers, space, backspace, symbols) to search input
      if (e.key.length === 1 || e.key === 'Backspace') {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalTypeToSearch);
    return () => window.removeEventListener('keydown', handleGlobalTypeToSearch);
  }, [activeCartEditItem, selectingUnitFor, isCheckoutOpen, priceViolations, isEditingDiscount]);

  // Keyboard navigation for main list (Up/Down/Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is open, don't hijack navigation
      if (activeCartEditItem || selectingUnitFor || isCheckoutOpen || priceViolations.length > 0) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev < 0) return 0;
          return Math.min(prev + 1, flatItems.length - 1);
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (prev < 0) return 0;
          return Math.max(prev - 1, 0);
        });
      } else if (e.key === 'Enter') {
        // Only open modal if an item is explicitly selected (selectedIndex >= 0)
        if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
          e.preventDefault();
          const target = flatItems[selectedIndex];
          handleVariantClick(target.product, target.variant);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, selectedIndex, activeCartEditItem, selectingUnitFor, isCheckoutOpen, priceViolations]);

  // Confirm Add to Cart logic & refocus empty search bar
  const handleConfirmAddToCart = () => {
    if (!activeCartEditItem) return;

    const numSellingPrice = Number(activeCartEditItem.sellingPrice) || 0;
    const numQuantity = Math.max(0.001, Number(activeCartEditItem.quantity) || 1);

    if (activeCartEditItem.unit.minimumPrice && numSellingPrice < Number(activeCartEditItem.unit.minimumPrice)) {
      toast.error(`Selling price cannot be below minimum price (KSh ${Number(activeCartEditItem.unit.minimumPrice).toLocaleString()})`);
      return;
    }

    if (activeCartEditItem.isEditingExisting && activeCartEditItem.cartUnitId) {
      setCart((prev) => prev.map((item) => 
        item.unitId === activeCartEditItem.cartUnitId 
          ? { ...item, sellingPrice: numSellingPrice, quantity: numQuantity }
          : item
      ));
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.unitId === activeCartEditItem.unit.id);
        if (existing) {
          return prev.map((item) => 
            item.unitId === activeCartEditItem.unit.id 
              ? { ...item, quantity: numQuantity, sellingPrice: numSellingPrice } 
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
          quantity: numQuantity,
          sellingPrice: numSellingPrice,
          minimumPrice: activeCartEditItem.unit.minimumPrice ? Number(activeCartEditItem.unit.minimumPrice) : null,
          maxStock: Number(activeCartEditItem.variant.baseStockQuantity) || 0,
        }];
      });
    }

    // Close modal, clear search input, reset selection, and refocus search input for next item
    setActiveCartEditItem(null);
    setSearchInputVal('');
    setSelectedIndex(-1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleCloseModal = () => {
    setActiveCartEditItem(null);
    setSelectedIndex(-1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

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
                ref={searchInputRef}
                type="text"
                autoFocus
                placeholder="Search products by Name or SKU..."
                value={searchInputVal}
                onChange={(e) => setSearchInputVal(e.target.value)}
                className="w-full h-full pl-11 pr-4 bg-white border border-gray-200 rounded-full focus:ring-2 focus:ring-black focus:border-black outline-none text-gray-900 transition-all placeholder:text-gray-400 text-sm shadow-sm font-semibold"
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

        {/* Product List / Grid */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 scrollbar-hide pb-32">
          {isLoading ? (
            <CardSkeleton count={10} />
          ) : flatItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
              <ShoppingBag className="w-12 h-12 opacity-30" />
              <p className="text-base font-semibold">No products found</p>
            </div>
          ) : (
            productMode === 'SIMPLE' ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                  <thead className="bg-gray-100 text-[11px] font-extrabold uppercase tracking-wider text-gray-700 border-b border-gray-300">
                    <tr>
                      <th scope="col" className="px-6 py-4 w-36">Item Code / SKU</th>
                      <th scope="col" className="px-6 py-4">Product Name</th>
                      <th scope="col" className="px-6 py-4 text-right">Price</th>
                      <th scope="col" className="px-6 py-4 text-center">Stock</th>
                      <th scope="col" className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700">
                    {flatItems.map(({ product, variant }, flatIndex) => {
                      const isFocused = selectedIndex === flatIndex;
                      const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                      const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                      const stock = Number(variant.baseStockQuantity) || 0;
                      const hasStock = stock > 0;

                      return (
                        <tr 
                          key={variant.id}
                          ref={(el) => (rowRefs.current[flatIndex] = el)}
                          onClick={() => {
                            setSelectedIndex(flatIndex);
                            handleVariantClick(product, variant);
                          }}
                          style={isFocused ? { backgroundColor: '#D97706', color: '#ffffff' } : {}}
                          className={`transition-all cursor-pointer group ${
                            isFocused
                              ? 'font-extrabold text-white shadow-md'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          {/* Column 1: Item Code / SKU First */}
                          <td className={`px-6 py-4 font-mono font-extrabold text-sm ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                            {variant.sku || '-'}
                          </td>
                          {/* Column 2: Product Name */}
                          <td className={`px-6 py-4 font-bold text-sm ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                            {product.name}
                          </td>
                          {/* Column 3: Price */}
                          <td className={`px-6 py-4 text-right font-extrabold text-sm ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                            KSh {priceToDisplay.toLocaleString()}
                          </td>
                          {/* Column 4: Stock */}
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isFocused
                                ? 'bg-white text-[#D97706] border-white shadow-sm font-extrabold'
                                : hasStock 
                                  ? 'bg-green-50 text-green-700 border-green-100' 
                                  : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {hasStock ? `${stock} in stock` : 'Sold out'}
                            </span>
                          </td>
                          {/* Column 5: Action */}
                          <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-center">
                              <button 
                                onClick={() => handleVariantClick(product, variant)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                                  isFocused
                                    ? 'bg-white text-[#D97706] font-bold shadow-sm'
                                    : 'bg-gray-50 text-gray-400 group-hover:bg-[#D97706] group-hover:text-white'
                                }`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 lg:gap-6">
                {flatItems.map(({ product, variant }, flatIndex) => {
                  const isFocused = selectedIndex === flatIndex;
                  const basePriceUnit = variant.units?.find((u: any) => u.isDefault) || variant.units?.[0];
                  const priceToDisplay = basePriceUnit ? Number(basePriceUnit.sellingPrice) : 0;
                  const stock = Number(variant.baseStockQuantity) || 0;
                  const hasStock = stock > 0;
                  
                  return (
                    <div 
                      key={variant.id}
                      ref={(el) => (rowRefs.current[flatIndex] = el)}
                      onClick={() => {
                        setSelectedIndex(flatIndex);
                        handleVariantClick(product, variant);
                      }}
                      style={isFocused ? { backgroundColor: '#D97706', color: '#ffffff' } : {}}
                      className={`group p-3 rounded-3xl cursor-pointer hover:shadow-xl transition-all duration-300 flex flex-col h-full relative overflow-hidden ${
                        isFocused ? 'scale-[1.02] shadow-xl text-white' : 'bg-white'
                      }`}
                    >
                      {/* SKU Badge */}
                      {variant.sku && (
                        <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-mono font-black shadow-sm ${
                          isFocused ? 'bg-white text-[#D97706]' : 'bg-gray-900 text-white'
                        }`}>
                          SKU: {variant.sku}
                        </div>
                      )}

                      {/* Image / Icon container */}
                      <div className={`w-full aspect-square rounded-2xl mb-3 flex items-center justify-center overflow-hidden relative transition-colors ${
                        isFocused ? 'bg-white/10' : 'bg-[#F7F6F4] group-hover:bg-gray-50'
                      }`}>
                        {(() => {
                          const posImageUrl = product.imageUrl || variant.imageUrl || product.variants?.[0]?.imageUrl;
                          return posImageUrl ? (
                            <img 
                              src={posImageUrl} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              alt={product.name} 
                            />
                          ) : (
                            <Package className={`w-10 h-10 transition-transform duration-500 group-hover:scale-110 ${
                              isFocused ? 'text-white/80' : 'text-gray-300'
                            }`} />
                          );
                        })()}
                        <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm backdrop-blur-md ${
                          isFocused
                            ? 'bg-white text-[#D97706] font-extrabold'
                            : hasStock 
                              ? 'bg-white/80 text-gray-800' 
                              : 'bg-rose-50/90 text-rose-700'
                        }`}>
                          {hasStock ? `${stock} in stock` : 'Sold out'}
                        </div>
                      </div>

                      {/* Name and description */}
                      <div className="flex-1 px-1">
                        <div className={`font-bold text-sm leading-snug line-clamp-2 ${isFocused ? 'text-white' : 'text-gray-900'}`} title={product.name}>
                          {product.name}
                        </div>
                        <div className={`text-xs font-medium mt-1 ${isFocused ? 'text-white/80' : 'text-gray-500'}`}>
                          {variant.name === 'Default' ? 'Standard' : variant.name}
                        </div>
                      </div>

                      {/* Price footer */}
                      <div className="px-1 mt-3 flex items-center justify-between">
                        <span className={`text-sm font-extrabold ${isFocused ? 'text-white' : 'text-gray-900'}`}>
                          KSh {priceToDisplay.toLocaleString()}
                        </span>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          isFocused
                            ? 'bg-white text-[#D97706] font-bold shadow-sm'
                            : 'bg-gray-50 text-gray-400 group-hover:bg-[#D97706] group-hover:text-white'
                        }`}>
                           <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
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

                return (
                <div 
                  key={item.unitId} 
                  className="flex flex-col p-2.5 rounded-xl transition-all group bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-sunken)] border border-[var(--color-border)]"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-2 flex-1 min-w-0">
                      <div className="font-extrabold text-[var(--color-text-primary)] text-sm truncate" title={item.productName}>
                        {item.productName}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1 font-bold flex items-center gap-1.5 flex-wrap">
                        <span>{variantNameText(item)}</span>
                        <span>•</span>
                        <span className="text-gray-900 font-extrabold">{item.quantity} x KSh {item.sellingPrice.toLocaleString()}</span>
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
            
            {/* Discount Row */}
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
            className="w-full py-3.5 bg-black disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold text-base rounded-[var(--radius-md)] cursor-pointer select-none flex justify-center items-center gap-2"
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

      {/* Add to Cart / Edit Item Modal */}
      {activeCartEditItem && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] m-4 flex flex-col border border-gray-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-[#F7F6F4]">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {activeCartEditItem.isEditingExisting ? 'Edit Item Details' : 'Add to Cart'}
                </h2>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  <span className="font-bold text-gray-900">{activeCartEditItem.product.name}</span>
                  {activeCartEditItem.variant.sku ? ` • SKU: ${activeCartEditItem.variant.sku}` : ''}
                  {activeCartEditItem.variant.name !== 'Default' ? ` • ${activeCartEditItem.variant.name}` : ''}
                  {` • ${activeCartEditItem.unit.name}`}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body: Straight Line Inputs (Quantity -> Selling Price -> Total Calculated Price) */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                
                {/* 1. Quantity Input (Focused First) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Quantity <span className="text-[#D97706]">*</span>
                  </label>
                  <input
                    ref={quantityInputRef}
                    type="text"
                    inputMode="decimal"
                    value={activeCartEditItem.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setActiveCartEditItem(prev => prev ? { ...prev, quantity: val as any } : null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        priceInputRef.current?.focus();
                        priceInputRef.current?.select();
                      }
                    }}
                    className="w-full h-11 px-3.5 bg-white border-2 border-gray-300 rounded-xl text-gray-900 text-base font-extrabold focus:outline-none focus:border-black focus:ring-0 shadow-sm"
                    placeholder="e.g. 1 or 0.5"
                  />
                </div>

                {/* 2. Unit Selling Price (Focused Second) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Selling Price <span className="text-[#D97706]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">KSh</span>
                    <input
                      ref={priceInputRef}
                      type="text"
                      inputMode="decimal"
                      value={activeCartEditItem.sellingPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                          setActiveCartEditItem(prev => prev ? { ...prev, sellingPrice: val as any } : null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          handleConfirmAddToCart();
                        }
                      }}
                      className="w-full h-11 pl-11 pr-3.5 bg-white border-2 border-gray-300 rounded-xl text-gray-900 text-base font-extrabold focus:outline-none focus:border-black focus:ring-0 shadow-sm"
                    />
                  </div>
                </div>

                {/* 3. Total Price (Read-only, calculated in real-time) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                    Total Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">KSh</span>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={
                        isNaN(Number(activeCartEditItem.quantity) * Number(activeCartEditItem.sellingPrice))
                          ? '0'
                          : (Number(activeCartEditItem.quantity) * Number(activeCartEditItem.sellingPrice)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                      }
                      className="w-full h-11 pl-11 pr-3.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 text-base font-black cursor-not-allowed select-none outline-none"
                    />
                  </div>
                </div>

              </div>

              {activeCartEditItem.unit.minimumPrice && Number(activeCartEditItem.sellingPrice) < Number(activeCartEditItem.unit.minimumPrice) && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1 mt-1">
                  ⚠️ Selling price cannot be below minimum price (KSh {Number(activeCartEditItem.unit.minimumPrice).toLocaleString()})
                </p>
              )}
            </div>
            
            {/* Footer: Min Price on Far Left, Cancel & Add to Order on Right */}
            <div className="px-6 py-4 border-t border-gray-200 bg-[#F7F6F4] flex items-center justify-between rounded-b-2xl">
              <div>
                <div className="px-3.5 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 shadow-sm inline-flex items-center gap-1.5">
                  <span className="text-gray-500 uppercase tracking-wider text-[10px]">Min Price:</span>
                  <span className="text-gray-900 font-extrabold">
                    {activeCartEditItem.unit.minimumPrice ? `KSh ${Number(activeCartEditItem.unit.minimumPrice).toLocaleString()}` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={activeCartEditItem.unit.minimumPrice && Number(activeCartEditItem.sellingPrice) < Number(activeCartEditItem.unit.minimumPrice)}
                  onClick={handleConfirmAddToCart}
                  className="px-6 py-2.5 bg-black hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-colors shadow-md cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {activeCartEditItem.isEditingExisting ? 'Save Changes' : 'Add to Order (Enter ↵)'}
                </button>
              </div>
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
