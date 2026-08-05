import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { configApi, adminAuthApi } from '../services/api';
import { getUser, hasRole, ROLES } from '../utils/permissions';
import { 
  Settings as SettingsIcon, Save, Building, MapPin, Phone, Globe, Image as ImageIcon, Key, 
  StickyNote, Clock, List, ArrowUp, ArrowDown, GripVertical, TriangleAlert, ShieldAlert, 
  Trash2, RefreshCcw, X, CreditCard, ChevronRight, CheckCircle2, AlertCircle, ShoppingCart, 
  Eye, EyeOff, Printer, LayoutDashboard, ShieldCheck, Calendar, Download, Wallet 
} from 'lucide-react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const PinModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (pin: string) => void; title: string; description: string }> = ({ isOpen, onClose, onConfirm, title, description }) => {
    const [pin, setPin] = useState('');

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" style={{ zIndex: 2000 }}>
                    <motion.div 
                        className="modal-content"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{ 
                            width: 'min(430px, 90vw)', 
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            background: '#0f172a',
                            borderRadius: '24px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 40px rgba(239, 68, 68, 0.1)',
                            overflow: 'hidden'
                        }}
                    >
                        <div className="modal-header" style={{ 
                            padding: '1.5rem 2rem',
                            borderBottom: '1px solid rgba(239, 68, 68, 0.1)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#f87171', margin: 0, fontSize: '1.3rem' }}>
                                <ShieldAlert size={28} className="animate-pulse" />
                                {title}
                            </h2>
                            <button 
                                onClick={onClose} 
                                style={{ 
                                    background: 'rgba(255,255,255,0.05)', 
                                    border: 'none', 
                                    color: '#94a3b8', 
                                    width: '36px', 
                                    height: '36px', 
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-brightness"
                                onMouseOver={e => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: '2rem' }}>
                            <p style={{ color: '#94a3b8', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6' }}>{description}</p>
                            <div className="field">
                                <label style={{ display: 'block', color: '#64748b', marginBottom: '0.75rem', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PIN de Seguridad</label>
                                <input
                                    type="password" autoComplete="off"
                                    autoFocus
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    placeholder="••••••"
                                    maxLength={6}
                                    style={{ 
                                        width: '100%', padding: '1.25rem', borderRadius: '16px', 
                                        background: 'rgba(0,0,0,0.3)', border: '1px solid #334155', 
                                        color: '#f8fafc', fontSize: '1.8rem', textAlign: 'center',
                                        letterSpacing: '0.4em', fontWeight: 'bold'
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && onConfirm(pin)}
                                />
                            </div>
                        </div>
                        <div style={{ padding: '0 2rem 2rem', display: 'flex', gap: '1rem' }}>
                            <button 
                                onClick={onClose}
                                style={{ 
                                    flex: 1, padding: '1rem', borderRadius: '14px', 
                                    background: '#1e293b', color: '#94a3b8', 
                                    border: '1px solid #334155', fontWeight: 600, 
                                    cursor: 'pointer', transition: 'all 0.2s' 
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.background = '#334155';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.background = '#1e293b';
                                    e.currentTarget.style.color = '#94a3b8';
                                }}
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={() => onConfirm(pin)}
                                style={{ 
                                    flex: 1.5, padding: '1rem', borderRadius: '14px', 
                                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)', 
                                    color: 'white', border: 'none', fontWeight: 700, 
                                    cursor: 'pointer', transition: 'all 0.3s',
                                    boxShadow: '0 8px 20px -5px rgba(239, 68, 68, 0.4)'
                                }}
                                onMouseOver={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 12px 25px -5px rgba(239, 68, 68, 0.6)';
                                }}
                                onMouseOut={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px -5px rgba(239, 68, 68, 0.4)';
                                }}
                            >
                                Confirmar Acción
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

const Settings: React.FC = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [isAccessPinOpen, setIsAccessPinOpen] = useState(false);

    useEffect(() => {
        if (!hasRole(ROLES.SUPER_ADMIN)) {
            toast.error('Solo el Super Admin puede acceder a Configuración');
            navigate('/admin');
            return;
        }
        setIsAccessPinOpen(true);
    }, []);

    const handleAccessConfirm = async (pin: string) => {
        try {
            await adminAuthApi.verifyPin(pin);
            setIsAccessGranted(true);
            setIsAccessPinOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'PIN incorrecto');
        }
    };

    const [activeTab, setActiveTab] = useState('business');
    const [showApiKey, setShowApiKey] = useState(false);
    const [config, setConfig] = useState<any>({
        businessName: '',
        address: '',
        phone: '',
        logoUrl: '',
        geminiApiKey: '',
        ticketHeader: '',
        ticketFooter: '',
        isAutoClosingEnabled: true,
        autoClosingTime: '23:59',
        isAutoOpeningEnabled: true,
        autoOpeningTime: '06:00',
        emailWebhookUrl: '',
        enableEmailTickets: false,
        enableQrCode: false,
        ticketWidth: '58mm',
        sidebarConfig: [] as { key: string; label: string; enabled: boolean }[],
        dashboardConfig: [] as { key: string; label: string; enabled: boolean }[],
        branchConfig: {} as Record<number, any>
    });
    const [loading, setLoading] = useState(false);
    const [dangerModal, setDangerModal] = useState<{ isOpen: boolean; type: 'sales' | 'inventory' | 'products' | 'counter' | null }>({ isOpen: false, type: null });
    const [roles, setRoles] = useState<any[]>([]);
    const [allPerms, setAllPerms] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState<any>(null);
    const [savingRoles, setSavingRoles] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    useEffect(() => {
        fetchConfig();
        adminAuthApi.getRoles().then(res => setRoles(res.data)).catch(() => {});
        import('../services/api').then(({ branchApi }) => {
            branchApi.getBranches().then(res => {
                setBranches(res.data);
                setConfig((prev: any) => {
                    const existing = prev.branchConfig || {};
                    const merged: any = {};
                    res.data.forEach((b: any) => {
                        merged[b.id] = existing[b.id] || {
                            closingType: b.closingType || 'daily',
                            openDay: b.openDay ?? 1,
                            closeDay: b.closeDay ?? 6,
                            strictOpen: b.strictOpen ?? false
                        };
                    });
                    return { ...prev, branchConfig: merged };
                });
            }).catch(() => {});
        });
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await configApi.getConfig();
            if (res.data) {
                setConfig({
                    businessName: res.data.businessName || '',
                    address: res.data.address || '',
                    phone: res.data.phone || '',
                    logoUrl: res.data.logoUrl || '',
                    geminiApiKey: res.data.geminiApiKey || '',
                    ticketHeader: res.data.ticketHeader || '',
                    ticketFooter: res.data.ticketFooter || '',
                    isAutoClosingEnabled: res.data.autoClosingTime !== '',
                    autoClosingTime: res.data.autoClosingTime || '23:59',
                    isAutoOpeningEnabled: res.data.autoOpeningTime !== '',
                    autoOpeningTime: res.data.autoOpeningTime || '06:00',
                    emailWebhookUrl: res.data.emailWebhookUrl || '',
                    enableEmailTickets: res.data.enableEmailTickets || false,
                    enableQrCode: res.data.enableQrCode || false,
                    ticketWidth: res.data.ticketWidth || '58mm',
                    labelFields: res.data.labelFields || ['businessName', 'clientName', 'phone', 'address', 'shippingDate', 'saleId', 'total'],
                    sidebarConfig: (() => {
                        const saved = (res.data.sidebarConfig?.sidebar) || (Array.isArray(res.data.sidebarConfig) ? res.data.sidebarConfig : []);
                        const allSidebarItems = [
                            { key: 'pos', label: 'Ventas (POS)', enabled: true },
                            { key: 'summary', label: 'Resumen Día', enabled: true },
                            { key: 'inventory', label: 'Inventario', enabled: true },
                            { key: 'replenishment', label: 'Reposición', enabled: true },
                            { key: 'products', label: 'Productos', enabled: true },
                            { key: 'categories', label: 'Categorías', enabled: false },
                            { key: 'suppliers', label: 'Proveedores', enabled: false },
                            { key: 'clients', label: 'Clientes', enabled: true },
                            { key: 'receivable', label: 'CxC', enabled: false },
                            { key: 'payable', label: 'CxP', enabled: false },
                            { key: 'expenses', label: 'Gastos', enabled: true },
                            { key: 'history', label: 'Hist. Ventas', enabled: true },
                            { key: 'closings', label: 'Cortes Caja', enabled: false },
                            { key: 'users', label: 'Personal', enabled: false },
                            { key: 'branches', label: 'Sucursales', enabled: false },
                            { key: 'reports', label: 'Reportes', enabled: false },
                            { key: 'admin', label: 'Dashboard', enabled: true },
                            { key: 'settings', label: 'Configuración', enabled: false },
                            { key: 'audit', label: 'Auditoría', enabled: false },
                            { key: 'transfers', label: 'Traslados', enabled: false },
                            { key: 'projections', label: 'Proyecciones', enabled: false },
                            { key: 'lookup', label: 'Consultar', enabled: true },
                            { key: 'sellerReport', label: 'Comisiones', enabled: true },
                            { key: 'deliveries', label: 'Deliverys', enabled: true },
                            { key: 'shipments', label: 'Envíos', enabled: true },
                        ];
                        const savedKeys = new Set(saved.map((i: any) => i.key));
                        const newItems = allSidebarItems.filter(i => !savedKeys.has(i.key));
                        return [...saved, ...newItems];
                    })(),
                    dashboardConfig: (() => {
                        const saved = res.data.sidebarConfig?.dashboard || [];
                        const allDashItems = [
                            { key: 'pos', label: 'Punto de Venta' },
                            { key: 'summary', label: 'Resumen Día' },
                            { key: 'inventory', label: 'Inventario' },
                            { key: 'replenishment', label: 'Reposición' },
                            { key: 'products', label: 'Productos' },
                            { key: 'clients', label: 'Clientes' },
                            { key: 'expenses', label: 'Gastos' },
                            { key: 'history', label: 'Historial Ventas' },
                            { key: 'projections', label: 'Proyecciones' },
                            { key: 'reports', label: 'Reportes' },
                            { key: 'receivable', label: 'Cuentas por Cobrar' },
                            { key: 'payable', label: 'Cuentas por Pagar' },
                            { key: 'transfers', label: 'Traslados' },
                            { key: 'closings', label: 'Cortes de Caja' },
                            { key: 'categories', label: 'Categorías' },
                            { key: 'suppliers', label: 'Proveedores' },
                            { key: 'branches', label: 'Sucursales' },
                            { key: 'users', label: 'Personal' },
                            { key: 'settings', label: 'Configuración' },
                            { key: 'audit', label: 'Auditoría' },
                            { key: 'shipments', label: 'Envíos' },
                            { key: 'lookup', label: 'Consultar' },
                            { key: 'sellerReport', label: 'Comisiones' },
                            { key: 'deliveries', label: 'Deliverys' },
                        ];
                        const savedKeys = new Set(saved.map((i: any) => i.key));
                        const newItems = allDashItems.filter(i => !savedKeys.has(i.key));
                        return [...saved, ...newItems];
                    })()
                });
            }
        } catch (error: any) {
            console.error('Error al cargar config:', error, error?.response?.data);
            toast.error('Error al cargar configuración');
        }
    };

    const [initialConfig, setInitialConfig] = useState<string>('');

    // Track initial config snapshot for dirty detection
    useEffect(() => {
        if (config.businessName !== undefined) {
            setInitialConfig(JSON.stringify(config));
        }
    }, [config.businessName]);

    const hasChanges = initialConfig && JSON.stringify(config) !== initialConfig;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChanges) return;
        setLoading(true);
        try {
            // Combinar sidebar y dashboard en un solo objeto
            const dashItems = (config.dashboardConfig || []).map((item: any) => ({ key: item.key, label: item.label }));
            const payload = {
                ...config,
                sidebarConfig: {
                    sidebar: config.sidebarConfig || [],
                    dashboard: dashItems
                }
            };
            if (config.branchConfig) {
                const { branchApi } = await import('../services/api');
                for (const [id, cfg] of Object.entries(config.branchConfig) as any) {
                    await branchApi.updateBranch(Number(id), cfg).catch(() => {});
                }
            }
            await configApi.updateConfig(payload);
            toast.success('Configuración guardada correctamente');
            window.dispatchEvent(new Event('config-updated'));
            setInitialConfig(JSON.stringify(config));
        } catch (error) {
            toast.error('Error al guardar configuración');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'business', label: 'Negocio', icon: <Building size={18} /> },
        { id: 'printing', label: 'IA e Impresión', icon: <StickyNote size={18} /> },
        { id: 'email', label: 'Email', icon: <Globe size={18} /> },
        { id: 'cash', label: 'Caja', icon: <Wallet size={18} /> },
        { id: 'sidebar', label: 'Barra Lateral', icon: <List size={18} /> },
        { id: 'dashboard', label: 'Menú Principal', icon: <LayoutDashboard size={18} /> },
        { id: 'roles', label: 'Roles', icon: <ShieldCheck size={18} /> },
        { id: 'danger', label: 'Zona de Peligro', icon: <TriangleAlert size={18} color="#ef4444" /> }
    ];

    const handleConfirmReset = async (pin: string) => {
        if (!dangerModal.type) return;
        
        try {
            setLoading(true);
            if (dangerModal.type === 'sales') {
                await configApi.resetSales(pin);
                toast.success('Historial de ventas reiniciado correctamente');
            } else if (dangerModal.type === 'inventory') {
                await configApi.resetInventory(pin);
                toast.success('Stock de inventario reiniciado a cero');
            } else if (dangerModal.type === 'products') {
                await configApi.resetProducts(pin);
                toast.success('Todos los productos eliminados correctamente');
            } else if (dangerModal.type === 'counter') {
                await configApi.resetSaleCounter(pin);
                toast.success('Contador de ventas reiniciado');
            }
            setDangerModal({ isOpen: false, type: null });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column', 
                background: '#0f172a',
                overflow: 'hidden'
            }}>
            {!isAccessGranted ? (
                <div style={{ 
                    flex: 1,
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#64748b',
                    padding: '2rem'
                }}>
                    <ShieldAlert size={48} className="animate-pulse" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p style={{ fontWeight: 700 }}>Verificando acceso...</p>
                </div>
            ) : (
                <div style={{
                    display: 'contents'
                }}>
                <div style={{
                    zIndex: 50,
                    background: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(12px)',
                    padding: '1.5rem 1.5rem 0.5rem 1.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
                }}>
                    <header className="page-header" style={{ marginBottom: '1rem' }}>
                        <div className="header-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="header-icon-container" style={{
                                    background: 'rgba(99, 102, 241, 0.15)',
                                    width: '56px', height: '56px',
                                    borderRadius: '16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#6366f1',
                                    border: '1px solid rgba(99, 102, 241, 0.2)'
                                }}>
                                    <SettingsIcon size={28} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em', margin: 0 }}>Configuración Maestra</h1>
                                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>Parámetros globales del sistema</p>
                                </div>
                            </div>

                            {activeTab !== 'danger' && (
                                <button 
                                    type="submit" 
                                    form="settings-form"
                                    className="btn-main" 
                                    disabled={loading || !hasChanges}
                                    style={{ 
                                        padding: '0.85rem 2rem', 
                                        fontSize: '1rem', 
                                        boxShadow: loading || !hasChanges ? 'none' : '0 10px 20px -5px rgba(59, 130, 246, 0.3)',
                                        height: 'fit-content',
                                        opacity: loading || !hasChanges ? 0.5 : 1,
                                        cursor: loading || !hasChanges ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Save size={20} />
                                    {loading ? 'Guardando...' : (!hasChanges ? 'Sin cambios' : 'Aplicar Cambios')}
                                </button>
                            )}
                        </div>
                    </header>

                    <div className="settings-tabs" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(30, 41, 59, 0.5)', padding: '0.5rem', borderRadius: '16px', border: '1px solid #334155', width: 'fit-content' }}>
                        {tabs.map((tab: any) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.6rem 1.25rem', borderRadius: '12px',
                                    border: 'none', cursor: 'pointer', fontWeight: 700,
                                    fontSize: '0.85rem', transition: 'all 0.2s',
                                    background: activeTab === tab.id ? '#3b82f6' : 'transparent',
                                    color: activeTab === tab.id ? 'white' : '#94a3b8'
                                }}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <form id="settings-form" onSubmit={handleSave} className="settings-form" style={{ padding: '1.5rem 1.5rem 4rem 1.5rem', flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'business' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '2.5rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.4rem', color: 'white' }}>
                                <Building size={24} color="#6366f1" /> Datos del Negocio
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                <div className="field">
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nombre Comercial</label>
                                    <input
                                        type="text"
                                        value={config.businessName}
                                        onChange={e => setConfig({ ...config, businessName: e.target.value })}
                                        placeholder="Ej: Farmacia La Esperanza"
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                    />
                                </div>

                                <div className="field">
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Teléfono</label>
                                    <input
                                        type="text"
                                        value={config.phone}
                                        onChange={e => setConfig({ ...config, phone: e.target.value })}
                                        placeholder="+503 2222-2222"
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                    />
                                </div>

                                <div className="field" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dirección</label>
                                    <input
                                        type="text"
                                        value={config.address}
                                        onChange={e => setConfig({ ...config, address: e.target.value })}
                                        placeholder="Ciudad, Calle, Edificio..."
                                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                    />
                                </div>

                                <div className="field" style={{ gridColumn: 'span 2' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>URL del Logo</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <input
                                            type="text"
                                            value={config.logoUrl}
                                            onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
                                            placeholder="https://ejemplo.com/logo.png"
                                            style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                        />
                                        {config.logoUrl && (
                                            <div style={{ width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
                                                <img src={config.logoUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'printing' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '2rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                {/* Sección IA */}
                                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#f59e0b', fontSize: '1.1rem' }}>
                                        <Key size={20} /> Inteligencia Artificial
                                    </h4>
                                    <div className="field">
                                        <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Gemini API Key</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showApiKey ? "text" : "password"}
                                                value={config.geminiApiKey}
                                                onChange={e => setConfig({ ...config, geminiApiKey: e.target.value })}
                                                placeholder="AIzaSy..."
                                                style={{ width: '100%', padding: '0.6rem 2.5rem 0.6rem 0.8rem', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '0.9rem' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>Para autogeneración de fichas médicas.</p>
                                    </div>
                                </div>

                                {/* Sección Impresión */}
                                <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#3b82f6', fontSize: '1.1rem' }}>
                                        <Building size={20} /> Formato de Ticket
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="field">
                                            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Ancho</label>
                                            <select
                                                value={config.ticketWidth}
                                                onChange={e => setConfig({ ...config, ticketWidth: e.target.value })}
                                                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '0.9rem', fontWeight: 700 }}
                                            >
                                                <option value="58mm">58mm</option>
                                                <option value="80mm">80mm</option>
                                            </select>
                                        </div>
                                        <div className="field">
                                             <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Tickets Email</label>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '38px', background: '#1e293b', padding: '0 0.8rem', borderRadius: '10px', border: '1px solid #334155' }}>
                                                 <input
                                                     type="checkbox"
                                                     checked={config.enableEmailTickets}
                                                     onChange={(e) => setConfig({ ...config, enableEmailTickets: e.target.checked })}
                                                     style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                                                 />
                                                 <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{config.enableEmailTickets ? 'SÍ' : 'NO'}</span>
                                             </label>
                                         </div>
                                         <div className="field">
                                             <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Código QR en Ticket</label>
                                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', height: '38px', background: '#1e293b', padding: '0 0.8rem', borderRadius: '10px', border: '1px solid #334155' }}>
                                                 <input
                                                     type="checkbox"
                                                     checked={config.enableQrCode}
                                                     onChange={(e) => setConfig({ ...config, enableQrCode: e.target.checked })}
                                                     style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                                                 />
                                                 <span style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>{config.enableQrCode ? 'SÍ' : 'NO'}</span>
                                             </label>
                                         </div>
                                     </div>
                                </div>
                            </div>

                            {/* Textareas y Webhook (Fila inferior) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
                                <div className="field">
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Encabezado del Ticket</label>
                                    <textarea
                                        value={config.ticketHeader}
                                        onChange={e => setConfig({ ...config, ticketHeader: e.target.value })}
                                        placeholder="¡Gracias por su compra!"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', minHeight: '80px', fontSize: '0.85rem', resize: 'none' }}
                                    />
                                </div>
                                <div className="field">
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.4rem', fontSize: '0.75rem' }}>Pie del Ticket</label>
                                    <textarea
                                        value={config.ticketFooter}
                                        onChange={e => setConfig({ ...config, ticketFooter: e.target.value })}
                                        placeholder="No se aceptan devoluciones..."
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', minHeight: '80px', fontSize: '0.85rem', resize: 'none' }}
                                    />
                                </div>
                            </div>

                            {/* CONFIGURACIÓN DE LABEL */}
                            <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', color: '#818cf8', fontSize: '1rem' }}>
                                    <Printer size={20} /> Label de Envío
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Organiza los campos en 3 secciones. Cada línea punteada del label separa una sección. Usa las flechas para cambiar de sección y ordenar.</p>
                                {(() => {
                                    const sectionDefs = [
                                        { key: 'section1', label: '1. Cabecera', color: '#818cf8' },
                                        { key: 'section2', label: '2. Cliente', color: '#10b981' },
                                        { key: 'section3', label: '3. Detalle', color: '#f59e0b' }
                                    ];
                                    const fields = config.labelFields && config.labelFields.length > 0
                                        ? config.labelFields
                                        : ['businessName', 'clientName', 'phone', 'address', 'products', 'shippingDate', 'saleId', 'total'];
                                    const sections = config.labelSections && typeof config.labelSections === 'object'
                                        ? config.labelSections
                                        : { section1: ['businessName', 'saleId', 'seller', 'shippingDate', 'status'], section2: ['clientName', 'phone', 'address', 'delivery'], section3: ['products', 'total'] };

                                    const moveField = (fieldKey: string, fromSection: string, toSection: string) => {
                                        if (fromSection === toSection) return;
                                        const newSections = { ...sections };
                                        newSections[fromSection] = (newSections[fromSection] || []).filter((k: string) => k !== fieldKey);
                                        if (!newSections[toSection]) newSections[toSection] = [];
                                        newSections[toSection] = [...newSections[toSection], fieldKey];
                                        setConfig({ ...config, labelSections: newSections });
                                    };

                                    const shiftField = (sectionKey: string, index: number, delta: number) => {
                                        const list = [...(sections[sectionKey] || [])];
                                        const target = index + delta;
                                        if (target < 0 || target >= list.length) return;
                                        [list[index], list[target]] = [list[target], list[index]];
                                        setConfig({ ...config, labelSections: { ...sections, [sectionKey]: list } });
                                    };

                                    const toggleField = (fieldKey: string) => {
                                        const newFields = fields.includes(fieldKey) ? fields.filter((f: string) => f !== fieldKey) : [...fields, fieldKey];
                                        setConfig({ ...config, labelFields: newFields });
                                    };

                                    const allFieldDefs = [
                                        { key: 'businessName', label: 'Nombre del negocio' },
                                        { key: 'saleId', label: '# de Venta' },
                                        { key: 'clientName', label: 'Nombre del cliente' },
                                        { key: 'phone', label: 'Teléfono' },
                                        { key: 'address', label: 'Dirección' },
                                        { key: 'products', label: 'Productos' },
                                        { key: 'delivery', label: 'Delivery' },
                                        { key: 'seller', label: 'Vendedor' },
                                        { key: 'total', label: 'Total' },
                                        { key: 'shippingDate', label: 'Fecha de envío' },
                                        { key: 'status', label: 'Estado' }
                                    ];
                                    const labelOf = (key: string) => allFieldDefs.find(f => f.key === key)?.label || key;

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div>
                                                <p style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '0.5rem' }}>CAMPO ACTIVO (toggle)</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                    {allFieldDefs.map(f => {
                                                        const isOn = fields.includes(f.key);
                                                        return (
                                                            <button key={f.key} onClick={() => toggleField(f.key)} style={{
                                                                padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                                                                background: isOn ? 'rgba(99,102,241,0.15)' : '#0f172a',
                                                                border: `1px solid ${isOn ? 'rgba(99,102,241,0.3)' : '#334155'}`,
                                                                color: isOn ? '#818cf8' : '#64748b'
                                                            }}>
                                                                {isOn ? '✓ ' : '○ '}{f.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                                {sectionDefs.map(section => (
                                                    <div key={section.key} style={{ background: '#0f172a', borderRadius: '12px', border: `1px solid ${section.color}33`, padding: '0.75rem' }}>
                                                        <p style={{ fontSize: '0.7rem', fontWeight: 900, color: section.color, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.label}</p>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minHeight: '40px' }}>
                                                            {(sections[section.key] || []).filter((k: string) => fields.includes(k)).map((key: string, idx: number) => (
                                                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#1e293b', borderRadius: '8px', padding: '0.35rem 0.5rem' }}>
                                                                    <span style={{ flex: 1, fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0' }}>{labelOf(key)}</span>
                                                                    <button onClick={() => shiftField(section.key, idx, -1)} disabled={idx === 0} style={{ background: 'none', border: 'none', color: '#64748b', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: '2px' }}>↑</button>
                                                                    <button onClick={() => shiftField(section.key, idx, 1)} disabled={idx === (sections[section.key] || []).filter((k: string) => fields.includes(k)).length - 1} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}>↓</button>
                                                                    {section.key !== 'section1' && <button onClick={() => moveField(key, section.key, 'section1')} title="Mover a Cabecera" style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', padding: '2px', fontSize: '0.8rem' }}>1</button>}
                                                                    {section.key !== 'section2' && <button onClick={() => moveField(key, section.key, 'section2')} title="Mover a Cliente" style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', padding: '2px', fontSize: '0.8rem' }}>2</button>}
                                                                    {section.key !== 'section3' && <button onClick={() => moveField(key, section.key, 'section3')} title="Mover a Detalle" style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '2px', fontSize: '0.8rem' }}>3</button>}
                                                                </div>
                                                            ))}
                                                            {(sections[section.key] || []).filter((k: string) => fields.includes(k)).length === 0 && (
                                                                <p style={{ fontSize: '0.65rem', color: '#475569', margin: 0 }}>Vacío</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'email' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '2.5rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem', fontSize: '1.4rem', color: 'white' }}>
                                <Globe size={24} color="#10b981" /> Envío de Tickets por Email
                            </h3>
                            <div style={{ maxWidth: '600px' }}>
                                <div className="field" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>Habilitar envío de tickets</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', height: '44px', background: '#1e293b', padding: '0 1rem', borderRadius: '12px', border: '1px solid #334155', width: 'fit-content' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.enableEmailTickets}
                                            onChange={(e) => setConfig({ ...config, enableEmailTickets: e.target.checked })}
                                            style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                                        />
                                        <span style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>{config.enableEmailTickets ? 'Habilitado' : 'Deshabilitado'}</span>
                                    </label>
                                </div>

                                <div className="field" style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.85rem', fontWeight: 700 }}>URL del Webhook (Google Apps Script)</label>
                                    <input
                                        type="text"
                                        value={config.emailWebhookUrl}
                                        onChange={e => setConfig({ ...config, emailWebhookUrl: e.target.value })}
                                        placeholder="https://script.google.com/macros/s/.../exec"
                                        style={{ 
                                            width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', 
                                            background: '#0f172a', border: '1px solid #334155', 
                                            color: 'white', fontSize: '0.95rem',
                                            opacity: config.enableEmailTickets ? 1 : 0.5
                                        }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                                        {config.enableEmailTickets 
                                            ? 'Los tickets se enviarán automáticamente al correo del cliente después de cada venta.'
                                            : '* Activa la opción de arriba para habilitar el envío.'}
                                    </p>
                                </div>

                                <div style={{ 
                                    background: 'rgba(16, 185, 129, 0.08)', 
                                    padding: '1.5rem', borderRadius: '16px', 
                                    border: `1px solid ${config.enableEmailTickets ? 'rgba(16, 185, 129, 0.2)' : '#334155'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                        <div style={{ 
                                            width: '10px', height: '10px', borderRadius: '50%', 
                                            background: config.enableEmailTickets && config.emailWebhookUrl ? '#10b981' : '#64748b'
                                        }} />
                                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>
                                            Estado: {config.enableEmailTickets && config.emailWebhookUrl ? 'Configurado y activo' : config.enableEmailTickets ? 'Falta la URL del webhook' : 'Deshabilitado'}
                                        </span>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>
                                        El webhook usa Google Apps Script para enviar los tickets por correo al cliente. 
                                        El archivo <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#10b981' }}>email_webhook.gs</code> en la raíz del proyecto contiene el script de ejemplo.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'cash' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '2rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem', fontSize: '1.4rem', color: 'white' }}>
                                <Wallet size={24} color="#10b981" /> Apertura y Cierre de Caja
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                                Programá la apertura y cierre automático, y definí el ciclo de cada sucursal (diario o semanal).
                            </p>

                            {/* === Sección 1: Automatización === */}
                            <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '1.5rem' }}>
                                <h4 style={{ color: 'white', fontWeight: 800, marginBottom: '1rem', fontSize: '1rem' }}>
                                    🕐 Horarios Automáticos
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.isAutoOpeningEnabled}
                                            onChange={(e) => setConfig({ ...config, isAutoOpeningEnabled: e.target.checked })}
                                            style={{ width: '22px', height: '22px', accentColor: '#10b981' }}
                                        />
                                        Apertura Automática
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', color: 'white', fontWeight: 700, fontSize: '1.05rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.isAutoClosingEnabled}
                                            onChange={(e) => setConfig({ ...config, isAutoClosingEnabled: e.target.checked })}
                                            style={{ width: '22px', height: '22px', accentColor: '#3b82f6' }}
                                        />
                                        Cierre Automático
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    {config.isAutoOpeningEnabled && (
                                        <div className="field animate-in fade-in slide-in-from-top-2" style={{ flex: 1, minWidth: '180px' }}>
                                            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Hora de Apertura</label>
                                            <input
                                                type="time"
                                                value={config.autoOpeningTime}
                                                onChange={e => setConfig({ ...config, autoOpeningTime: e.target.value })}
                                                style={{ width: '100%', maxWidth: '220px', padding: '0.75rem 1rem', borderRadius: '12px', background: '#1e293b', border: '1px solid #10b98140', color: 'white', colorScheme: 'dark', fontSize: '1.2rem', textAlign: 'center' }}
                                            />
                                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                                                💰 Crea apertura $0 para cada sucursal (respeta el día configurado abajo).
                                            </p>
                                        </div>
                                    )}
                                    {config.isAutoClosingEnabled && (
                                        <div className="field animate-in fade-in slide-in-from-top-2" style={{ flex: 1, minWidth: '180px' }}>
                                            <label style={{ display: 'block', color: '#94a3b8', marginBottom: '0.75rem', fontSize: '0.9rem' }}>Hora de Cierre</label>
                                            <input
                                                type="time"
                                                value={config.autoClosingTime}
                                                onChange={e => setConfig({ ...config, autoClosingTime: e.target.value })}
                                                style={{ width: '100%', maxWidth: '220px', padding: '0.75rem 1rem', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', color: 'white', colorScheme: 'dark', fontSize: '1.2rem', textAlign: 'center' }}
                                            />
                                            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                                                ⚠️ Consolida ventas/gastos. Desconecta a todos los usuarios.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* === Sección 2: Configuración por Sucursal === */}
                            <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b' }}>
                                <h4 style={{ color: 'white', fontWeight: 800, marginBottom: '0.5rem', fontSize: '1rem' }}>
                                    🏪 Ciclo por Sucursal
                                </h4>
                                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                                    Elegí si la sucursal opera en ciclo <strong style={{ color: '#e2e8f0' }}>diario</strong> (abre y cierra cada día) o <strong style={{ color: '#e2e8f0' }}>semanal</strong> (abre un día y cierra otro ese mismo periodo). El modo "Estricto" bloquea ventas si no hay apertura activa.
                                </p>
                                {branches.length === 0 && (
                                    <p style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>Cargando sucursales...</p>
                                )}
                                {branches.map(b => {
                                    const cfg = config.branchConfig?.[b.id] || { closingType: 'daily', openDay: 1, closeDay: 6, strictOpen: false };
                                    return (
                                        <div key={b.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem', border: '1px solid #334155' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                <h5 style={{ color: 'white', fontWeight: 800, margin: 0, fontSize: '0.95rem' }}>{b.name}</h5>
                                                <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: cfg.closingType === 'periodic' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', color: cfg.closingType === 'periodic' ? '#fbbf24' : '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    {cfg.closingType === 'periodic' ? 'Semanal' : 'Diaria'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
                                                <div className="field">
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tipo de Ciclo</label>
                                                    <select value={cfg.closingType} onChange={e => setConfig({ ...config, branchConfig: { ...config.branchConfig, [b.id]: { ...cfg, closingType: e.target.value } } })}
                                                        style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.7rem', color: 'white', minWidth: '130px' }}>
                                                        <option value="daily">Diaria</option>
                                                        <option value="periodic">Semanal</option>
                                                    </select>
                                                </div>
                                                {cfg.closingType === 'periodic' && (
                                                    <>
                                                        <div className="field">
                                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Día Apertura</label>
                                                            <select value={cfg.openDay} onChange={e => setConfig({ ...config, branchConfig: { ...config.branchConfig, [b.id]: { ...cfg, openDay: parseInt(e.target.value) } } })}
                                                                style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.7rem', color: 'white' }}>
                                                                {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d, i) => (<option key={i} value={i}>{d}</option>))}
                                                            </select>
                                                        </div>
                                                        <div className="field">
                                                            <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Día Cierre</label>
                                                            <select value={cfg.closeDay} onChange={e => setConfig({ ...config, branchConfig: { ...config.branchConfig, [b.id]: { ...cfg, closeDay: parseInt(e.target.value) } } })}
                                                                style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem 0.7rem', color: 'white' }}>
                                                                {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d, i) => (<option key={i} value={i}>{d}</option>))}
                                                            </select>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <ShieldCheck size={11} /> Estricto
                                                    </label>
                                                    <input type="checkbox" checked={cfg.strictOpen} onChange={e => setConfig({ ...config, branchConfig: { ...config.branchConfig, [b.id]: { ...cfg, strictOpen: e.target.checked } } })}
                                                        style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sidebar' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', fontSize: '1.4rem', color: 'white' }}>
                                <List size={24} color="#8b5cf6" /> Configuración de Barra Lateral
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1.5rem' }}>
                                Selecciona qué módulos estarán visibles en el menú rápido y arrastra hacia arriba los más importantes.
                            </p>

                            <Reorder.Group
                                axis="y"
                                values={config.sidebarConfig}
                                onReorder={(newOrder) => setConfig({ ...config, sidebarConfig: newOrder })}
                                className="sidebar-config-list"
                                style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '0.4rem', 
                                    maxWidth: '600px', 
                                    margin: '0 auto',
                                    paddingRight: '10px'
                                }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {config.sidebarConfig.map((item: any, index: number) => (
                                        <Reorder.Item
                                            key={item.key}
                                            value={item}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            layout
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: '#0f172a', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #1e293b',
                                                transition: 'background 0.2s, border 0.2s', borderLeft: item.enabled ? '4px solid #8b5cf6' : '1px solid #1e293b'
                                            }}
                                            whileDrag={{
                                                scale: 1.02,
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                                background: '#1e293b',
                                                borderColor: '#8b5cf6',
                                                zIndex: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ color: '#475569', cursor: 'grab', display: 'flex', alignItems: 'center' }} className="drag-handle">
                                                    <GripVertical size={20} />
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={item.enabled}
                                                    onChange={(e) => {
                                                        const newConfig = [...config.sidebarConfig];
                                                        newConfig[index].enabled = e.target.checked;
                                                        setConfig({ ...config, sidebarConfig: newConfig });
                                                    }}
                                                    style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                                                />
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: item.enabled ? 'white' : '#64748b' }}>{item.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    type="button"
                                                    disabled={index === 0}
                                                    onClick={() => {
                                                        const newConfig = [...config.sidebarConfig];
                                                        const temp = newConfig[index];
                                                        newConfig[index] = newConfig[index - 1];
                                                        newConfig[index - 1] = temp;
                                                        setConfig({ ...config, sidebarConfig: newConfig });
                                                    }}
                                                    style={{ padding: '6px', borderRadius: '8px', cursor: index === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: index === 0 ? '#1e293b' : '#94a3b8' }}
                                                >
                                                    <ArrowUp size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index === config.sidebarConfig.length - 1}
                                                    onClick={() => {
                                                        const newConfig = [...config.sidebarConfig];
                                                        const temp = newConfig[index];
                                                        newConfig[index] = newConfig[index + 1];
                                                        newConfig[index + 1] = temp;
                                                        setConfig({ ...config, sidebarConfig: newConfig });
                                                    }}
                                                    style={{ padding: '6px', borderRadius: '8px', cursor: index === config.sidebarConfig.length - 1 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: index === config.sidebarConfig.length - 1 ? '#1e293b' : '#94a3b8' }}
                                                >
                                                    <ArrowDown size={18} />
                                                </button>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', fontSize: '1.4rem', color: 'white' }}>
                                <LayoutDashboard size={24} color="#3b82f6" /> Configuración del Menú Principal
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1.5rem' }}>
                                Arrastra para ordenar los módulos del panel principal del Dashboard.
                            </p>

                            <Reorder.Group
                                axis="y"
                                values={config.dashboardConfig || []}
                                onReorder={(newOrder) => setConfig({ ...config, dashboardConfig: newOrder })}
                                className="sidebar-config-list"
                                style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '600px', margin: '0 auto', paddingRight: '10px' }}
                            >
                                <AnimatePresence mode="popLayout">
                                    {(config.dashboardConfig || []).map((item: any, index: number) => (
                                        <Reorder.Item
                                            key={item.key}
                                            value={item}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            layout
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                background: '#0f172a', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid #1e293b',
                                                transition: 'background 0.2s, border 0.2s', borderLeft: '4px solid #3b82f6'
                                            }}
                                            whileDrag={{
                                                scale: 1.02,
                                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                                background: '#1e293b',
                                                borderColor: '#3b82f6',
                                                zIndex: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ color: '#475569', cursor: 'grab', display: 'flex', alignItems: 'center' }} className="drag-handle">
                                                    <GripVertical size={20} />
                                                </div>
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'white' }}>{item.label}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    type="button"
                                                    disabled={index === 0}
                                                    onClick={() => {
                                                        const newConfig = [...(config.dashboardConfig || [])];
                                                        const temp = newConfig[index];
                                                        newConfig[index] = newConfig[index - 1];
                                                        newConfig[index - 1] = temp;
                                                        setConfig({ ...config, dashboardConfig: newConfig });
                                                    }}
                                                    style={{ padding: '6px', borderRadius: '8px', cursor: index === 0 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: index === 0 ? '#1e293b' : '#94a3b8' }}
                                                >
                                                    <ArrowUp size={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index === (config.dashboardConfig || []).length - 1}
                                                    onClick={() => {
                                                        const newConfig = [...(config.dashboardConfig || [])];
                                                        const temp = newConfig[index];
                                                        newConfig[index] = newConfig[index + 1];
                                                        newConfig[index + 1] = temp;
                                                        setConfig({ ...config, dashboardConfig: newConfig });
                                                    }}
                                                    style={{ padding: '6px', borderRadius: '8px', cursor: index === (config.dashboardConfig || []).length - 1 ? 'default' : 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: index === (config.dashboardConfig || []).length - 1 ? '#1e293b' : '#94a3b8' }}
                                                >
                                                    <ArrowDown size={18} />
                                                </button>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem 2rem', borderRadius: '24px', border: '1px solid #334155' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', fontSize: '1.4rem', color: 'white' }}>
                                <ShieldCheck size={24} color="#8b5cf6" /> Roles y Permisos
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1.5rem' }}>
                                Selecciona un rol y marca los permisos que tendrá.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                                {roles.map(r => (
                                    <button key={r.id} onClick={async () => {
                                        setSelectedRole(r);
                                        try {
                                            const res = await adminAuthApi.getPermissions();
                                            const rolePerms = r.rolePermissions?.map((rp: any) => rp.permission?.key || rp.permissionKey) || [];
                                            setAllPerms(res.data.map((p: any) => ({ ...p, enabled: rolePerms.includes(p.key) })));
                                        } catch {}
                                    }}
                                    style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', border: selectedRole?.id === r.id ? '2px solid #8b5cf6' : '1px solid #334155', background: selectedRole?.id === r.id ? 'rgba(139,92,246,0.1)' : '#0f172a', color: selectedRole?.id === r.id ? '#a78bfa' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                                        {r.name}
                                    </button>
                                ))}
                            </div>
                            {selectedRole && (
                                <div style={{ background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', padding: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0, color: 'white', fontWeight: 800 }}>{selectedRole.name}</h4>
                                        <button className="btn-main" disabled={savingRoles} onClick={async () => {
                                            setSavingRoles(true);
                                            try {
                                                const perms = allPerms.filter(p => p.enabled).map(p => p.key);
                                                await adminAuthApi.updateRolePermissions(selectedRole.id, perms);
                                                toast.success('Permisos actualizados');
                                            } catch (e) { toast.error('Error al guardar'); }
                                            finally { setSavingRoles(false); }
                                        }} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                                            {savingRoles ? 'Guardando...' : 'Guardar Permisos'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.3rem' }}>
                                        {allPerms.map(p => {
                                            return (
                                                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', borderRadius: '6px', cursor: 'pointer', background: p.enabled ? 'rgba(139,92,246,0.05)' : 'transparent', fontSize: '0.78rem', color: p.enabled ? 'white' : '#64748b' }}>
                                                    <input type="checkbox" checked={!!p.enabled}
                                                        onChange={() => setAllPerms(allPerms.map(pp => pp.key === p.key ? { ...pp, enabled: !pp.enabled } : pp))}
                                                        style={{ accentColor: '#8b5cf6', width: '14px', height: '14px' }} />
                                                    {p.name || p.key}
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="settings-section animate-in fade-in slide-in-from-bottom-2" style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', fontSize: '1.4rem', color: '#ef4444' }}>
                                <TriangleAlert size={24} /> Zona de Peligro (Acciones Críticas)
                            </h3>
                            <p style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '2rem' }}>
                                Estas acciones son irreversibles y solo deben ejecutarse por el Super Administrador para limpieza de datos.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2rem', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: '#ef4444', marginBottom: '1rem' }}><Trash2 size={32} /></div>
                                    <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Borrar Historial de Ventas</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                                        Elimina permanentemente todas las ventas, cierres de caja, gastos y aplicaciones de pago de clientes. Los productos y clientes permanecerán intactos.
                                    </p>
                                    <button 
                                        type="button"
                                        onClick={() => setDangerModal({ isOpen: true, type: 'sales' })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                                    >
                                        Limpiar Ventas y Finanzas
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2rem', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: '#f59e0b', marginBottom: '1rem' }}><RefreshCcw size={32} /></div>
                                    <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Reiniciar Stock (Pruebas)</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                                        Pone todos los niveles de stock en cero para todas las sucursales y elimina todos los registros de lotes y vencimientos. Ideal para inicio de inventario físico.
                                    </p>
                                    <button 
                                        type="button"
                                        onClick={() => setDangerModal({ isOpen: true, type: 'inventory' })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)')}
                                    >
                                        Reiniciar Inventario a Cero
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2rem', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: '#3b82f6', marginBottom: '1rem' }}><RefreshCcw size={32} /></div>
                                    <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Reiniciar Contador de Ventas</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                                        Reinicia el número de folio de ventas. La próxima venta será #1. Útil al salir a producción después de pruebas.
                                    </p>
                                    <button 
                                        type="button"
                                        onClick={() => setDangerModal({ isOpen: true, type: 'counter' })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
                                    >
                                        Reiniciar # de Ventas
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '2rem', borderRadius: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <ShoppingCart size={32} />
                                        <TriangleAlert size={20} className="animate-pulse" />
                                    </div>
                                    <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Eliminar Todos los Productos</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                                        ¡ATENCIÓN! Esta acción borrará TODOS los productos y variantes. Las categorías se conservarán intactas. Acción irreversible.
                                    </p>
                                    <button 
                                        type="button"
                                        onClick={() => setDangerModal({ isOpen: true, type: 'products' })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                                    >
                                        Borrar Todos los Productos
                                    </button>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ color: '#10b981', marginBottom: '1rem' }}><Download size={32} /></div>
                                    <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.75rem' }}>Descargar Backup</h4>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem', flex: 1 }}>
                                        Descarga un archivo comprimido (.tar.gz) con la base de datos completa. Úsalo como respaldo antes de hacer cambios críticos.
                                    </p>
                                    <button onClick={async () => {
                                        try {
                                            const res = await fetch('/api/config/danger/backup', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } });
                                            if (!res.ok) return toast.error('Error al descargar backup');
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url; a.download = 'backup-ventasee-' + new Date().toISOString().slice(0,10) + '.zip';
                                            document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                                            toast.success('Backup descargado');
                                        } catch { toast.error('Error al descargar backup'); }
                                    }}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)')}
                                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}>
                                        <Download size={18} style={{ marginRight: '8px' }} /> Descargar Backup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </form>

                </div>
            )}

                <PinModal 
                    isOpen={isAccessPinOpen}
                    onClose={() => {
                        setIsAccessPinOpen(false);
                        navigate('/admin');
                    }}
                    onConfirm={handleAccessConfirm}
                    title="Acceso a Configuración"
                    description="Esta sección contiene ajustes críticos del sistema. Ingresa tu PIN de Super Admin para continuar."
                />

                <PinModal 
                    isOpen={dangerModal.isOpen}
                    onClose={() => setDangerModal({ isOpen: false, type: null })}
                    onConfirm={handleConfirmReset}
                    title={
                        dangerModal.type === 'sales' ? "Confirmar Borrado de Ventas" : 
                        dangerModal.type === 'inventory' ? "Confirmar Reinicio de Stock" :
                        dangerModal.type === 'counter' ? "Reiniciar Contador de Ventas" :
                        "Confirmar Borrado de Productos"
                    }
                    description={
                        dangerModal.type === 'sales' ? "Esta acción eliminará TODO el historial financiero. No hay marcha atrás. Ingresa el PIN de Super Admin para proceder." :
                        dangerModal.type === 'inventory' ? "Se pondrán todos los stocks a cero y se borrarán los lotes. Ingresa el PIN de Super Admin para proceder." :
                        dangerModal.type === 'counter' ? "La próxima venta iniciará con el folio #1. Ingresa el PIN de Super Admin para proceder." :
                        "Se eliminarán TODOS los productos permanentemente. Las categorías se conservarán. Ingresa el PIN de Super Admin para proceder."
                    }
                />
            </main>
        </div >
    );
};

export default Settings;
