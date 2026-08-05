import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { statsApi, branchApi } from '../services/api';
import { X } from 'lucide-react';
import { 
    BarChart3, Calendar, Users, Package, TrendingUp, TrendingDown, 
    ArrowLeft, Award, Wallet, Building2, PieChart, ChevronRight, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

type ReportModule = 'hub' | 'clients' | 'products' | 'financial' | 'branches' | 'users' | 'deliveries';

const Reports: React.FC = () => {
    const [activeModule, setActiveModule] = useState<ReportModule>('hub');
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
    const [branchId, setBranchId] = useState<number | undefined>(undefined);
    const [branches, setBranches] = useState<any[]>([]);
    const [data, setData] = useState<any>(null);
    const [clientSort, setClientSort] = useState<'consumption' | 'visits'>('consumption');
    const [filterNoDebt, setFilterNoDebt] = useState(false);

    useEffect(() => {
        loadBranches();
    }, []);

    useEffect(() => {
        if (activeModule === 'hub') return;
        const t = setTimeout(() => { fetchReports(); }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeModule, dateRange.start, dateRange.end, branchId]);

    const loadBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchReports = async () => {
        setLoading(true);
        try {
            const res = await statsApi.getReports({
                startDate: dateRange.start,
                endDate: dateRange.end,
                branchId
            });
            setData(res.data);
        } catch (error) {
            toast.error('Error al generar reportes');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: any) => {
        try {
            const num = Number(val);
            if (isNaN(num)) return '$0.00';
            return new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(num);
        } catch (e) {
            return '$0.00';
        }
    };

    const hubModules = [
        { id: 'clients', title: 'Ranking de Clientes', desc: 'Fidelidad, consumo y deudas', icon: <Users size={24} />, color: '#3b82f6' },
        { id: 'products', title: 'Top Productos', desc: 'Lo más vendido y recaudación', icon: <Package size={24} />, color: '#f59e0b' },
        { id: 'users', title: 'Ventas por Vendedor', desc: 'Rendimiento por personal', icon: <Award size={24} />, color: '#ef4444' },
        { id: 'financial', title: 'Balance Financiero', desc: 'Ventas vs Gastos y Utilidad', icon: <TrendingUp size={24} />, color: '#10b981' },
        { id: 'branches', title: 'Rendimiento Sucursales', desc: 'Comparativa de ventas por local', icon: <Building2 size={24} />, color: '#8b5cf6' },
        { id: 'deliveries', title: 'Envíos por Encomendista', desc: 'Pedidos saliendo por delivery', icon: <Truck size={24} />, color: '#06b6d4' },
    ];

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ background: '#020617' }}>
                <header className="page-header" style={{ marginBottom: 0, background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem 2rem', borderBottom: '1px solid #1e293b', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        {activeModule !== 'hub' && (
                            <button 
                                onClick={() => setActiveModule('hub')}
                                style={{ background: '#1e293b', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                title="Volver al Menú"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div className="header-text">
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>
                                {activeModule === 'hub' ? 'Centro de Reportes' : hubModules.find(m => m.id === activeModule)?.title}
                            </h1>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                {activeModule === 'hub' ? 'Selecciona un módulo de análisis especializado' : 'Cambia el periodo y los datos se actualizan solos'}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', background: '#0f172a', padding: '0.4rem', borderRadius: '12px', border: '1px solid #334155', gap: '0.4rem' }}>
                            <input 
                                type="date" 
                                value={dateRange.start} 
                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                style={{ fontSize: '0.8rem', color: '#e2e8f0', background: '#1e293b', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '8px' }}
                            />
                            <span style={{ color: '#64748b', alignSelf: 'center', fontSize: '0.8rem' }}>a</span>
                            <input 
                                type="date" 
                                value={dateRange.end} 
                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                style={{ fontSize: '0.8rem', color: '#e2e8f0', background: '#1e293b', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '8px' }}
                            />
                        </div>

                        {activeModule !== 'hub' && loading && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', height: '38px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 700 }}>
                                <span className="loading-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                                Actualizando...
                            </div>
                        )}
                    </div>
                </header>

                <div style={{ padding: '2rem' }}>
                    <AnimatePresence mode="wait">
                        {activeModule === 'hub' ? (
                            <motion.div 
                                key="hub"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
                            >
                                {hubModules.map((module) => (
                                    <motion.div
                                        key={module.id}
                                        whileHover={{ y: -8, scale: 1.02 }}
                                        onClick={() => setActiveModule(module.id as ReportModule)}
                                        style={{ 
                                            background: '#0f172a', 
                                            padding: '2rem', 
                                            borderRadius: '24px', 
                                            border: '1px solid #1e293b', 
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            textAlign: 'center',
                                            gap: '1.25rem',
                                            transition: 'border-color 0.2s'
                                        }}
                                        className="report-card"
                                    >
                                        <div style={{ 
                                            width: '54px', 
                                            height: '54px', 
                                            borderRadius: '16px', 
                                            background: `${module.color}15`, 
                                            color: module.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: `0 10px 30px -10px ${module.color}30`
                                        }}>
                                            {module.icon}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>{module.title}</h3>
                                            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>{module.desc}</p>
                                        </div>
                                        <div style={{ marginTop: '0.5rem', color: module.color, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                                            Ingresar <ChevronRight size={14} />
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <motion.div
                                key={activeModule}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {loading ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1rem' }}>
                                        <div className="loading-spinner"></div>
                                        <p style={{ color: '#64748b' }}>Generando análisis especializado...</p>
                                    </div>
                                ) : (
                                    <>
                                         {activeModule === 'clients' && <ClientReport data={data} formatCurrency={formatCurrency} clientSort={clientSort} setClientSort={setClientSort} filterNoDebt={filterNoDebt} setFilterNoDebt={setFilterNoDebt} />}
                                        {activeModule === 'products' && <ProductReport data={data} formatCurrency={formatCurrency} />}
                                        {activeModule === 'users' && <UserReport data={data} formatCurrency={formatCurrency} />}
                                        {activeModule === 'financial' && <FinancialReport data={data} formatCurrency={formatCurrency} />}
                                        {activeModule === 'branches' && <BranchReport data={data} formatCurrency={formatCurrency} />}
                                        {activeModule === 'deliveries' && <DeliveryReport data={data} formatCurrency={formatCurrency} dateRange={dateRange} branchId={branchId} />}
                                    </>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

// --- Sub-Report Components ---

const ClientReport: React.FC<{ data: any, formatCurrency: any, clientSort: any, setClientSort: any, filterNoDebt: boolean, setFilterNoDebt: any }> = ({ data, formatCurrency, clientSort, setClientSort, filterNoDebt, setFilterNoDebt }) => {
    const sortedClients = data?.topClients?.filter((c: any) => {
        if (filterNoDebt) return c.totalCurrentDebt <= 0;
        return true;
    }).sort((a: any, b: any) => {
        return clientSort === 'consumption' ? b.consumption - a.consumption : b.visits - a.visits;
    }) || [];

    return (
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={24} color="#3b82f6" /> Ranking de Clientes Elite
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Analizando consumo y frecuencia del periodo seleccionado.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: filterNoDebt ? '#10b98120' : '#1e293b', padding: '0.5rem 1rem', borderRadius: '12px', border: `1px solid ${filterNoDebt ? '#10b981' : '#334155'}`, transition: 'all 0.2s' }}>
                        <input
                            type="checkbox"
                            checked={filterNoDebt}
                            onChange={(e) => setFilterNoDebt(e.target.checked)}
                            style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: filterNoDebt ? '#10b981' : '#94a3b8', fontWeight: 600 }}>Solo sin Deuda</span>
                    </label>
                    <div style={{ display: 'flex', background: '#1e293b', padding: '0.25rem', borderRadius: '12px', gap: '0.25rem' }}>
                        <button 
                            onClick={() => setClientSort('consumption')}
                            style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', background: clientSort === 'consumption' ? '#3b82f6' : 'transparent', color: 'white', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                        >
                            Consumo
                        </button>
                        <button 
                            onClick={() => setClientSort('visits')}
                            style={{ padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', background: clientSort === 'visits' ? '#3b82f6' : 'transparent', color: 'white', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
                        >
                            Visitas
                        </button>
                    </div>
                </div>
            </div>
            
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                            <th style={{ padding: '1.25rem 2rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ranking / Cliente</th>
                            <th style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Visitas</th>
                            <th style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Consumo Periodo</th>
                            <th style={{ padding: '1.25rem 2rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Deuda Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedClients.map((client: any, idx: number) => (
                            <tr key={client.id} style={{ borderBottom: '1px solid #1e293b60', transition: 'background 0.2s' }} className="hover-row">
                                <td style={{ padding: '1.25rem 2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ 
                                        width: '32px', height: '32px', borderRadius: '10px', 
                                        background: idx === 0 ? 'linear-gradient(45deg, #f59e0b, #fbbf24)' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#1e293b', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'white', fontWeight: 800,
                                        boxShadow: idx < 3 ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                                    }}>
                                        {idx + 1}
                                    </div>
                                    {client.name}
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'center' }}>
                                    <span style={{ padding: '0.4rem 1rem', borderRadius: '20px', background: '#3b82f615', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 700 }}>
                                        {client.visits} <span style={{ fontSize: '0.75rem', fontWeight: 400, opacity: 0.8 }}>visitas</span>
                                    </span>
                                </td>
                                <td style={{ padding: '1.25rem', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>
                                    {formatCurrency(client.consumption)}
                                </td>
                                <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                        <span style={{ fontWeight: 700, color: client.totalCurrentDebt > 0 ? '#ef4444' : '#64748b', fontSize: '1rem' }}>
                                            {formatCurrency(client.totalCurrentDebt)}
                                        </span>
                                        {client.totalCurrentDebt > 0 && <span style={{ fontSize: '0.65rem', color: '#ef4444', textTransform: 'uppercase', fontWeight: 800 }}>Deuda Pendiente</span>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sortedClients.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: '5rem', textAlign: 'center', color: '#475569' }}>Sin datos significativos en este periodo.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ProductReport: React.FC<{ data: any, formatCurrency: any }> = ({ data, formatCurrency }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Package size={24} color="#f59e0b" /> Listado de Popularidad
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {data?.topProducts?.map((p: any, idx: number) => {
                    const maxQty = data.topProducts[0]?.quantity || 1;
                    const widthPercent = (p.quantity / maxQty) * 100;
                    
                    return (
                        <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', width: '20px' }}>#{idx + 1}</span>
                                    <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{p.name}</span>
                                </div>
                                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{p.quantity} unidades vendidas</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '20px', overflow: 'hidden' }}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${widthPercent}%` }}
                                    style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', borderRadius: '20px' }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '2rem' }}>
                <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 700, marginBottom: '1rem' }}>Recaudación por Producto</h3>
                {data?.topProducts?.slice(0, 5).map((p: any, idx: number) => (
                    <div key={idx} style={{ padding: '0.75rem 0', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{p.name}</span>
                        <span style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.revenue)}</span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const FinancialReport: React.FC<{ data: any, formatCurrency: any }> = ({ data, formatCurrency }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        <SummaryCard 
            title="Ingresos Totales" 
            value={formatCurrency(data?.summary?.totalSales || 0)} 
            subtitle="Ventas brutas del periodo"
            icon={<TrendingUp size={28} color="#10b981" />}
            color="#10b981"
        />
        <SummaryCard 
            title="Gastos Registrados" 
            value={formatCurrency(data?.summary?.totalExpenses || 0)} 
            subtitle="Operativos y variados"
            icon={<TrendingDown size={28} color="#ef4444" />}
            color="#ef4444"
        />
        <SummaryCard 
            title="Utilidad Neta" 
            value={formatCurrency(data?.summary?.netAmount || 0)} 
            subtitle="Rendimiento neto"
            icon={<BarChart3 size={28} color="#3b82f6" />}
            color="#3b82f6"
        />
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '2rem', gridColumn: 'span 3' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Wallet size={20} color="#10b981" /> Distribución de Medios de Pago
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                {data?.paymentMethods && Object.entries(data.paymentMethods).map(([method, amount]: any) => (
                    <div key={method} style={{ padding: '1.5rem', background: '#1e293b50', borderRadius: '20px', border: '1px solid #1e293b' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700 }}>{method}</p>
                        <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, marginTop: '0.5rem' }}>{formatCurrency(amount)}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const UserReport: React.FC<{ data: any, formatCurrency: any }> = ({ data, formatCurrency }) => {
    const users = Array.isArray(data?.salesByUser) ? data.salesByUser : [];
    
    const getInitials = (user: any) => {
        const name = String(user?.name || '');
        if (!name) return '?';
        return name.trim().charAt(0).toUpperCase();
    };

    const getUserName = (user: any) => String(user?.name || 'Sin Nombre');
    const getUserRole = (user: any) => String(user?.role || '-');

    return (
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '2rem', borderBottom: '1px solid #1e293b' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Award size={24} color="#ef4444" /> Ventas por Vendedor
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Monto total recaudado y cantidad de facturas emitidas por el personal.</p>
            </div>
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {users.map((user: any, idx: number) => (
                        <motion.div 
                            key={`user-card-${user.id || idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            style={{ background: '#1e293b50', padding: '1.5rem', borderRadius: '20px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '1.25rem' }}
                        >
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#ef444420', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
                                {getInitials(user)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h4 style={{ color: 'white', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getUserName(user)}</h4>
                                <p style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase' }}>{getUserRole(user)}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                                    <div>
                                        <p style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Ventas</p>
                                        <p style={{ color: 'white', fontWeight: 700 }}>{Number(user.count) || 0}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Total</p>
                                        <p style={{ color: '#10b981', fontWeight: 800 }}>{formatCurrency(user.total)}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {users.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#475569' }}>
                            No hay datos de ventas por vendedor en este periodo.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const BranchReport: React.FC<{ data: any, formatCurrency: any }> = ({ data, formatCurrency }) => {
    const branches = Array.isArray(data?.branchPerformance) ? data.branchPerformance : [];

    return (
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Building2 size={24} color="#8b5cf6" /> Desempeño por Sucursal
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {branches.map((branch: any, idx: number) => (
                    <motion.div 
                        key={`branch-card-${branch.id || idx}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        style={{ background: '#1e293b50', padding: '2rem', borderRadius: '24px', border: '1px solid #1e293b' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#8b5cf620', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={20} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 800 }}>{Number(branch.count) || 0} ventas</span>
                        </div>
                        <h3 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{String(branch.name || 'Sucursal Desconocida')}</h3>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem' }}>Ingresos generados en este periodo</p>
                        <div style={{ paddingTop: '1rem', borderTop: '1px solid #1e293b' }}>
                            <p style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 800 }}>{formatCurrency(branch.total)}</p>
                        </div>
                    </motion.div>
                ))}
                {branches.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: 'span 3', padding: '4rem', textAlign: 'center' }}>
                        <PieChart size={48} color="#1e293b" style={{ marginBottom: '1rem' }} />
                        <p style={{ color: '#64748b' }}>No hay datos suficientes para comparar sucursales.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const STATUS_INFO: Record<string, { label: string; color: string; bg: string }> = {
    VENDIDO: { label: 'Pendiente', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
    DESPACHADO: { label: 'Despachado', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
    ENTREGADO: { label: 'Entregado', color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
};

const DeliveryReport: React.FC<{ data: any, formatCurrency: any, dateRange: any, branchId: any }> = ({ data, formatCurrency, dateRange, branchId }) => {
    const deliveries = Array.isArray(data?.salesByDelivery) ? data.salesByDelivery : [];

    const [modalDelivery, setModalDelivery] = useState<any>(null);
    const [detailData, setDetailData] = useState<any[]>([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const openDetail = async (delivery: any) => {
        setModalDelivery(delivery);
        setLoadingDetail(true);
        setDetailData([]);
        try {
            const res = await statsApi.getDeliveryDetail({
                startDate: dateRange.start,
                endDate: dateRange.end,
                branchId,
                deliveryId: delivery.id
            });
            setDetailData(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDetail(false);
        }
    };

    const totalShipments = deliveries.reduce((acc: number, d: any) => acc + (Number(d.count) || 0), 0);
    const totalRevenue = deliveries.reduce((acc: number, d: any) => acc + (Number(d.total) || 0), 0);
    const totalShippingCost = deliveries.reduce((acc: number, d: any) => acc + (Number(d.shippingTotal) || 0), 0);
    const totalPendientes = deliveries.reduce((acc: number, d: any) => acc + (Number(d.pendientes) || 0), 0);
    const totalDespachados = deliveries.reduce((acc: number, d: any) => acc + (Number(d.despachados) || 0), 0);
    const totalEntregados = deliveries.reduce((acc: number, d: any) => acc + (Number(d.entregados) || 0), 0);
    const maxCount = Math.max(...deliveries.map((d: any) => Number(d.count) || 0), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.25rem 1.5rem', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#06b6d420', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Truck size={18} /></div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Envíos Totales</span>
                    </div>
                    <p style={{ color: 'white', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{totalShipments}</p>
                </div>
                <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.25rem 1.5rem', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#10b98120', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={18} /></div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Recaudado</span>
                    </div>
                    <p style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{formatCurrency(totalRevenue)}</p>
                </div>
                <div style={{ background: '#0f172a', borderRadius: '20px', padding: '1.25rem 1.5rem', border: '1px solid #1e293b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f59e0b20', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={18} /></div>
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>Costo Envíos</span>
                    </div>
                    <p style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>{formatCurrency(totalShippingCost)}</p>
                </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Truck size={24} color="#06b6d4" /> Envíos por Encomendista
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.25rem' }}>Pedidos asignados a cada delivery en el periodo seleccionado. Tocá una fila para ver el detalle de envíos.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700 }}>{totalPendientes} Pendientes</span>
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 700 }}>{totalDespachados} Despachados</span>
                        <span style={{ padding: '0.35rem 0.75rem', borderRadius: '8px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>{totalEntregados} Entregados</span>
                    </div>
                </div>

                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#0f172a', zIndex: 10 }}>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                                <th style={{ padding: '1rem 2rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Encomendista</th>
                                <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Envíos</th>
                                <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Estados</th>
                                <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Costo Envío</th>
                                <th style={{ padding: '1rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'right' }}>Total Vendido</th>
                                <th style={{ padding: '1rem 2rem', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', textAlign: 'center' }}>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deliveries.map((d: any, idx: number) => (
                                <motion.tr
                                    key={`delivery-${d.id || idx}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    style={{ borderBottom: '1px solid #1e293b60', transition: 'background 0.2s' }}
                                    className="hover-row"
                                >
                                    <td style={{ padding: '1.1rem 2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#06b6d420', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Truck size={18} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: 'white' }}>{d.name}</span>
                                            {d.phone && <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{d.phone}</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                                            <span style={{ padding: '0.35rem 0.9rem', borderRadius: '20px', background: '#06b6d415', color: '#22d3ee', fontSize: '0.9rem', fontWeight: 700 }}>{d.count}</span>
                                            <div style={{ width: '100px', height: '5px', background: '#1e293b', borderRadius: '20px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(d.count / maxCount) * 100}%`, background: 'linear-gradient(90deg, #06b6d4, #22d3ee)', borderRadius: '20px' }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                            {d.pendientes > 0 && <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: 700 }}>{d.pendientes} P</span>}
                                            {d.despachados > 0 && <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>{d.despachados} D</span>}
                                            {d.entregados > 0 && <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: '0.7rem', fontWeight: 700 }}>{d.entregados} E</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>
                                        {formatCurrency(d.shippingTotal)}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', color: '#10b981', fontWeight: 800, fontSize: '1.05rem' }}>
                                        {formatCurrency(d.total)}
                                    </td>
                                    <td style={{ padding: '1rem 2rem', textAlign: 'center' }}>
                                        <button
                                            onClick={() => openDetail(d)}
                                            style={{ padding: '0.4rem 0.9rem', borderRadius: '8px', background: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s' }}
                                        >
                                            <ChevronRight size={12} /> Ver {d.count}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                            {deliveries.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#475569' }}>
                                    <Truck size={40} color="#1e293b" style={{ marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                    No hay envíos asignados a encomendistas en este periodo.
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {modalDelivery && (
                    <div className="modal-overlay" style={{ zIndex: 5000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setModalDelivery(null)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            style={{ background: '#0f172a', borderRadius: '20px', width: 'min(820px, 95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: '1px solid #1e293b', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}
                        >
                            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#06b6d420', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Truck size={22} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.15rem', fontWeight: 800 }}>{modalDelivery.name}</h3>
                                        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.78rem' }}>
                                            {modalDelivery.phone ? `${modalDelivery.phone} · ` : ''}{detailData.length} envío(s) en el periodo
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setModalDelivery(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}><X size={22} /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 2rem' }}>
                                {loadingDetail ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', gap: '1rem' }}>
                                        <div className="loading-spinner"></div>
                                        <p style={{ color: '#64748b' }}>Cargando envíos...</p>
                                    </div>
                                ) : detailData.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>No se encontraron envíos.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {detailData.map((s: any) => {
                                            const st = STATUS_INFO[s.fulfillmentStatus] || { label: s.fulfillmentStatus, color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' };
                                            return (
                                                <div key={s.id} style={{ background: '#1e293b', borderRadius: '14px', border: '1px solid #334155', overflow: 'hidden' }}>
                                                    <div style={{ padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', borderBottom: '1px solid #33415540' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>#{s.id}</span>
                                                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: st.bg, color: st.color, fontSize: '0.7rem', fontWeight: 700 }}>{st.label}</span>
                                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                                {new Date(s.createdAt).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>{formatCurrency(s.total)}</span>
                                                            {s.shipping > 0 && <span style={{ display: 'block', fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Envío: {formatCurrency(s.shipping)}</span>}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '0.75rem 1.1rem' }}>
                                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                            <span><strong style={{ color: '#e2e8f0' }}>{s.clientName}</strong>{s.clientPhone ? ` · ${s.clientPhone}` : ''}</span>
                                                            {s.clientAddress && <span style={{ color: '#64748b' }}>{s.clientAddress}</span>}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                            {s.items.map((it: any, i: number) => (
                                                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                                                    <span>{it.quantity}× {it.productName}</span>
                                                                    <span style={{ fontWeight: 600 }}>{formatCurrency(it.subtotal)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #334155', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                                                            <span>Pago: {s.paymentMethod} · Vendedor: {s.sellerName}</span>
                                                            {s.shippingDate && <span>Envío: {new Date(s.shippingDate).toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit' })}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SummaryCard: React.FC<{ title: string; value: string; subtitle: string; icon: React.ReactNode; color: string }> = ({ title, value, subtitle, icon, color }) => (
    <motion.div 
        style={{ 
            background: '#0f172a', 
            borderRadius: '24px', 
            padding: '2rem', 
            border: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {icon}
            </div>
            <div style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: '#1e293b', color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>
                PERIODO
            </div>
        </div>
        <div>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>{title}</p>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0.25rem 0' }}>{value}</h2>
            <p style={{ color: '#475569', fontSize: '0.8rem' }}>{subtitle}</p>
        </div>
    </motion.div>
);

export default Reports;
