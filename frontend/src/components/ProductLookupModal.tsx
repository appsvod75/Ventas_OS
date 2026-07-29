import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, DollarSign, Layers, Store, ImageIcon } from 'lucide-react';
import { productApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualKeyboard from './VirtualKeyboard';

interface ProductLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProductLookupModal: React.FC<ProductLookupModalProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeKeyboard, setActiveKeyboard] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults([]);
            setSelectedIdx(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await productApi.searchProducts(query.trim());
                setResults(res.data);
            } catch { setResults([]); }
            finally { setLoading(false); }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const totalStock = (p: any) =>
        p.inventory?.reduce((sum: number, i: any) => sum + (i.stockLevel || 0), 0) || 0;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="lookup-modal"
                    onClick={e => e.stopPropagation()}
                >
                    <header className="lookup-header">
                        <div className="lookup-search">
                            <Search size={20} style={{ color: '#64748b', flexShrink: 0 }} />
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Buscar por nombre o SKU..."
                                value={query}
                                onChange={e => { setQuery(e.target.value); setSelectedIdx(null); }}
                                onFocus={() => setActiveKeyboard(true)}
                                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '1rem', outline: 'none', padding: '0.5rem' }}
                            />
                            {query && (
                                <button className="lookup-clear" onClick={() => { setQuery(''); setResults([]); }}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <button className="lookup-close" onClick={onClose}>
                            <X size={24} />
                        </button>
                    </header>

                    <div className="lookup-body">
                        {loading && (
                            <div className="lookup-loading">
                                <div className="spinner" />
                                <p>Buscando...</p>
                            </div>
                        )}
                        {!loading && query.trim() && results.length === 0 && (
                            <div className="lookup-empty">
                                <Package size={48} opacity={0.3} />
                                <p>No se encontraron productos para "{query}"</p>
                            </div>
                        )}
                        {!loading && results.length > 0 && (
                            <div className="lookup-results">
                                {results.map((p, idx) => (
                                    <div
                                        key={p.id}
                                        className={`lookup-item ${selectedIdx === idx ? 'selected' : ''}`}
                                        onClick={() => setSelectedIdx(selectedIdx === idx ? null : idx)}
                                    >
                                        <div className="lookup-item-image">
                                            <img
                                                src={p.imageUrl || `https://via.placeholder.com/60?text=${encodeURIComponent(p.name.charAt(0))}`}
                                                alt={p.name}
                                                onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/60?text=N/A'; }}
                                            />
                                        </div>
                                        <div className="lookup-item-info">
                                            <div className="lookup-item-top">
                                                <span className="lookup-item-name">{p.name}</span>
                                                {p.sku && <span className="lookup-item-sku">SKU: {p.sku}</span>}
                                            </div>
                                            <div className="lookup-item-details">
                                                {p.category && (
                                                    <span className="lookup-cat" style={{ background: `${p.category.colorHex || '#3b82f6'}20`, color: p.category.colorHex || '#3b82f6' }}>
                                                        {p.category.name}
                                                    </span>
                                                )}
                                                <span className="lookup-price">${Number(p.basePrice || p.base_price || 0).toFixed(2)}</span>
                                                <span className="lookup-stock">{totalStock(p)} UN</span>
                                            </div>
                                            {selectedIdx === idx && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    className="lookup-item-expanded"
                                                >
                                                    {p.variants?.length > 0 && (
                                                        <div className="lookup-variants">
                                                            <span className="lookup-section-label"><Layers size={12} /> Tiers</span>
                                                            <div className="lookup-variant-list">
                                                                {p.variants.map((v: any) => (
                                                                    <div key={v.id || v.name} className="lookup-variant">
                                                                        <span>{v.name}</span>
                                                                        <span className="lookup-variant-qty">x{v.quantity}</span>
                                                                        <span className="lookup-variant-price">${Number(v.price).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {p.inventory?.length > 0 && (
                                                        <div className="lookup-branch-stock">
                                                            <span className="lookup-section-label"><Store size={12} /> Stock por Sucursal</span>
                                                            {p.inventory.map((i: any) => (
                                                                <div key={i.branchId} className="lookup-branch-row">
                                                                    <span>{i.branch?.name || `Sucursal #${i.branchId}`}</span>
                                                                    <span className="lookup-branch-qty">{i.stockLevel} UN</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {!query.trim() && (
                            <div className="lookup-hint">
                                <Search size={32} opacity={0.2} />
                                <p>Escriba nombre o SKU del producto para consultar</p>
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {activeKeyboard && (
                            <VirtualKeyboard
                                value={query}
                                onChange={setQuery}
                                onClose={() => setActiveKeyboard(false)}
                                onConfirm={() => setActiveKeyboard(false)}
                                title="CONSULTAR PRODUCTO"
                            />
                        )}
                    </AnimatePresence>

                    <style>{`
                        .lookup-modal {
                            background: #1e293b; border-radius: 24px; border: 1px solid #334155;
                            width: min(650px, 94vw); max-height: min(85vh, 700px);
                            display: flex; flex-direction: column; overflow: hidden;
                            box-shadow: 0 25px 60px -12px rgba(0,0,0,0.5);
                        }
                        .lookup-header {
                            display: flex; align-items: center; gap: 0.5rem;
                            padding: 0.75rem 1rem; border-bottom: 1px solid #334155;
                        }
                        .lookup-search {
                            flex: 1; display: flex; align-items: center; gap: 0.5rem;
                            background: #0f172a; border: 1px solid #334155; border-radius: 12px;
                            padding: 0.25rem 0.75rem;
                        }
                        .lookup-search:focus-within { border-color: #3b82f6; }
                        .lookup-clear { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
                        .lookup-close { background: none; border: none; color: #64748b; cursor: pointer; padding: 4px; }

                        .lookup-body { flex: 1; overflow-y: auto; padding: 0.75rem; }
                        .lookup-loading, .lookup-empty, .lookup-hint {
                            display: flex; flex-direction: column; align-items: center; justify-content: center;
                            padding: 3rem 1rem; gap: 0.75rem; color: #64748b; text-align: center;
                        }
                        .spinner {
                            width: 32px; height: 32px; border: 3px solid #334155;
                            border-top-color: #3b82f6; border-radius: 50%; animation: spin 0.6s linear infinite;
                        }
                        @keyframes spin { to { transform: rotate(360deg); } }

                        .lookup-results { display: flex; flex-direction: column; gap: 0.5rem; }
                        .lookup-item {
                            display: flex; gap: 0.75rem; padding: 0.75rem;
                            background: #0f172a; border: 1px solid transparent; border-radius: 14px;
                            cursor: pointer; transition: all 0.2s;
                        }
                        .lookup-item:hover { border-color: #334155; background: rgba(30,41,59,0.5); }
                        .lookup-item.selected { border-color: #3b82f6; background: rgba(59,130,246,0.05); }

                        .lookup-item-image {
                            width: 60px; height: 60px; border-radius: 10px; overflow: hidden;
                            background: #1e293b; flex-shrink: 0; border: 1px solid #334155;
                        }
                        .lookup-item-image img { width: 100%; height: 100%; object-fit: cover; }

                        .lookup-item-info { flex: 1; min-width: 0; }
                        .lookup-item-top { display: flex; align-items: baseline; gap: 0.75rem; margin-bottom: 0.35rem; }
                        .lookup-item-name { font-weight: 800; color: #f1f5f9; font-size: 0.9rem; }
                        .lookup-item-sku { font-size: 0.7rem; color: #64748b; }

                        .lookup-item-details { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
                        .lookup-cat { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; }
                        .lookup-price { font-weight: 800; color: #10b981; font-size: 0.9rem; }
                        .lookup-stock { font-size: 0.7rem; color: #94a3b8; }

                        .lookup-item-expanded {
                            margin-top: 0.75rem; padding-top: 0.75rem;
                            border-top: 1px solid #334155; overflow: hidden;
                        }
                        .lookup-section-label {
                            display: flex; align-items: center; gap: 0.3rem;
                            font-size: 0.65rem; font-weight: 800; color: #64748b;
                            text-transform: uppercase; margin-bottom: 0.4rem;
                        }
                        .lookup-variant-list { display: flex; flex-direction: column; gap: 0.25rem; }
                        .lookup-variant {
                            display: grid; grid-template-columns: 1fr 60px 80px;
                            gap: 0.5rem; align-items: center; padding: 0.25rem 0.5rem;
                            background: rgba(15,23,42,0.5); border-radius: 6px;
                            font-size: 0.8rem; color: #cbd5e1;
                        }
                        .lookup-variant-qty { color: #f59e0b; font-weight: 700; text-align: center; }
                        .lookup-variant-price { color: #10b981; font-weight: 700; text-align: right; }

                        .lookup-branch-stock { margin-top: 0.5rem; }
                        .lookup-branch-row {
                            display: flex; justify-content: space-between; align-items: center;
                            padding: 0.2rem 0.5rem; font-size: 0.78rem; color: #94a3b8;
                        }
                        .lookup-branch-qty { font-weight: 700; color: #e2e8f0; }

                        @media (max-width: 500px) {
                            .lookup-item { flex-direction: column; align-items: flex-start; }
                            .lookup-item-image { width: 50px; height: 50px; }
                        }
                    `}</style>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default ProductLookupModal;
