import React, { useState, useEffect } from 'react';
import { Archive, TrendingDown, TrendingUp, DollarSign, Calendar, Zap, AlertTriangle, X, Eye, Filter, Search, Receipt, ArrowRight, Loader2, User, Lock, Wallet, ShieldCheck, Activity, RefreshCw, CheckCircle2, Clock, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { closingApi, PeriodClosing, ClosingDetails, ClosingMovement, PeriodSummary } from '../services/closing.service';
import { branchApi, openingApi, adminAuthApi } from '../services/api';
import { format, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const METHOD_STYLES: Record<string, { label: string; shortLabel: string; icon: string; cls: string }> = {
    EFECTIVO: { label: 'Efectivo', shortLabel: 'EFE', icon: '💵', cls: 'cash' },
    TARJETA: { label: 'Tarjeta', shortLabel: 'TAR', icon: '💳', cls: 'card' },
    TRANSFERENCIA: { label: 'Transferencia', shortLabel: 'TRF', icon: '🏦', cls: 'transfer' },
    CREDITO: { label: 'Crédito', shortLabel: 'CRÉ', icon: '📋', cls: 'credit' },
    'EFECTIVO+CREDITO': { label: 'Efectivo + Crédito', shortLabel: 'EFE+CRÉ', icon: '💵📋', cls: 'mixed' },
    OTRO: { label: 'Otro', shortLabel: 'OTR', icon: '•', cls: 'other' }
};

const CashClosings: React.FC = () => {
    const [closings, setClosings] = useState<PeriodClosing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isForceLoading, setIsForceLoading] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);

    // Filters
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showShipping, setShowShipping] = useState(false);

    // Modals
    const [selectedClosing, setSelectedClosing] = useState<PeriodClosing | null>(null);
    const [closingDetails, setClosingDetails] = useState<ClosingDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [cashCounted, setCashCounted] = useState<string>('');

    // Apertura Modal
    const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
    const [openingAmount, setOpeningAmount] = useState<string>('');
    const [openingDate, setOpeningDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [openingBranchId, setOpeningBranchId] = useState<string>('');
    const [currentOpening, setCurrentOpening] = useState<any>(null);
    const [loadingOpening, setLoadingOpening] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [pendingSubmit, setPendingSubmit] = useState<(() => Promise<void>) | null>(null);
    const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);

    useEffect(() => {
        fetchBranches();
        fetchPeriodSummary();
        const t = setInterval(fetchPeriodSummary, 60 * 1000);
        return () => clearInterval(t);
    }, [selectedBranch]);

    useEffect(() => {
        fetchPeriods();
    }, [selectedBranch, startDate, endDate]);

    const fetchBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
        } catch (error) {
            console.error('Error fetching branches', error);
        }
    };

    const fetchPeriods = async () => {
        try {
            setIsLoading(true);
            const res = await closingApi.getPeriodClosings({
                branchId: selectedBranch || undefined,
                startDate,
                endDate
            });
            setClosings(res.data.data);
            return res.data.data;
        } catch (error) {
            toast.error('Error al cargar cortes por período');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPeriodSummary = async () => {
        try {
            const res = await closingApi.getPeriodSummary(selectedBranch ? Number(selectedBranch) : undefined);
            setPeriodSummary(res.data);
        } catch (e) {
            console.error('Error fetching period summary', e);
        }
    };

    const fetchClosingDetails = async (closing: PeriodClosing) => {
        try {
            setSelectedClosing(closing);
            setIsLoadingDetails(true);
            setCashCounted('');
            const res = await closingApi.getClosingDetails(
                format(new Date(closing.periodStart), 'yyyy-MM-dd'),
                closing.branchId,
                format(new Date(closing.periodEnd), 'yyyy-MM-dd')
            );
            setClosingDetails(res.data);
            if (res.data.cashSummary) {
                setCashCounted(res.data.cashSummary.cashExpected.toFixed(2));
            }
        } catch (error) {
            toast.error('Error al cargar detalles del cierre');
            console.error(error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const executeForceClosing = async () => {
        try {
            setIsForceLoading(true);
            await closingApi.forceClosing();
            toast.success('Período recalculado exitosamente');

            // Re-fetch everything to ensure the table is updated
            const newData = await fetchPeriods();

            if (selectedClosing && newData) {
                const updated = newData.find(c => c.id === selectedClosing.id);
                if (updated) {
                    setSelectedClosing(updated);
                    fetchClosingDetails(updated);
                } else {
                    fetchClosingDetails(selectedClosing);
                }
            }
        } catch (error) {
            toast.error('Error al recalcular el período');
            console.error(error);
        } finally {
            setIsForceLoading(false);
        }
    };

    const openOpeningModal = async () => {
        try {
            const targetBranch = selectedBranch || (branches[0]?.id.toString() || '');
            setOpeningBranchId(targetBranch);
            setOpeningAmount('');
            setOpeningDate(format(new Date(), 'yyyy-MM-dd'));
            setCurrentOpening(null);
            setIsOpeningModalOpen(true);

            if (targetBranch) {
                const lastRes = await openingApi.getLastOpening(Number(targetBranch));
                if (lastRes.data) {
                    setCurrentOpening(lastRes.data);
                    setOpeningAmount(String(lastRes.data.amount || ''));
                    setOpeningDate(format(new Date(lastRes.data.date), 'yyyy-MM-dd'));
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpeningSubmit = async () => {
        const amt = parseFloat(openingAmount);
        if (isNaN(amt) || amt < 0) return toast.error('Monto inválido');
        if (!openingDate) return toast.error('Fecha requerida');
        if (!openingBranchId) return toast.error('Sucursal requerida');

        const day = new Date(openingDate + 'T00:00:00').getDay();
        const isMonday = day === 1;
        if (!isMonday) {
            const dateLabel = format(new Date(openingDate + 'T00:00:00'), "EEEE dd/MM/yyyy", { locale: es });
            const toastId = toast((t) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fbbf24', fontWeight: 700, fontSize: '0.95rem' }}>
                        <AlertTriangle size={20} /> No es Lunes
                    </div>
                    <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                        La fecha <strong>{dateLabel}</strong> no es Lunes. ¿Desea proceder de todas formas?
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => { toast.dismiss(t.id); proceedToPin(amt); }}
                            style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Proceder
                        </button>
                    </div>
                </div>
            ), { duration: 15000, style: { background: '#1e293b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '1rem', maxWidth: '360px' } });
            return;
        }
        proceedToPin(amt);
    };

    const proceedToPin = (amt: number) => {
        setPinInput('');
        setPinError('');
        setPendingSubmit(() => async () => {
            setLoadingOpening(true);
            try {
                if (currentOpening) {
                    await openingApi.updateOpening(currentOpening.id, {
                        amount: amt,
                        date: openingDate,
                        branchId: Number(openingBranchId)
                    });
                    toast.success('Apertura actualizada');
                } else {
                    await openingApi.createOpening({
                        amount: amt,
                        date: openingDate,
                        branchId: Number(openingBranchId)
                    });
                    toast.success('Apertura creada');
                }
                setIsPinModalOpen(false);
                setIsOpeningModalOpen(false);
                fetchPeriods();
            } catch (e: any) {
                toast.error(e.response?.data?.message || 'Error al guardar apertura');
            } finally {
                setLoadingOpening(false);
            }
        });
        setIsPinModalOpen(true);
    };

    const validatePinAndSubmit = async () => {
        setPinError('');
        try {
            await adminAuthApi.verifyPin(pinInput);
            if (pendingSubmit) await pendingSubmit();
        } catch (e: any) {
            setPinError('PIN incorrecto');
        }
    };

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    return (
        <div className="closings-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div>
                        <h1>{periodSummary?.closingType === 'periodic' ? 'Cortes de Caja (Semanal)' : 'Cortes de Caja Diarios'}</h1>
                        <p>
                            {periodSummary?.periodLabel && periodSummary.periodLabel !== 'Hoy'
                                ? `Periodo en vivo: ${periodSummary.periodLabel} · ${periodSummary.salesCount} ventas acumuladas`
                                : 'Historial de auditoría y balances de sucursales'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                        <button onClick={openOpeningModal} className="btn-opening">
                            <Wallet size={18} /> Apertura de Caja
                        </button>
                        <button onClick={() => fetchPeriods()} className="btn-warning">
                            <RefreshCw size={18} /> Actualizar
                        </button>
                    </div>
                </header>

                {periodSummary && (
                    <div className="period-live-cards">
                        <div className="plc-card plc-sales">
                            <div className="plc-icon"><TrendingUp size={20} /></div>
                            <div className="plc-info">
                                <span className="plc-label">Venta Total del Periodo</span>
                                <span className="plc-amount text-emerald-400">{formatCurrency(periodSummary.totalSales + periodSummary.totalShipping)}</span>
                                <span className="plc-meta">{periodSummary.salesCount} {periodSummary.salesCount === 1 ? 'venta' : 'ventas'}</span>
                            </div>
                        </div>
                        <div className="plc-card plc-shipping">
                            <div className="plc-icon"><Truck size={20} /></div>
                            <div className="plc-info">
                                <span className="plc-label">Envíos del Periodo</span>
                                <span className="plc-amount text-violet-400">{formatCurrency(periodSummary.totalShipping)}</span>
                                <span className="plc-meta">Costo de entregas</span>
                            </div>
                        </div>
                        <div className="plc-card plc-expenses">
                            <div className="plc-icon"><TrendingDown size={20} /></div>
                            <div className="plc-info">
                                <span className="plc-label">Gastos del Periodo</span>
                                <span className="plc-amount text-rose-400">-{formatCurrency(periodSummary.totalExpenses)}</span>
                            </div>
                        </div>
                        <div className="plc-card plc-net">
                            <div className="plc-icon"><Activity size={20} /></div>
                            <div className="plc-info">
                                <span className="plc-label">Neto {periodSummary.closingType === 'periodic' ? 'Semana' : 'Día'}</span>
                                <span className={`plc-amount ${periodSummary.netAmount >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>{formatCurrency(periodSummary.netAmount)}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="controls-bar">
                    <div className="filters-group">
                        <div className="filter-item">
                            <label><Filter size={14} /> Sucursal</label>
                            <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                                <option value="">Todas las Sucursales</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="filter-item">
                            <label><Calendar size={14} /> Desde</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label><Calendar size={14} /> Hasta</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label style={{ visibility: 'hidden' }}>•</label>
                            <label className="show-empty-toggle" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                <input
                                    type="checkbox"
                                    checked={showShipping}
                                    onChange={e => setShowShipping(e.target.checked)}
                                    style={{ accentColor: '#3b82f6', width: '15px', height: '15px', cursor: 'pointer' }}
                                />
                                Mostrar envíos
                            </label>
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    {isLoading ? (
                        <div className="loading-state">Cargando historial de períodos...</div>
                    ) : closings.length === 0 ? (
                        <div className="empty-state">
                            <Archive size={48} className="empty-icon" />
                            <p>No se encontraron períodos con los filtros aplicados.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Estado</th>
                                    <th>Período</th>
                                    <th>Sucursal</th>
                                    <th className="text-center">Ventas</th>
                                    <th className="text-right">Gastos</th>
                                    {showShipping && <th className="text-right">Envíos</th>}
                                    <th className="text-right">Neto</th>
                                    <th className="text-center">Detalles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {closings.map((closing) => {
                                    const isPositive = Number(closing.netAmount) >= 0;
                                    return (
                                        <tr key={closing.id}>
                                            <td>
                                                <span className={`status-pill ${closing.estado === 'closed' ? 'st-closed' : 'st-open'}`}>
                                                    {closing.estado === 'closed'
                                                        ? <><CheckCircle2 size={13} /> Cerrado</>
                                                        : <><Clock size={13} /> Abierto</>}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 font-bold text-slate-200">
                                                    <Calendar size={14} className="text-slate-500" />
                                                    <span>
                                                        {format(new Date(closing.periodStart), 'dd MMM', { locale: es })}
                                                        {' — '}
                                                        {format(new Date(closing.periodEnd), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td><span className="branch-tag">{closing.branchName || '---'}</span></td>
                                            <td className="text-center amounts text-emerald-400">
                                                {formatCurrency(closing.totalSales)}
                                            </td>
                                            <td className="text-right amounts text-rose-400">
                                                -{formatCurrency(closing.totalExpenses)}
                                            </td>
                                            {showShipping && (
                                                <td className="text-right amounts text-violet-400">
                                                    {formatCurrency(closing.totalShipping)}
                                                </td>
                                            )}
                                            <td className={`text-right font-bold amounts ${isPositive ? 'text-blue-400' : 'text-rose-400'}`}>
                                                {formatCurrency(closing.netAmount)}
                                            </td>
                                            <td className="text-center">
                                                <button className="action-view-btn" onClick={() => fetchClosingDetails(closing)}>
                                                    <Eye size={18} />
                                                    <span>Ver Detalles</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
                                        <h2>Auditoría Directa: {selectedClosing.branchName}</h2>
                                        <p className="kardex-subtitle">
                                            {format(new Date(selectedClosing.periodStart), "EEEE dd 'de' MMMM", { locale: es })}
                                            {' — '}
                                            {format(new Date(selectedClosing.periodEnd), "EEEE dd 'de' MMMM, yyyy", { locale: es })}
                                        </p>
                                    </div>
                                </div>
                                <div className="kardex-header-actions">
                                    <button 
                                        onClick={() => executeForceClosing()} 
                                        disabled={isForceLoading} 
                                        className="btn-recalc-modern"
                                        title="Recalcular todos los cierres de este período"
                                    >
                                        {isForceLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                                        <span>Recalcular Período</span>
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
                                        <p> Reconstruyendo movimientos del período...</p>
                                    </div>
                                ) : !closingDetails || !closingDetails.movements || closingDetails.movements.length === 0 ? (
                                    <div className="empty-kardex">No hay movimientos registrados en este período.</div>
                                ) : (
                                    <div className="kardex-list">
                                        {/* Desglose por método de pago */}
                                        <div className="kardex-section-title">Métodos de Pago</div>
                                        <div className="payment-breakdown-grid">
                                            {Object.entries(closingDetails.paymentBreakdown || {}).map(([method, info]: any) => {
                                                const methodConfig = METHOD_STYLES[method] || METHOD_STYLES.OTRO;
                                                return (
                                                    <div key={method} className={`pm-card pm-${methodConfig.cls}`}>
                                                        <div className="pm-card-top">
                                                            <span className="pm-icon">{methodConfig.icon}</span>
                                                            <span className="pm-label">{methodConfig.label}</span>
                                                            <span className="pm-count">{info.count}</span>
                                                        </div>
                                                        <div className="pm-amount">{formatCurrency(info.total)}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Cuadre de efectivo */}
                                        <div className="kardex-section-title">Cuadre de Efectivo</div>
                                        <div className="cash-reconcile-box">
                                            <div className="cash-recon-grid">
                                                <div className="cash-recon-row">
                                                    <span>Apertura de caja</span>
                                                    <strong>{formatCurrency(closingDetails.cashSummary.openingAmount)}</strong>
                                                </div>
                                                <div className="cash-recon-row">
                                                    <span>+ Ventas en efectivo</span>
                                                    <strong className="text-emerald-400">{formatCurrency(closingDetails.cashSummary.cashSalesTotal)}</strong>
                                                </div>
                                                <div className="cash-recon-row">
                                                    <span>+ Abonos a crédito</span>
                                                    <strong className="text-emerald-400">{formatCurrency(closingDetails.cashSummary.cashCreditPayments)}</strong>
                                                </div>
                                                <div className="cash-recon-row">
                                                    <span>- Gastos del día</span>
                                                    <strong className="text-rose-400">-{formatCurrency(closingDetails.cashSummary.totalExpenses)}</strong>
                                                </div>
                                                <div className="cash-recon-row cash-recon-total">
                                                    <span>= Efectivo esperado</span>
                                                    <strong className="text-blue-400">{formatCurrency(closingDetails.cashSummary.cashExpected)}</strong>
                                                </div>
                                                <div className="cash-recon-divider"></div>
                                                <div className="cash-recon-row cash-recon-input-row">
                                                    <label htmlFor="cashCounted">Efectivo contado</label>
                                                    <div className="cash-counted-input-wrap">
                                                        <span className="cc-currency">$</span>
                                                        <input
                                                            id="cashCounted"
                                                            type="text"
                                                            value={cashCounted}
                                                            onChange={e => setCashCounted(e.target.value.replace(/[^0-9.]/g, ''))}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                </div>
<div className="cash-recon-row cash-recon-total">
                                                    {(() => {
                                                        const counted = parseFloat(cashCounted) || 0;
                                                        const diff = counted - closingDetails.cashSummary.cashExpected;
                                                        const cls = Math.abs(diff) < 0.01 ? 'cash-ok' : (diff > 0 ? 'cash-surplus' : 'cash-short');
                                                        const label = Math.abs(diff) < 0.01 ? '✓ CUADRA' : (diff > 0 ? 'SOBRANTE' : 'FALTANTE');
                                                        return (
                                                            <>
                                                                <span className={cls}>{label}</span>
                                                                <strong className={cls}>{diff >= 0 ? '+' : ''}{formatCurrency(diff)}</strong>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ marginTop: '1rem', padding: '0.85rem 1.25rem', background: 'rgba(59,130,246,0.04)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.1)', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Eye size={14} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                            Para ver el detalle de movimientos, consultá el Historial de Ventas.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </main>

            {/* MODAL APERTURA */}
            {isOpeningModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setIsOpeningModalOpen(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="cc-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 'min(520px, 92vw)', width: '95%' }}
                    >
                        <header className="cc-modal-header">
                            <div className="cc-header-info">
                                <div className="cc-icon-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                    <Wallet size={22} />
                                </div>
                                <div>
                                    <h2>{currentOpening ? 'Editar Apertura' : 'Nueva Apertura'}</h2>
                                    <p>{currentOpening ? `#${currentOpening.id} · ${format(new Date(currentOpening.date), "EEEE dd/MM/yyyy", { locale: es })}` : 'Registrar el monto inicial de efectivo'}</p>
                                </div>
                            </div>
                            <button className="cc-btn-close" onClick={() => setIsOpeningModalOpen(false)}>
                                <X size={22} />
                            </button>
                        </header>

                        <div className="cc-modal-body">
                            <div className="cc-grid">
                                <div className="cc-field">
                                    <label>Sucursal</label>
                                    <select value={openingBranchId} onChange={e => setOpeningBranchId(e.target.value)}>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div className="cc-field">
                                    <label>Fecha de Apertura</label>
                                    <input type="date" value={openingDate} onChange={e => setOpeningDate(e.target.value)} />
                                    {(() => {
                                        const isMon = new Date(openingDate + 'T00:00:00').getDay() === 1;
                                        return !isMon && (
                                            <div className="cc-warn">
                                                <AlertTriangle size={11} /> No es Lunes — se solicitará confirmación al guardar
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            <div className="cc-field" style={{ marginTop: '1rem' }}>
                                <label>Monto Inicial (Efectivo en Caja)</label>
                                <div className="cc-amount-wrap">
                                    <span className="cc-currency">$</span>
                                    <input
                                        type="text"
                                        value={openingAmount}
                                        onChange={e => setOpeningAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>

                        <footer className="cc-modal-footer">
                            <button type="button" className="cc-btn-cancel" onClick={() => setIsOpeningModalOpen(false)}>Cancelar</button>
                            <button type="button" className="cc-btn-save" onClick={handleOpeningSubmit} disabled={loadingOpening}>
                                {loadingOpening ? 'Procesando...' : <><Wallet size={18} /> {currentOpening ? 'Guardar Cambios' : 'Crear Apertura'}</>}
                            </button>
                        </footer>
                    </motion.div>
                </div>
            )}

            {/* MODAL PIN ADMIN */}
            {isPinModalOpen && (
                <div className="modal-overlay" style={{ zIndex: 6000 }} onClick={() => setIsPinModalOpen(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="cc-modal"
                        onClick={e => e.stopPropagation()}
                        style={{ maxWidth: 'min(400px, 92vw)', width: '95%' }}
                    >
                        <header className="cc-modal-header" style={{ borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.04)' }}>
                            <div className="cc-header-info">
                                <div className="cc-icon-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                                    <Lock size={22} />
                                </div>
                                <div>
                                    <h2>Autorización Requerida</h2>
                                    <p>PIN de Super Admin para continuar</p>
                                </div>
                            </div>
                            <button className="cc-btn-close" onClick={() => setIsPinModalOpen(false)}>
                                <X size={22} />
                            </button>
                        </header>

                        <div className="cc-modal-body" style={{ textAlign: 'center' }}>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Ingresá el PIN de Super Admin para autorizar la {currentOpening ? 'edición' : 'creación'} de la apertura.
                            </p>
                            <input
                                type="password"
                                value={pinInput}
                                onChange={e => setPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                onKeyDown={e => { if (e.key === 'Enter' && pinInput.length >= 4) validatePinAndSubmit(); }}
                                placeholder="••••••"
                                autoFocus
                                className="cc-pin-input"
                            />
                            {pinError && <p className="cc-pin-error">{pinError}</p>}
                        </div>

                        <footer className="cc-modal-footer">
                            <button type="button" className="cc-btn-cancel" onClick={() => setIsPinModalOpen(false)}>Cancelar</button>
                            <button type="button" className="cc-btn-save" style={{ background: '#f59e0b', boxShadow: '0 4px 10px -3px rgba(245,158,11,0.3)' }} onClick={validatePinAndSubmit} disabled={pinInput.length < 4 || loadingOpening}>
                                {loadingOpening ? 'Verificando...' : <><ShieldCheck size={18} /> Autorizar</>}
                            </button>
                        </footer>
                    </motion.div>
                </div>
            )}

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
                    max-width: 580px !important; width: 92% !important; 
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

                /* === REALCE CIERRE: Métodos de Pago y Cuadre === */
                .kardex-section-title {
                    font-size: 0.7rem; font-weight: 800; color: #64748b;
                    text-transform: uppercase; letter-spacing: 0.08em;
                    margin: 1.5rem 0 0.75rem; padding-bottom: 0.4rem;
                    border-bottom: 1px solid #334155;
                    display: flex; align-items: center; gap: 0.5rem;
                }
                .kardex-section-title:first-child { margin-top: 0; }

                .payment-breakdown-grid {
                    display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem;
                }
                .pm-card {
                    background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 0.9rem 1rem;
                    transition: all 0.2s; position: relative; overflow: hidden;
                }
                .pm-card:hover { transform: translateY(-2px); border-color: #475569; }
                .pm-card.pm-cash { border-left: 3px solid #10b981; }
                .pm-card.pm-card { border-left: 3px solid #3b82f6; }
                .pm-card.pm-transfer { border-left: 3px solid #8b5cf6; }
                .pm-card.pm-credit { border-left: 3px solid #f59e0b; }
                .pm-card.pm-mixed { border-left: 3px solid #ec4899; }
                .pm-card.pm-other { border-left: 3px solid #64748b; }
                .pm-card-top { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }
                .pm-icon { font-size: 0.95rem; }
                .pm-label { font-size: 0.7rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; flex: 1; }
                .pm-count { font-size: 0.65rem; padding: 0.1rem 0.45rem; background: rgba(255,255,255,0.05); border-radius: 6px; color: #64748b; font-weight: 700; }
                .pm-amount { font-size: 1.15rem; font-weight: 800; color: #e2e8f0; font-variant-numeric: tabular-nums; }
                .pm-card.pm-cash .pm-amount { color: #10b981; }
                .pm-card.pm-card .pm-amount { color: #60a5fa; }
                .pm-card.pm-transfer .pm-amount { color: #a78bfa; }
                .pm-card.pm-credit .pm-amount { color: #fbbf24; }
                .pm-card.pm-mixed .pm-amount { color: #f472b6; }

                .cash-reconcile-box {
                    background: linear-gradient(135deg, rgba(16,185,129,0.04) 0%, rgba(59,130,246,0.04) 100%);
                    border: 1px solid rgba(16,185,129,0.15); border-radius: 16px; padding: 1.25rem 1.5rem;
                }
                .cash-recon-grid { display: flex; flex-direction: column; gap: 0.5rem; }
                .cash-recon-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #94a3b8; }
                .cash-recon-row strong { color: #e2e8f0; font-variant-numeric: tabular-nums; font-weight: 700; }
                .cash-recon-total { font-size: 1rem; padding-top: 0.4rem; }
                .cash-recon-divider { height: 1px; background: #334155; margin: 0.5rem 0; }
                .cash-recon-input-row { font-size: 0.95rem; font-weight: 700; color: #e2e8f0; margin: 0.5rem 0; }
                .cash-recon-input-row label { display: flex; align-items: center; gap: 0.4rem; }
                .cash-counted-input-wrap {
                    display: flex; align-items: center; gap: 0.25rem;
                    background: #0f172a; border: 1px solid #334155; border-radius: 10px; padding: 0.4rem 0.75rem;
                    min-width: 180px;
                }
                .cash-counted-input-wrap:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .cc-currency { color: #64748b; font-weight: 800; }
                .cash-counted-input-wrap input {
                    flex: 1; background: transparent; border: none; outline: none;
                    color: white; font-weight: 800; font-size: 1rem; text-align: right;
                    font-variant-numeric: tabular-nums; width: 100%;
                }
                .cash-ok { color: #10b981 !important; font-weight: 800; }
                .cash-surplus { color: #3b82f6 !important; font-weight: 800; }
                .cash-short { color: #ef4444 !important; font-weight: 800; }

                /* Pills de método en el timeline */
                .method-pill {
                    font-size: 0.65rem; padding: 0.18rem 0.5rem; border-radius: 6px;
                    font-weight: 700; letter-spacing: 0.03em; white-space: nowrap;
                }
                .method-pill.m-cash { background: rgba(16,185,129,0.15); color: #10b981; }
                .method-pill.m-card { background: rgba(59,130,246,0.15); color: #60a5fa; }
                .method-pill.m-transfer { background: rgba(139,92,246,0.15); color: #a78bfa; }
                .method-pill.m-credit { background: rgba(245,158,11,0.15); color: #fbbf24; }
                .method-pill.m-mixed { background: rgba(236,72,153,0.15); color: #f472b6; }
                .method-pill.m-other { background: rgba(100,116,139,0.15); color: #94a3b8; }

                .mov-row.mov-sale { background: rgba(16,185,129,0.02); }
                .mov-row.mov-payment { background: rgba(59,130,246,0.02); }
                .mov-row.mov-expense { background: rgba(239,68,68,0.02); }
                .mov-badge.PAYMENT { background: rgba(59,130,246,0.15); color: #60a5fa; }

                /* === Apertura / PIN modal (patrón ProductModal) === */
                .btn-opening {
                    display: flex; align-items: center; gap: 0.5rem;
                    background: rgba(16,185,129,0.1); color: #34d399;
                    border: 1px solid rgba(16,185,129,0.25);
                    padding: 0.6rem 1rem; border-radius: 10px;
                    font-weight: 700; cursor: pointer; transition: all 0.2s; font-size: 0.85rem;
                }
                .btn-opening:hover { background: #10b981; color: white; border-color: #10b981; transform: translateY(-1px); }

                .period-live-cards {
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
                    margin-bottom: 1.5rem; flex-shrink: 0;
                }
                .plc-card {
                    background: #1e293b; border: 1px solid #334155; border-radius: 14px;
                    padding: 1rem 1.25rem; display: flex; align-items: center; gap: 0.85rem;
                    transition: transform 0.2s;
                }
                .plc-card:hover { transform: translateY(-2px); }
                .plc-card.plc-sales { border-left: 3px solid #10b981; }
                .plc-card.plc-shipping { border-left: 3px solid #8b5cf6; }
                .plc-card.plc-expenses { border-left: 3px solid #ef4444; }
                .plc-card.plc-net { border-left: 3px solid #3b82f6; }
                .plc-icon {
                    width: 38px; height: 38px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                .plc-card.plc-sales .plc-icon { background: rgba(16,185,129,0.12); color: #34d399; }
                .plc-card.plc-shipping .plc-icon { background: rgba(139,92,246,0.12); color: #a78bfa; }
                .plc-card.plc-expenses .plc-icon { background: rgba(239,68,68,0.12); color: #f43f5e; }
                .plc-card.plc-net .plc-icon { background: rgba(59,130,246,0.12); color: #60a5fa; }
                .plc-info { display: flex; flex-direction: column; gap: 0.1rem; }
                .plc-label { font-size: 0.65rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                .plc-amount { font-size: 1.3rem; font-weight: 800; line-height: 1.2; font-variant-numeric: tabular-nums; }
                .plc-meta { font-size: 0.7rem; color: #64748b; font-weight: 600; }
                @media (max-width: 1024px) { .period-live-cards { grid-template-columns: 1fr 1fr; gap: 0.6rem; } }

                .modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
                    display: flex; align-items: center; justify-content: center; padding: 20px;
                }
                .cc-modal {
                    background: #1e293b; border-radius: 20px; border: 1px solid #334155;
                    display: flex; flex-direction: column; max-height: clamp(500px, 85vh, 95vh);
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); overflow: hidden;
                }
                .cc-modal-header {
                    padding: 0.85rem 1.25rem; background: #1e293b; border-bottom: 1px solid #334155;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .cc-header-info { display: flex; gap: 0.75rem; align-items: center; }
                .cc-icon-badge {
                    width: 36px; height: 36px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                }
                .cc-modal-header h2 { font-size: 1.1rem; font-weight: 800; color: white; margin: 0; }
                .cc-modal-header p { font-size: 0.72rem; color: #94a3b8; margin: 0; }
                .cc-btn-close {
                    background: none; border: none; color: #64748b; cursor: pointer;
                    width: 32px; height: 32px; border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s;
                }
                .cc-btn-close:hover { background: rgba(239, 68, 68, 0.15); color: white; }

                .cc-modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
                .cc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
                .cc-field { display: flex; flex-direction: column; gap: 0.4rem; }
                .cc-field label {
                    font-size: 0.68rem; font-weight: 800; color: #64748b;
                    text-transform: uppercase; letter-spacing: 0.05em;
                }
                .cc-field select, .cc-field input[type="date"] {
                    background: #0f172a; border: 1px solid #334155; border-radius: 10px;
                    padding: 0.65rem 0.85rem; color: white; font-size: 0.9rem; outline: none;
                    color-scheme: dark; transition: all 0.2s;
                }
                .cc-field select:focus, .cc-field input[type="date"]:focus {
                    border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
                }
                .cc-amount-wrap {
                    display: flex; align-items: center; gap: 0.5rem;
                    background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 0.75rem 1rem;
                    transition: all 0.2s;
                }
                .cc-amount-wrap:focus-within { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
                .cc-amount-wrap input {
                    flex: 1; background: transparent; border: none; outline: none;
                    color: white; font-size: 1.4rem; font-weight: 800; text-align: right;
                    font-variant-numeric: tabular-nums; width: 100%;
                }
                .cc-currency { color: #64748b; font-weight: 800; font-size: 1.1rem; }
                .cc-warn {
                    display: flex; align-items: center; gap: 0.35rem;
                    font-size: 0.7rem; color: #fbbf24; font-weight: 600; margin-top: 0.2rem;
                }

                .cc-modal-footer {
                    padding: 0.85rem 1.25rem; background: #1e293b; border-top: 1px solid #334155;
                    display: flex; justify-content: flex-end; gap: 0.75rem;
                }
                .cc-btn-cancel {
                    background: transparent; border: 1px solid #334155; color: #94a3b8;
                    padding: 0.6rem 1.25rem; border-radius: 10px; font-weight: 700;
                    font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; gap: 0.4rem;
                }
                .cc-btn-cancel:hover { background: #334155; color: white; }
                .cc-btn-save {
                    background: #10b981; color: white; border: none;
                    padding: 0.6rem 1.5rem; border-radius: 10px; font-weight: 800;
                    font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
                    display: flex; align-items: center; gap: 0.5rem;
                    box-shadow: 0 4px 10px -3px rgba(16,185,129,0.3);
                }
                .cc-btn-save:hover:not(:disabled) { background: #059669; transform: translateY(-1px); box-shadow: 0 6px 15px -3px rgba(16,185,129,0.4); }
                .cc-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

                .cc-pin-input {
                    width: 100%; text-align: center; letter-spacing: 0.4em;
                    font-size: 1.6rem; font-weight: 800; color: white;
                    background: #0f172a; border: 1px solid #334155; border-radius: 12px;
                    padding: 0.85rem 1rem; outline: none; transition: all 0.2s;
                    font-variant-numeric: tabular-nums;
                }
                .cc-pin-input:focus { border-color: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,0.1); }
                .cc-pin-error { color: #ef4444; font-size: 0.8rem; font-weight: 700; margin-top: 0.75rem; }

                .status-pill {
                    display: inline-flex; align-items: center; gap: 0.35rem;
                    padding: 0.3rem 0.7rem; border-radius: 999px;
                    font-size: 0.72rem; font-weight: 800; text-transform: uppercase;
                    letter-spacing: 0.04em; white-space: nowrap;
                }
                .status-pill.st-open { background: rgba(16,185,129,0.12); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
                .status-pill.st-closed { background: rgba(100,116,139,0.12); color: #94a3b8; border: 1px solid rgba(100,116,139,0.25); }
                .text-violet-400 { color: #a78bfa; }
            `}</style>
        </div>
    );
};

export default CashClosings;
