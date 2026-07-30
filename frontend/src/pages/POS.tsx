import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, ShoppingCart, User, Store, ChevronRight, Pill, Info, Plus, Minus, Trash2, X, Maximize2, FileText, CheckCircle2, Delete, Palette, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { productApi, saleApi, configApi } from '../services/api';
import { socket, socketEvents } from '../services/socket';
import { useCart } from '../context/CartContext';
import Sidebar from '../components/Sidebar';
import { addToOfflineQueue, syncOfflineSales } from '../services/offlineQueue';
import CheckoutModal from '../components/CheckoutModal';
import TicketModal from '../components/TicketModal';
import BranchSwitcher from '../components/BranchSwitcher';
import VirtualKeyboard from '../components/VirtualKeyboard';

const getCategoryColor = (catName: string) => {
  if (!catName) return '#475569';
  let hash = 0;
  for (let i = 0; i < catName.length; i++) {
    hash = catName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const POS: React.FC = () => {
  const { cart, addToCart, removeFromCart, updateQuantity, updateItemVariant, updateItemNotes, updateCustomPrice, updateCustomData, subtotal, total, clearCart, shippingCost, setShippingCost } = useCart();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchKeyboardOpen, setIsSearchKeyboardOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [zoomedProduct, setZoomedProduct] = useState<any>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [flyingItems, setFlyingItems] = useState<any[]>([]);
  const [designModal, setDesignModal] = useState<{ isOpen: boolean; item: any }>({ isOpen: false, item: null });
  const [designForm, setDesignForm] = useState({ position: [] as string[], imageUrl: '', notes: '' });
  const printRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Usuario"}');

  useEffect(() => {
    fetchData();

    // Listen for real-time updates
    socket.on(socketEvents.PRODUCT_CREATED, fetchData);
    socket.on(socketEvents.PRODUCT_UPDATED, fetchData);
    socket.on(socketEvents.INVENTORY_UPDATED, fetchData);

    return () => {
      socket.off(socketEvents.PRODUCT_CREATED);
      socket.off(socketEvents.PRODUCT_UPDATED);
      socket.off(socketEvents.INVENTORY_UPDATED);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes, configRes] = await Promise.all([
        productApi.getProducts(user.branch_id),
        productApi.getCategories(),
        configApi.getConfig()
      ]);
      setProducts(prodRes.data);
      setConfig(configRes.data);

      const cats = [{ id: 'all', name: 'Todos' }, ...catRes.data];
      // Verificar si hay productos sin categoría para añadir el chip "Sin Categoría"
      const hasUncategorized = prodRes.data.some((p: any) => !p.category_name);
      if (hasUncategorized) {
        cats.push({ id: 'none', name: 'Sin Categoría' });
      }
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    // Prevent double clicking while animating if needed, but usually not necessary
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const newItem = {
      id: Date.now(),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      imageUrl: product.imageUrl || `https://via.placeholder.com/150?text=${encodeURIComponent(product.name)}`
    };

    setFlyingItems(prev => [...prev, newItem]);
    addToCart(product);

    // Remove after animation finish
    setTimeout(() => {
      setFlyingItems(prev => prev.filter(item => item.id !== newItem.id));
    }, 850);
  };

  const filteredProducts = products.filter(p => {
    let matchesCategory = false;
    if (activeCategory === 'Todos') {
      matchesCategory = true;
    } else if (activeCategory === 'Sin Categoría') {
      matchesCategory = !p.category_name;
    } else {
      matchesCategory = p.category_name === activeCategory;
    }

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleConfirmCheckout = async (paymentMethod: string, amountTendered: number, targetClient: any | null, dueDate?: string, customDate?: string, shippingDate?: string, userId?: number, deliveryId?: number) => {
    if (cart.length === 0) return;

    const cartTotal = cart.reduce((sum, item) => {
      const price = item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.base_price);
      return sum + (price * Number(item.quantity));
    }, 0);
    const finalTotal = cartTotal + shippingCost;
    const isPartial = paymentMethod.includes('+CREDITO');
    const change = isPartial ? 0 : (amountTendered - finalTotal);
    const balance = isPartial ? (finalTotal - amountTendered) : 0;

    const saleData = {
      branch_id: user.branch_id || 1,
      user_id: userId,
      payment_method: paymentMethod,
      client_id: targetClient ? targetClient.id : 1,
      due_date: dueDate,
      customDate: customDate,
      amount_tendered: amountTendered,
      change: change > 0 ? change : 0,
      balance: balance,
      shipping: shippingCost,
      shipping_date: shippingCost > 0 && shippingDate ? shippingDate : null,
      fulfillment_status: shippingCost > 0 && shippingDate ? 'VENDIDO' : undefined,
      delivery_id: deliveryId,
      items: cart.map(item => ({
        product_id: item.id,
        quantity: item.selectedVariant ? parseInt(item.quantity as any) * parseInt(item.selectedVariant.quantity as any) : parseInt(item.quantity as any),
        unitPrice: item.customPrice ? Number(item.customPrice) : (item.selectedVariant ? Number(item.selectedVariant.price) / Number(item.selectedVariant.quantity) : Number(item.base_price)),
        notes: item.notes || null,
        customData: item.customData || null
      }))
    };

    try {
      const res = await saleApi.createSale(saleData);
      const saleId = res.data.sale_id;

      // Building "In-Memory" sale object for instant ticket preview
      const memorySale = {
        id: saleId,
        createdAt: customDate ? new Date(customDate.includes('T') ? `${customDate}:00-06:00` : `${customDate}T${new Date().toLocaleTimeString('en-GB')}-06:00`).toISOString() : new Date().toISOString(),
        user: { name: user.name },
        client: targetClient || { name: 'Clientes Varios' },
        paymentMethod: paymentMethod,
        total: finalTotal,
        shipping: shippingCost,
        amountTendered: amountTendered,
        change: change > 0 ? change : 0,
        balance: balance,
        dueDate: dueDate,
        details: cart.map(item => {
          const unitPrice = item.customPrice || (item.selectedVariant ? Number(item.selectedVariant.price) : Number(item.base_price));
          return {
            quantity: item.quantity,
            subtotal: unitPrice * Number(item.quantity),
            product: { name: item.name },
            notes: item.notes
          };
        })
      };

      setLastSale(memorySale);
      setIsTicketModalOpen(true);
      toast.success('Venta registrada con éxito');

      clearCart();
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
      fetchData(); // Refresh stock
    } catch (err) {
      if (!window.navigator.onLine) {
        addToOfflineQueue(saleData);
        toast.success('Sin conexión. La venta se ha guardado localmente y se sincronizará automáticamente al recuperar la conexión.', { duration: 5000 });
        clearCart();
        setIsCartOpen(false);
        setIsCheckoutOpen(false);
      } else {
        toast.error('Error al realizar la venta');
      }
    }
  };

  useEffect(() => {
    const handleSync = () => {
      if (window.navigator.onLine) {
        syncOfflineSales(api).then(res => {
          if (res && res.success > 0) {
            console.log(`Sincronizadas ${res.success} ventas pendientes.`);
            fetchData();
          }
        });
      }
    };

    window.addEventListener('online', handleSync);
    return () => window.removeEventListener('online', handleSync);
  }, []);

  useEffect(() => {
    if (cart.length === 0 && shippingCost > 0) {
      setShippingCost(0);
    }
  }, [cart.length]);

  return (
    <div className={`pos-container ${isSidebarOpen ? 'sidebar-expanded' : ''}`}>
      <div className="sidebar-hover-edge" onMouseEnter={() => setIsSidebarOpen(true)}></div>
      <div className="sidebar-pos-wrapper" onMouseLeave={() => setIsSidebarOpen(false)}>
        <Sidebar aria-expanded={isSidebarOpen} />
        <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)}>
           <X size={20} />
        </button>
      </div>
      <div className="products-section">
        <header className="pos-header">
          <div className="header-info">
             <button className="sidebar-trigger" onClick={() => setIsSidebarOpen(true)}>
                <Store size={22} />
             </button>
            <BranchSwitcher />
            <div className="user-tag">
              <User size={18} />
              <span>{user.name}</span>
            </div>
          </div>

          <div 
            className="search-bar-wrapper" 
            style={{ 
              position: 'relative', 
              width: '100%',
              maxWidth: '450px', // Un poco más ancho para el POS
              flexShrink: 0,
              margin: '0 auto 0 0',
              padding: 0,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <Search size={20} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
            <input
              type="text"
              placeholder="Buscar producto por nombre o SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchKeyboardOpen(true);
              }}
              inputMode="none"
              style={{ 
                width: '100%', 
                display: 'block',
                padding: '0.875rem 45px 0.875rem 3rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                color: '#1e293b',
                outline: 'none',
                fontSize: '1rem',
                margin: 0,
                transition: 'border-color 0.2s'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchKeyboardOpen(false);
                }}
                style={{
                  position: 'absolute',
                  right: '12px', 
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px',
                  zIndex: 10
                }}
              >
                <Trash2 size={20} strokeWidth={2.5} />
              </button>
            )}
          </div>

          <div className="categories-scroll">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-chip ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.name)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </header>

        <main className="products-grid-container">
          <div className="products-grid">
            {filteredProducts.map((p) => (
              <motion.div
                key={p.id}
                className="product-card"
                style={{ '--cat-color': p.category?.colorHex || getCategoryColor(p.category_name || '') } as any}
                whileTap={{ scale: 0.96 }}
                onClick={(e) => handleAddToCart(e, p)}
              >
                <div className="product-image-container">
                  <img src={p.imageUrl || `https://via.placeholder.com/300?text=${encodeURIComponent(p.name)}`} alt={p.name} />
                    <button
                      className="zoom-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomedProduct(p);
                    }}
                    title="Ver imagen completa"
                    style={{
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
                <div className="product-info">
                  <span
                    className="product-category"
                    style={{ background: `var(--cat-color)20`, color: `var(--cat-color)` }}
                  >
                    {p.category_name || 'Sin Categoría'}
                  </span>
                  <h3 className="product-name">{p.name}</h3>
                  <div className="product-footer">
                    <span className="product-price">${Number(p.base_price).toFixed(2)}</span>
                    {!p.is_service ? (
                      <span className={`product-stock ${p.stock_level <= 0 ? 'critical' :
                        p.stock_level < p.min_stock ? 'low' : 'normal'
                        }`}>
                        Stock: {p.stock_level}
                      </span>
                    ) : (
                      <span className="product-stock service-type">
                        Servicio
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </main>

        <button className="mobile-cart-toggle" onClick={() => setIsCartOpen(true)}>
          <ShoppingCart size={24} />
          {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
        </button>
      </div>

      <aside className={`cart-section ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Mi Carrito</h2>
          <button className="close-cart" onClick={() => setIsCartOpen(false)}><X /></button>
        </div>

        <div className="cart-items">
          {cart.map(item => {
            const basePrice = item.selectedVariant ? item.selectedVariant.price : item.base_price;
            const currentPrice = item.customPrice !== undefined ? item.customPrice : basePrice;
            return (
              <div key={item.cartItemId} className="cart-item-modern">
                {/* Fila 1: Nombre del Producto */}
                <div className="cart-item-name-row">
                  <h4>{item.name}</h4>
                </div>

                {/* Fila 2: Precio y Controles */}
                <div className="cart-item-main-row">
                  <div className="price-box">
                    {item.allowPriceChange ? (
                      <div className="price-edit-group">
                        <span className="price-edit-prefix">$</span>
                          <input
                          type="number"
                          step="0.01"
                          className="price-edit-input"
                          value={currentPrice}
                          onFocus={e => e.target.select()}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '' || val === '0') {
                              updateCustomPrice(item.cartItemId, 0);
                            } else {
                              const num = parseFloat(val);
                              if (!isNaN(num)) updateCustomPrice(item.cartItemId, num);
                            }
                          }}
                          onBlur={e => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val < basePrice) {
                              if (val < basePrice && !isNaN(val)) {
                                toast.error('Precio no permitido — debe ser mayor o igual al base');
                              }
                              updateCustomPrice(item.cartItemId, basePrice);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <span className="price-val">${Number(currentPrice).toFixed(2)}</span>
                    )}
                    {item.selectedVariant && (
                      <span className="price-unit-info">
                        ({item.selectedVariant.quantity} und)
                      </span>
                    )}
                  </div>
                  
                  <div className="controls-box">
                    <div className="qty-selector">
                      <button className="q-btn" onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span className="q-val">{item.quantity}</span>
                      <button className="q-btn" onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                    </div>
                    {item.hasCustomization && (
                      <button className={`design-btn ${item.customData ? 'has-data' : ''}`} onClick={() => {
                        const existing = item.customData || {};
                        setDesignForm({
                            position: existing.position || [],
                            imageUrl: existing.imageUrl || '',
                            notes: existing.notes || ''
                        });
                        setDesignModal({ isOpen: true, item });
                      }} title="Diseños">
                        <Palette size={14} />
                        {item.customData && <span className="design-check"><Check size={8} /></span>}
                      </button>
                    )}
                    <button className="del-btn" onClick={() => removeFromCart(item.cartItemId)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Fila 3: Tiers/Variantes */}
                {item.variants && item.variants.length > 0 && (
                  <div className="cart-item-tiers-row">
                    <div className="tier-chips-mini">
                      <button
                        className={`mini-chip ${!item.selectedVariant ? 'active' : ''}`}
                        onClick={() => updateItemVariant(item.cartItemId, null)}
                      >
                        UNIDAD
                      </button>
                      {item.variants.map(v => (
                        <button
                          key={v.id || v.name}
                          className={`mini-chip ${item.selectedVariant?.id === v.id || item.selectedVariant?.name === v.name ? 'active' : ''}`}
                          onClick={() => updateItemVariant(item.cartItemId, v)}
                        >
                          {v.name || 'EMPAQUE'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fila Extra: Notas de Servicio */}
                {item.is_service && (
                  <div className="cart-item-notes-row">
                    <input
                      type="text"
                      placeholder="Detalles del servicio..."
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(item.cartItemId, e.target.value)}
                      className="mini-note-input"
                    />
                  </div>
                )}
              </div>
            )
          })}
          {cart.length === 0 && (
            <div className="empty-cart">
              <ShoppingCart size={48} />
              <p>El carrito está vacío</p>
            </div>
          )}
        </div>

        <div className="cart-footer">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row shipping-row">
            <span>Envío</span>
            <div className="shipping-input-wrapper">
              <span className="shipping-currency">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost || ''}
                onChange={(e) => setShippingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="0.00"
                className="shipping-input"
                disabled={cart.length === 0}
                style={{ opacity: cart.length === 0 ? 0.4 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'text' }}
              />
            </div>
          </div>
          <div className="summary-row total">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button
            className="pay-btn"
            disabled={cart.length === 0}
            onClick={async () => {
              try {
                const res = await fetch('/api/openings/check', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
                const data = await res.json();
                if (data.needsOpening) {
                  if (data.strictOpen) return toast.error('No hay apertura de caja. Realice la apertura primero.');
                  // Non-strict: warn and continue
                  toast('No hay apertura de caja, puede continuar como admin', { icon: '⚠️' });
                }
              } catch {}
              setIsCheckoutOpen(true);
            }}
          >
            PAGAR AHORA <ChevronRight size={20} />
          </button>
        </div>
      </aside>

      {isCheckoutOpen && (
        <CheckoutModal
          orderTotal={total}
          shipping={shippingCost}
          onClose={() => setIsCheckoutOpen(false)}
          onConfirm={handleConfirmCheckout}
        />
      )}
      {lastSale && config && (
        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => setIsTicketModalOpen(false)}
          sale={lastSale}
          businessConfig={config}
        />
      )}

      {/* Modal de IA */}
      <AnimatePresence>
        {/* TECLADO QWERTY REUTILIZABLE (Sólo Tablet) */}
        {isSearchKeyboardOpen && (
          <VirtualKeyboard 
            value={searchQuery}
            onChange={setSearchQuery}
            onClose={() => setIsSearchKeyboardOpen(false)}
            title="CERRAR TECLADO"
          />
        )}

      </AnimatePresence>

      {/* Modal de Zoom de Imagen */}
      <AnimatePresence>
        {zoomedProduct && (
          <div
            className="modal-overlay"
            onClick={() => { setZoomedProduct(null); setZoomScale(1); }}
            style={{ background: 'rgba(0,0,0,0.9)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, zIndex: 1000, overflow: 'hidden' }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="zoom-modal-content"
              onClick={e => e.stopPropagation()}
              style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* Controles de Zoom */}
              <div style={{
                position: 'fixed',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px',
                borderRadius: '20px',
                display: 'flex',
                gap: '12px',
                zIndex: 1010,
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <button
                  onClick={() => setZoomScale(prev => Math.max(1, prev - 0.25))}
                  style={{ background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Minus size={20} />
                </button>
                <button
                  onClick={() => setZoomScale(1)}
                  style={{ background: 'white', border: 'none', borderRadius: '20px', padding: '0 15px', height: '40px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  {Math.round(zoomScale * 100)}%
                </button>
                <button
                  onClick={() => setZoomScale(prev => Math.min(5, prev + 0.25))}
                  style={{ background: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                onClick={() => { setZoomedProduct(null); setZoomScale(1); }}
                style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  zIndex: 1010
                }}
              >
                <X size={24} />
              </button>

              <div style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <motion.img
                  drag={zoomScale > 1}
                  dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
                  dragElastic={0.1}
                  animate={{ scale: zoomScale }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  src={zoomedProduct.imageUrl || `https://via.placeholder.com/800?text=${encodeURIComponent(zoomedProduct.name)}`}
                  alt={zoomedProduct.name}
                  style={{
                    maxWidth: '90%',
                    maxHeight: '80%',
                    objectFit: 'contain',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    cursor: zoomScale > 1 ? 'grab' : 'default'
                  }}
                />
              </div>

              <div style={{
                position: 'fixed',
                top: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                textAlign: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                zIndex: 1010
              }}>
                {zoomedProduct.name}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Diseños */}
      <AnimatePresence>
        {designModal.isOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDesignModal({ isOpen: false, item: null })}
            style={{ zIndex: 2000 }}
          >
            <motion.div
              className="design-modal"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="design-modal-header">
                <Palette size={24} />
                <h3>Diseños - {designModal.item?.name}</h3>
                <button className="design-modal-close" onClick={() => setDesignModal({ isOpen: false, item: null })}>
                  <X size={20} />
                </button>
              </div>
              <div className="design-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Posición del Diseño</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['Adelante', 'Atrás'].map(p => (
                      <label key={p} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem',
                        background: designForm.position.includes(p) ? 'rgba(236,72,153,0.15)' : '#0f172a',
                        border: `1px solid ${designForm.position.includes(p) ? '#ec4899' : '#334155'}`,
                        borderRadius: '10px', cursor: 'pointer', color: designForm.position.includes(p) ? '#ec4899' : '#94a3b8',
                        fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s'
                      }}>
                        <input type="checkbox" checked={designForm.position.includes(p)}
                          onChange={() => setDesignForm({
                            ...designForm,
                            position: designForm.position.includes(p)
                              ? designForm.position.filter(x => x !== p)
                              : [...designForm.position, p]
                          })}
                          style={{ accentColor: '#ec4899', width: '16px', height: '16px' }}
                        />
                        {p}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>URL de Imagen Referencia</label>
                  <input type="url" placeholder="https://ejemplo.com/diseno.jpg" value={designForm.imageUrl}
                    onChange={e => setDesignForm({ ...designForm, imageUrl: e.target.value })}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.6rem 0.8rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                  />
                  {designForm.imageUrl && (
                    <div style={{ marginTop: '0.5rem', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', background: '#0f172a', border: '1px solid #334155' }}>
                      <img src={designForm.imageUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
                <div className="field">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Observaciones</label>
                  <textarea placeholder="Ej: El diseño de adelante a la altura del pecho, el de atrás grande centrado..."
                    value={designForm.notes}
                    onChange={e => setDesignForm({ ...designForm, notes: e.target.value })}
                    rows={4}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.6rem 0.8rem', color: 'white', fontSize: '0.85rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
              <div className="design-modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem 1.25rem', borderTop: '1px solid #334155' }}>
                <button className="design-btn-cancel" onClick={() => setDesignModal({ isOpen: false, item: null })}>Cancelar</button>
                <button className="design-btn-save" onClick={() => {
                  const data = { ...designForm };
                  updateCustomData(designModal.item.cartItemId, data);
                  setDesignModal({ isOpen: false, item: null });
                }}>
                  <Check size={16} /> Guardar Diseño
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flyingItems.map(item => (
          <motion.div
            key={item.id}
            className="flying-item"
            initial={{ 
                x: item.x - 30, // center offset
                y: item.y - 30, 
                scale: 1, 
                opacity: 1 
            }}
            animate={{ 
                x: window.innerWidth < 1024 ? window.innerWidth - 60 : window.innerWidth - 300, 
                y: 60,
                scale: 0.2,
                opacity: 0,
                rotate: 720
            }}
            transition={{ 
                duration: 0.8, 
                ease: [0.34, 1.56, 0.64, 1] // snappy bounce
            }}
          >
            <img src={item.imageUrl} alt="flying" />
          </motion.div>
        ))}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-only, .print-only * { visibility: visible; }
          .print-only {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }

        .flying-item {
          pointer-events: none;
          position: fixed;
          z-index: 10000;
          width: 60px;
          height: 60px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border: 2px solid white;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flying-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pos-container {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #f1f5f9;
        }

        /* products-section */
        .products-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .pos-header {
          background: white;
          padding: 1.25rem 1.5rem 0 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          z-index: 10;
        }

        .header-info {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .branch-tag, .user-tag {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .search-bar {
          position: relative;
          margin-bottom: 0;
        }

        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .search-bar input {
          width: 100%;
          padding: 0.875rem 3.5rem 0.875rem 3rem;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
        }

        .search-bar input:focus {
          border-color: ${user.color_hex || '#3b82f6'};
          background: white;
        }
        
        .search-wrapper .search-clear {
          position: absolute !important;
          right: 0.8rem !important;
          top: 50% !important;
          transform: translateY(-50%) !important;
          background: transparent !important;
          border: none !important;
          color: #94a3b8 !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
          padding: 0.25rem !important;
          border-radius: 6px !important;
          z-index: 10 !important;
        }
        .search-wrapper .search-clear:hover { 
          color: #ef4444 !important; 
          background: rgba(239, 68, 68, 0.1) !important; 
          transform: translateY(-50%) scale(1.1) !important;
        }

        .categories-scroll {
          display: flex;
          gap: 0.75rem;
          overflow-x: auto;
          white-space: nowrap;
          padding: 0.75rem 0.5rem 1.5rem 0.5rem;
          scrollbar-width: none;
          margin-bottom: -0.75rem;
        }
        .categories-scroll::-webkit-scrollbar {
          display: none;
        }

        .category-chip {
          padding: 0.5rem 1.25rem;
          background: #f1f5f9;
          border: none;
          border-radius: 9999px;
          font-weight: 600;
          font-size: 0.875rem;
          color: #475569;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .category-chip:hover {
          background: #e2e8f0;
          color: ${user.color_hex || '#3b82f6'};
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .category-chip.active {
          background: ${user.color_hex || '#3b82f6'};
          color: white;
          box-shadow: 0 4px 12px ${user.color_hex || '#3b82f6'}66;
          transform: translateY(-2px);
        }

        .products-grid-container {
          flex: 1;
          overflow-y: auto;
          padding: 1rem 1.5rem 1.5rem 1.5rem;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1rem;
        }

        .product-card {
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .product-image-container {
          aspect-ratio: 4/3;
          background: #f8fafc;
          position: relative;
        }

        .product-image-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 0.5rem;
        }

        .product-info {
          padding: 0.75rem;
        }

        .product-category {
          font-size: 0.55rem;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .product-name {
          font-size: 0.825rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0.2rem 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          height: 1.7rem;
          line-height: 0.85rem;
          text-transform: uppercase;
        }

        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .product-price {
          font-size: 1rem;
          font-weight: 800;
          color: #3b82f6;
        }

        .product-stock {
          font-size: 0.75rem;
          color: #94a3b8;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .product-stock.normal {
          background: #dcfce7;
          color: #166534;
        }

        .product-stock.low {
          background: #ffedd5;
          color: #9a3412;
        }

        .product-stock.critical {
          background: #fee2e2;
          color: #991b1b;
        }

        .product-stock.service-type {
          background: #e0f2fe;
          color: #0369a1;
        }

        /* cart-section */
        .cart-section {
          width: 400px;
          background: white;
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          z-index: 20;
          transition: transform 0.3s ease-in-out;
        }

        .cart-header {
          padding: 1.5rem;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
        }

        .close-cart {
          display: none;
          font-size: 2rem;
          background: none;
          border: none;
          color: #94a3b8;
        }

        .cart-items {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #f1f5f9;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .qty-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          cursor: pointer;
        }

        .cart-footer {
          padding: 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          color: #64748b;
        }

        .summary-row.total {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 2px dashed #e2e8f0;
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 900;
        }

        .summary-row.shipping-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          color: #64748b;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .shipping-input-wrapper {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .shipping-currency {
          color: #94a3b8;
          font-size: 0.8rem;
        }
        .shipping-input {
          width: 80px;
          padding: 4px 6px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 700;
          text-align: right;
          color: #0f172a;
          background: #f8fafc;
          outline: none;
          transition: border-color 0.2s;
        }
        .shipping-input:focus {
          border-color: #3b82f6;
        }
        .shipping-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .shipping-input[type=number] {
          -moz-appearance: textfield;
        }

        .pay-btn {
          width: 100%;
          padding: 1.25rem;
          background: ${user.color_hex || '#3b82f6'};
          color: white;
          border: none;
          border-radius: 16px;
          font-weight: 800;
          font-size: 1rem;
          margin-top: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          cursor: pointer;
          box-shadow: 0 10px 15px -3px ${user.color_hex || '#3b82f6'}60;
        }

        .mobile-cart-toggle {
          display: none;
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          width: 64px;
          height: 64px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 50%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          z-index: 30;
          align-items: center;
          justify-content: center;
        }

        .cart-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ef4444;
          color: white;
          font-size: 0.75rem;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 3px solid white;
        }

        /* Responsive: Phones and Small Tablets (Vertical) */
        @media (max-width: 900px) {
          .cart-section {
            position: fixed;
            top: 0;
            right: 0;
            height: 100vh;
            transform: translateX(100%);
            width: 100%;
          }
          .cart-section.open {
            transform: translateX(0);
          }
          .mobile-cart-toggle {
            display: flex;
          }
          .close-cart {
            display: block;
          }
        }

        /* TABLET OPTIMIZATION (Horizontal/Large): Always show cart + Small cards */
        @media (min-width: 901px) and (max-width: 1300px) {
          .sidebar-pos-wrapper {
             position: fixed;
             left: 0;
             top: 0;
             bottom: 0;
             z-index: 2000;
             transform: translateX(-100%);
             transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .sidebar-expanded .sidebar-pos-wrapper {
             transform: translateX(0);
          }
          .sidebar-expanded .sidebar-close-btn {
             display: flex !important;
          }
          .sidebar-trigger {
             display: flex !important;
          }
          
          .cart-section {
            width: 270px !important;
            position: static !important;
            transform: none !important;
            display: flex !important;
          }
          .mobile-cart-toggle, .close-cart {
            display: none !important;
          }
          .products-grid {
            grid-template-columns: repeat(4, 1fr) !important; 
            gap: 0.5rem !important;
          }
          .product-card {
            border-radius: 12px !important;
          }
          .product-info {
            padding: 0.5rem !important;
          }
          .product-name {
            font-size: 0.72rem !important;
            height: 1.4rem !important;
            line-height: 0.7rem !important;
          }
          .product-price {
            font-size: 0.85rem !important;
          }
          .product-stock {
            font-size: 0.68rem !important;
            padding: 1px 3px !important;
          }
          .pos-header {
            padding: 0.75rem 0.75rem 0 0.75rem !important;
          }
          .products-grid-container {
            padding: 0.75rem !important;
          }
          .search-bar input {
             padding: 0.6rem 3rem 0.6rem 2.5rem !important;
             font-size: 0.9rem !important;
          }
        }

        /* AJUSTES PRODUCT GRID PARA TECLADO */

        /* AJUSTES PRODUCT GRID PARA TECLADO */
        .sidebar-expanded .products-grid {
           /* padding-bottom: 300px; */
        }

        .sidebar-trigger {
           display: none;
           background: #1e293b;
           color: white;
           border: none;
           width: 40px;
           height: 40px;
           border-radius: 10px;
           align-items: center;
           justify-content: center;
           cursor: pointer;
           margin-right: -0.5rem;
           transition: all 0.2s;
        }
        .sidebar-trigger:hover { background: #3b82f6; }

        .sidebar-hover-edge {
           display: none;
           position: fixed;
           left: 0;
           top: 0;
           bottom: 0;
           width: 15px;
           z-index: 1500;
           background: transparent;
        }
        
        @media (min-width: 901px) and (max-width: 1300px) {
           .sidebar-hover-edge { display: block !important; }
        }

        .sidebar-close-btn {
           display: none;
           position: absolute;
           top: 10px;
           right: -45px;
           background: #ef4444;
           color: white;
           border: none;
           width: 35px;
           height: 35px;
           border-radius: 50%;
           align-items: center;
           justify-content: center;
           cursor: pointer;
           z-index: 2001;
           box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        }

        @media (max-width: 768px) {
          .products-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
          .cart-section {
            width: 100%;
          }
          .header-info {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
        .product-stock.low {
          color: #ef4444;
          font-weight: 700;
        }
        .item-qty { font-weight: 700; min-width: 20px; text-align: center; }
        .remove-btn { background: none; border: none; color: #94a3b8; cursor: pointer; margin-left: 0.5rem; }
        .remove-btn:hover { color: #ef4444; }
        
        /* REDISEÑO COMPACTO DEL CARRITO (TIPO TABLA) */
        .cart-items { padding: 0.75rem !important; }
        .cart-item-modern {
          background: white;
          padding: 0.5rem 0.25rem;
          margin-bottom: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-bottom: 1px solid #f1f5f9;
        }
        .cart-item-name-row h4 {
          margin: 0;
          font-size: 0.78rem;
          font-weight: 800;
          color: #0f172a;
          text-transform: uppercase;
          line-height: 1.1;
        }
        .cart-item-main-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        .price-box {
          display: flex;
          align-items: baseline;
          gap: 6px;
        }
        .price-val {
          font-size: 1rem;
          font-weight: 800;
          color: ${user.color_hex || '#3b82f6'};
        }
        .price-edit-group {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #0f172a;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 2px 8px;
        }
        .price-edit-prefix {
          font-size: 0.85rem;
          font-weight: 800;
          color: #0ea5e9;
        }
        .price-edit-input {
          width: 80px;
          background: transparent;
          border: none;
          color: #0ea5e9;
          font-weight: 800;
          font-size: 1rem;
          font-family: monospace;
          outline: none;
          padding: 2px 0;
        }
        .price-edit-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .price-unit-info {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
        }
        .controls-box {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .qty-selector {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 2px;
        }
        .q-btn {
          width: 24px;
          height: 24px;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .q-btn:hover { background: #e2e8f0; color: #1e293b; }
        .q-val {
          font-weight: 900;
          font-size: 0.9rem;
          min-width: 24px;
          text-align: center;
        }
        .del-btn {
          background: rgba(239, 68, 68, 0.05);
          border: none;
          color: #ef4444;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .del-btn:hover { background: #ef4444; color: white; }

        .cart-item-tiers-row {
          padding-top: 4px;
        }
        .tier-chips-mini {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .mini-chip {
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #64748b;
          font-size: 0.65rem;
          font-weight: 800;
          cursor: pointer;
          text-transform: uppercase;
        }
        .mini-chip.active {
          background: #10b981;
          border-color: #10b981;
          color: white;
        }
        .mini-note-input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.75rem;
          background: #fbfffb;
        }
        
        .empty-cart { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; gap: 1rem; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .ai-modal { background: white; border-radius: 24px; width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; }
        .modal-header { padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h2 { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
        .modal-header button { background: none; border: none; color: #94a3b8; cursor: pointer; }
        .modal-body { padding: 1.5rem; }

        /* Estilos para Notas de Servicio */
        .cart-item-notes {
            margin-top: 12px;
            padding: 8px;
            background: #f1f5f9;
            border-radius: 12px;
            border: 1px dashed #cbd5e1;
        }

        .note-label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 6px;
        }

        .note-input {
            width: 100%;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 0.85rem;
            color: #1e293b;
            outline: none;
            transition: all 0.2s;
        }
        .p-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .p-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-color: #3b82f6; }

        .note-input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .product-stock.service-type {
            background: #f0f9ff;
            color: #0369a1;
            padding: 2px 8px;
            border-radius: 6px;
            border: 1px solid #bae6fd;
            font-weight: 700;
        }
        
        @media (max-width: 640px) {
        }

        .design-btn {
          background: rgba(236, 72, 153, 0.1);
          border: 1px solid rgba(236, 72, 153, 0.3);
          color: #ec4899;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .design-btn:hover {
          background: rgba(236, 72, 153, 0.2);
          border-color: #ec4899;
        }
        .design-btn.has-data { position: relative; }
        .design-btn.has-data svg:first-child { color: #10b981; }
        .design-check {
          position: absolute; top: -3px; right: -3px;
          background: #10b981; color: white;
          border-radius: 50%; width: 14px; height: 14px;
          display: flex; align-items: center; justify-content: center;
        }

        .design-modal {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          max-width: 480px;
          width: 90%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
        .design-modal-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #334155;
          color: #ec4899;
        }
        .design-modal-header h3 {
          flex: 1;
          font-size: 1rem;
          font-weight: 800;
          color: white;
          margin: 0;
        }
        .design-modal-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 4px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .design-modal-close:hover {
          background: #334155;
          color: white;
        }
        .design-modal-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .design-btn-cancel { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 0.55rem 1.25rem; border-radius: 10px; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
        .design-btn-cancel:hover { background: #334155; color: white; }
        .design-btn-save { background: #ec4899; color: white; border: none; padding: 0.55rem 1.5rem; border-radius: 10px; font-weight: 800; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
        .design-btn-save:hover { background: #db2777; transform: scale(1.02); }
        .design-modal-body .field label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          margin-bottom: 0.4rem;
          display: block;
        }
      `}</style>
    </div >
  );
};

export default POS;
