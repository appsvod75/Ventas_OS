import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { productApi } from '../services/api';
import { Search, Package, DollarSign, Layers, Store, ImageIcon, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductLookupPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [product, setProduct] = useState<any>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        productApi.getProducts(undefined, false).then(res => setAllProducts(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filteredResults = searchQuery.trim()
        ? allProducts.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
          ).slice(0, 12)
        : [];

    const selectProduct = (p: any) => {
        setProduct(p);
        setSearchQuery(p.name);
        setShowDropdown(false);
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    const totalStock = (p: any) =>
        p.inventory?.reduce((sum: number, i: any) => sum + (i.stockLevel || 0), 0) || 0;

    return (
        <div className="products-page" style={{ background: '#0f172a', color: 'white' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem 4rem', overflow: 'auto' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Consultar Producto</h1>
                    <p style={{ color: '#94a3b8' }}>Busca por nombre o código (SKU)</p>
                </header>

                <div ref={searchRef} style={{ maxWidth: '600px', marginBottom: '2rem', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 5 }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && filteredResults.length > 0) {
                                    setShowDropdown(false);
                                    selectProduct(filteredResults[0]);
                                }
                            }}
                            placeholder="Nombre o SKU..."
                            style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: 'white', fontSize: '1rem', outline: 'none' }}
                            autoFocus
                        />
                        {showDropdown && filteredResults.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                {filteredResults.map(p => (
                                    <div key={p.id}
                                        onClick={() => { setShowDropdown(false); selectProduct(p); }}
                                        style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#0f172a')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600, color: 'white' }}>{p.name}</span>
                                            {p.sku && <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>SKU: {p.sku}</span>}
                                        </div>
                                        <span style={{ fontWeight: 900, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>
                                            {formatCurrency(p.base_price || p.basePrice || 0)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {product && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            style={{ maxWidth: '720px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}
                        >
                            {product.imageUrl && (
                                <div style={{ height: '200px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={product.imageUrl} alt={product.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                        onError={e => (e.currentTarget.style.display = 'none')} />
                                </div>
                            )}
                            <div style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{product.name}</h2>
                                        {product.sku && <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.25rem' }}>SKU: {product.sku}</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {product.isMedicine || product.is_medicine ? <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>MEDICINA</span> : null}
                                        {product.isService || product.is_service ? <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>SERVICIO</span> : null}
                                        {product.hasCustomization ? <span style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700 }}>DISEÑOS</span> : null}
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <DollarSign size={16} /> Precios
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2332 100%)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #10b981', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base</p>
                                            <p style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', margin: '0' }}>{formatCurrency(product.base_price || product.basePrice || 0)}</p>
                                        </div>
                                        {(product.variants || []).map((v: any, i: number) => (
                                            <div key={i} style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2332 100%)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #2d3a4e', textAlign: 'center' }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.5rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{v.name}</p>
                                                <p style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24', margin: '0 0 0.25rem 0' }}>{formatCurrency(v.price)}</p>
                                                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>{v.quantity} und. — {(v.price / v.quantity).toFixed(2)} c/u</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Store size={16} /> Inventario por Sucursal
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {(product.inventory || []).length > 0 ? (
                                            (product.inventory || []).map((i: any) => (
                                                <div key={i.branchId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #1e293b' }}>
                                                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{i.branch?.name || `Sucursal #${i.branchId}`}</span>
                                                    <span style={{ fontWeight: 800, color: i.stockLevel > 0 ? '#10b981' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
                                                        {i.stockLevel} UN
                                                    </span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', background: '#0f172a', borderRadius: '10px' }}>
                                                <Package size={24} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                                                <p style={{ fontSize: '0.85rem', margin: 0 }}>Sin inventario registrado</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {searchQuery.trim() && !filteredResults.length && !product && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2rem', background: 'rgba(239,68,68,0.05)', borderRadius: '16px', border: '1px solid rgba(239,68,68,0.2)', maxWidth: '600px' }}>
                        <AlertCircle size={24} color="#ef4444" />
                        <div>
                            <p style={{ fontWeight: 700, color: '#ef4444' }}>No encontrado</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No hay un producto con ese nombre o SKU.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default ProductLookupPage;
