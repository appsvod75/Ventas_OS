import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, Activity, Tags, Truck, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { closingApi, PeriodSummary } from '../services/closing.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const DailySummary: React.FC = () => {
    const [summary, setSummary] = useState<PeriodSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
        const interval = setInterval(fetchSummary, 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const fetchSummary = async () => {
        try {
            setIsLoading(true);
            const res = await closingApi.getPeriodSummary();
            setSummary(res.data);
        } catch (error) {
            toast.error('Error al cargar el resumen del periodo');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    const isWeekly = summary?.closingType === 'periodic';

    return (
        <div className="daily-summary-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div>
                        <h1>Resumen {isWeekly ? 'de la Semana' : 'del Día'} (En Vivo)</h1>
                        <p>
                            {summary?.periodLabel
                                ? `Periodo: ${summary.periodLabel} · Transacciones en tiempo real`
                                : 'Visualización de transacciones desde el inicio del periodo hasta ahora.'}
                        </p>
                    </div>
                    <div className="time-badge">
                        <Clock size={16} />
                        Actualizado: {format(new Date(), "hh:mm a", { locale: es })}
                    </div>
                </header>

                {isLoading && !summary ? (
                    <div className="loading-state">Calculando totales del periodo...</div>
                ) : summary ? (
                    <>
                        <div className="summary-grid">
                            <div className="stat-card sales">
                                <div className="icon-wrapper"><TrendingUp size={28} /></div>
                                <div className="stat-info">
                                    <h3>Ventas Brutas (Sin Desc.)</h3>
                                    <p className="amount text-emerald-400">{formatCurrency(summary.grossSales)}</p>
                                    <span className="stat-meta">{summary.salesCount} {summary.salesCount === 1 ? 'venta' : 'ventas'}</span>
                                </div>
                            </div>

                            <div className="stat-card expenses">
                                <div className="icon-wrapper"><TrendingDown size={28} /></div>
                                <div className="stat-info">
                                    <h3>Gastos del Periodo</h3>
                                    <p className="amount text-rose-400">-{formatCurrency(summary.totalExpenses)}</p>
                                </div>
                            </div>

                            {summary.totalShipping > 0 && (
                            <div className="stat-card" style={{ background: '#1e293b', padding: '2rem', borderRadius: '20px', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="icon-wrapper" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}><Truck size={28} /></div>
                                <div className="stat-info">
                                    <h3>Envíos del Periodo</h3>
                                    <p className="amount text-indigo-400">{formatCurrency(summary.totalShipping)}</p>
                                </div>
                            </div>
                            )}

                            <div className="stat-card net-sales">
                                <div className="icon-wrapper"><DollarSign size={28} /></div>
                                <div className="stat-info">
                                    <h3>Neto {isWeekly ? 'de la Semana' : 'del Día'}</h3>
                                    <p className={`amount ${summary.netAmount >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrency(summary.netAmount)}</p>
                                </div>
                            </div>
                        </div>

                        {summary.totalDiscounts > 0 && (
                            <div style={{ marginBottom: '2rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#fbbf24', fontSize: '0.85rem', fontWeight: 600 }}>
                                <Tags size={16} /> Descuentos aplicados en el periodo: <strong>{formatCurrency(summary.totalDiscounts)}</strong>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">No se pudo cargar la información del periodo.</div>
                )}

                <div className="info-banner">
                    <Activity size={24} className="text-blue-400" />
                    <div>
                        <h4>Este cálculo es en tiempo real</h4>
                        <p>
                            Los datos mostrados aquí no se guardan permanentemente como "Corte de Caja" hasta que se ejecute el Cierre Automático
                            {isWeekly ? ' semanal' : ' nocturno'} o se presione "Forzar Cierre" en el Panel de Administrador.
                            {isWeekly && ' El rango cubre desde la apertura del periodo (Lunes) hasta este momento.'}
                        </p>
                    </div>
                </div>

            </main>

            <style>{`
                .daily-summary-page { display: flex; height: 100vh; background: #0f172a; color: white; overflow: hidden; }
                .dashboard-main { flex: 1; overflow-y: auto; padding: 2.5rem 4rem; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
                .dash-header h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.25rem; }
                .dash-header p { color: #94a3b8; font-size: 1.05rem; }
                .time-badge { display: flex; align-items: center; gap: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 0.5rem 1rem; border-radius: 999px; font-weight: 600; font-size: 0.9rem; border: 1px solid rgba(59, 130, 246, 0.2); }
                
                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
                
                @media (max-width: 1400px) {
                    .summary-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
                    .dashboard-main { padding: 1.5rem 2rem; }
                    .amount { font-size: 1.8rem; }
                }
                
                @media (max-width: 768px) {
                    .summary-grid { grid-template-columns: 1fr; }
                    .stat-card { padding: 1.5rem; }
                }
                
                .stat-card {
                    background: #1e293b;
                    padding: 2rem;
                    border-radius: 20px;
                    border: 1px solid #334155;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
                
                .icon-wrapper {
                    width: 65px; height: 65px;
                    border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                }
                .sales .icon-wrapper { background: rgba(52, 211, 153, 0.1); color: #34d399; }
                .expenses .icon-wrapper { background: rgba(244, 63, 94, 0.1); color: #f43f5e; }
                .net-sales .icon-wrapper { background: rgba(59, 130, 246, 0.1); color: #60a5fa; }
                
                .stat-info h3 { font-size: 0.95rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
                .stat-info .stat-meta { font-size: 0.75rem; color: #64748b; font-weight: 600; }
                .amount { font-size: 2.4rem; font-weight: 900; line-height: 1; letter-spacing: -0.02em; }
                
                .info-banner {
                    display: flex; gap: 1.25rem; align-items: flex-start;
                    background: rgba(59, 130, 246, 0.05);
                    border: 1px solid rgba(59, 130, 246, 0.15);
                    padding: 1.5rem 2rem;
                    border-radius: 16px;
                }
                .info-banner h4 { color: #60a5fa; margin-bottom: 0.25rem; font-size: 1.1rem; }
                .info-banner p { color: #94a3b8; line-height: 1.5; font-size: 0.95rem; }
                
                .loading-state, .empty-state { padding: 4rem; text-align: center; color: #94a3b8; font-size: 1.1rem; }
            `}</style>
        </div>
    );
};

export default DailySummary;
