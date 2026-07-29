import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Layers, Users, User, History, TrendingUp, DollarSign, Activity, Wallet, Truck, LogOut, Settings, ShieldCheck, Archive, Receipt, BarChart3, LineChart, Eye, Tags, Store, Building2, Banknote, Clock, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import BranchSwitcher from '../components/BranchSwitcher';
import api, { configApi, saleApi, statsApi } from '../services/api';
import { getUser, hasRole, ROLES } from '../utils/permissions';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = getUser();
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [statsData, setStatsData] = React.useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);
    const [showExitModal, setShowExitModal] = React.useState(false);
    const [pendingShipments, setPendingShipments] = React.useState(0);

    // --- GUARDIA DE BOTÓN ATRÁS (Native Back Button) ---
    React.useEffect(() => {
        // Bloquear el botón de atrás agregando un estado al historial
        window.history.pushState(null, '', window.location.pathname);

        const handlePopState = (e: PopStateEvent) => {
            // Cuando el usuario le da atrás, mostramos el modal y volvemos a empujar el estado para que no se salga
            window.history.pushState(null, '', window.location.pathname);
            setShowExitModal(true);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val);
    };

    const [dashboardOrder, setDashboardOrder] = React.useState<any[] | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const [configRes, statsRes] = await Promise.all([
                    api.get('/config?_=' + Date.now()),
                    statsApi.getDashboardStats()
                ]);
                if (cancelled) return;
                if (configRes.data?.logoUrl) setLogoUrl(configRes.data.logoUrl);
                const sc = configRes.data?.sidebarConfig;
                if (sc) {
                    const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.dashboard) {
                        setDashboardOrder([...parsed.dashboard]);
                    }
                }
                setStatsData(statsRes.data);
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            }
            if (cancelled) return;
            try {
                const shipRes = await api.get('/sales/shipments/list?status=VENDIDO');
                setPendingShipments(shipRes.data.length);
            } catch (_) {}
            try {
                const shipRes = await api.get('/sales/shipments/list?status=DESPACHADO');
                setPendingShipments(prev => prev + shipRes.data.length);
            } catch (_) {}
            setIsLoadingStats(false);
        };
        fetchData();
        const handler = () => fetchData();
        window.addEventListener('config-updated', handler);
        return () => { cancelled = true; window.removeEventListener('config-updated', handler); };
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        // Use replace to ensure the back button doesn't return to the previous page
        window.location.replace('/login');
    };

    // Mocks for now, can be wired to real backend endpoints later
    const stats = [
        {
            label: 'Ventas Netas (Día)',
            value: statsData ? formatCurrency(statsData.sales.totalAmount - (statsData.totalExpenses || 0)) : '$0.00',
            icon: <DollarSign size={18} />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            details: statsData ? Object.keys(statsData.sales.branches).map(branchName => ({
                label: branchName,
                value: formatCurrency(statsData.sales.branches[branchName].amount)
            })) : []
        },
        {
            label: 'Ventas Realizadas',
            value: statsData ? statsData.sales.totalCount.toString() : '0',
            icon: <ShoppingCart size={18} />,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            details: statsData ? Object.keys(statsData.sales.branches).map(branchName => ({
                label: branchName,
                value: statsData.sales.branches[branchName].count.toString()
            })) : []
        },
        {
            label: 'Productos Bajos (Global)',
            value: statsData ? statsData.lowStockCount.toString() : '0',
            icon: <Package size={18} />,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10'
        },
        {
            label: 'Nuevos Clientes (Global)',
            value: statsData ? statsData.newClientsCount.toString() : '0',
            icon: <Users size={18} />,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10'
        }
    ];

    const allDashboardModules: Record<string, any> = {
        pos: { title: 'Punto de Venta', icon: <ShoppingCart size={22} />, path: '/pos', desc: 'Realizar ventas' },
        summary: { title: 'Resumen Día', icon: <Eye size={22} />, path: '/summary', desc: 'Resumen actual' },
        inventory: { title: 'Inventario', icon: <Package size={22} />, path: '/inventory', desc: 'Control de stock' },
        replenishment: { title: 'Reposición', icon: <TrendingUp size={22} />, path: '/replenishment', desc: 'Sugerencias de compra' },
        products: { title: 'Productos', icon: <Layers size={22} />, path: '/products', desc: 'Catálogo y precios' },
        clients: { title: 'Clientes', icon: <Users size={22} />, path: '/clients', desc: 'Base de datos' },
        expenses: { title: 'Gastos', icon: <Receipt size={22} />, path: '/expenses', desc: 'Salidas de caja' },
        history: { title: 'Historial Ventas', icon: <History size={22} />, path: '/sales-history', desc: 'Historial global' },
        projections: { title: 'Proyecciones', icon: <LineChart size={22} />, path: '/projections', desc: 'Metas y pronósticos' },
        reports: { title: 'Reportes', icon: <BarChart3 size={22} />, path: '/reports', desc: 'Estadísticas' },
        receivable: { title: 'Cuentas por Cobrar', icon: <Wallet size={22} />, path: '/receivable', desc: 'Cobros pendientes' },
        payable: { title: 'Cuentas por Pagar', icon: <Truck size={22} />, path: '/payable', desc: 'Deudas a proveedores' },
        transfers: { title: 'Traslados', icon: <Truck size={22} />, path: '/transfers', desc: 'Transferencias entre sucursales' },
        closings: { title: 'Cortes de Caja', icon: <Banknote size={22} />, path: '/closings', desc: 'Balances diarios' },
        categories: { title: 'Categorías', icon: <Tags size={22} />, path: '/categories', desc: 'Agrupación de items' },
        suppliers: { title: 'Proveedores', icon: <Building2 size={22} />, path: '/suppliers', desc: 'Gestión de compras' },
        branches: { title: 'Sucursales', icon: <Store size={22} />, path: '/branches', desc: 'Sedes y bodegas' },
        users: { title: 'Personal', icon: <User size={22} />, path: '/users', desc: 'Accesos y roles' },
        settings: { title: 'Configuración', icon: <Settings size={22} />, path: '/settings', desc: 'Ajustes maestros' },
        audit: { title: 'Auditoría', icon: <BarChart3 size={22} />, path: '/audit', desc: 'Registro de actividades' },
        shipments: { title: 'Envíos', icon: <Truck size={22} />, path: '/shipments', desc: 'Entregas programadas', badge: pendingShipments },
        lookup: { title: 'Consultar', icon: <Search size={22} />, path: '/lookup', desc: 'Búsqueda de productos' },
        sellerReport: { title: 'Comisiones', icon: <BarChart3 size={22} />, path: '/seller-report', desc: 'Ventas por vendedor' },
        deliveries: { title: 'Deliverys', icon: <Truck size={22} />, path: '/deliveries', desc: 'Gestión de repartidores' },
    };

    const allModules = Object.values(allDashboardModules).reduce((acc: any, m: any) => {
        acc[m.title] = m; return acc;
    }, {} as Record<string, any>);
    const savedLabels = dashboardOrder && dashboardOrder.length > 0
        ? dashboardOrder.map((d: any) => d.label || d)
        : null;
    let modules: any[] = Object.keys(allModules)
        .filter(t => t !== 'Configuración' || hasRole(ROLES.SUPER_ADMIN));
    if (savedLabels) {
        const ordered: any[] = [];
        const remaining: any[] = [];
        modules.forEach(t => {
            const idx = savedLabels.indexOf(t);
            if (idx >= 0) ordered[idx] = allModules[t];
            else remaining.push(allModules[t]);
        });
        modules = ordered.filter(Boolean).concat(remaining);
    } else {
        modules = modules.map(t => allModules[t]);
    }

    return (
        <div className="admin-dashboard-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div className="header-left">
                        <div className="flex items-center gap-4">
                            {!isLoading && logoUrl && (
                                <div className="admin-logo-box">
                                    <img src={logoUrl} alt="Logo" />
                                </div>
                            )}
                            <div>
                                <div className="header-text-main">
                                    <h1>Panel Principal</h1>
                                    <p>Bienvenido de nuevo, <span>{user.name}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="dash-logout-btn" onClick={handleLogout}>
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </header>

                <div className="dashboard-content-split">
                    <aside className="stats-sidebar">
                        <h2 className="section-title-mini"><Activity size={18} /> Pulso del Negocio</h2>
                        <div className="stats-stack">
                            {stats.map((stat, i) => (
                                <div key={i} className={`stat-card stat-${i % 4} ${isLoadingStats ? 'loading-pulse' : ''} compact-card`}>
                                    <div className="stat-main">
                                        <div className="stat-icon">
                                            {stat.icon}
                                        </div>
                                        <div className="stat-info">
                                            <p className="stat-label">{stat.label}</p>
                                            <p className="stat-value">
                                                {isLoadingStats ? '...' : stat.value}
                                            </p>
                                        </div>
                                    </div>
                                    {!isLoadingStats && stat.details && stat.details.length > 0 && (
                                        <div className="stat-details-vertical">
                                            {stat.details.map((detail, idx) => (
                                                <div key={idx} className="detail-item-v">
                                                    <span className="d-label">{detail.label}</span>
                                                    <span className="d-value">{detail.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </aside>

                    <section className="modules-area">
                        <div className="modules-section">
                            <h2 className="section-title-mini"><Layers size={20} /> Módulos del Sistema</h2>
                            {dashboardOrder && (
                            <div className="modules-grid" key="loaded">
                                {modules.map((mod, i) => (
                                     <button
                                         key={mod.title}
                                         onClick={() => navigate(mod.path)}
                                         className="module-card"
                                         style={{ animation: `fadeInUp 0.45s ease-out ${i * 0.05}s both` }}
                                     >
                                          <div className="mod-icon" style={{ position: 'relative' }}>
                                              {mod.icon}
                                              {(mod as any).badge > 0 && (
                                                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.5rem', fontWeight: 900, width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(239,68,68,0.4)' }}>
                                                      {(mod as any).badge}
                                                  </span>
                                              )}
                                          </div>
                                        <div className="mod-info">
                                            <h3>{mod.title}</h3>
                                            <p>{mod.desc}</p>
                                        </div>
                                        </button>
                                ))}
                            </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* --- MODAL DE CONFIRMACIÓN DE SALIDA --- */}
                {showExitModal && (
                    <div className="exit-modal-overlay">
                        <div className="exit-modal-content">
                            <div className="exit-modal-icon">
                                <LogOut size={40} />
                            </div>
                            <h3>¿Cerrar Sesión?</h3>
                            <p>¿Estás seguro que deseas salir de la aplicación? Tu sesión se cerrará por seguridad.</p>
                            <div className="exit-modal-actions">
                                <button className="btn-cancel-exit" onClick={() => setShowExitModal(false)}>
                                    Mantenerme Aquí
                                </button>
                                <button className="btn-confirm-exit" onClick={handleLogout}>
                                    Sí, Salir
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            <style>{`
                .admin-dashboard-page { display: flex; width: 100%; height: 100vh; background: #0f172a; color: white; overflow: hidden; }
                .dashboard-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding: 0.75rem 1.5rem 0; position: relative; width: 100%; }
                
                .dash-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 1rem; 
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    flex-shrink: 0;
                }
                .header-left > div { display: flex; align-items: center; gap: 1rem; }
                .dash-header h1 { font-size: 1.8rem; font-weight: 900; margin: 0; letter-spacing: -0.04em; color: #f8fafc; }
                .dash-header p { color: #64748b; font-size: 0.9rem; margin: 0; }
                .dash-header p span { font-weight: 800; color: #3b82f6; }

                .admin-logo-box {
                    position: relative;
                    width: 55px;
                    height: 55px;
                    background: #1e293b;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 3px;
                    overflow: hidden;
                }

                .admin-logo-box::after {
                    content: '';
                    position: absolute;
                    inset: 2px;
                    background: #1e293b;
                    border-radius: 12px;
                    z-index: 1;
                }

                .admin-logo-box img {
                    position: relative;
                    z-index: 2;
                    max-width: 90%;
                    max-height: 90%;
                    object-fit: contain;
                }

                .dash-logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(239, 68, 68, 0.1);
                    color: #f87171;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 0.4rem 0.7rem;
                    border-radius: 10px;
                    font-weight: 700;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .dash-logout-btn:hover { background: #ef4444; color: white; }

                /* NEW SPLIT LAYOUT */
                .dashboard-content-split {
                    display: flex;
                    gap: 1.25rem;
                    flex: 1;
                    overflow: hidden;
                    padding-bottom: 0.5rem; /* Pequeño respiro pero casi nada */
                }

                .stats-sidebar {
                    width: 240px;
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    flex-shrink: 0;
                    overflow-y: auto;
                    padding-right: 0.5rem;
                    scrollbar-width: none;
                }
                .stats-sidebar::-webkit-scrollbar { display: none; }

                .modules-area {
                    flex: 1;
                    overflow-y: auto;
                    padding-right: 0.75rem;
                    scrollbar-width: thin;
                    scrollbar-color: #334155 transparent;
                }
                .modules-area::-webkit-scrollbar { width: 4px; }
                .modules-area::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }

                .section-title-mini { 
                    font-size: 0.75rem; 
                    font-weight: 800; 
                    display: flex; 
                    align-items: center; 
                    gap: 0.5rem; 
                    margin-bottom: 0.75rem; 
                    color: #475569; 
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                }

                .stats-stack { display: flex; flex-direction: column; gap: 0.6rem; }
                .stat-card { 
                    background: #1e293b99; 
                    border: 1px solid #334155; 
                    padding: 0.85rem; 
                    border-radius: 14px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 0.6rem; 
                    transition: all 0.2s; 
                }
                .stat-card:hover { transform: translateX(3px); border-color: #3b82f6; }
                
                .stat-main { display: flex; align-items: center; gap: 0.6rem; }
                .stat-icon { 
                    width: 36px; 
                    height: 36px; 
                    border-radius: 10px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0;
                }
                
                .stat-0 .stat-icon { background: rgba(16, 185, 129, 0.1); color: #34d399; }
                .stat-1 .stat-icon { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
                .stat-2 .stat-icon { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
                .stat-3 .stat-icon { background: rgba(168, 85, 247, 0.1); color: #c084fc; }

                .stat-info { display: flex; flex-direction: column; }
                .stat-label { color: #64748b; font-size: 0.55rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.1rem; }
                .stat-value { font-size: 1.25rem; font-weight: 900; line-height: 1; color: white; }
                
                .stat-details-vertical { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 0.35rem; 
                    padding-top: 0.6rem; 
                    border-top: 1px solid rgba(255,255,255,0.03); 
                }
                .detail-item-v { display: flex; justify-content: space-between; align-items: center; font-size: 0.65rem; }
                .detail-item-v .d-label { color: #475569; font-weight: 600; }
                .detail-item-v .d-value { color: #94a3b8; font-weight: 800; background: rgba(255,255,255,0.02); padding: 1px 4px; border-radius: 4px; }

                .modules-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); 
                    gap: 0.75rem; 
                }
                .module-card { 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    padding: 0.85rem 0.5rem; 
                    border-radius: 16px; 
                    text-align: center; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    gap: 0.5rem; 
                    transition: all 0.3s;
                    cursor: pointer;
                    color: white;
                }
                .module-card:hover { 
                    transform: translateY(-4px); 
                    background: #283548; 
                    border-color: #3b82f6; 
                }
                @keyframes fadeInUp {
                    0%   { opacity: 0; transform: translateY(20px); box-shadow: 0 0 0 rgba(59,130,246,0); }
                    40%  { opacity: 1; transform: translateY(0); box-shadow: 0 0 24px rgba(59,130,246,0.5); }
                    100% { opacity: 1; transform: translateY(0); box-shadow: 0 0 0 rgba(59,130,246,0); }
                }

                
                .mod-icon { 
                    padding: 0.5rem; 
                    background: #0f172a; 
                    border-radius: 10px; 
                    color: #64748b; 
                    transition: all 0.2s; 
                }
                .mod-icon svg { width: 20px !important; height: 20px !important; }
                .module-card:hover .mod-icon { color: #60a5fa; background: rgba(59, 130, 246, 0.1); }
                
                .mod-info h3 { font-size: 0.75rem; font-weight: 800; margin-bottom: 0.1rem; color: #e2e8f0; }
                .mod-info p { display: none; }

                /* TABLET OPTIMIZATIONS (10 INC) */
                @media (max-width: 1024px) {
                    .dashboard-main { padding: 0.5rem 1rem 0; }
                    .stats-sidebar { width: 210px; gap: 0.5rem; }
                    .modules-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.5rem; }
                    .stat-value { font-size: 1.15rem; }
                    .dash-header h1 { font-size: 1.5rem; }
                    .dash-header { margin-bottom: 0.75rem; padding-bottom: 0.4rem; }
                    .stat-card { padding: 0.75rem; }
                    .section-title-mini { margin-bottom: 0.5rem; }
                }

                @media (max-width: 768px) {
                    .dashboard-content-split { flex-direction: column; overflow-y: auto; padding-bottom: 1rem; }
                    .stats-sidebar { width: 100%; overflow-y: visible; }
                    .modules-area { overflow-y: visible; padding-right: 0; }
                }

                .loading-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

                .exit-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.85);
                    backdrop-filter: blur(12px);
                    z-index: 20000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }
                .exit-modal-content {
                    background: #1e293b;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    padding: 2.5rem;
                    border-radius: 32px;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    animation: modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                @keyframes modal-enter {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .exit-modal-icon {
                    width: 80px;
                    height: 80px;
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                }
                .exit-modal-content h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; color: white; }
                .exit-modal-content p { color: #94a3b8; line-height: 1.6; margin-bottom: 2rem; font-size: 0.95rem; }
                .exit-modal-actions { display: flex; flex-direction: column; gap: 0.75rem; }
                .btn-cancel-exit { padding: 1rem; border-radius: 12px; border: 1px solid #334155; background: #1e293b; color: #94a3b8; font-weight: 700; cursor: pointer; transition: all 0.2s; }
                .btn-cancel-exit:hover { background: #334155; color: white; }
                .btn-confirm-exit { padding: 1rem; border-radius: 12px; border: none; background: #ef4444; color: white; font-weight: 800; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.05em; }
                .btn-confirm-exit:hover { background: #dc2626; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3); }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
