import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Search, Package, Layers, Coins, TrendingUp,
    ChevronRight, Store, ArrowRight, Filter, Info, Plus, X, Truck, ShoppingCart, MinusCircle, PlusCircle, CheckCircle2, User, Phone, FileText, Calendar, Trash2, History, RefreshCw, Edit, Check
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ProductModal from '../components/ProductModal';
import { productApi, branchApi, providerApi, purchaseApi, inventoryApi, saleApi } from '../services/api';
import { socket, socketEvents } from '../services/socket';
import VirtualKeyboard from '../components/VirtualKeyboard';
import NumericKeyboard from '../components/NumericKeyboard';
import { AnimatePresence } from 'framer-motion';

const StatCard = ({ icon, label, value, sub, color }: any) => (
    <div className="stat-card">
        <div className="stat-icon" style={{ color }}>{icon}</div>
        <div className="stat-content">
            <span className="stat-label">{label}</span>
            <div className="stat-value">{value}</div>
            <span className="stat-sub">{sub}</span>
        </div>
    </div>
);

const getCategoryColor = (categoryName: string) => {
    if (!categoryName) return '#64748b'; // default slate-500
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 45%)`; // darker, vibrant color suitable for both background and text
};

const Inventory: React.FC = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [providers, setProviders] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isProvModalOpen, setIsProvModalOpen] = useState(false);
    const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [kardexBranch, setKardexBranch] = useState<number>(1);
    const [isProdModalOpen, setIsProdModalOpen] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);
    const [kardexItems, setKardexItems] = useState<any[]>([]);
    const [loadingKardex, setLoadingKardex] = useState(false);
    
    // Refs to avoid stale closures in socket listener
    const kardexOpenRef = useRef(isKardexModalOpen);
    const selectedIdRef = useRef(selectedId);
    const kardexBranchRef = useRef(kardexBranch);

    useEffect(() => { kardexOpenRef.current = isKardexModalOpen; }, [isKardexModalOpen]);
    useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);
    useEffect(() => { kardexBranchRef.current = kardexBranch; }, [kardexBranch]);
    const [editingBranchStock, setEditingBranchStock] = useState<{ branchId: number; minStock: number; maxStock: number } | null>(null);
    const [isSavingStock, setIsSavingStock] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';
    const initialBranch = currentUser.branch_id || 1;

    const [activeKeyboard, setActiveKeyboard] = useState<'qwerty' | 'numeric' | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

    // ERP Modal States
    const [docType, setDocType] = useState('purchase'); // purchase, adjustment_in, adjustment_out, transfer
    const [selectedBranch, setSelectedBranch] = useState<number>(initialBranch);
    const [targetBranchId, setTargetBranchId] = useState<number | ''>('');
    const [isDirectTransfer, setIsDirectTransfer] = useState(true);
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [selectedProviderId, setSelectedProviderId] = useState<number | ''>('');
    const [paymentType, setPaymentType] = useState('CASH'); // CASH, CREDIT
    const [dueDate, setDueDate] = useState('');
    const [isDueDateModalOpen, setIsDueDateModalOpen] = useState(false);
    const [isMovementDetailModalOpen, setIsMovementDetailModalOpen] = useState(false);
    const [movementDetail, setMovementDetail] = useState<any>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [detailType, setDetailType] = useState<'PURCHASE' | 'SALE' | 'TRANSFER' | null>(null);

    // New Provider States
    const [newProv, setNewProv] = useState({ name: '', vendor: '', phone: '', email: '', address: '' });

    // Purchase Items
    const [purchaseItems, setPurchaseItems] = useState<any[]>([]);
    const [itemSearch, setItemSearch] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [showAbove, setShowAbove] = useState(false);
    const [providerSearch, setProviderSearch] = useState('');
    const [showProvResults, setShowProvResults] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const provSearchRef = useRef<HTMLDivElement>(null);


    const user = JSON.parse(localStorage.getItem('user') || '{ }');

    useEffect(() => {
        fetchProducts();
        fetchBranches();
        fetchProviders();
        fetchCategories();

        // Listen for real-time updates
        socket.on(socketEvents.PRODUCT_CREATED, fetchDataFromSocket);
        socket.on(socketEvents.PRODUCT_UPDATED, fetchDataFromSocket);
        socket.on(socketEvents.INVENTORY_UPDATED, fetchDataFromSocket);

        return () => {
            socket.off(socketEvents.PRODUCT_CREATED);
            socket.off(socketEvents.PRODUCT_UPDATED);
            socket.off(socketEvents.INVENTORY_UPDATED);
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (provSearchRef.current && !provSearchRef.current.contains(event.target as Node)) {
                setShowProvResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDataFromSocket = (data: any) => {
        console.log('🔄 Sincronización Real-time recibida:', data);
        fetchProducts();
        if (kardexOpenRef.current && selectedIdRef.current) {
            fetchKardex(selectedIdRef.current, kardexBranchRef.current);
        }
    };

    // Re-validate stock when origin branch changes in transfers
    useEffect(() => {
        if (docType === 'transfer' && purchaseItems.length > 0) {
            let affectedCount = 0;
            const updatedItems = purchaseItems.map(item => {
                const product = products.find(p => p.id === item.product_id);
                const branchStock = product?.inventory?.find((i: any) => i.branchId === selectedBranch)?.stockLevel || 0;
                
                if (item.quantity > branchStock) {
                    affectedCount++;
                    return { ...item, quantity: branchStock };
                }
                return item;
            });

            if (affectedCount > 0) {
                setPurchaseItems(updatedItems);
                toast.error(`Se han ajustado ${affectedCount} productos por falta de stock en la nueva sucursal de origen.`);
            }
        }
    }, [selectedBranch, docType]);


    const fetchProviders = async () => {
        try {
            const res = await providerApi.getProviders();
            setProviders(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchCategories = async () => {
        try {
            const res = await productApi.getCategories();
            setCategories(res.data);
        } catch (err) { console.error(err); }
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        try {
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            const parts = text.split(regex);
            return parts.map((part, i) => 
                part.toLowerCase() === query.toLowerCase() 
                    ? <span key={i} style={{ color: '#10b981', fontWeight: 800 }}>{part}</span> 
                    : part
            );
        } catch (e) { return text; }
    };

    const handleSaveProvider = async () => {
        if (!newProv.name) return toast.error('Nombre es requerido');
        try {
            await providerApi.createProvider(newProv);
            await fetchProviders();
            setIsProvModalOpen(false);
            setNewProv({ name: '', vendor: '', phone: '', email: '', address: '' });
        } catch (err) {
            toast.error('Error al guardar proveedor');
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
            if (!isAdmin) {
                setSelectedBranch(initialBranch);
            } else if (res.data.length > 0 && !selectedBranch) {
                setSelectedBranch(res.data[0].id);
            }
            // Default target branch to the first one available that isn't the current one
            if (res.data.length > 1) {
                const other = res.data.find((b: any) => b.id !== initialBranch);
                if (other) setTargetBranchId(other.id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await productApi.getProducts();
            setProducts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchKardex = async (productId: number, branchId: number) => {
        setLoadingKardex(true);
        try {
            const res = await inventoryApi.getProductKardex(productId, branchId);
            setKardexItems(res.data);
        } catch (err) {
            toast.error('Error al obtener movimientos');
        } finally {
            setLoadingKardex(false);
        }
    };

    const handleOpenKardex = (productId: number) => {
        setKardexBranch(initialBranch);
        fetchKardex(productId, initialBranch);
        setIsKardexModalOpen(true);
    };

    const openMovementDetail = async (id: number, type: 'PURCHASE' | 'SALE' | 'TRANSFER') => {
        setLoadingDetail(true);
        setDetailType(type);
        setIsMovementDetailModalOpen(true);
        try {
            let res;
            if (type === 'PURCHASE') res = await purchaseApi.getPurchase(id);
            else if (type === 'SALE') res = await saleApi.getSaleById(id);
            else res = await inventoryApi.getTransfer(id);
            setMovementDetail(res.data);
        } catch (err) {
            toast.error('Error al cargar detalle');
            setIsMovementDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };


    const clearForm = () => {
        setInvoiceNumber('');
        setSelectedProviderId('');
        setProviderSearch('');
        setPurchaseItems([]);
        setItemSearch('');
        setPaymentType('CASH');
        setDueDate('');
        setTargetBranchId('');
    };

    const addPurchaseItem = (product: any) => {
        const itemExists = purchaseItems.find(i => i.product_id === product.id);
        if (itemExists) return toast.error('El producto ya está en la lista');

        const isAdjustment = docType === 'adjustment_in' || docType === 'adjustment_out';
        const isPurchase = docType === 'purchase';
        const isTransfer = docType === 'transfer';

        // STOCK VALIDATION FOR TRANSFERS
        if (isTransfer) {
            const branchStock = product.inventory?.find((i: any) => i.branchId === selectedBranch)?.stockLevel || 0;
            if (branchStock <= 0) {
                return toast.error(`No hay existencias de "${product.name}" en la sucursal de origen.`);
            }
        }
        
        let initialSubtotal: any = 0;
        let initialUnitCost: any = 0;

        if (isAdjustment) {
            initialSubtotal = 0;
            initialUnitCost = 0;
        } else if (isPurchase) {
            initialSubtotal = '';
            initialUnitCost = '';
        } else {
            const defaultCost = Number(product.average_cost || 0);
            const finalCost = (isTransfer || docType === 'adjustment_out') 
                ? defaultCost 
                : Number(product.average_cost || product.base_price || 0);
            initialSubtotal = finalCost;
            initialUnitCost = finalCost;
        }

        const newItem = {
            product_id: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 1,
            unit_cost: initialUnitCost,
            subtotal: initialSubtotal,
            batch_number: '',
            expiration_date: '',
            multiplier: 1,
            unit_name: 'UNIDAD',
            variants: product.variants || []
        };

        setPurchaseItems([...purchaseItems, newItem]);
        setItemSearch('');
        setShowResults(false);

        // Autofocus quantity of the new item
        setTimeout(() => {
            const inputs = document.querySelectorAll('.qty-input');
            const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
            if (lastInput) lastInput.focus();
        }, 100);
    };

    const formatDateMask = (value: string) => {
        // Remove all non-digits
        const digits = value.replace(/\D/g, '');
        let formatted = '';
        
        if (digits.length > 0) {
            formatted = digits.substring(0, 2);
            if (digits.length > 2) {
                formatted += '/' + digits.substring(2, 4);
                if (digits.length > 4) {
                    formatted += '/' + digits.substring(4, 8);
                }
            }
        }
        return formatted;
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...purchaseItems];
        const item = newItems[index];

        if (field === 'expiration_date') {
            item[field] = formatDateMask(value);
        } else {
            item[field] = value;
        }

        // Auto-calculate logic
        if (field === 'quantity' || field === 'subtotal' || field === 'multiplier') {
            const qty = Number(item.quantity) || 0;

            // STOCK VALIDATION FOR TRANSFERS
            if (docType === 'transfer' && (field === 'quantity' || field === 'multiplier')) {
                const originalProduct = products.find(p => p.id === item.product_id);
                const branchStock = originalProduct?.inventory?.find((i: any) => i.branchId === selectedBranch)?.stockLevel || 0;
                const mult = Number(item.multiplier) || 1;
                const totalTargetUnits = qty * mult;
                
                if (totalTargetUnits > branchStock) {
                    toast.error(`Stock insuficiente. Solo tienes ${branchStock} unidades disponibles.`);
                    // If it was a quantity change, we cap it. 
                    // If it was a multiplier change, we might want to cap quantity or warn.
                    if (field === 'quantity') {
                        item.quantity = Math.floor(branchStock / mult);
                    }
                }
            }

            const sub = Number(item.subtotal) || 0;
            const mult = Number(item.multiplier) || 1;
            const totalQty = (Number(item.quantity) || 0) * mult;
            
            if (totalQty > 0) {
                // We keep unit_cost as the cost per BASE unit for the backend
                item.unit_cost = sub / totalQty;
            }
        } else if (field === 'unit_cost') {
            const mult = Number(item.multiplier) || 1;
            item.subtotal = (Number(item.quantity) || 0) * mult * (Number(item.unit_cost) || 0);
        }

        setPurchaseItems(newItems);
    };

    const removeItem = (index: number) => {
        setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return purchaseItems.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0);
    };

    const handleSavePurchase = async () => {
        if (purchaseItems.length === 0) return toast.error('Agregue productos');

        const loadingToast = toast.loading('Procesando movimiento...');
        try {
            if (docType === 'transfer') {
                if (!targetBranchId) throw new Error('Seleccione sucursal de destino');
                if (targetBranchId === selectedBranch) throw new Error('Origen y destino deben ser diferentes');
                
                await inventoryApi.createTransfer({
                    from_branch_id: selectedBranch,
                    to_branch_id: targetBranchId,
                    status: (isAdmin && isDirectTransfer) ? 'COMPLETED' : 'PENDING',
                    items: purchaseItems.map(item => ({
                        product_id: item.product_id,
                        quantity: Number(item.quantity) * (item.multiplier || 1)
                    }))
                });
                toast.success((isAdmin && isDirectTransfer) ? 'Traslado procesado correctamente' : 'Solicitud de traslado creada', { id: loadingToast });
            } else {
                const data = {
                    branch_id: selectedBranch,
                    provider_id: selectedProviderId || null,
                    invoice_number: docType === 'adjustment_out' ? `ADJ-OUT: ${invoiceNumber}` : (docType === 'adjustment_in' ? `ADJ-IN: ${invoiceNumber}` : invoiceNumber),
                    payment_type: paymentType,
                    details: purchaseItems.map(item => ({
                        ...item,
                        quantity: (docType === 'adjustment_out' ? -1 : 1) * Number(item.quantity) * (item.multiplier || 1),
                        unit_cost: item.unit_cost
                    }))
                };
                await purchaseApi.createPurchase(data);
                toast.success('Movimiento procesado correctamente', { id: loadingToast });
            }

            setIsModalOpen(false);
            clearForm();
            fetchProducts(); // Refresh stock
        } catch (err: any) {
            console.error("Save Inventory Error:", err);
            const errMsg = err.response?.data?.message || err.message || 'Error al procesar el movimiento';
            toast.error(`Error: ${errMsg}`, { id: loadingToast });
        }
    };

    const handleSaveBranchStock = async () => {
        if (!editingBranchStock || !selectedId) return;
        setIsSavingStock(true);
        try {
            await inventoryApi.updateInventory(editingBranchStock.branchId, selectedId, {
                minStock: editingBranchStock.minStock,
                maxStock: editingBranchStock.maxStock
            });
            toast.success('Límites actualizados');
            setEditingBranchStock(null);
            fetchProducts();
        } catch (err) {
            toast.error('Error al actualizar límites');
        } finally {
            setIsSavingStock(false);
        }
    };

    const filteredItemSearch = products.filter(p =>
        !p.is_service && (
            p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
            p.sku?.toLowerCase().includes(itemSearch.toLowerCase())
        )
    ).slice(0, 5);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const selectedProduct = products.find(p => p.id === selectedId);

    const stats = {
        totalItems: products.filter(p => !p.is_service).length,
        totalStock: products.filter(p => !p.is_service).reduce((acc, p) => acc + (Number(p.stock_level) || 0), 0),
        lowStock: products.filter(p => !p.is_service).filter(p => (Number(p.stock_level) || 0) < (p.minStock || 10)).length,
        valuation: products.filter(p => !p.is_service).reduce((acc, p) => acc + (Number(p.stock_level) || 0) * (Number(p.average_cost) || 0), 0)
    };

    return (
        <div className="inventory-container">
            <Sidebar />

            <div className="inventory-main">
                <header className="inventory-header">
                    <div className="header-title">
                        <h1>Inventario Maestro</h1>
                        <p>Gestión centralizada de stock y productos</p>
                    </div>

                    <div className="header-actions">
                        <div 
                            className="inventory-search-wrapper" 
                            style={{ 
                                position: 'relative', 
                                width: '300px',
                                flexShrink: 0,
                                margin: 0,
                                padding: 0
                            }}
                        >
                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                            <input
                                type="text"
                                placeholder="Buscar en inventario global..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => { setActiveField('globalSearch'); setActiveKeyboard('qwerty'); }}
                                inputMode="none"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.875rem 45px 0.875rem 3rem',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s'
                                }}
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
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
                        <button className="btn-erp" onClick={() => setIsModalOpen(true)}>
                            <Plus size={18} /> Nuevo Movimiento
                        </button>
                    </div>
                </header>

                <div className="inventory-stats">
                    <StatCard
                        icon={<Layers />}
                        label="Artículos"
                        value={stats.totalItems}
                        sub="En catálogo"
                        color="#3b82f6"
                    />
                    <StatCard
                        icon={<Package />}
                        label="Stock Total"
                        value={stats.totalStock}
                        sub="Unidades físicas"
                        color="#f59e0b"
                    />
                    <StatCard
                        icon={<TrendingUp />}
                        label="Bajo Stock"
                        value={stats.lowStock}
                        sub="Causa de alerta"
                        color="#ef4444"
                    />
                    <StatCard
                        icon={<Coins />}
                        label="Valorización"
                        value={`$${stats.valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        sub="Inversión total"
                        color="#10b981"
                    />
                </div>

                <div className="inventory-content">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>PRODUCTO</th>
                                    <th>CATEGORÍA</th>
                                    <th>PRECIO BASE</th>
                                    <th>STOCK GLOBAL</th>
                                    <th>ESTADO</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr
                                        key={p.id}
                                        className={selectedId === p.id ? 'active' : ''}
                                        onClick={() => setSelectedId(p.id)}
                                    >
                                        <td>
                                            <div className="product-cell">
                                                <div className="product-img">
                                                    <img src={p.imageUrl || `https://picsum.photos/seed/${p.id}/50`} alt="" />
                                                </div>
                                                <div className="product-details">
                                                    <span className="sku">{p.sku}</span>
                                                    <span className="name">{p.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <span
                                                className="p-category"
                                                style={{ '--cat-color': getCategoryColor(p.category_name || '') } as any}
                                            >
                                                {p.category_name || 'Sin Categoría'}
                                            </span>
                                        </td>
                                        <td className="font-mono font-bold text-center">${Number(p.base_price || 0).toFixed(2)}</td>
                                        <td className="font-mono font-bold">{p.stock_level || 0} UN</td>
                                        <td>
                                            <span className={`status-badge ${(Number(p.stock_level) || 0) <= (p.minStock || 5) ? 'low' : 'ok'}`}>
                                                {(Number(p.stock_level) || 0) <= (p.minStock || 5) ? 'BAJO' : 'Suficiente'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={`inventory-side-panel ${selectedProduct ? 'open' : ''}`}>
                        {selectedProduct ? (
                            <div className="side-panel-content">
                                <div className="panel-header">
                                    <div className="panel-header-top">
                                        <span
                                            className="category"
                                            style={{ '--cat-color': getCategoryColor(selectedProduct.category_name || '') } as any}
                                        >
                                            {selectedProduct.category_name || 'Sin Categoría'}
                                        </span>
                                        <button className="btn-close-panel" onClick={() => setSelectedId(null)}>
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <h2>{selectedProduct.name}</h2>
                                    <p className="sku">SKU: {selectedProduct.sku}</p>
                                </div>

                                <div className="panel-stats">
                                    <div className="p-stat">
                                        <label>Precio Base</label>
                                        <div className="value">${Number(selectedProduct.base_price).toFixed(2)}</div>
                                    </div>
                                    <div className="p-stat">
                                        <label>Stock Total</label>
                                        <div className="value">{selectedProduct.stock_level} UN</div>
                                    </div>
                                </div>

                                <div className="divider"></div>

                                <div className="branch-stock-section">
                                    <div className="section-header-compact">
                                        <h3>Stock por Sucursal</h3>
                                        <button
                                            className="btn-kardex-mini"
                                            onClick={() => handleOpenKardex(selectedProduct.id)}
                                            title="Ver Kardex"
                                        >
                                            <History size={14} />
                                            <span>Kardex</span>
                                        </button>
                                    </div>
                                    <div className="branch-list">
                                        {branches.map(b => {
                                            const branchInv = selectedProduct.inventory?.find((i: any) => i.branchId === b.id);
                                            const isEditing = editingBranchStock?.branchId === b.id;

                                            return (
                                                <div key={b.id} className={`branch-row ${isEditing ? 'editing' : ''}`}>
                                                    <div className="branch-main-info">
                                                        <div className="branch-info">
                                                            <Store size={14} />
                                                            <span>{b.name}</span>
                                                        </div>
                                                        <div className="branch-stock-status">
                                                            <span className={`stock-val ${(branchInv?.stockLevel <= (branchInv?.minStock || 5)) ? 'low' : ''}`}>
                                                                {branchInv?.stockLevel || 0} UN
                                                            </span>
                                                            {!isEditing && (
                                                                <button
                                                                    className="btn-edit-stock"
                                                                    onClick={() => setEditingBranchStock({
                                                                        branchId: b.id,
                                                                        minStock: branchInv?.minStock ?? 5,
                                                                        maxStock: branchInv?.maxStock ?? 100
                                                                    })}
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {editingBranchStock && editingBranchStock.branchId === b.id && (
                                                        <div className="branch-edit-form animate-in">
                                                            <div className="edit-inputs">
                                                                <div className="edit-field">
                                                                    <label>Mínimo</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editingBranchStock.minStock}
                                                                        onChange={e => setEditingBranchStock(prev => prev ? { ...prev, minStock: parseInt(e.target.value) || 0 } : null)}
                                                                        onFocus={() => { setActiveField('minStock'); setActiveKeyboard('numeric'); }}
                                                                        inputMode="none"
                                                                    />
                                                                </div>
                                                                <div className="edit-field">
                                                                    <label>Máximo</label>
                                                                    <input
                                                                        type="number"
                                                                        value={editingBranchStock.maxStock}
                                                                        onChange={e => setEditingBranchStock(prev => prev ? { ...prev, maxStock: parseInt(e.target.value) || 0 } : null)}
                                                                        onFocus={() => { setActiveField('maxStock'); setActiveKeyboard('numeric'); }}
                                                                        inputMode="none"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="edit-actions">
                                                                <button className="btn-save-stock" onClick={handleSaveBranchStock} disabled={isSavingStock}>
                                                                    {isSavingStock ? '...' : <Check size={14} />}
                                                                </button>
                                                                <button className="btn-cancel-stock" onClick={() => setEditingBranchStock(null)}>
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-panel">
                                <Package size={48} />
                                <p>Seleccione un producto para ver el detalle</p>
                            </div>
                        )}
                    </div>
                </div>

            {/* ERP MODAL */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="erp-modal">
                        <header className="erp-modal-header">
                            <div className="header-left">
                                <div className="icon-box"><ShoppingCart size={24} /></div>
                                <div>
                                    <h2>Nuevo Movimiento de Inventario</h2>
                                    <p>Gestión de entradas, salidas y traslados</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </header>

                        <div className="erp-form">
                            <div className="erp-header-container">
                                <div className="erp-header-compact">
                                <div className="header-grid-compact">
                                    <div className="form-group">
                                        <label>OPERACIÓN</label>
                                        <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                                            <option value="purchase">Compra (Entrada)</option>
                                            <option value="adjustment_in">Ajuste (+)</option>
                                            <option value="adjustment_out">Ajuste (-)</option>
                                            <option value="transfer">Traslado</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>REFERENCIA / FACTURA</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: F-12345"
                                            value={invoiceNumber}
                                            onChange={(e) => setInvoiceNumber(e.target.value)}
                                            onFocus={() => { setActiveField('invoiceNumber'); setActiveKeyboard('qwerty'); }}
                                            inputMode="none"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{docType === 'transfer' ? 'ORIGEN (DESDE)' : 'SEDE'}</label>
                                        <select 
                                            value={selectedBranch} 
                                            onChange={(e) => setSelectedBranch(Number(e.target.value))}
                                            disabled={!isAdmin && docType !== 'transfer'}
                                            style={{ 
                                                cursor: (isAdmin || docType === 'transfer') ? 'pointer' : 'not-allowed', 
                                                opacity: (isAdmin || docType === 'transfer') ? 1 : 0.7 
                                            }}
                                        >
                                            {!isAdmin && docType === 'transfer' && (
                                                <option value={initialBranch}>Asignar por Admin</option>
                                            )}
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {docType === 'transfer' && (
                                        <>
                                            <div className="form-group animate-in">
                                                <label>DESTINO (PARA)</label>
                                                <select 
                                                    value={targetBranchId} 
                                                    onChange={(e) => setTargetBranchId(Number(e.target.value))}
                                                    disabled={!isAdmin}
                                                    style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.7 }}
                                                >
                                                    {branches.map(b => (
                                                        <option key={b.id} value={b.id}>{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {isAdmin && (
                                                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                                                    <input 
                                                        type="checkbox" 
                                                        id="isDirect"
                                                        checked={isDirectTransfer}
                                                        onChange={(e) => setIsDirectTransfer(e.target.checked)}
                                                        style={{ width: 'auto', margin: 0 }}
                                                    />
                                                    <label htmlFor="isDirect" style={{ marginBottom: 0, fontSize: '0.85rem' }}>Procesar salida e ingreso inmediatamente</label>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    <div className="form-group" ref={provSearchRef}>
                                        <label>PROVEEDOR</label>
                                        <div className="provider-search-container" style={{ position: 'relative' }}>
                                            <div className="select-with-btn">
                                                <div style={{ flex: 1, position: 'relative' }}>
                                                    <input 
                                                        type="text"
                                                        placeholder="Buscar proveedor..."
                                                        className="erp-input"
                                                        value={providerSearch}
                                                        onChange={(e) => {
                                                            setProviderSearch(e.target.value);
                                                            if (e.target.value.trim().length > 0) setShowProvResults(true);
                                                            else setShowProvResults(false);
                                                        }}
                                                        onFocus={() => {
                                                            setActiveField('providerSearch');
                                                            setActiveKeyboard('qwerty');
                                                            if (providerSearch.trim().length > 0) setShowProvResults(true);
                                                        }}
                                                        style={{ width: '100%', paddingRight: '45px' }}
                                                        inputMode="none"
                                                    />
                                                    {providerSearch && (
                                                        <button 
                                                            onClick={() => {
                                                                setProviderSearch('');
                                                                setShowProvResults(false);
                                                                setSelectedProviderId('');
                                                            }}
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
                                                            <Trash2 size={18} strokeWidth={2.5} />
                                                        </button>
                                                    )}
                                                    {showProvResults && providerSearch.trim().length > 0 && (
                                                        <div className="search-results provider-results animate-in" style={{ 
                                                            position: 'absolute', top: '100%', left: 0, right: 0, 
                                                            zIndex: 100, background: 'white', borderRadius: '12px', 
                                                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)', maxHeight: '250px', 
                                                            overflowY: 'auto', border: '1px solid #e2e8f0',
                                                            marginTop: '6px'
                                                        }}>
                                                            <div 
                                                                className="search-item" 
                                                                style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: selectedProviderId === '' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
                                                                onClick={() => {
                                                                    setSelectedProviderId('');
                                                                    setProviderSearch('');
                                                                    setShowProvResults(false);
                                                                }}
                                                            >
                                                                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>-- Directo (Sin Proveedor) --</span>
                                                            </div>
                                                            {(() => {
                                                                const filtered = providers.filter(p => p.name.toLowerCase().includes(providerSearch.toLowerCase()));
                                                                return (
                                                                    <>
                                                                        {filtered.map(p => (
                                                                            <div 
                                                                                key={p.id} 
                                                                                className="search-item" 
                                                                                style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                                onClick={() => {
                                                                                    setSelectedProviderId(p.id);
                                                                                    setProviderSearch(p.name);
                                                                                    setShowProvResults(false);
                                                                                }}
                                                                            >
                                                                                <div>
                                                                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{highlightMatch(p.name, providerSearch)}</div>
                                                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{p.vendor || 'S/N'} • {p.phone || 'Sin tel'}</div>
                                                                                </div>
                                                                                {selectedProviderId === p.id && <Check size={16} color="#10b981" />}
                                                                            </div>
                                                                        ))}
                                                                        {filtered.length === 0 && (
                                                                            <div 
                                                                                className="search-item create-new-prov" 
                                                                                style={{ 
                                                                                    padding: '15px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.05)', 
                                                                                    cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'center',
                                                                                    fontWeight: 800, fontSize: '0.9rem'
                                                                                }}
                                                                                onClick={() => {
                                                                                    setNewProv({ ...newProv, name: providerSearch });
                                                                                    setIsProvModalOpen(true);
                                                                                    setShowProvResults(false);
                                                                                }}
                                                                            >
                                                                                <Plus size={18} strokeWidth={3} />
                                                                                <span>Crear "{providerSearch}"</span>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>PAGO</label>
                                        <div className="payment-toggle-container">
                                            <div className="payment-toggle mini">
                                                <button
                                                    className={paymentType === 'CASH' ? 'active' : ''}
                                                    onClick={() => setPaymentType('CASH')}
                                                >CON</button>
                                                <button
                                                    className={paymentType === 'CREDIT' ? 'active' : ''}
                                                    onClick={() => setPaymentType('CREDIT')}
                                                >CRE</button>
                                            </div>
                                            {paymentType === 'CREDIT' && (
                                                <button 
                                                    className="vence-btn-mini animate-fade" 
                                                    onClick={() => setIsDueDateModalOpen(true)}
                                                    title="Establecer Fecha de Vencimiento"
                                                >
                                                    <Calendar size={14} />
                                                    <span>{dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString() : 'FECHA'}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                            <div className="erp-section grid-section">
                                <div className="erp-grid">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '25%' }}>PRODUCTO</th>
                                                <th className="text-center" style={{ width: '10%' }}>CANT.</th>
                                                <th className="text-center" style={{ width: '12%' }}>UNIDAD</th>
                                                <th className="text-center" style={{ width: '9%' }}>COSTO U.</th>
                                                <th className="text-center" style={{ width: '8%' }}>TOT. U.</th>
                                                <th className="text-center" style={{ width: '13%' }}>TOT. LÍNEA</th>
                                                <th className="text-center" style={{ width: '15%' }}>LOTE / VENC.</th>
                                                <th className="text-center" style={{ width: '8%' }}>ACC.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {purchaseItems.map((item, idx) => (
                                                <tr key={item.product_id}>
                                                    <td>
                                                        <div className="grid-product">
                                                            <span className="name">{item.name}</span>
                                                            <span className="sku">{item.sku}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <input
                                                            type="number"
                                                            className="grid-input qty-input"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                            onFocus={(e) => { 
                                                                e.target.select(); 
                                                                setActiveItemIndex(idx); 
                                                                setActiveField('quantity'); 
                                                                setActiveKeyboard('numeric'); 
                                                            }}
                                                            inputMode="none"
                                                        />
                                                    </td>
                                                     <td className="text-center">
                                                        <select 
                                                            className="grid-input-mini"
                                                            value={item.multiplier}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value);
                                                                const variant = item.variants.find((v: any) => v.quantity === val);
                                                                const newItems = [...purchaseItems];
                                                                newItems[idx].multiplier = val;
                                                                newItems[idx].unit_name = variant ? variant.name : 'Unidad';
                                                                setPurchaseItems(newItems);
                                                                updateItem(idx, 'multiplier', val);
                                                            }}
                                                            style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.75rem', padding: '2px' }}
                                                        >
                                                            <option value={1}>UNIDAD</option>
                                                            {item.variants?.map((v: any) => (
                                                                <option key={v.id} value={v.quantity}>{v.name} ({v.quantity})</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="text-center">
                                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 'bold' }}>
                                                            ${(Number(item.unit_cost) || 0).toFixed(4)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                            {(Number(item.quantity) || 0) * (item.multiplier || 1)}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="cost-input">
                                                            <span>$</span>
                                                            {docType === 'transfer' ? (
                                                                <div className="grid-input-readonly" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}>
                                                                    {(Number(item.subtotal) || 0).toFixed(2)}
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type="number"
                                                                    className="grid-input highlight"
                                                                    value={item.subtotal}
                                                                    onChange={(e) => updateItem(idx, 'subtotal', e.target.value)}
                                                                    onFocus={(e) => { 
                                                                        e.target.select(); 
                                                                        setActiveItemIndex(idx); 
                                                                        setActiveField('subtotal'); 
                                                                        setActiveKeyboard('numeric'); 
                                                                    }}
                                                                    inputMode="none"
                                                                />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <div className="lot-inputs-row">
                                                            <input
                                                                type="text"
                                                                className="grid-input-mini"
                                                                placeholder="Lote"
                                                                value={item.batch_number}
                                                                onChange={(e) => updateItem(idx, 'batch_number', e.target.value)}
                                                                onFocus={() => { 
                                                                    setActiveItemIndex(idx); 
                                                                    setActiveField('batch_number'); 
                                                                    setActiveKeyboard('qwerty'); 
                                                                }}
                                                                inputMode="none"
                                                            />
                                                            <input
                                                                type="text"
                                                                className="grid-input-mini"
                                                                placeholder="dd/mm/aaaa"
                                                                value={item.expiration_date}
                                                                onChange={(e) => updateItem(idx, 'expiration_date', e.target.value)}
                                                                onFocus={() => { 
                                                                    setActiveItemIndex(idx); 
                                                                    setActiveField('expiration_date'); 
                                                                    setActiveKeyboard('numeric'); 
                                                                }}
                                                                inputMode="none"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="text-center">
                                                        <button className="del-btn-mini" onClick={() => removeItem(idx)}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Ghost Row for New Entry */}
                                            <tr className="ghost-row">
                                                <td colSpan={6}>
                                                    <div 
                                                        className="item-search-wrapper"
                                                        style={{ 
                                                            position: 'relative', 
                                                            width: '100%',
                                                            flexShrink: 0,
                                                            margin: 0,
                                                            padding: 0
                                                        }}
                                                    >
                                                        <Plus size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6', pointerEvents: 'none', zIndex: 5 }} />
                                                        <input
                                                            type="text"
                                                            placeholder="Buscar producto por nombre o SKU..."
                                                            value={itemSearch}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                setItemSearch(val);
                                                                setShowResults(val.length > 0);
                                                            }}
                                                            onFocus={(e) => { 
                                                                setActiveField('itemSearch'); 
                                                                setActiveKeyboard('qwerty');
                                                                if (itemSearch.length > 0) setShowResults(true);
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setShowAbove(window.innerHeight - rect.bottom < 250);
                                                            }}
                                                            inputMode="none"
                                                            style={{ 
                                                                width: '100%', 
                                                                padding: '0.9rem 45px 0.9rem 3rem',
                                                                background: '#0f172a',
                                                                border: '1px solid #334155',
                                                                borderRadius: '12px',
                                                                color: 'white',
                                                                outline: 'none',
                                                                fontSize: '1rem',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        />
                                                        {itemSearch && (
                                                            <button 
                                                                onClick={() => { setItemSearch(''); setShowResults(false); }}
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
                                                        {showResults && itemSearch && (
                                                            <div className={`table-search-results ${showAbove ? 'show-above' : ''}`}>
                                                                {filteredItemSearch.map(p => (
                                                                    <div key={p.id} className="table-result-item" onClick={() => addPurchaseItem(p)}>
                                                                        <div className="pi">
                                                                            <span className="pn">{highlightMatch(p.name, itemSearch)}</span>
                                                                            <span className="ps">{highlightMatch(p.sku, itemSearch)}</span>
                                                                        </div>
                                                                        <span className="pstock">{p.stock_level} en stock</span>
                                                                    </div>
                                                                ))}
                                                                {filteredItemSearch.length === 0 && (
                                                                    <div 
                                                                        className="table-result-item create-new" 
                                                                        style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center', transition: 'all 0.2s' }}
                                                                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                                                                        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
                                                                        onClick={() => setIsProdModalOpen(true)}
                                                                    >
                                                                        <Plus size={16} strokeWidth={3} />
                                                                        <span style={{ fontWeight: 800 }}>Crear "{itemSearch}" al vuelo</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {purchaseItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="empty-row">
                                                        <Package size={32} opacity={0.3} />
                                                        <p>Use el buscador de la tabla para agregar productos</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <footer className="erp-modal-footer">
                            <div className="footer-stats">
                                <div className="stat">LÍNEAS: <span>{purchaseItems.length}</span></div>
                                <div className="stat highlight">TOTAL: <span>${calculateTotal().toFixed(2)}</span></div>
                            </div>
                            <div className="footer-btns">
                                <button className="btn-ghost" onClick={() => {
                                    setIsModalOpen(false);
                                    clearForm();
                                }}>Cancelar Operación</button>
                                <button
                                    className="btn-primary"
                                    disabled={purchaseItems.length === 0}
                                    onClick={handleSavePurchase}
                                >
                                    <CheckCircle2 size={18} /> {docType === 'transfer' ? 'Procesar Traslado' : 'Procesar Movimiento'}
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}

            {/* Provider Mini Modal */}
            {isProvModalOpen && (
                <div className="mini-modal-overlay">
                    <div className="mini-modal">
                        <div className="mini-modal-header">
                            <h3><Truck size={20} /> Nuevo Proveedor</h3>
                            <button className="close-mini" onClick={() => setIsProvModalOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="mini-modal-body">
                            <div className="form-group">
                                <label>Nombre de Empresa *</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del proveedor"
                                    value={newProv.name}
                                    onChange={(e) => setNewProv({ ...newProv, name: e.target.value })}
                                    onFocus={() => { setActiveField('newProvName'); setActiveKeyboard('qwerty'); }}
                                    inputMode="none"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Persona de Contacto</label>
                                    <input
                                        type="text"
                                        placeholder="Vendedor"
                                        value={newProv.vendor}
                                        onChange={(e) => setNewProv({ ...newProv, vendor: e.target.value })}
                                        onFocus={() => { setActiveField('newProvVendor'); setActiveKeyboard('qwerty'); }}
                                        inputMode="none"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input
                                        type="text"
                                        placeholder="7000-0000"
                                        value={newProv.phone}
                                        onChange={(e) => setNewProv({ ...newProv, phone: e.target.value })}
                                        onFocus={() => { setActiveField('newProvPhone'); setActiveKeyboard('numeric'); }}
                                        inputMode="none"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={newProv.email}
                                    onChange={(e) => setNewProv({ ...newProv, email: e.target.value })}
                                    onFocus={() => { setActiveField('newProvEmail'); setActiveKeyboard('qwerty'); }}
                                    inputMode="none"
                                />
                            </div>
                            <div className="form-group">
                                <label>Dirección</label>
                                <textarea
                                    placeholder="Ubicación física"
                                    value={newProv.address}
                                    onChange={(e) => setNewProv({ ...newProv, address: e.target.value })}
                                    onFocus={() => { setActiveField('newProvAddress'); setActiveKeyboard('qwerty'); }}
                                    inputMode="none"
                                />
                            </div>
                        </div>
                        <div className="mini-modal-footer">
                            <button className="btn-cancel-mini" onClick={() => setIsProvModalOpen(false)}>Cancelar</button>
                            <button className="btn-save-mini" onClick={handleSaveProvider}>Guardar Proveedor</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Due Date Mini Modal */}
            {isDueDateModalOpen && (
                <div className="mini-modal-overlay">
                    <div className="mini-modal">
                        <div className="mini-modal-header">
                            <h3><Calendar size={20} /> Fecha de Pago</h3>
                            <button className="close-mini" onClick={() => setIsDueDateModalOpen(false)}><X size={18} /></button>
                        </div>
                        <div className="mini-modal-body">
                            <div className="form-group">
                                <label>Seleccionar Fecha de Vencimiento</label>
                                <input
                                    type="date"
                                    className="vence-input-modal"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    onFocus={() => { setActiveField('dueDate'); setActiveKeyboard('numeric'); }}
                                    inputMode="none"
                                    style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}
                                />
                            </div>
                        </div>
                        <div className="mini-modal-footer">
                            <button className="btn-save-mini" style={{ width: '100%' }} onClick={() => setIsDueDateModalOpen(false)}>Confirmar Fecha</button>
                        </div>
                    </div>
                </div>
            )}

            {/* KARDEX MODAL */}
            {isKardexModalOpen && (
                <div className="modal-overlay">
                    <div className="erp-modal kardex">
                        <header className="erp-modal-header">
                            <div className="header-left">
                                <div className="icon-box" style={{ background: user.color_hex || '#3b82f6', color: 'white' }}><History size={24} /></div>
                                <div className="title-box">
                                    <h2 style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kardex de Movimientos</h2>
                                    <p style={{ color: user.color_hex || '#3b82f6', fontSize: '1.2rem', fontWeight: 800 }}>{products.find(p => p.id === selectedId)?.name}</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsKardexModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </header>

                        <div className="kardex-controls">
                            <div className="erp-header-compact" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                <div className="header-grid-compact" style={{ gridTemplateColumns: '250px auto' }}>
                                    <div className="form-group">
                                        <label>SUCURSAL</label>
                                        <select
                                            value={kardexBranch}
                                            disabled={!isAdmin}
                                            onChange={(e) => {
                                                const bId = Number(e.target.value);
                                                setKardexBranch(bId);
                                                if (selectedId) fetchKardex(selectedId, bId);
                                            }}
                                            style={{ cursor: isAdmin ? 'pointer' : 'not-allowed', opacity: isAdmin ? 1 : 0.7 }}
                                        >
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button
                                            className="refresh-btn"
                                            onClick={() => selectedId && fetchKardex(selectedId, kardexBranch)}
                                            disabled={loadingKardex}
                                        >
                                            <RefreshCw size={18} className={loadingKardex ? 'spin' : ''} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="kardex-body">
                            {loadingKardex ? (
                                <div className="kardex-loading">
                                    <RefreshCw className="spin" size={48} />
                                    <p>Cargando movimientos...</p>
                                </div>
                            ) : kardexItems.length === 0 ? (
                                <div className="kardex-empty">
                                    <Package size={48} opacity={0.3} />
                                    <p>No se encontraron movimientos para este producto en esta sucursal.</p>
                                </div>
                            ) : (
                                <div className="kardex-table-wrapper">
                                    <table className="kardex-table">
                                        <thead>
                                            <tr>
                                                <th>FECHA</th>
                                                <th>TIPO</th>
                                                <th>REFERENCIA</th>
                                                <th className="text-right">S. INICIAL</th>
                                                <th className="text-right">MOV</th>
                                                <th className="text-right">S. FINAL</th>
                                                <th>USUARIO</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kardexItems.map((item, idx) => (
                                                <tr key={idx} className={item.quantity > 0 ? 'entry' : 'exit'}>
                                                    <td>{new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                    <td>
                                                        <span className={`type-badge ${item.quantity < 0 || item.type.includes('SALIDA') ? 'out' : 'in'}`}>
                                                            {item.type.split(' ')[0]}
                                                        </span>
                                                    </td>
                                                    <td className="ref">{item.reference}</td>
                                                    <td className="text-right font-bold" style={{ color: '#94a3b8' }}>
                                                        {item.initialBalance}
                                                    </td>
                                                    <td className={`text-right font-bold ${item.quantity > 0 ? 'text-green' : 'text-red'}`}>
                                                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                                                    </td>
                                                    <td className="text-right font-bold balance">
                                                        {item.finalBalance}
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.user}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .inventory-container {
                    display: flex;
                    height: 100vh;
                    background: #f8fafc;
                }
                .inventory-main {
                    flex: 1;
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    background: #0f172a;
                    color: white;
                }
                .inventory-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .header-title h1 { font-size: 1.8rem; font-weight: 800; }
                .header-title p { color: #94a3b8; font-size: 0.9rem; }
                
                .header-actions {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    overflow-x: auto;
                    padding: 4px 0;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .header-actions::-webkit-scrollbar { display: none; }

                .btn-erp {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 800;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .btn-erp:hover { background: #2563eb; transform: translateY(-1px); }

                .inventory-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                .stat-card {
                    background: #1e293b;
                    padding: 0.8rem 1rem;
                    border-radius: 16px;
                    display: flex;
                    gap: 0.75rem;
                    border: 1px solid #334155;
                    align-items: center;
                    overflow: hidden;
                }
                .stat-icon {
                    width: 38px;
                    height: 38px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .stat-icon svg { width: 20px; height: 20px; }
                .stat-content { display: flex; flex-direction: column; justify-content: center; min-width: 0; }
                .stat-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .stat-value { font-size: 1.1rem; font-weight: 800; margin: 0.15rem 0; }
                .stat-sub { font-size: 0.6rem; color: #475569; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

                .inventory-content {
                    flex: 1;
                    display: flex;
                    gap: 1.5rem;
                    overflow: hidden;
                }
                .table-container {
                    flex: 1;
                    background: #1e293b;
                    border-radius: 24px;
                    overflow: auto;
                    border: 1px solid #334155;
                    scrollbar-width: thin;
                    scrollbar-color: #334155 transparent;
                }
                table { width: 100%; border-collapse: collapse; }
                thead { background: #0f172a; position: sticky; top: 0; z-index: 100 !important; }
                th { padding: 1rem; text-align: left; font-size: 0.7rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
                td { padding: 1rem; border-bottom: 1px solid #334155; }
                tr:hover { background: rgba(59, 130, 246, 0.05); cursor: pointer; }
                tr.active { background: rgba(59, 130, 246, 0.1); }

                .product-cell { display: flex; gap: 1rem; align-items: center; }
                .product-img { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #0f172a; }
                .product-img img { width: 100%; height: 100%; object-fit: cover; }
                .product-details { display: flex; flex-direction: column; }
                .product-details .sku { font-size: 0.65rem; color: #475569; font-family: monospace; }
                .product-details .name { font-size: 0.9rem; font-weight: 700; }

                .status-badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    text-transform: uppercase;
                }
                .status-badge.ok { background: #064e3b; color: #10b981; }
                .status-badge.low { background: #450a0a; color: #ef4444; }

                .inventory-side-panel {
                    width: 0;
                    height: 100%;
                    background: #1e293b;
                    border-radius: 20px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    border: none;
                }
                .inventory-side-panel.open { 
                    width: 265px; 
                    border: 1px solid #334155; 
                    margin-left: 0.5rem; 
                }
                .side-panel-content { padding: 0.5rem; display: flex; flex-direction: column; height: 100%; overflow: hidden; }
                .panel-header { margin-bottom: 0.5rem; }
                .panel-header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; }
                .btn-close-panel { 
                    background: transparent; 
                    border: none; 
                    color: #475569; 
                    cursor: pointer; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    padding: 4px;
                    border-radius: 8px;
                    transition: all 0.2s;
                }
                .btn-close-panel:hover { background: rgba(255,255,255,0.05); color: white; }
                .panel-header .category { font-size: 0.65rem; font-weight: 800; color: ${user.color_hex || '#3b82f6'}; text-transform: uppercase; }
                .panel-header h2 { font-size: 0.9rem; margin: 0.15rem 0; font-weight: 800; line-height: 1.2; }
                .panel-header .sku { color: #475569; font-size: 0.7rem; font-family: monospace; }
                
                .panel-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.25rem; }
                .p-stat { background: #0f172a; padding: 0.5rem 0.75rem; border-radius: 12px; border: 1px solid #334155; }
                .p-stat label { font-size: 0.5rem; font-weight: 700; color: #475569; text-transform: uppercase; }
                .p-stat .value { font-size: 0.95rem; font-weight: 800; margin-top: 0.1rem; }

                .divider { height: 1px; background: #334155; margin: 0.5rem 0; width: 100%; }

                .branch-stock-section h3 { font-size: 0.7rem; font-weight: 800; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .branch-list { display: flex; flex-direction: column; gap: 0.4rem; padding-bottom: 0.5rem; }
                .branch-row { 
                    display: flex; 
                    justify-content: space-between; 
                    background: #0f172a; 
                    padding: 0.5rem 0.6rem; 
                    border-radius: 10px; 
                    border: 1px solid #334155;
                    align-items: center;
                }
                .branch-info { display: flex; align-items: center; gap: 0.4rem; color: #94a3b8; font-size: 0.75rem; font-weight: 600; }
                .stock-val { font-weight: 800; font-family: monospace; font-size: 0.9rem; }
                .stock-val.low { color: #ef4444; }
                
                .branch-main-info { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                .branch-stock-status { display: flex; align-items: center; gap: 0.5rem; }
                .btn-edit-stock { 
                    background: transparent; 
                    border: none; 
                    color: #475569; 
                    cursor: pointer; 
                    padding: 4px; 
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    opacity: 0.4;
                }
                .branch-row:hover .btn-edit-stock { opacity: 1; }
                .btn-edit-stock:hover { background: #1e293b; color: ${user.color_hex || '#3b82f6'}; }

                .branch-row.editing { border-color: ${user.color_hex || '#3b82f6'}; background: ${user.color_hex ? user.color_hex + '10' : 'rgba(59, 130, 246, 0.05)'}; }

                .branch-edit-form { margin-top: 1rem; padding-top: 1rem; border-top: 1px dashed #334155; }
                .edit-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem; }
                .edit-field label { font-size: 0.6rem; color: #64748b; margin-bottom: 0.25rem; display: block; text-transform: uppercase; font-weight: 800; }
                .edit-field input { 
                    width: 100%; 
                    background: #0f172a; 
                    border: 1px solid #334155; 
                    padding: 0.4rem 0.6rem; 
                    border-radius: 8px; 
                    color: white; 
                    font-size: 0.85rem; 
                    font-family: monospace; 
                    outline: none;
                }
                .edit-field input:focus { border-color: ${user.color_hex || '#3b82f6'}; }
                
                .edit-actions { display: flex; gap: 0.5rem; }
                .btn-save-stock { flex: 1; background: ${user.color_hex || '#3b82f6'}; color: white; border: none; padding: 0.4rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; transition: all 0.2s; }
                .btn-save-stock:hover { background: #2563eb; }
                .btn-save-stock:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-cancel-stock { background: #334155; color: #94a3b8; border: none; padding: 0.4rem 0.75rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-cancel-stock:hover { color: white; background: #475569; }
                
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 2rem;
                }
                .erp-modal {
                    background: #1e293b;
                    width: 95vw;
                    max-width: 1400px;
                    height: 90vh;
                    border-radius: 32px;
                    border: 1px solid #334155;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    animation: modal-slide-up 0.3s ease-out;
                }
                @keyframes modal-slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .erp-modal-header {
                    padding: 2rem;
                    background: #0f172a;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #334155;
                }
                .header-left { display: flex; gap: 1.5rem; align-items: center; }
                .icon-box { 
                    width: 56px; 
                    height: 56px; 
                    background: rgba(59, 130, 246, 0.1); 
                    color: #3b82f6;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }
                .header-left h2 { font-size: 1.5rem; font-weight: 800; }
                .header-left p { color: #475569; font-size: 0.85rem; }
                .close-btn { background: none; border: none; color: #475569; cursor: pointer; transition: color 0.2s; }
                .close-btn:hover { color: white; }

                .erp-form { 
                    flex: 1; 
                    display: flex; 
                    flex-direction: column; 
                    min-height: 0; 
                    overflow: hidden; 
                    padding: 0;
                }
                
                .erp-form-scrollable {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                    padding: 1.5rem 2.5rem;
                    gap: 1.5rem;
                }
                
                .erp-header-container {
                    padding: 1.5rem 2.5rem 0 2.5rem;
                }
                
                .erp-header-compact {
                    background: rgba(30, 41, 59, 0.4);
                    padding: 1.25rem;
                    border-radius: 20px;
                    border: 1px solid #334155;
                }
                .header-grid-compact {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1rem;
                    align-items: flex-end;
                }
                .header-grid-compact .form-group { margin-bottom: 0; flex: 1; min-width: 140px; }
                .header-grid-compact label { font-size: 0.65rem; color: #64748b; margin-bottom: 0.4rem; font-weight: 800; text-transform: uppercase; line-height: 1; }
                .header-grid-compact select, .header-grid-compact input { 
                    background: #0f172a; 
                    border-color: #334155; 
                    padding: 0 0.75rem; 
                    font-size: 0.85rem; 
                    width: 100%;
                    height: 42px;
                    border-radius: 10px;
                    color: white;
                }

                .select-with-btn { display: flex; gap: 0.5rem; align-items: flex-end; }
                .add-mini-btn { 
                    background: #3b82f6; 
                    border: none; 
                    color: white; 
                    width: 42px; 
                    height: 42px; 
                    border-radius: 10px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    cursor: pointer;
                    transition: all 0.2s;
                    flex-shrink: 0;
                }
                .add-mini-btn:hover { background: #2563eb; transform: scale(1.05); }

                .payment-toggle.mini { padding: 4px; gap: 4px; height: 42px; width: 100%; display: flex; align-items: stretch; border: 1px solid #334155; border-radius: 12px; }
                .payment-toggle.mini button { flex: 1; border: none; background: transparent; color: #475569; padding: 0; font-size: 0.7rem; border-radius: 8px; font-weight: 800; height: auto; cursor: pointer; transition: all 0.2s; }
                .payment-toggle.mini button.active { background: ${user.color_hex || '#3b82f6'}; color: white; }

                .vence-input { width: 100% !important; }

                .erp-section.grid-section {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                    overflow: hidden;
                    margin-bottom: 0;
                    padding: 0 2.5rem 1.5rem 2.5rem;
                }

                .erp-grid {
                    flex: 1;
                    overflow-y: auto;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    background: rgba(15, 23, 42, 0.4);
                }

                .section-title { 
                    font-size: 0.85rem; 
                    font-weight: 800; 
                    color: #3b82f6; 
                    margin-bottom: 1rem; 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .ghost-row td { background: rgba(59, 130, 246, 0.03); padding: 0; }
                
                .ghost-row td { background: rgba(59, 130, 246, 0.03); padding: 0; }
                .table-search-container { position: relative; width: 100%; display: flex; align-items: center; padding: 0.75rem 1rem; gap: 0.75rem; }
                .table-search-container svg { color: ${user.color_hex || '#3b82f6'}; opacity: 0.6; }
                .table-search-container input { background: transparent; border: none; color: white; width: 100%; outline: none; font-size: 0.9rem; font-weight: 600; height: 32px; padding-right: 2rem; }
                .table-search-container input::placeholder { color: #475569; font-weight: 400; }
                .search-clear-mini {
                    position: absolute !important;
                    right: 0.5rem !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    background: transparent !important;
                    border: none !important;
                    color: #64748b !important;
                    cursor: pointer !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 4px !important;
                    border-radius: 4px !important;
                    transition: all 0.2s !important;
                    z-index: 5 !important;
                }
                .search-clear-mini:hover { 
                    color: #ef4444 !important; 
                    background: rgba(239, 68, 68, 0.1) !important; 
                }

                .table-search-results {
                    position: absolute;
                    top: 100%;
                    left: 1rem;
                    right: 1rem;
                    background: #1e293b;
                    border: 1px solid #3b82f6;
                    border-radius: 12px;
                    z-index: 100;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    max-height: 250px;
                    overflow-y: auto;
                    margin-top: 8px;
                }
                .table-search-results.show-above {
                    top: auto;
                    bottom: 100%;
                    margin-top: 0;
                    margin-bottom: 8px;
                }
                .table-result-item { padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; border-bottom: 1px solid #0f172a; }
                .table-result-item:hover { background: #3b82f6; }
                .table-result-item:hover .ps, .table-result-item:hover .pstock { color: #bfdbfe; }
                .table-result-item .pi { display: flex; flex-direction: column; }
                .table-result-item .pn { font-weight: 700; font-size: 0.9rem; }
                .table-result-item .ps { font-size: 0.7rem; color: #64748b; font-family: monospace; }
                .table-result-item .pstock { font-size: 0.75rem; color: #10b981; font-weight: 700; }
                .grid-product { display: flex; flex-direction: column; }
                .grid-product .name { font-weight: 700; font-size: 0.95rem; }
                .grid-product .sku { font-size: 0.75rem; color: #475569; font-family: monospace; }
                
                .grid-input { 
                    width: 100%; 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    padding: 0.5rem; 
                    border-radius: 8px; 
                    color: white; 
                    text-align: center; 
                    font-weight: 700;
                    font-family: monospace;
                    outline: none;
                    transition: all 0.2s;
                }
                .qty-input:focus {
                    background: rgba(59, 130, 246, 0.15);
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
                }
                .highlight:focus {
                    background: rgba(16, 185, 129, 0.15);
                    border-color: #10b981;
                    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.3);
                }
                .cost-input { display: flex; align-items: center; gap: 0.25rem; justify-content: center; }
                .cost-input span { color: #10b981; font-weight: 800; font-size: 0.8rem; }
                
                .lot-inputs-row { display: flex; gap: 4px; align-items: center; }
                .grid-input-mini { 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    padding: 0.4rem; 
                    border-radius: 6px; 
                    color: white; 
                    font-size: 0.7rem; 
                    width: 50%;
                    outline: none;
                    text-align: center;
                }
                
                .del-btn-mini { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
                .del-btn-mini:hover { background: #ef4444; color: white; }
                
                .empty-row { padding: 3rem !important; text-align: center; color: #475569; }
                .empty-row svg { margin-bottom: 0.75rem; }
                .empty-row p { font-size: 0.8rem; font-weight: 600; }

                .erp-modal-footer {
                    padding: 1.5rem 2.5rem;
                    background: #0f172a;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-top: 1px solid #334155;
                }
                .footer-stats { display: flex; gap: 4rem; align-items: center; }
                .stat { font-size: 0.9rem; font-weight: 700; color: #475569; display: flex; gap: 0.75rem; align-items: center; }
                .stat span { color: white; font-size: 1.2rem; font-family: monospace; }
                .stat.highlight span { color: #10b981; font-size: 1.8rem; font-weight: 900; }

                .footer-btns { display: flex; gap: 1rem; }
                .btn-ghost { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 0.9rem 1.5rem; border-radius: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s; }
                .btn-ghost:hover { color: white; border-color: #475569; }
                .btn-primary { background: ${user.color_hex || '#3b82f6'}; border: none; color: white; padding: 0.9rem 2.5rem; border-radius: 14px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s; box-shadow: 0 4px 15px ${user.color_hex ? user.color_hex + '40' : 'rgba(59, 130, 246, 0.3)'}; }
                .btn-primary:hover { background: #2563eb; transform: translateY(-2px); }
                .btn-primary:active { transform: scale(0.98); }

                .mini-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2500;
                    padding: 1rem;
                }
                .mini-modal {
                    background: #1e293b;
                    width: min(500px, 92vw);
                    border-radius: 24px;
                    border: 1px solid #334155;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                    max-height: min(90vh, 700px);
                    overflow: hidden;
                    animation: scale-up 0.2s ease-out;
                }
                @keyframes scale-up {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .mini-modal-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; background: #0f172a; border-bottom: 1px solid #334155; }
                .mini-modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; overflow-y: auto; flex: 1; }
                .mini-modal-body label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.4rem; display: block; }
                .mini-modal-body input, .mini-modal-body textarea {
                    width: 100%;
                    padding: 0.8rem 1rem;
                    background: #0f172a;
                    border: 1px solid #334155;
                    border-radius: 12px;
                    color: white;
                    outline: none;
                    font-size: 0.9rem;
                    transition: border-color 0.2s;
                    font-family: inherit;
                }
                .mini-modal-body input:focus, .mini-modal-body textarea:focus {
                    border-color: #3b82f6;
                }
                .mini-modal-body textarea { resize: vertical; min-height: 80px; }
                .mini-modal-footer { padding: 1.5rem; border-top: 1px solid #334155; display: flex; gap: 1rem; justify-content: flex-end; }
                
                .btn-cancel-mini { background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; }
                .btn-save-mini { background: #3b82f6; border: none; color: white; padding: 0.6rem 1.25rem; border-radius: 10px; cursor: pointer; font-weight: 700; }
                .close-mini { background: transparent; border: none; color: #64748b; cursor: pointer; }

                .animate-fade { animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                @media (max-width: 1200px) {
                    .inventory-stats { grid-template-columns: repeat(4, 1fr); }
                    .inventory-side-panel.open { width: 265px; }

                    /* Compactando el Modal Nuevo Movimiento (Tablet) */
                    .erp-modal { height: 95vh; width: 98vw; border-radius: 20px; }
                    .erp-modal-header { padding: 1rem 1.5rem; }
                    .header-left .icon-box { width: 44px; height: 44px; border-radius: 12px; }
                    .header-left .icon-box svg { width: 22px; height: 22px; }
                    .header-left h2 { font-size: 1.2rem; margin: 0; }
                    .header-left p { font-size: 0.75rem; margin-top: 0.1rem; }
                    
                    .erp-form-scrollable { padding: 1rem 0.75rem; gap: 0.75rem; }
                    .erp-header-container { padding: 1rem 0.75rem 0 0.75rem; }
                    .erp-header-compact { padding: 0.75rem 1rem; }
                    .header-grid-compact { gap: 0.75rem; align-items: flex-end; }
                    .header-grid-compact label { margin-bottom: 0.25rem; font-size: 0.6rem; }
                    .header-grid-compact select, .header-grid-compact input { 
                        height: 36px; 
                        padding: 0 0.5rem; 
                        font-size: 0.8rem; 
                        border-radius: 8px;
                    }
                    .add-mini-btn { width: 36px; height: 36px; border-radius: 8px; }
                    .payment-toggle.mini { height: 36px; padding: 2px; border-radius: 8px; }
                    .payment-toggle.mini button { font-size: 0.65rem; border-radius: 6px; }
                    
                    .payment-toggle-container { display: flex; align-items: center; gap: 8px; }
                    .vence-btn-mini {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(59, 130, 246, 0.15);
                        border: 1px dashed rgba(59, 130, 246, 0.4);
                        color: #60a5fa;
                        padding: 0 10px;
                        height: 36px;
                        border-radius: 8px;
                        font-size: 0.7rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .vence-btn-mini:hover { background: rgba(59, 130, 246, 0.25); border-color: #60a5fa; }
                    
                    .section-title { margin-bottom: 0.5rem; font-size: 0.75rem; }
                    
                    .table-search-container { padding: 0.5rem 0.75rem; }
                    .table-search-container input { height: 28px; font-size: 0.85rem; }
                    .grid-product .name { font-size: 0.85rem; }
                    
                    .erp-modal-footer { padding: 1rem 1.5rem; }
                    .footer-stats { gap: 2rem; }
                    .stat span { font-size: 1rem; }
                    .stat.highlight span { font-size: 1.5rem; }
                    .btn-ghost, .btn-primary { padding: 0.75rem 1.5rem; font-size: 0.85rem; }

                    /* Mejoras en la tabla ERP para tablet (8 Columnas) */
                    .erp-section.grid-section { padding: 0 0.75rem 0.25rem 0.75rem; }
                    .erp-grid th { 
                        padding: 0.3rem 0.35rem !important; 
                        line-height: 0.95; 
                        font-size: 0.62rem; 
                        height: auto !important; 
                        vertical-align: middle;
                    }
                    /* Forzar anchos proporcionales en tablet */
                    .erp-grid th:nth-child(1) { width: 25% !important; }
                    .erp-grid th:nth-child(2) { width: 10% !important; }
                    .erp-grid th:nth-child(3) { width: 12% !important; }
                    .erp-grid th:nth-child(4) { width: 9% !important; }
                    .erp-grid th:nth-child(5) { width: 8% !important; }
                    .erp-grid th:nth-child(6) { width: 13% !important; }
                    .erp-grid th:nth-child(7) { width: 15% !important; }
                    .erp-grid th:nth-child(8) { width: 8% !important; }

                    .erp-grid td { padding: 0.4rem 0.35rem; font-size: 0.75rem; }
                    
                    /* Inputs de Lote/Vence más delgados */
                    .lot-inputs-row { gap: 3px; }
                    .lot-inputs-row .grid-input-mini { 
                        padding: 2px 4px; 
                        font-size: 0.65rem; 
                        height: 24px;
                    }

                    .erp-grid th:last-child, .erp-grid td:last-child { 
                        width: 44px !important; 
                        min-width: 44px !important; 
                        max-width: 44px !important;
                        white-space: nowrap; 
                        text-align: center; 
                        padding: 0.4rem 0.2rem; 
                    }
                    .del-btn-mini { width: 24px; height: 24px; }
                    .erp-grid td:nth-child(3) .grid-input { min-width: 85px; padding: 0.4rem 0.3rem; font-size: 0.75rem; text-align: left; }
                    .erp-grid td:nth-child(1) { min-width: 140px; }
                    .lot-inputs-row { flex-direction: column; gap: 3px; }
                    .lot-inputs-row .grid-input-mini { width: 100%; font-size: 0.62rem; padding: 0.25rem 0.2rem; }
                }
                @media (max-width: 900px) {
                    .inventory-stats { grid-template-columns: repeat(2, 1fr); }
                }

                .inventory-content {
                    flex: 1;
                    display: flex;
                    min-height: 0;
                    overflow: hidden;
                    gap: 1.5rem;
                }
                
                .table-container {
                    flex: 1;
                    background: #1e293b;
                    border-radius: 20px;
                    overflow-y: auto;
                    border: 1px solid #334155;
                    height: 100%;
                }
                

            `}</style>
            {/* PROVIDER MODAL (existing) */}
            {/* ... provider modal code ... already handled by isProvModalOpen check below */}

            {/* KARDEX MODAL */}
            {isKardexModalOpen && (
                <div className="modal-overlay">
                    <div className="erp-modal kardex">
                        <header className="erp-modal-header">
                            <div className="header-left">
                                <div className="icon-box" style={{ background: user.color_hex || '#3b82f6', color: 'white' }}><History size={24} /></div>
                                <div className="title-box">
                                    <h2 style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kardex de Movimientos</h2>
                                    <p style={{ color: user.color_hex || '#3b82f6', fontSize: '1.2rem', fontWeight: 800 }}>{products.find(p => p.id === selectedId)?.name}</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setIsKardexModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </header>

                        <div className="kardex-controls">
                            <div className="erp-header-compact" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                                <div className="header-grid-compact" style={{ gridTemplateColumns: '250px auto' }}>
                                    <div className="form-group">
                                        <label>SUCURSAL</label>
                                        <select
                                            value={kardexBranch}
                                            onChange={(e) => {
                                                const bId = Number(e.target.value);
                                                setKardexBranch(bId);
                                                if (selectedId) fetchKardex(selectedId, bId);
                                            }}
                                        >
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button
                                            className="refresh-btn"
                                            onClick={() => selectedId && fetchKardex(selectedId, kardexBranch)}
                                            disabled={loadingKardex}
                                        >
                                            <RefreshCw size={18} className={loadingKardex ? 'spin' : ''} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="kardex-body">
                            {loadingKardex ? (
                                <div className="kardex-loading">
                                    <RefreshCw className="spin" size={48} />
                                    <p>Cargando movimientos...</p>
                                </div>
                            ) : kardexItems.length === 0 ? (
                                <div className="kardex-empty">
                                    <Package size={48} opacity={0.3} />
                                    <p>No se encontraron movimientos para este producto en esta sucursal.</p>
                                </div>
                            ) : (
                                <div className="kardex-table-wrapper">
                                    <table className="kardex-table">
                                        <thead>
                                            <tr>
                                                <th>FECHA</th>
                                                <th>TIPO</th>
                                                <th>REFERENCIA</th>
                                                <th className="text-right">S. INICIAL</th>
                                                <th className="text-right">MOV</th>
                                                <th className="text-right">S. FINAL</th>
                                                <th>USUARIO</th>
                                                <th className="text-center">ACC.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {kardexItems.map((item, idx) => (
                                                <tr key={idx} className={item.quantity > 0 ? 'entry' : 'exit'}>
                                                    <td>{new Date(item.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                                                    <td>
                                                        <span className={`type-badge ${item.quantity < 0 || item.type.includes('SALIDA') ? 'out' : 'in'}`}>
                                                            {item.type.split(' ')[0]}
                                                        </span>
                                                    </td>
                                                    <td className="ref">{item.reference}</td>
                                                    <td className="text-right font-bold" style={{ color: '#94a3b8' }}>
                                                        {item.initialBalance}
                                                    </td>
                                                    <td className={`text-right font-bold ${item.quantity > 0 ? 'text-green' : 'text-red'}`}>
                                                        {item.quantity > 0 ? '+' : ''}{item.quantity}
                                                    </td>
                                                    <td className="text-right font-bold balance">
                                                        {item.finalBalance}
                                                    </td>
                                                    <td style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.user}</td>
                                                    <td className="text-center">
                                                        {item.recordId && (
                                                            <button 
                                                                className="btn-detail-view"
                                                                onClick={() => openMovementDetail(item.recordId, item.recordType)}
                                                                title="Ver detalle completo"
                                                            >
                                                                <FileText size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .section-header-compact { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
                .section-header-compact h3 { margin-bottom: 0 !important; }
                .btn-kardex-mini {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    border-radius: 8px;
                    color: #3b82f6;
                    font-size: 0.7rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 4px 8px;
                    cursor: pointer;
                    text-transform: uppercase;
                    transition: all 0.2s;
                }
                .btn-kardex-mini:hover {
                    background: #3b82f6;
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .erp-modal.kardex {
                    max-width: 1200px;
                    width: 95vw;
                    height: 85vh;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }

                .kardex-controls {
                    padding: 1.5rem 2rem;
                    background: rgba(15, 23, 42, 0.8);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .kardex-body {
                    flex: 1;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    background: #0f172a;
                }

                .kardex-table-wrapper {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem 2rem;
                }

                .kardex-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 8px;
                }

                .kardex-table th {
                    text-align: left;
                    padding: 0.75rem 1rem;
                    color: #64748b;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 800;
                    position: sticky;
                    top: 0;
                    background: #0f172a;
                    z-index: 10;
                }

                .kardex-table tr {
                    transition: transform 0.2s;
                }

                .erp-header-compact select {
                    color: white !important;
                }

                .kardex-table td {
                    padding: 1rem;
                    background: rgba(30, 41, 59, 0.4);
                    font-size: 0.9rem;
                    color: #f1f5f9;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }

                .kardex-table td:first-child { border-left: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px 0 0 12px; }
                .kardex-table td:last-child { border-right: 1px solid rgba(255, 255, 255, 0.05); border-radius: 0 12px 12px 0; }

                .kardex-table tr:hover td {
                    background: rgba(30, 41, 59, 0.8);
                }

                .type-badge {
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.7rem;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }
                .type-badge.in { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
                .type-badge.out { background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

                .text-green { color: #10b981; text-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }
                .text-red { color: #ef4444; text-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
                .balance { color: #3b82f6; font-weight: 800; font-size: 1rem; }

                .refresh-btn {
                    background: rgba(30, 41, 59, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #94a3b8;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .refresh-btn:hover { color: white; border-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
                .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .kardex-loading, .kardex-empty {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1.5rem;
                    color: #475569;
                    text-align: center;
                    padding: 4rem;
                }
                .kardex-loading p, .kardex-empty p {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #94a3b8;
                    max-width: 300px;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .btn-detail-view {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.2);
                    color: #60a5fa;
                    padding: 6px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-detail-view:hover {
                    background: #3b82f6;
                    color: white;
                    transform: scale(1.1);
                }

                .movement-detail-modal {
                    background: #0f172a;
                    width: 95%;
                    max-width: 600px;
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    overflow: hidden;
                    animation: modalSlide 0.3s ease-out;
                }
                .detail-header {
                    padding: 1.5rem;
                    background: rgba(30, 41, 59, 0.5);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .detail-header h2 { font-size: 1.25rem; font-weight: 800; color: white; margin: 0; }
                .detail-header p { font-size: 0.85rem; color: #94a3b8; margin: 0.2rem 0 0 0; }
                
                .detail-body { padding: 1.5rem; max-height: 70vh; overflow-y: auto; }
                .detail-info-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
                    gap: 1.5rem; 
                    margin-bottom: 2rem;
                    padding: 1rem;
                    background: rgba(30, 41, 59, 0.3);
                    border-radius: 12px;
                }
                .info-item label { display: block; font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.4rem; }
                .info-item span { display: block; font-size: 0.95rem; color: #f1f5f9; font-weight: 600; }

                .detail-items-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
                .detail-items-table th { padding: 10px; font-size: 0.75rem; color: #64748b; text-align: left; text-transform: uppercase; }
                .detail-items-table td { padding: 12px 10px; background: rgba(30, 41, 59, 0.5); }
                .detail-items-table td:first-child { border-radius: 10px 0 0 10px; }
                .detail-items-table td:last-child { border-radius: 0 10px 10px 0; }
                
                .highlight-row td { background: rgba(59, 130, 246, 0.15) !important; border: 1px solid rgba(59, 130, 246, 0.3); border-width: 1px 0; }
                .highlight-row td:first-child { border-left-width: 1px; }
                .highlight-row td:last-child { border-right-width: 1px; }

                .sku-text { font-size: 0.75rem; color: #64748b; font-family: monospace; }
                
                .detail-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 1rem; color: #94a3b8; }
            `}</style>


            {isMovementDetailModalOpen && (
                <div className="modal-overlay animate-in" style={{ zIndex: 2000 }}>
                    <div className="movement-detail-modal">
                        <header className="detail-header">
                            <div>
                                <h2>Detalle de {detailType === 'PURCHASE' ? 'Compra' : detailType === 'SALE' ? 'Venta' : 'Traslado'}</h2>
                                <p>ID: {movementDetail ? (movementDetail.invoiceNumber || movementDetail.id) : 'Cargando...'}</p>
                            </div>
                            <button className="close-btn" onClick={() => setIsMovementDetailModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </header>
                        <div className="detail-body">
                            {loadingDetail ? (
                                <div className="detail-loading">
                                    <RefreshCw className="spin" size={32} />
                                    <p>Consultando servidor...</p>
                                </div>
                            ) : movementDetail ? (
                                <>
                                    <div className="detail-info-grid">
                                        <div className="info-item">
                                            <label>Fecha</label>
                                            <span>{new Date(movementDetail.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Usuario</label>
                                            <span>{movementDetail.user?.name || 'Sistema'}</span>
                                        </div>
                                        {detailType === 'PURCHASE' && (
                                            <div className="info-item">
                                                <label>Proveedor</label>
                                                <span>{movementDetail.provider?.name || 'Directo'}</span>
                                            </div>
                                        )}
                                        {detailType === 'TRANSFER' && (
                                            <>
                                                <div className="info-item">
                                                    <label>Origen</label>
                                                    <span>{movementDetail.fromBranch?.name || 'Sucursal origen'}</span>
                                                </div>
                                                <div className="info-item">
                                                    <label>Destino</label>
                                                    <span>{movementDetail.toBranch?.name || 'Sucursal destino'}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <table className="detail-items-table">
                                        <thead>
                                            <tr>
                                                <th>PRODUCTO</th>
                                                <th className="text-right">CANT</th>
                                                {detailType === 'PURCHASE' && <th className="text-right">COSTO U.</th>}
                                                {detailType === 'PURCHASE' && <th className="text-right">TOTAL</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {movementDetail.details?.map((d: any, i: number) => (
                                                <tr key={i} className={d.productId === selectedId || d.product_id === selectedId ? 'highlight-row' : ''}>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{d.product?.name || d.product_name}</span>
                                                            <span className="sku-text">{d.product?.sku}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-right font-bold" style={{ color: '#f59e0b' }}>{d.quantity}</td>
                                                    {detailType === 'PURCHASE' && <td className="text-right" style={{ color: '#94a3b8' }}>${Number(d.unit_cost || 0).toFixed(2)}</td>}
                                                    {detailType === 'PURCHASE' && <td className="text-right font-bold" style={{ color: '#10b981' }}>${Number(d.subtotal || 0).toFixed(2)}</td>}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#64748b' }}>No se pudo cargar la información</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ProductModal 
                isOpen={isProdModalOpen}
                onClose={() => setIsProdModalOpen(false)}
                initialName={itemSearch}
                categories={categories}
                providers={providers}
                onSaveSuccess={(newProd) => {
                    // Logic to capture and add to current list
                    // Format to match expected purchase item
                    const purchaseItem = {
                        product_id: newProd.id,
                        name: newProd.name,
                        sku: newProd.sku,
                        quantity: 1,
                        unit_cost: 0,
                        subtotal: 0,
                        batch_number: '',
                        expiration_date: '',
                        multiplier: 1,
                        unit_name: 'UNIDAD',
                        variants: newProd.variants || []
                    };
                    setPurchaseItems(prev => [...prev, purchaseItem]);
                    setItemSearch('');
                    // Refresh product list in background
                    fetchProducts();
                    
                    // Autofocus quantity of the new item
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('.qty-input');
                        const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                        if (lastInput) lastInput.focus();
                    }, 500);
                }}
            />

            <AnimatePresence>
                {activeKeyboard === 'qwerty' && (
                    <VirtualKeyboard 
                        value={
                            activeField === 'globalSearch' ? search : 
                            activeField === 'invoiceNumber' ? invoiceNumber :
                            activeField === 'itemSearch' ? itemSearch :
                            activeField === 'providerSearch' ? providerSearch :
                            activeField && activeItemIndex !== null ? purchaseItems[activeItemIndex][activeField] :
                            ''
                        }
                        onChange={(val) => {
                            if (activeField === 'globalSearch') setSearch(val);
                            else if (activeField === 'invoiceNumber') setInvoiceNumber(val);
                            else if (activeField === 'itemSearch') {
                                setItemSearch(val);
                                setShowResults(true);
                            }
                            else if (activeField === 'providerSearch') {
                                setProviderSearch(val);
                                setShowProvResults(val.trim().length > 0);
                            }
                            else if (activeField && activeItemIndex !== null) updateItem(activeItemIndex, activeField, val);
                        }}
                        onClose={() => setActiveKeyboard(null)}
                        onConfirm={() => setActiveKeyboard(null)}
                        title={`ESCRIBIENDO ${activeField?.toUpperCase()}`}
                    />
                )}
                {activeKeyboard === 'numeric' && (
                    <NumericKeyboard 
                        value={
                            activeField === 'minStock' ? (editingBranchStock?.minStock.toString() || '') :
                            activeField === 'maxStock' ? (editingBranchStock?.maxStock.toString() || '') :
                            activeField && activeItemIndex !== null ? purchaseItems[activeItemIndex][activeField].toString() :
                            ''
                        }
                        onChange={(val) => {
                            if (activeField === 'minStock') setEditingBranchStock(prev => prev ? { ...prev, minStock: parseInt(val) || 0 } : null);
                            else if (activeField === 'maxStock') setEditingBranchStock(prev => prev ? { ...prev, maxStock: parseInt(val) || 0 } : null);
                            else if (activeField && activeItemIndex !== null) updateItem(activeItemIndex, activeField, val);
                        }}
                        onClose={() => setActiveKeyboard(null)}
                        onConfirm={() => setActiveKeyboard(null)}
                        title={`INGRESANDO ${activeField?.toUpperCase()}`}
                    />
                )}
            </AnimatePresence>
        </div>
    </div>
    );
};

export default Inventory;
