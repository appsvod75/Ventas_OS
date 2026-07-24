import React, { useState, useEffect } from 'react';
import { Archive, TrendingDown, TrendingUp, DollarSign, Calendar, Zap, AlertTriangle, X, Eye, Filter, Search, Receipt, ArrowRight, Loader2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { closingApi, CashClosing, ClosingMovement } from '../services/closing.service';
import { branchApi } from '../services/api';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const CashClosings: React.FC = () => {
    const [closings, setClosings] = useState<CashClosing[]>([]);
    const [initialBalance, setInitialBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isForceLoading, setIsForceLoading] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    // Filters
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    // Modals
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
    const [closingDetails, setClosingDetails] = useState<ClosingMovement[]>([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        fetchBranches();
    }, []);

    useEffect(() => {
        fetchClosings();
    }, [page, selectedBranch, startDate, endDate]);

    const fetchBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
        } catch (error) {
            console.error('Error fetching branches', error);
        }
    };

    const fetchClosings = async () => {
        try {
            setIsLoading(true);
            const res = await closingApi.getClosings({ 
                page, 
                limit, 
                branchId: selectedBranch || undefined,
                startDate,
                endDate
            });
            setClosings(res.data.data);
            setInitialBalance(Number(res.data.initialBalance || 0));
            setTotalPages(res.data.pagination.totalPages);
            return res.data.data;
        } catch (error) {
            toast.error('Error al cargar cortes de caja');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchClosingDetails = async (closing: CashClosing) => {
        try {
            setSelectedClosing(closing);
            setIsLoadingDetails(true);
            const res = await closingApi.getClosingDetails(
                format(new Date(closing.date), 'yyyy-MM-dd'), 
                closing.branchId
            );
            setClosingDetails(res.data);
        } catch (error) {
            toast.error('Error al cargar detalles del cierre');
            console.error(error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const executeForceClosing = async (date?: string) => {
        try {
            if (!date) setIsConfirmModalOpen(false);
            setIsForceLoading(true);
            await closingApi.forceClosing(date);
            toast.success(`Cierre recalculado exitosamente${date ? ' para ' + date : ''}`);
            
            // Re-fetch everything to ensure main table is updated
            const newData = await fetchClosings();
            
            if (date && selectedClosing && newData) {
                // Update selectedClosing with new summary values from the fetched list
                const updated = newData.find(c => 
                    format(new Date(c.date), 'yyyy-MM-dd') === date && 
                    c.branchId === selectedClosing.branchId
                );
                if (updated) {
                    setSelectedClosing(updated);
                    // Pass the NEW updated object directly to avoid stale closures
                    fetchClosingDetails(updated);
                } else {
                    fetchClosingDetails(selectedClosing);
                }
            }
        } catch (error) {
            toast.error('Error al recalcular el cierre');
            console.error(error);
        } finally {
            setIsForceLoading(false);
        }
    };

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    // Calculate running balances for the current view
    // Since records are DESC (newest first), we calculate from bottom up
    const closingsWithRunningBalance = [...closings].reverse().reduce((acc: any[], closing, idx) => {
        const prevBalance = idx === 0 ? initialBalance : acc[idx - 1].runningBalance;
        const currentBalance = prevBalance + Number(closing.netAmount || 0);
        acc.push({ ...closing, runningBalance: currentBalance });
        return acc;
    }, []).reverse();

    return (
        <div className="closings-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div>
                        <h1>Cierres de Caja Diarios</h1>
                        <p>Historial de auditoría y balances de sucursales</p>
                    </div>
                    <button onClick={() => executeForceClosing()} disabled={isForceLoading} className="btn-warning">
                        <Zap size={18} /> {isForceLoading ? 'Calculando...' : 'Forzar Cierre Hoy'}
                    </button>
                </header>

                <div className="controls-bar">
                    <div className="filters-group">
                        <div className="filter-item">
                            <label><Filter size={14} /> Sucursal</label>
                            <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setPage(1); }}>
                                <option value="">Todas las Sucursales</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label><Calendar size={14} /> Desde</label>
                            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} />
                        </div>
                        <div className="filter-item">
                            <label><Calendar size={14} /> Hasta</label>
                            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} />
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    {isLoading ? (
                        <div className="loading-state">Cargando historial de cortes...</div>
                    ) : closings.length === 0 ? (
                        <div className="empty-state">
                            <Archive size={48} className="empty-icon" />
                            <p>No se encontraron cortes de caja con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fecha Operación</th>
                                        <th>Sucursal</th>
                                        <th className="text-right">Ventas</th>
                                        <th className="text-right">Gastos</th>
                                        <th className="text-right">Neto Día</th>
                                        <th className="text-right">Saldo Acum.</th>
                                        <th className="text-center">Auditoría</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {closingsWithRunningBalance.map((closing) => {
                                        const isPositive = Number(closing.netAmount) >= 0;
                                        return (
                                            <tr key={closing.id}>
                                                <td>
                                                    <div className="flex items-center gap-2 font-bold text-slate-200">
                                                        <Calendar size={14} className="text-slate-500" />
                                                        {format(new Date(closing.date), "dd MMM yyyy", { locale: es })}
                                                    </div>
                                                </td>
                                                <td><span className="branch-tag">{closing.branch?.name || '---'}</span></td>
                                                <td className="text-right amounts text-emerald-400">
                                                    {formatCurrency(closing.totalSales)}
                                                </td>
                                                <td className="text-right amounts text-rose-400">
                                                    -{formatCurrency(closing.totalExpenses)}
                                                </td>
                                                <td className={`text-right font-bold amounts ${isPositive ? 'text-blue-400' : 'text-rose-400'}`}>
                                                    {formatCurrency(closing.netAmount)}
                                                </td>
                                                <td className="text-right font-black amounts text-slate-100 bg-slate-800/30">
                                                    {formatCurrency(closing.runningBalance)}
                                                </td>
                                                <td className="text-center">
                                                    <button className="action-view-btn" onClick={() => fetchClosingDetails(closing)}>
                                                        <Eye size={18} />
                                                        <span>Kardex</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
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

                {/* --- MODAL KARDEX DIARIO --- */}
                {selectedClosing && (
                    <div className="modal-overlay" onClick={() => setSelectedClosing(null)}>
                        <div className="modal-content large-kardex" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="kardex-header-left">
                                    <div className="kardex-icon-box">
                                        <Receipt size={22} />
                                    </div>
                                    <div>
                                        <h2>Auditoría Directa: {selectedClosing.branch?.name}</h2>
                                        <p className="kardex-subtitle">
                                            {format(new Date(selectedClosing.date), "EEEE dd 'de' MMMM, yyyy", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <div className="kardex-header-actions">
                                    <button 
                                        onClick={() => executeForceClosing(format(new Date(selectedClosing.date), 'yyyy-MM-dd'))} 
                                        disabled={isForceLoading} 
                                        className="btn-recalc-modern"
                                        title="Recalcular todos los cierres de este día"
                                    >
                                        {isForceLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                        <span>Recalcular Día</span>
                                    </button>
                                    <button onClick={() => setSelectedClosing(null)} className="kardex-close-btn">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="modal-body kardex-body">
                                {isLoadingDetails ? (
                                    <div className="loading-kardex">
                                        <Loader2 size={32} className="animate-spin text-blue-500" />
                                        <p>Reconstruyendo movimientos del día...</p>
                                    </div>
                                ) : closingDetails.length === 0 ? (
                                    <div className="empty-kardex">No hay movimientos registrados este día.</div>
                                ) : (
                                    <div className="kardex-list">
                                        <div className="kardex-summary-top">
                                            <div className="k-stat">
                                                <label>Ventas</label>
                                                <span className="text-emerald-400">{formatCurrency(selectedClosing.totalSales)}</span>
                                            </div>
                                            <div className="k-stat">
                                                <label>Gastos</label>
                                                <span className="text-rose-400">-{formatCurrency(selectedClosing.totalExpenses)}</span>
                                            </div>
                                            <div className="k-divider"></div>
                                            <div className="k-stat">
                                                <label>Neto Día</label>
                                                <span className={Number(selectedClosing.netAmount) >= 0 ? 'text-blue-400' : 'text-rose-400'}>
                                                    {formatCurrency(selectedClosing.netAmount)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="kardex-table-wrapper">
                                            <table className="kardex-table">
                                                <thead>
                                                    <tr>
                                                        <th>Hora</th>
                                                        <th>Tipo</th>
                                                        <th>Descripción / Concepto</th>
                                                        <th>Usuario</th>
                                                        <th className="text-right">Monto</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {closingDetails.map((mov, i) => (
                                                        <tr key={i} className={mov.type === 'SALE' ? 'mov-sale' : 'mov-expense'}>
                                                            <td className="time-col">{format(new Date(mov.time), 'hh:mm a')}</td>
                                                            <td>
                                                                <span className={`mov-badge ${mov.type}`}>
                                                                    {mov.type === 'SALE' ? 'VENTA' : 'GASTO'}
                                                                </span>
                                                            </td>
                                                            <td className="desc-col">{mov.description}</td>
                                                            <td className="user-col">
                                                                <div className="flex items-center gap-1">
                                                                    <User size={12} className="opacity-50" />
                                                                    {mov.user}
                                                                </div>
                                                            </td>
                                                            <td className={`text-right font-bold amounts ${mov.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {mov.amount >= 0 ? '+' : ''}{formatCurrency(mov.amount)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {isConfirmModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsConfirmModalOpen(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <div className="modal-title">
                                    <AlertTriangle size={24} className="text-amber-500" />
                                    <h2>Confirmar Cierre Forzado</h2>
                                </div>
                                <button onClick={() => setIsConfirmModalOpen(false)} className="close-btn">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="modal-body">
                                <p>¿Estás seguro que deseas <strong>forzar el cálculo</strong> de cierre de caja para el día de hoy?</p>
                                <p className="text-sm text-slate-400 mt-2">
                                    Esta acción calculará inmediatamente el balance neto usando las ventas y gastos registrados hasta este momento.
                                </p>
                            </div>

                            <div className="modal-actions">
                                <button onClick={() => setIsConfirmModalOpen(false)} className="btn-cancel">
                                    Cancelar
                                </button>
                                <button onClick={() => executeForceClosing()} className="btn-confirm-warning">
                                    Aceptar y Forzar Cierre
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .closings-page { display: flex; height: 100vh; background: #0f172a; color: white; overflow: hidden; }
                .dashboard-main { flex: 1; overflow-y: auto; padding: 1.5rem 3rem; display: flex; flex-direction: column; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-shrink: 0; }
                .dash-header h1 { font-size: 1.8rem; font-weight: 900; margin-bottom: 0.1rem; letter-spacing: -0.02em; }
                .dash-header p { color: #64748b; font-size: 0.9rem; }
                
                .controls-bar { 
                    background: #1e293b; 
                    padding: 1rem 1.5rem; 
                    border-radius: 12px; 
                    border: 1px solid #334155; 
                    margin-bottom: 1.5rem;
                    flex-shrink: 0;
                }
                .filters-group { display: flex; gap: 2rem; align-items: center; }
                .filter-item { display: flex; flex-direction: column; gap: 0.35rem; }
                .filter-item label { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.4rem; }
                .filter-item select, .filter-item input { 
                    background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; padding: 0.5rem 0.8rem; font-size: 0.85rem; outline: none; transition: all 0.2s;
                    color-scheme: dark;
                }
                .filter-item select:focus, .filter-item input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

                .btn-warning { display: flex; align-items: center; gap: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); padding: 0.6rem 1rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.8rem;}
                .btn-warning:hover:not(:disabled) { background: #3b82f6; color: white; }
                
                .btn-recalc {
                    display: flex; align-items: center; gap: 0.5rem; background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); padding: 0.4rem 0.8rem; border-radius: 8px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.75rem;
                }
                .btn-recalc:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; }
                .btn-recalc:disabled { opacity: 0.5; background: #1e293b; color: #475569; }

                .table-container { background: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; display: flex; flex-direction: column; flex: 1; min-height: 0; }
                .data-table { width: 100%; border-collapse: collapse; overflow: auto; }
                .data-table thead { position: sticky; top: 0; z-index: 10; background: #1e293b; }
                .data-table th, .data-table td { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid #334155; }
                .data-table th { background: rgba(15, 23, 42, 0.8); font-weight: 800; color: #64748b; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; }
                .data-table tr:hover { background: rgba(255,255,255,0.02); }
                
                .branch-tag { background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
                
                .action-view-btn { 
                    background: transparent; border: 1px solid #334155; color: #94a3b8; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; transition: all 0.2s; margin: 0 auto;
                }
                .action-view-btn:hover { background: #3b82f6; color: white; border-color: #3b82f6; }

                .amounts { font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
                .text-right { text-align: right !important; }
                .text-center { text-align: center !important; }
                .font-black { font-weight: 900; }

                /* MODAL KARDEX REDESIGN */
                .modal-overlay { 
                    position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); 
                    backdrop-filter: blur(8px); display: flex; align-items: center; 
                    justify-content: center; z-index: 100; animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                .large-kardex { 
                    max-width: 950px !important; width: 90% !important; 
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    border-radius: 20px; position: relative; overflow: hidden;
                    animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

                .modal-header { 
                    display: flex; justify-content: space-between; align-items: center; 
                    padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(255, 255, 255, 0.02);
                }
                .kardex-header-left { display: flex; align-items: center; gap: 1.25rem; }
                .kardex-icon-box { 
                    width: 44px; height: 44px; background: rgba(59, 130, 246, 0.15); 
                    color: #3b82f6; border-radius: 12px; display: flex; 
                    align-items: center; justify-content: center; border: 1px solid rgba(59, 130, 246, 0.2);
                }
                .kardex-header-left h2 { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; }
                .kardex-subtitle { font-size: 0.75rem; color: #64748b; margin-top: 0.1rem; text-transform: capitalize; }

                .kardex-header-actions { display: flex; align-items: center; gap: 1rem; }
                .btn-recalc-modern { 
                    background: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); 
                    padding: 0.55rem 1rem; border-radius: 10px; font-weight: 700; cursor: pointer; 
                    transition: all 0.2s; font-size: 0.75rem; display: flex; align-items: center; gap: 0.6rem;
                }
                .btn-recalc-modern:hover:not(:disabled) { background: #3b82f6; color: white; border-color: #3b82f6; transform: translateY(-1px); }
                .btn-recalc-modern:active { transform: translateY(0); }

                .kardex-close-btn { 
                    width: 36px; height: 36px; background: rgba(255, 255, 255, 0.05); 
                    border: none; color: #94a3b8; border-radius: 10px; cursor: pointer; 
                    display: flex; align-items: center; justify-content: center; 
                    transition: all 0.2s;
                }
                .kardex-close-btn:hover { background: #ef4444; color: white; }

                .kardex-body { padding: 2rem; }
                .kardex-summary-top { 
                    display: grid; grid-template-columns: repeat(3, 1fr) auto repeat(1, 1fr); 
                    gap: 2rem; background: rgba(15, 23, 42, 0.5); 
                    padding: 1.5rem 2rem; border-radius: 16px; margin-bottom: 2rem; 
                    border: 1px solid rgba(255, 255, 255, 0.05); align-items: center;
                }
                .kardex-summary-top { display: flex; justify-content: space-around; }
                .k-stat { display: flex; flex-direction: column; gap: 0.35rem; text-align: center; }
                .k-stat label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                .k-stat span { font-size: 1.4rem; font-weight: 900; font-family: 'JetBrains Mono', monospace; }
                .k-divider { width: 1px; height: 30px; background: rgba(255, 255, 255, 0.1); }

                .kardex-table-wrapper { 
                    height: 450px; overflow-y: auto; border: 1px solid rgba(255, 255, 255, 0.05); 
                    border-radius: 16px; background: rgba(2, 6, 23, 0.3);
                }
                .kardex-table { width: 100%; border-collapse: collapse; }
                .kardex-table th { 
                    position: sticky; top: 0; background: #1e293b; padding: 1rem; 
                    text-align: left; font-size: 0.65rem; font-weight: 800; color: #64748b; 
                    text-transform: uppercase; border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .kardex-table td { padding: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.02); font-size: 0.85rem; vertical-align: middle; }
                .kardex-table tr:hover { background: rgba(255, 255, 255, 0.015); }
                
                .mov-badge { font-size: 0.6rem; font-weight: 900; padding: 0.25rem 0.6rem; border-radius: 6px; display: inline-flex; }
                .mov-badge.SALE { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
                .mov-badge.EXPENSE { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .time-col { color: #64748b; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
                .desc-col { font-weight: 600; color: #e2e8f0; }
                .user-col { color: #94a3b8; font-weight: 500; font-size: 0.75rem; }

                .loading-kardex { height: 300px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; color: #64748b; }

                .pagination { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: rgba(15, 23, 42, 0.3); border-top: 1px solid #334155; margin-top: auto; }
                
                @media (max-width: 1024px) {
                    .dashboard-main { padding: 1.5rem; }
                    .filters-group { gap: 1rem; }
                    .kardex-summary-top { gap: 1.5rem; padding: 1rem; flex-wrap: wrap; }
                }
            `}</style>
        </div>
    );
};

export default CashClosings;
