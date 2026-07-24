import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Layers, Users, User, History, TrendingUp, DollarSign, Activity, Wallet, Truck, LogOut, Settings, ShieldCheck, Archive, Receipt, BarChart3, LineChart, Eye, Tags, Store, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import { configApi } from '../services/api';
import { statsApi } from '../services/stats.service';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [statsData, setStatsData] = React.useState<any>(null);
    const [isLoadingStats, setIsLoadingStats] = React.useState(true);
    const [showExitModal, setShowExitModal] = React.useState(false);

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

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [logoRes, statsRes] = await Promise.all([
                    configApi.getConfig(),
                    statsApi.getDashboardStats()
                ]);

                if (logoRes.data?.logoUrl) setLogoUrl(logoRes.data.logoUrl);
                setStatsData(statsRes.data);
            } catch (error) {
                console.error('Error fetching dashboard data', error);
            } finally {
                setIsLoading(false);
                setIsLoadingStats(false);
            }
        };
        fetchDashboardData();
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

    const modules = [
        { title: 'Punto de Venta', icon: <ShoppingCart size={22} />, path: '/pos', desc: 'Realizar ventas' },
        { title: 'Inventario', icon: <Package size={22} />, path: '/inventory', desc: 'Control de stock' },
        { title: 'Reposición de Stock', icon: <TrendingUp size={22} />, path: '/replenishment', desc: 'Sugerencias de compra' },
        { title: 'Productos', icon: <Layers size={22} />, path: '/products', desc: 'Catálogo y precios' },
        { title: 'Categorías', icon: <Tags size={22} />, path: '/categories', desc: 'Agrupación de items' },
        { title: 'Proveedores', icon: <Building2 size={22} />, path: '/suppliers', desc: 'Gestión de compras' },
        { title: 'Clientes', icon: <Users size={22} />, path: '/clients', desc: 'Base de datos' },
        { title: 'Cuentas por Cobrar', icon: <Wallet size={22} />, path: '/receivable', desc: 'Cobros pendientes' },
        { title: 'Cuentas por Pagar', icon: <Truck size={22} />, path: '/payable', desc: 'Deudas a proveedores' },
        { title: 'Personal', icon: <User size={22} />, path: '/users', desc: 'Accesos y roles' },
        { title: 'Sucursales', icon: <Store size={22} />, path: '/branches', desc: 'Sedes y bodegas' },
        { title: 'Gastos', icon: <Receipt size={22} />, path: '/expenses', desc: 'Salidas de caja' },
        { title: 'Historial', icon: <History size={22} />, path: '/sales-history', desc: 'Historial global' },
        { title: 'Resumen Día', icon: <Eye size={22} />, path: '/summary', desc: 'Resumen actual' },
        { title: 'Cortes Caja', icon: <Archive size={22} />, path: '/closings', desc: 'Balances diarios' },
        { title: 'Configuración', icon: <Settings size={22} />, path: '/settings', desc: 'Ajustes maestros' },
        { title: 'Reportes', icon: <BarChart3 size={22} />, path: '/reports', desc: 'Estadísticas' },
        { title: 'Proyecciones', icon: <LineChart size={22} />, path: '/projections', desc: 'Metas y pronósticos' },
    ];

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
                                <div>
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

                <div className="stats-grid">
                    {stats.map((stat, i) => (
                        <div key={i} className={`stat-card stat-${i % 4} ${isLoadingStats ? 'loading-pulse' : ''}`}>
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

                <div className="modules-section">
                    <h2><Activity size={20} /> Módulos del Sistema</h2>
                    <motion.div 
                        className="modules-grid"
                        variants={{
                            hidden: { opacity: 0 },
                            show: {
                                opacity: 1,
                                transition: {
                                    staggerChildren: 0.06
                                }
                            }
                        }}
                        initial="hidden"
                        animate="show"
                    >
                        {modules
                            .filter(mod => {
                                // RBAC: Solo Super Admin (ID 1) ve Configuración y Personal
                                if (mod.title === 'Configuración' || mod.title === 'Personal') {
                                    return user.id === 1;
                                }
                                return true;
                            })
                            .map((mod, i) => (
                             <motion.button
                                 key={mod.title}
                                 variants={{
                                     hidden: { opacity: 0, y: 20 },
                                     show: { opacity: 1, y: 0 }
                                 }}
                                 whileHover={{ scale: 1.02, backgroundColor: "#283548" }}
                                 whileTap={{ scale: 0.98 }}
                                 onClick={() => navigate(mod.path)}
                                 className="module-card"
                             >
                                 {/* Halo spark effect on entry */}
                                 <motion.div 
                                     className="halo-spark"
                                     variants={{
                                         hidden: { scale: 0.8, opacity: 0 },
                                         show: { 
                                             scale: [0.8, 1.2, 1],
                                             opacity: [0, 1, 0],
                                             transition: { 
                                                 duration: 0.4, 
                                                 delay: 0.05,
                                                 ease: "easeOut" 
                                             } 
                                         }
                                     }}
                                 />
                                 <div className="mod-icon">
                                     {mod.icon}
                                 </div>
                                <div className="mod-info">
                                    <h3>{mod.title}</h3>
                                    <p>{mod.desc}</p>
                                </div>
                            </motion.button>
                        ))}
                    </motion.div>
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
                .admin-dashboard-page { display: flex; height: 100vh; background: #0f172a; color: white; overflow: hidden; }
                .dashboard-main { flex: 1; overflow-y: auto; padding: 2rem 4rem; position: relative; }
                
                .dash-header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 3rem; 
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .header-left > div { display: flex; align-items: center; gap: 2rem; }
                .dash-header h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 0.25rem; letter-spacing: -0.04em; }
                .dash-header p { color: #94a3b8; font-size: 1.1rem; }
                .dash-header p span { font-weight: 800; color: #3b82f6; text-transform: uppercase; }

                .admin-logo-box {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    background: #1e293b;
                    border-radius: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                }

                .admin-logo-box::before {
                    content: '';
                    position: absolute;
                    width: 150%;
                    height: 150%;
                    background: conic-gradient(#3b82f6, #8b5cf6, #3b82f6);
                    animation: spin-border 4s linear infinite;
                    z-index: 1;
                }

                .admin-logo-box::after {
                    content: '';
                    position: absolute;
                    inset: 3px;
                    background: #1e293b;
                    border-radius: 21px;
                    z-index: 1;
                }

                @keyframes spin-border {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .admin-logo-box img {
                    position: relative;
                    z-index: 2;
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 18px;
                    padding: 5px;
                }

                .dash-logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    background: rgba(239, 68, 68, 0.1);
                    color: #f87171;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    padding: 0.75rem 1.25rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .dash-logout-btn:hover { background: #ef4444; color: white; }

                .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-bottom: 2.5rem; }
                .stat-card { background: rgba(30, 41, 59, 0.5); border: 1px solid #334155; padding: 1.25rem; border-radius: 16px; display: flex; align-items: stretch; justify-content: space-between; gap: 1rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; position: relative; overflow: hidden; }
                
                .stat-card::after {
                    content: '';
                    position: absolute;
                    top: 0; left: -100%;
                    width: 100%; height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
                    transition: 0.5s;
                }
                .stat-card:hover::after { left: 100%; }
                .stat-card:hover { transform: translateY(-5px); border-color: #3b82f666; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3); }
                
                .stat-main { display: flex; align-items: center; gap: 1rem; flex: 1; }
                .stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                
                .stat-0 .stat-icon { background: rgba(16, 185, 129, 0.1); color: #34d399; }
                .stat-1 .stat-icon { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
                .stat-2 .stat-icon { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
                .stat-3 .stat-icon { background: rgba(168, 85, 247, 0.1); color: #c084fc; }

                .stat-info { display: flex; flex-direction: column; justify-content: center; }
                .stat-label { color: #94a3b8; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
                .stat-value { font-size: 1.5rem; font-weight: 900; line-height: 1; margin: 0; color: white; }
                
                .stat-details-vertical { display: flex; flex-direction: column; justify-content: center; gap: 0.35rem; border-left: 1px solid rgba(148, 163, 184, 0.2); padding-left: 1rem; min-width: 140px; flex-shrink: 0; }
                .detail-item-v { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.75rem; }
                .detail-item-v .d-label { color: #94a3b8; font-weight: 600; font-size: 0.65rem; max-width: 110px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .detail-item-v .d-value { color: #e2e8f0; font-weight: 700; }


                .modules-section h2 { font-size: 1.1rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; color: #f8fafc; }
                .modules-section h2 svg { color: #3b82f6; }
                
                .modules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; grid-auto-rows: 1fr; }
                .module-card { 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    padding: 1.25rem; 
                    border-radius: 16px; 
                    text-align: center; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    gap: 0.75rem; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    cursor: pointer;
                    color: white;
                    position: relative;
                    overflow: hidden;
                }
                .module-card:hover { transform: translateY(-5px); background: #283548; border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3); }
                
                .halo-spark {
                    position: absolute;
                    inset: -20px;
                    background: radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%);
                    z-index: 1;
                    pointer-events: none;
                    border-radius: 50%;
                }

                .mod-icon { padding: 0.75rem; background: rgba(15, 23, 42, 0.5); border-radius: 12px; color: #cbd5e1; transition: all 0.2s; position: relative; z-index: 2; }
                .module-card:hover .mod-icon { color: #60a5fa; background: rgba(59, 130, 246, 0.1); transform: scale(1.1); }
                
                .mod-info h3 { font-size: 1rem; font-weight: 800; margin-bottom: 0.25rem; transition: font-size 0.2s; }
                .module-card:hover .mod-info h3 { color: #60a5fa; }
                .mod-info p { color: #94a3b8; font-size: 0.75rem; line-height: 1.4; font-weight: 500; transition: font-size 0.2s; }

                /* TABLET SCALING (approx 25% reduction) */
                @media (max-width: 1200px) {
                    .dashboard-main { padding: 1.5rem 2rem; }
                    .modules-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
                    .module-card { padding: 0.9rem; gap: 0.5rem; }
                    .mod-icon { padding: 0.6rem; }
                    .mod-icon svg { width: 17px !important; height: 17px !important; }
                    .mod-info h3 { font-size: 0.85rem; }
                    .mod-info p { font-size: 0.65rem; }
                    .dash-header h1 { font-size: 1.8rem; }
                    .admin-logo-box { width: 70px; height: 70px; }
                }

                .loading-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100px; color: #475569; }

                /* EXIT MODAL STYLES */
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
