import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, Pill, DollarSign, Package, Check, Layers, AlertCircle, Info, Hash, LayoutGrid, List, Eye, EyeOff, RotateCcw, Image, ImageOff, Truck, Store, CheckCircle2, ShieldAlert, Palette } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProductModal from '../components/ProductModal';
import { productApi, adminAuthApi } from '../services/api';
import api from '../services/api';
import { socket, socketEvents } from '../services/socket';
import toast from 'react-hot-toast';

const Products: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [providers, setProviders] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
    const [showNewCatForm, setShowNewCatForm] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isSavingCat, setIsSavingCat] = useState(false);
    const [showDisabled, setShowDisabled] = useState(false);
    const [filterNoImage, setFilterNoImage] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
    const [deletePin, setDeletePin] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const getCategoryColor = (catName: string) => {
        const colors: Record<string, string> = {
            'ASEO PERSONAL': '#3b82f6',
            'LIBRERÍA': '#8b5cf6',
            'BEBIDAS Y SNACKS': '#f59e0b',
            'LIMPIEZA': '#10b981',
            'OTROS': '#64748b'
        };
        return colors[catName.toUpperCase()] || '#3b82f6';
    };

    useEffect(() => {
        fetchData();

        // Escuchar actualizaciones en tiempo real
        socket.on(socketEvents.PRODUCT_CREATED, () => {
            console.log('🔄 Nuevo producto detectado, refrescando...');
            fetchData();
        });

        socket.on(socketEvents.PRODUCT_UPDATED, () => {
            console.log('🔄 Producto actualizado detectado, refrescando...');
            fetchData();
        });

        return () => {
            socket.off(socketEvents.PRODUCT_CREATED);
            socket.off(socketEvents.PRODUCT_UPDATED);
        };
    }, [showDisabled]);

    const fetchData = async () => {
        try {
            const [prodRes, catRes, provRes] = await Promise.all([
                productApi.getProducts(user.branch_id, showDisabled),
                productApi.getCategories(),
                api.get('/providers')
            ]);
            setProducts(prodRes.data);
            setCategories(catRes.data);
            setProviders(provRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenModal = (product: any = null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        setDeleteTarget(id);
        setDeletePin('');
        setConfirmModal(null);
    };

    const handleDeleteWithPin = async () => {
        if (!deleteTarget || !deletePin) return;
        setIsDeleting(true);
        try {
            await adminAuthApi.verifyPin(deletePin);
            const toastId = toast.loading('Eliminando permanentemente...');
            try {
                await productApi.deleteProductPermanent(deleteTarget);
                toast.success('Producto eliminado del sistema', { id: toastId });
                setDeleteTarget(null);
                setDeletePin('');
                fetchData();
            } catch (err: any) {
                const msg = err.response?.data?.message || 'No se puede eliminar: tiene historial de ventas.';
                toast.error(msg, { id: toastId });
                setDeleteTarget(null);
                setDeletePin('');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'PIN incorrecto');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleRestore = async (id: number) => {
        try {
            await productApi.restoreProduct(id);
            toast.success('Producto restaurado');
            fetchData();
        } catch (err) {
            toast.error('Error al restaurar');
        }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku?.toLowerCase().includes(search.toLowerCase());
        const matchesNoImage = filterNoImage ? (!p.imageUrl || p.imageUrl.trim() === '') : true;
        return matchesSearch && matchesNoImage;
    });

    return (
        <div className="products-page">
            <Sidebar />

            <main className="products-main">
                <header className="page-header">
                    <div className="header-text">
                        <h1>Catálogo de Productos</h1>
                        <p>Gestión de inventario y precios multinivel</p>
                    </div>

                    <div className="header-tools">
                        <div 
                            className="search-wrapper" 
                            style={{ 
                                position: 'relative', 
                                width: '300px',
                                flexShrink: 0,
                                margin: 0,
                                padding: 0
                            }}
                        >
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem 60px 0.75rem 2.8rem',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.9rem',
                                    margin: 0
                                }}
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    style={{
                                        position: 'absolute',
                                        right: '30px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
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
                                    <Trash2 size={18} strokeWidth={2.5} color="#ef4444" />
                                </button>
                            )}
                        </div>
                        <div className="view-toggles">
                            <button
                                className={`btn-toggle ${!showDisabled ? 'active' : ''}`}
                                onClick={() => setShowDisabled(false)}
                                title="Ver Activos"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                className={`btn-toggle ${showDisabled ? 'active-red' : ''}`}
                                onClick={() => setShowDisabled(true)}
                                title="Ver Deshabilitados"
                            >
                                <EyeOff size={18} />
                            </button>
                            <div className="toggle-sep"></div>
                            <button
                                className={`btn-toggle ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`}
                                onClick={() => setViewMode('table')}
                                title="Vista Tabla"
                            >
                                <List size={18} />
                            </button>
                            <div className="toggle-sep"></div>
                            <button
                                className={`btn-toggle ${filterNoImage ? 'active-amber' : ''}`}
                                onClick={() => setFilterNoImage(!filterNoImage)}
                                title={filterNoImage ? "Mostrando sin imagen" : "Filtrar sin imagen"}
                            >
                                <ImageOff size={18} />
                            </button>
                        </div>
                        <button className="btn-add" onClick={() => handleOpenModal()}>
                            <Plus size={20} /> Nuevo Producto
                        </button>
                    </div>
                </header>

                <div className={`products-container ${viewMode}`}>
                    {viewMode === 'grid' ? (
                        <div className="products-list-grid">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="p-card" style={{ '--cat-color': p.category?.colorHex || getCategoryColor(p.category_name || '') } as any}>
                                    <div className="p-image">
                                        <img src={p.imageUrl || `https://via.placeholder.com/300?text=${encodeURIComponent(p.name)}`} alt={p.name} />
                                        {p.isMedicine && (
                                            <div className="med-badge" title="Producto Médico">
                                                <Pill size={12} />
                                            </div>
                                        )}
                                        {p.is_service && (
                                            <div className="service-badge-grid" title="Servicio / Mano de Obra">
                                                <CheckCircle2 size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-info">
                                        <div className="p-top">
                                            <span
                                                className="p-category"
                                                style={{ background: `var(--cat-color)20`, color: `var(--cat-color)` }}
                                            >
                                                {p.category_name || 'Sin Categoría'}
                                            </span>
                                            <div className="p-actions-mini">
                                                <button className="btn-mini edit" onClick={() => handleOpenModal(p)}>
                                                    <Edit size={12} />
                                                </button>
                                                <button className="btn-mini delete" onClick={() => handleDelete(p.id)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="p-name">{p.name}</h3>

                                        <div className="p-footer-compact">
                                            <div className="p-price-compact">
                                                <span className="currency">$</span>
                                                <span className="value">{Number(p.base_price || p.basePrice).toFixed(2)}</span>
                                            </div>
                                            {p.variants && p.variants.length > 0 && (
                                                <div className="p-variants-badge" title={`${p.variants.length} niveles de precio`}>
                                                    <Layers size={10} />
                                                    <span>{p.variants.length}</span>
                                                </div>
                                            )}
                                            {p.hasCustomization && (
                                                <div className="p-variants-badge design-badge" title="Con Diseños">
                                                    <Palette size={10} />
                                                    <span>Diseños</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="products-table-wrapper">
                            <table className="products-table">
                                <thead>
                                    <tr>
                                        <th>Imagen</th>
                                        <th>Producto</th>
                                        <th>SKU</th>
                                        <th>Categoría</th>
                                        <th>Precio Base</th>
                                        <th>Diseños</th>
                                        <th>Tiers</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} style={{ '--cat-color': p.category?.colorHex || getCategoryColor(p.category_name || '') } as any}>
                                            <td>
                                                <div className="t-img-box">
                                                    <img src={p.imageUrl || `https://via.placeholder.com/50?text=${encodeURIComponent(p.name)}`} alt="" />
                                                    {p.isMedicine && <Pill size={12} className="t-med-icon" />}
                                                    {p.is_service && <CheckCircle2 size={12} className="t-service-icon" />}
                                                </div>
                                            </td>
                                            <td className="t-name-cell">
                                                <div className="t-name">{p.name}</div>
                                            </td>
                                            <td className="t-sku-cell">{p.sku || '---'}</td>
                                            <td>
                                                <span
                                                    className="p-category"
                                                    style={{ '--cat-color': getCategoryColor(p.category_name || '') } as any}
                                                >
                                                    {p.category_name || 'Sin Categoría'}
                                                </span>
                                            </td>
                                            <td className="t-price-cell">${Number(p.base_price || p.basePrice).toFixed(2)}</td>
                                            <td>
                                                {p.hasCustomization ? (
                                                    <span className="t-designs-tag">
                                                        <Palette size={12} /> Sí
                                                    </span>
                                                ) : (
                                                    <span className="t-designs-tag disabled">No</span>
                                                )}
                                            </td>
                                            <td>
                                                {p.variants?.length > 0 ? (
                                                    <span className="t-variants-tag">{p.variants.length} tiers</span>
                                                ) : '---'}
                                            </td>
                                            <td>
                                                <div className="t-actions">
                                                    {!showDisabled ? (
                                                        <>
                                                            <button className="btn-icon-table edit" onClick={() => handleOpenModal(p)} title="Editar">
                                                                <Edit size={16} />
                                                            </button>
                                                            <button className="btn-icon-table delete" onClick={() => handleDelete(p.id)} title="Desactivar">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="btn-icon-table restore" onClick={() => handleRestore(p.id)} title="Reactivar">
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {filteredProducts.length === 0 && (
                        <div className="empty-state">
                            <Package size={48} />
                            <p>No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </main>

            <ProductModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingProduct={editingProduct}
                categories={categories}
                providers={providers}
                onSaveSuccess={() => {
                    fetchData();
                    setIsModalOpen(false);
                }}
            />

            {confirmModal && (
                <div className="modal-overlay" style={{ zIndex: 4000 }}>
                    <div className="confirm-modal animate-in">
                        <header className="confirm-header">
                            <AlertCircle size={48} color="#ef4444" />
                            <h2>{confirmModal.title}</h2>
                        </header>
                        <p>{confirmModal.message}</p>
                        <footer>
                            <button className="btn-ghost" onClick={() => setConfirmModal(null)}>Cancelar</button>
                            <button className="btn-danger" onClick={confirmModal.onConfirm}>Confirmar</button>
                        </footer>
                    </div>
                </div>
            )}

            {deleteTarget !== null && (
                <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => { setDeleteTarget(null); setDeletePin(''); }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: '24px', padding: '2rem', width: '400px', maxWidth: '90vw', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <ShieldAlert size={28} style={{ color: '#ef4444', flexShrink: 0 }} />
                            <div>
                                <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Eliminar Permanentemente</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Requiere PIN de Super Admin</p>
                            </div>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Esta acción eliminará el producto de la base de datos. No podrás recuperarlo. Si tiene historial de ventas, solo se desactivará.</p>
                        <input
                            type="password" autoComplete="off"
                            autoFocus
                            value={deletePin}
                            onChange={e => setDeletePin(e.target.value)}
                            placeholder="PIN de seguridad"
                            maxLength={6}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', marginBottom: '1.5rem' }}
                            onKeyDown={e => e.key === 'Enter' && handleDeleteWithPin()}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setDeleteTarget(null); setDeletePin(''); }} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                Cancelar
                            </button>
                            <button onClick={handleDeleteWithPin} disabled={!deletePin || isDeleting} style={{ flex: 1.5, padding: '0.8rem', borderRadius: '12px', background: !deletePin || isDeleting ? '#334155' : '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: !deletePin || isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .products-page { display: flex; height: 100vh; background: #0f172a; color: white; }
                .products-main { flex: 1; overflow-y: auto; }
                
                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .header-text h1 { font-size: 2rem; font-weight: 800; color: #f8fafc; }
                .header-text p { color: #64748b; font-size: 0.9rem; }
                
                .header-tools { display: flex; gap: 1rem; align-items: center; }
                .view-toggles { display: flex; background: #1e293b; padding: 4px; border-radius: 12px; border: 1px solid #334155; }
                .btn-toggle { background: transparent; border: none; color: #64748b; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-toggle.active { background: ${user.color_hex || '#3b82f6'}; color: white; }
                .btn-toggle.active-red { background: #ef4444; color: white; }
                .btn-toggle.active-amber { background: #f59e0b; color: white; }
                .toggle-sep { width: 1px; height: 24px; background: #334155; margin: 0 0.5rem; }

                .btn-add { background: #3b82f6; color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
                
                .btn-add { background: #3b82f6; color: white; border: none; padding: 0.7rem 1.2rem; border-radius: 12px; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }

                .products-list-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }
                .p-card { background: #1e293b; border-radius: 20px; border: 1px solid #334155; overflow: hidden; transition: all 0.2s; }
                .p-image { height: 150px; background: #0f172a; position: relative; }
                .p-image img { width: 100%; height: 100%; object-fit: contain; padding: 1rem; }
                .med-badge { position: absolute; top: 0.75rem; right: 0.75rem; background: #ef4444; color: white; padding: 4px; border-radius: 8px; }
                .p-info { padding: 1.25rem; }
                .p-top { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
                .p-category { font-size: 0.7rem; font-weight: 800; padding: 4px 8px; border-radius: 10px; }
                .p-name { font-size: 1rem; font-weight: 800; color: #f1f5f9; margin-bottom: 1rem; }
                .p-price-compact .value { font-size: 1.25rem; font-weight: 800; color: #10b981; }

                .products-table { width: 100%; border-collapse: separate; border-spacing: 0 0.5rem; }
                .products-table th { padding: 1rem; text-align: left; color: #64748b; font-size: 0.8rem; text-transform: uppercase; }
                .products-table td { padding: 1rem; background: #1e293b; }
                .products-table tr td:first-child { border-radius: 12px 0 0 12px; }
                .products-table tr td:last-child { border-radius: 0 12px 12px 0; }
                .t-img-box { width: 48px; height: 48px; background: #0f172a; border-radius: 8px; overflow: hidden; position: relative; }
                .t-img-box img { width: 100%; height: 100%; object-fit: cover; }
                
                .confirm-modal { background: #1e293b; padding: 2rem; border-radius: 24px; width: 400px; text-align: center; }
                .confirm-header { margin-bottom: 1.5rem; }
                .confirm-header h2 { margin-top: 1rem; }
                .confirm-modal p { color: #94a3b8; margin-bottom: 2rem; }
                .confirm-modal footer { display: flex; gap: 1rem; justify-content: center; }
            `}</style>
        </div>
    );
};

export default Products;
