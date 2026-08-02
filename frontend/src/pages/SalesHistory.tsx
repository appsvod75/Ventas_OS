import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, History, Eye, CheckCircle, XCircle, Trash2, Plus, ShoppingCart, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Ticket from '../components/Ticket';
import NumericKeyboard from '../components/NumericKeyboard';
import { saleApi, configApi, productApi } from '../services/api';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence } from 'framer-motion';
import { getUser, hasRole, ROLES } from '../utils/permissions';

interface SaleRecord {
    id: number;
    total: number;
    discount: number;
    amountTendered?: number | null;
    change?: number | null;
    paymentMethod: string;
    createdAt: string;
    reversedAt?: string | null;
    shipping: number;
    fulfillmentStatus: string;
    balance: number;
    dueDate?: string | null;
    shippingDate?: string | null;
    branch: { name: string };
    user: { name: string };
    client?: { name: string; phone: string };
    clientId?: number;
    branchId: number;
    details: Array<{
        productId: number;
        quantity: number;
        subtotal: number;
        unitPrice: number;
        product: { name: string };
    }>;
}

const SalesHistory: React.FC = () => {
    const [sales, setSales] = useState<SaleRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 3), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editItems, setEditItems] = useState<any[]>([]);
    const [editDate, setEditDate] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeEditIdx, setActiveEditIdx] = useState<number | null>(null);
    const user = getUser();
    const [config, setConfig] = useState<any>(null);
    const [showReverseModal, setShowReverseModal] = useState(false);
    const [reversalReason, setReversalReason] = useState('');
    const [includeShipping, setIncludeShipping] = useState(false);
    const [isReversing, setIsReversing] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [foundProducts, setFoundProducts] = useState<any[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const lastSearchRef = useRef(searchTerm);

    // Pagination attributes
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    useEffect(() => {
        if (lastSearchRef.current === searchTerm) return;
        lastSearchRef.current = searchTerm;

        const delayDebounceFn = setTimeout(() => {
            if (page === 1) fetchHistory();
            else setPage(1);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        fetchHistory();
    }, [page, startDate, endDate]);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await configApi.getConfig();
            setConfig(res.data);
        } catch (error) {
            console.error('Error fetching config', error);
        }
    };

    const fetchHistory = async () => {
        try {
            setIsLoading(true);
            const res = await saleApi.getSalesHistory({
                search: searchTerm,
                startDate,
                endDate: endDate ? `${endDate}T23:59:59` : '',
                page,
                limit
            });
            setSales(res.data.data);
            setTotalPages(res.data.pagination.totalPages);
        } catch (error) {
            toast.error('Error al cargar el historial');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to first page
        fetchHistory();
    };

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSearchProducts = async (query: string) => {
        setProductSearch(query);
        if (query.length < 2) {
            setFoundProducts([]);
            return;
        }
        try {
            setIsSearchingProducts(true);
            const res = await productApi.getProducts(selectedSale?.branchId || user.branch_id);
            const filtered = res.data.filter((p: any) => 
                p.name.toLowerCase().includes(query.toLowerCase()) || 
                p.sku?.toLowerCase().includes(query.toLowerCase())
            );
            
            // Expandir variantes para que sean seleccionables individualmente
            const expanded: any[] = [];
            filtered.forEach((p: any) => {
                // Opción base (Unidad)
                expanded.push({
                    id: `${p.id}-base`,
                    productId: p.id,
                    name: p.name,
                    sku: p.sku,
                    price: Number(p.basePrice),
                    variantName: 'Unidad',
                    quantityPerUnit: 1,
                    isPackage: false
                });
                
                // Variantes (Cajas, etc)
                if (p.variants && p.variants.length > 0) {
                    p.variants.forEach((v: any) => {
                        expanded.push({
                            id: `${p.id}-v-${v.id}`,
                            productId: p.id,
                            name: p.name,
                            sku: p.sku,
                            price: Number(v.price),
                            variantName: v.variantName || v.name || 'Paquete',
                            quantityPerUnit: Number(v.quantity),
                            isPackage: true
                        });
                    });
                }
            });

            setFoundProducts(expanded.slice(0, 10));
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingProducts(false);
        }
    };

    const handleAddProductToEdit = (variant: any) => {
        // En edición, si es un paquete, lo convertimos a unidades base para simplificar el backend
        // que ya maneja tiers automáticos por cantidad, PERO si el usuario quiere EL PRECIO de la tier
        // le pondremos la cantidad mínima de esa tier.
        
        const existing = editItems.find(it => it.productId === variant.productId);
        
        if (existing) {
            const newQty = existing.quantity + variant.quantityPerUnit;
            const newItems = editItems.map(it => 
                it.productId === variant.productId 
                ? { ...it, quantity: newQty, subtotal: it.unitPrice * newQty } 
                : it
            );
            setEditItems(newItems);
        } else {
            setEditItems([...editItems, {
                productId: variant.productId,
                quantity: variant.quantityPerUnit,
                unitPrice: variant.price / variant.quantityPerUnit,
                subtotal: variant.price,
                product: { name: variant.name }
            }]);
        }
        setProductSearch('');
        setFoundProducts([]);
    };

    const handleRemoveItemFromEdit = (idx: number) => {
        setEditItems(editItems.filter((_, i) => i !== idx));
    };

    return (
        <div className="history-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div>
                        <h1>Historial Global de Ventas</h1>
                        <p>Búsqueda y visualización de tickets anteriores</p>
                    </div>
                </header>

                <div className="controls-bar">
                    <form onSubmit={handleSearch} className="search-form-expanded">
                        <div className="search-group">
                            <label>Búsq. Cliente</label>
                            <div 
                                className="search-input-wrapper"
                                style={{ 
                                    position: 'relative', 
                                    width: '100%',
                                    maxWidth: '450px',
                                }}
                            >
                                <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                                <input
                                    type="text"
                                    placeholder="Nombre o teléfono..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.875rem 45px 0.875rem 3rem',
                                        background: '#0f172a',
                                        border: '1px solid #334155',
                                        borderRadius: '12px',
                                        color: 'white',
                                        outline: 'none',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            position: 'absolute',
                                            right: '12px',
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
                                        <Trash2 size={20} strokeWidth={2.5} color="#ef4444" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="search-group">
                            <label>Desde</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                        </div>

                        <div className="search-group">
                            <label>Hasta</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }} />
                        </div>

                    </form>
                </div>

                <div className="table-container">
                    {isLoading ? (
                        <div className="loading-state">Cargando historial...</div>
                    ) : sales.length === 0 ? (
                        <div className="empty-state">
                            <History size={48} className="empty-icon" />
                            <p>No se encontraron registros de ventas.</p>
                        </div>
                    ) : (
                        <>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha y Hora</th>
                                        <th>Sucursal</th>
                                        <th>Cliente</th>
                                        <th>Método</th>
                                        <th className="text-right">Total</th>
                                        <th className="text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale.id}>
                                            <td>{format(new Date(sale.createdAt), "dd MMM yyyy, hh:mm a", { locale: es })}</td>
                                            <td>{sale.branch.name}</td>
                                            <td>
                                                <div className="client-cell">
                                                    <span className="font-bold">{sale.client?.name || 'Clientes Varios'}</span>
                                                    {sale.client?.phone && <span className="client-phone">{sale.client.phone}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${sale.paymentMethod === 'Credito' ? 'badge-warning' : 'badge-success'}`}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="text-right font-bold amounts" style={{ color: sale.reversedAt ? '#ef4444' : '#34d399' }}>
                                                {formatCurrency((sale.total || 0) + (sale.shipping || 0))}
                                                {sale.reversedAt && <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase' }}>ANULADA</div>}
                                            </td>
                                            <td className="text-center">
                                                <button className="action-btn" onClick={() => setSelectedSale(sale)}>
                                                    <Eye size={18} /> Ver Detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="btn-secondary"
                                    >Anterior</button>
                                    <span>Página {page} de {totalPages}</span>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        className="btn-secondary"
                                    >Siguiente</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Sale Details Modal */}
            {selectedSale && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal-content large" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Detalle de Venta #{selectedSale.id}
                                    {selectedSale.reversedAt && (
                                        <span style={{ marginLeft: '0.75rem', fontSize: '0.7rem', background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '6px', fontWeight: 800, verticalAlign: 'middle' }}>ANULADA</span>
                                    )}
                                </h2>
                                <div className="text-sm text-slate-400">
                                    {isEditing ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6' }}>FECHA:</label>
                                            <input 
                                                type="datetime-local" 
                                                value={editDate} 
                                                onChange={e => setEditDate(e.target.value)}
                                                className="edit-date-input"
                                                style={{ colorScheme: 'dark', background: '#0f172a', border: '1px solid #334155', borderRadius: '4px', padding: '2px 8px', color: 'white' }}
                                            />
                                        </div>
                                    ) : (
                                        format(new Date(selectedSale.createdAt), "EEEE d 'de' MMMM, yyyy - hh:mm a", { locale: es })
                                    )}
                                </div>
                            </div>
                            <div className="modal-actions-header" style={{ display: 'flex', gap: '0.5rem' }}>
                                {(hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN) && !isEditing) && (
                                    <button 
                                        className="btn-edit-sale" 
                                        onClick={() => {
                                            setIsEditing(true);
                                            setEditItems(selectedSale.details.map(d => ({ ...d })));
                                            const d = new Date(selectedSale.createdAt);
                                            const offset = d.getTimezoneOffset() * 60000;
                                            setEditDate(new Date(d.getTime() - offset).toISOString().slice(0, 16));
                                        }}
                                    >
                                        <Filter size={18} /> Editar Venta
                                    </button>
                                )}
                                {(hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN) && !isEditing && !selectedSale.reversedAt) && (
                                    <button 
                                        className="btn-reverse-sale" 
                                        onClick={() => {
                                            const ship = selectedSale.shipping > 0 && (selectedSale.fulfillmentStatus === 'DESPACHADO' || selectedSale.fulfillmentStatus === 'ENTREGADO');
                                            setIncludeShipping(ship);
                                            setReversalReason('');
                                            setShowReverseModal(true);
                                        }}
                                    >
                                        <XCircle size={18} /> Anular
                                    </button>
                                )}
                                {isEditing && (
                                    <>
                                        <button className="btn-secondary" onClick={() => setIsEditing(false)}>Cancelar</button>
                                        <button 
                                            className="btn-save-edit" 
                                            onClick={async () => {
                                                try {
                                                    const newTotal = editItems.reduce((sum, item) => sum + item.subtotal, 0) - (selectedSale.discount || 0);
                                                    await saleApi.updateSale(selectedSale.id, {
                                                        items: editItems.map(it => ({
                                                            product_id: it.productId,
                                                            quantity: it.quantity,
                                                            unitPrice: it.unitPrice
                                                        })),
                                                        discount: selectedSale.discount,
                                                        payment_method: selectedSale.paymentMethod,
                                                        clientId: selectedSale.clientId,
                                                        total: newTotal,
                                                        customDate: editDate
                                                    });
                                                    toast.success('Venta y Fecha actualizadas correctamente');
                                                    setIsEditing(false);
                                                    setSelectedSale(null);
                                                    fetchHistory();
                                                } catch (err) {
                                                    toast.error('Error al actualizar venta');
                                                }
                                            }}
                                        >
                                            Guardar Cambios
                                        </button>
                                    </>
                                )}
                                {!isEditing && (
                                    <button className="btn-print-ticket" onClick={handlePrint}>
                                        <History size={18} /> Reimprimir Ticket
                                    </button>
                                )}
                                <button className="close-btn" onClick={() => { setSelectedSale(null); setIsEditing(false); }}>×</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            {isEditing && (
                                <div className="edit-product-search-container" style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.5rem', display: 'block' }}>AGREGAR PRODUCTO A LA VENTA:</label>
                                    <div 
                                        className="search-input-wrapper"
                                        style={{ 
                                            position: 'relative', 
                                            width: '100%',
                                            maxWidth: '100%',
                                            flexShrink: 0,
                                            margin: 0,
                                            padding: 0
                                        }}
                                    >
                                        <Plus size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', pointerEvents: 'none', zIndex: 5 }} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre o SKU..."
                                            value={productSearch}
                                            onChange={(e) => handleSearchProducts(e.target.value)}
                                            style={{ 
                                                width: '100%', 
                                                padding: '0.85rem 45px 0.85rem 3rem',
                                                background: '#0f172a', 
                                                color: 'white', 
                                                borderColor: 'rgba(59, 130, 246, 0.4)',
                                                borderStyle: 'solid',
                                                borderWidth: '1px',
                                                fontSize: '0.95rem',
                                                borderRadius: '12px',
                                                outline: 'none'
                                            }}
                                        />
                                        {productSearch && (
                                            <button 
                                                onClick={() => { setProductSearch(''); setFoundProducts([]); }}
                                                style={{
                                                    position: 'absolute',
                                                    right: '12px',
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
                                        {isSearchingProducts && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: '60px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6' }} />}
                                    </div>
                                    
                                    {foundProducts.length > 0 && (
                                        <div className="edit-search-dropdown">
                                            {foundProducts.map(item => (
                                                <button 
                                                    key={item.id} 
                                                    onClick={() => handleAddProductToEdit(item)}
                                                    className="search-result-item"
                                                >
                                                    <div className="item-info">
                                                        <span className="item-name">{item.name}</span>
                                                        <span className="item-variant">{item.variantName}</span>
                                                    </div>
                                                    <div className="item-price">
                                                        {formatCurrency(item.price)}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="ticket-info">
                                <div className="info-group">
                                    <span className="info-label">Cajero/Usuario</span>
                                    <span className="info-value">{selectedSale.user.name}</span>
                                </div>
                                <div className="info-group">
                                    <span className="info-label">Sucursal</span>
                                    <span className="info-value">{selectedSale.branch.name}</span>
                                </div>
                                <div className="info-group">
                                    <span className="info-label">Cliente</span>
                                    <span className="info-value">{selectedSale.client?.name || 'Clientes Varios'} {selectedSale.client?.phone ? `(${selectedSale.client.phone})` : ''}</span>
                                </div>
                                <div className="info-group">
                                    <span className="info-label">Método</span>
                                    <span className="info-value">{selectedSale.paymentMethod}</span>
                                </div>
                            </div>

                            <table className="details-table">
                                <thead>
                                    <tr>
                                        <th>CANT.</th>
                                        <th>PRODUCTO</th>
                                        <th className="text-right">SUBTOTAL</th>
                                        {isEditing && <th className="text-center" style={{ width: '50px' }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {isEditing ? editItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="text-center font-bold">
                                                <input 
                                                    type="number" 
                                                    inputMode="none"
                                                    value={item.quantity} 
                                                    onChange={(e) => {
                                                        const newQty = parseInt(e.target.value) || 0;
                                                        const newItems = [...editItems];
                                                        newItems[idx].quantity = newQty;
                                                        const unitPrice = Number(newItems[idx].unitPrice) || 0;
                                                        newItems[idx].subtotal = unitPrice * newQty;
                                                        setEditItems(newItems);
                                                    }}
                                                    onFocus={() => { setActiveEditIdx(idx); setShowKeyboard(true); }}
                                                    className="edit-qty-input"
                                                />
                                            </td>
                                            <td>{item.product.name}</td>
                                            <td className="text-right amounts">{formatCurrency(item.subtotal)}</td>
                                            <td className="text-center">
                                                <button 
                                                    className="btn-remove-item" 
                                                    onClick={() => handleRemoveItemFromEdit(idx)}
                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )) : selectedSale.details.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="text-center font-bold">{item.quantity}</td>
                                            <td>{item.product.name}</td>
                                            <td className="text-right amounts">{formatCurrency(item.subtotal)}</td>
                                            {isEditing && <td></td>}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    {!isEditing && (
                                        <>
                                            <tr>
                                                <td colSpan={2} className="text-right text-slate-400" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>Subtotal:</td>
                                                <td className="text-right amounts text-slate-400" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                                                    {formatCurrency(selectedSale.total)}
                                                </td>
                                            </tr>
                                            {selectedSale.shipping > 0 && (
                                                <tr>
                                                    <td colSpan={2} className="text-right text-slate-400">Envío:</td>
                                                    <td className="text-right amounts text-slate-400">{formatCurrency(selectedSale.shipping)}</td>
                                                </tr>
                                            )}
                                            {(selectedSale.discount || 0) > 0 && (
                                                <tr>
                                                    <td colSpan={2} className="text-right text-red-400">Descuento:</td>
                                                    <td className="text-right amounts text-red-400">-{formatCurrency(selectedSale.discount)}</td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                    <tr>
                                        <td colSpan={isEditing ? 3 : 2} className="text-right text-emerald-400 font-bold" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>Total Venta:</td>
                                        <td className="text-right amounts text-emerald-400 font-bold" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                                            {formatCurrency(isEditing ? editItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0) - (selectedSale.discount || 0) : (selectedSale.total + (selectedSale.shipping || 0)))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colSpan={isEditing ? 3 : 2} className="text-right text-slate-400">Monto Recibido:</td>
                                        <td className="text-right amounts text-slate-300">{formatCurrency(selectedSale.amountTendered ?? (selectedSale.total + (selectedSale.shipping || 0)))}</td>
                                    </tr>
                                    <tr>
                                        <td colSpan={isEditing ? 3 : 2} className="text-right text-slate-400">Cambio:</td>
                                        <td className="text-right amounts text-slate-300">{formatCurrency(selectedSale.change ?? 0)}</td>
                                    </tr>
                                    {!isEditing && selectedSale.balance > 0 && (
                                        <tr>
                                            <td colSpan={2} className="text-right text-amber-400 font-bold" style={{ paddingTop: '0.75rem' }}>Saldo Pendiente:</td>
                                            <td className="text-right amounts text-amber-400 font-bold" style={{ paddingTop: '0.75rem' }}>
                                                {formatCurrency(selectedSale.balance)}
                                                {selectedSale.dueDate && (
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#f59e0b' }}>
                                                        Vence: {format(new Date(selectedSale.dueDate), 'dd/MM/yyyy', { locale: es })}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {!isEditing && selectedSale.balance <= 0 && selectedSale.paymentMethod.includes('CREDITO') && (
                                        <tr>
                                            <td colSpan={2} className="text-right text-emerald-400 font-bold" style={{ paddingTop: '0.75rem' }}>Estado de Pago:</td>
                                            <td className="text-right amounts text-emerald-400 font-bold" style={{ paddingTop: '0.75rem' }}>
                                                Total Pagado
                                            </td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Ticket for Printing */}
            <div style={{ display: 'none' }}>
                <div className="print-only">
                    {selectedSale && config && (
                        <Ticket sale={selectedSale} businessConfig={config} ref={printRef} />
                    )}
                </div>
            </div>

            {showReverseModal && selectedSale && (
                <div className="modal-overlay" onClick={() => setShowReverseModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 style={{ color: '#ef4444' }}>Anular Venta #{selectedSale.id}</h2>
                                <p className="text-sm text-slate-400">Esta acción no se puede deshacer</p>
                            </div>
                            <button className="btn-close" onClick={() => setShowReverseModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                                    Se devolverá el inventario de {selectedSale.details?.length || 0} producto(s).
                                    {selectedSale.balance > 0 && ' Se cancelará el saldo pendiente.'}
                                </p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0' }}>
                                        <span>Total venta:</span>
                                        <span style={{ fontWeight: 700 }}>${Number(selectedSale.total || 0).toFixed(2)}</span>
                                    </div>
                                    {selectedSale.shipping > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                                            <span>— Envío:</span>
                                            <span>${Number(selectedSale.shipping).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {selectedSale.balance > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b' }}>
                                            <span>— Saldo pendiente (se cancela):</span>
                                            <span style={{ fontWeight: 700 }}>${Number(selectedSale.balance).toFixed(2)}</span>
                                        </div>
                                    )}
                                    {selectedSale.paymentMethod.includes('EFECTIVO') && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                                            <span>— Reembolso productos:</span>
                                            <span style={{ fontWeight: 700 }}>${Number(Math.max(0, (selectedSale.amountTendered || 0) - (selectedSale.change || 0) - (selectedSale.shipping || 0))).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                                {selectedSale.shipping > 0 && selectedSale.shippingDate && (
                                    <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Fecha de despacho:</span>
                                        <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{format(new Date(selectedSale.shippingDate), 'dd/MM/yyyy', { locale: es })}</span>
                                    </div>
                                )}
                                {selectedSale.shipping > 0 && !selectedSale.shippingDate && (
                                    <div style={{ borderTop: '1px solid rgba(239,68,68,0.15)', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#10b981', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Despacho:</span>
                                        <span style={{ fontWeight: 700 }}>Inmediato</span>
                                    </div>
                                )}
                            </div>
                            <div className="field">
                                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Motivo de Anulación *</label>
                                <textarea
                                    className="modern-textarea"
                                    placeholder="Describa el motivo..."
                                    value={reversalReason}
                                    onChange={e => setReversalReason(e.target.value)}
                                    rows={3}
                                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.75rem', color: 'white', resize: 'none', outline: 'none' }}
                                />
                            </div>
                            {selectedSale.shipping > 0 && (
                                <label className="compact-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.75rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={includeShipping}
                                        onChange={e => setIncludeShipping(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>
                                        Incluir envío como gasto (${Number(selectedSale.shipping).toFixed(2)})
                                    </span>
                                </label>
                            )}
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: '1px solid #334155' }}>
                            <button className="btn-secondary" onClick={() => setShowReverseModal(false)}>Cancelar</button>
                            <button
                                className="btn-danger"
                                disabled={!reversalReason.trim() || isReversing}
                                onClick={async () => {
                                    if (!reversalReason.trim()) return;
                                    setIsReversing(true);
                                    try {
                                        await saleApi.reverseSale(selectedSale.id, { reason: reversalReason.trim(), includeShipping });
                                        toast.success('Venta anulada exitosamente');
                                        setShowReverseModal(false);
                                        setSelectedSale(null);
                                        fetchHistory();
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || 'Error al anular venta');
                                    } finally {
                                        setIsReversing(false);
                                    }
                                }}
                            >
                                {isReversing ? 'Anulando...' : 'Anular Venta'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .dashboard-main { flex: 1; display: flex; flex-direction: column; padding: 2rem 4rem; overflow: hidden; }
                
                .dash-header { margin-bottom: 2rem; }
                .dash-header h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.25rem; }
                .dash-header p { color: #94a3b8; }
                
                .controls-bar { display: flex; justify-content: space-between; margin-bottom: 2rem; background: rgba(30, 41, 59, 0.3); padding: 1.5rem; border-radius: 16px; border: 1px solid #334155; }
                 .search-form-expanded { display: flex; gap: 1.5rem; width: 100%; align-items: flex-end; }
                .search-group:first-child { flex: 1; }
                .search-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .search-group label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 4px; }
                .search-group input { 
                    padding: 0.7rem 1rem; background: #0f172a; border: 1px solid #334155; border-radius: 10px; color: white; outline: none; font-size: 0.9rem;
                    transition: all 0.2s;
                }
                .search-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                .search-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                
                .btn-primary { background: #3b82f6; color: white; padding: 0.75rem 2rem; border-radius: 10px; font-weight: 700; cursor: pointer; border: none; transition: all 0.2s; }
                .btn-primary:hover { background: #2563eb; }
                .btn-secondary { background: rgba(255,255,255,0.1); color: white; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; }
                .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.15); }
                .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-danger { background: #ef4444; color: white; border: none; padding: 0.55rem 1.5rem; border-radius: 10px; font-weight: 800; font-size: 0.8rem; cursor: pointer; }
                .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }
                .btn-danger:hover:not(:disabled) { background: #dc2626; }

                .client-cell { display: flex; flex-direction: column; }
                .client-phone { font-size: 0.75rem; color: #94a3b8; }
                
                .badge { padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
                .badge-success { background: rgba(52, 211, 153, 0.1); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.2); }
                .badge-warning { background: rgba(251, 191, 36, 0.1); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.2); }

                .text-right { text-align: right !important; }
                .text-center { text-align: center !important; }
                .font-bold { font-weight: 700; }
                .amounts { font-variant-numeric: tabular-nums; }
                
                .action-btn { background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; justify-content: center; margin: 0 auto; transition: all 0.2s; }
                .action-btn:hover { background: #3b82f6; color: white; }

                .loading-state, .empty-state { padding: 4rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .empty-icon { color: #475569; margin-bottom: 1rem; }

                .pagination { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: rgba(15, 23, 42, 0.3); border-top: 1px solid #334155; }

                /* Modal Styles */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
                .modal-content { background: #1e293b; width: 100%; max-width: 500px; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden; display: flex; flex-direction: column; max-height: 90vh; }
                .modal-content.large { max-width: 650px; }
                .modal-header { padding: 1.5rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: flex-start; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.25rem 0; color: white; }
                .close-btn { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; padding: 0; line-height: 1; }
                .close-btn:hover { color: white; }
                
                .modal-body { padding: 1.5rem; overflow-y: auto; }
                
                .ticket-info { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: rgba(15, 23, 42, 0.4); padding: 1rem; border-radius: 8px; border: 1px dashed #334155; margin-bottom: 1.5rem; }
                .info-group { display: flex; flex-direction: column; }
                .info-label { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
                .info-value { font-weight: 600; color: #e2e8f0; }

                .details-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
                .details-table th, .details-table td { padding: 0.75rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .details-table th { color: #94a3b8; font-size: 0.75rem; text-align: left; }
                .details-table tfoot td { padding: 0.5rem 0; border-bottom: none; font-weight: 600; }
                .details-table .total-row td { padding-top: 1rem; font-size: 1.1rem; font-weight: 900; }

                .btn-print-ticket {
                    background: #10b981;
                    color: white;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .btn-print-ticket:hover {
                    background: #059669;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);
                }

                .btn-edit-sale {
                    background: rgba(245, 158, 11, 0.1);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .btn-edit-sale:hover {
                    background: #f59e0b;
                    color: white;
                }

                .btn-reverse-sale {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                }
                .btn-reverse-sale:hover {
                    background: #ef4444;
                    color: white;
                }

                .edit-qty-input {
                    width: 60px;
                    background: #0f172a;
                    border: 1px solid #3b82f6;
                    color: white;
                    text-align: center;
                    padding: 4px;
                    border-radius: 4px;
                    font-weight: 900;
                }

                .edit-actions-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255,255,255,0.1);
                }

                .btn-save-edit {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 800;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                /* Estética del Buscador en Edición (Inspirada en POS) */
                .edit-search-dropdown {
                    position: absolute; top: 100%; left: 0; right: 0; background: #0f172a; 
                    border: 1px solid #3b82f6; border-radius: 16px; margin-top: 10px; z-index: 100;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6); overflow: hidden;
                    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .search-result-item {
                    width: 100%; padding: 1rem 1.5rem; display: flex; justify-content: space-between;
                    align-items: center; background: transparent; border: none; cursor: pointer;
                    border-bottom: 1px solid rgba(255,255,255,0.05); transition: all 0.2s;
                }
                .search-result-item:hover { background: rgba(59, 130, 246, 0.15); padding-left: 1.75rem; }
                .search-result-item .item-info { display: flex; flex-direction: column; align-items: flex-start; }
                .search-result-item .item-name { color: white; font-weight: 700; font-size: 0.95rem; }
                .search-result-item .item-variant { 
                    font-size: 0.65rem; color: #3b82f6; font-weight: 900; 
                    text-transform: uppercase; margin-top: 4px; letter-spacing: 0.05em;
                    background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px;
                }
                .search-result-item .item-price { color: #10b981; font-weight: 900; font-size: 1.1rem; }

                .edit-clear-search-btn {
                    position: absolute; right: 2.25rem; top: 50%; transform: translateY(-50%);
                    background: rgba(255,255,255,0.05); border: none; color: #94a3b8;
                    width: 24px; height: 24px; border-radius: 50%; display: flex;
                    align-items: center; justify-content: center; cursor: pointer;
                    transition: all 0.2s;
                }
                .edit-clear-search-btn:hover { background: #334155; color: white; }

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
            `}</style>

            <AnimatePresence>
                {showKeyboard && activeEditIdx !== null && (
                    <NumericKeyboard
                        value={String(editItems[activeEditIdx]?.quantity || '')}
                        onChange={(val) => {
                            const newQty = parseInt(val) || 0;
                            const newItems = [...editItems];
                            if (newItems[activeEditIdx]) {
                                newItems[activeEditIdx].quantity = newQty;
                                const unitPrice = Number(newItems[activeEditIdx].unitPrice) || 0;
                                newItems[activeEditIdx].subtotal = unitPrice * newQty;
                                setEditItems(newItems);
                            }
                        }}
                        onClose={() => { setShowKeyboard(false); setActiveEditIdx(null); }}
                        title="CANTIDAD"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalesHistory;
