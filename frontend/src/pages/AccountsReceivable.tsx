import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import NumericKeyboard from '../components/NumericKeyboard';
import { saleApi } from '../services/api';
import { Wallet, Search, ArrowRight, User, CreditCard, DollarSign, X, Eye, FileText, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence } from 'framer-motion';

const AccountsReceivable: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
    const [showKeyboard, setShowKeyboard] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await saleApi.getAccountsReceivable();
            setAccounts(res.data);
        } catch (error) {
            toast.error('Error al cargar cuentas por cobrar');
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.clientName?.toLowerCase().includes(filter.toLowerCase()) ||
        acc.documentId?.toLowerCase().includes(filter.toLowerCase())
    );

    const handlePayClick = (acc: any) => {
        setSelectedAccount(acc);
        setPaymentAmount(''); // Empieza vacío para que el placeholder actúe
        setIsPaymentModalOpen(false); // To reset animation
        setTimeout(() => setIsPaymentModalOpen(true), 10);
    };

    const handleHistoryClick = async (acc: any) => {
        setSelectedAccount(acc);
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        setExpandedPayment(null);
        try {
            const res = await saleApi.getClientPayments(acc.clientId);
            setPaymentHistory(res.data);
        } catch (error) {
            toast.error("Error al cargar historial de pagos");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleConfirmPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccount) return;
        try {
            // Si el input está vacío, asume que se quiere pagar todo el saldo
            const amountToPay = paymentAmount.trim() === '' ? Number(selectedAccount.totalBalance) : parseFloat(paymentAmount);

            if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > selectedAccount.totalBalance) {
                toast.error("Monto inválido. No puede ser mayor a la deuda ni 0.");
                return;
            }
            await saleApi.payAccountReceivable(selectedAccount.clientId, amountToPay);
            toast.success("Pago registrado exitosamente");
            setIsPaymentModalOpen(false);
            fetchAccounts();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Error al registrar el cobro");
        }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem' }}>
                <div className="page-header" style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                    <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="header-icon-container" style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            width: '64px', height: '64px',
                            borderRadius: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            <Wallet size={32} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Cuentas por Cobrar</h1>
                            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Seguimiento de ventas al crédito y saldos pendientes</p>
                        </div>
                    </div>
                </div>

                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div className="stat-card" style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid #334155',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div className="stat-info">
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total por Cobrar</span>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#10b981', marginTop: '0.25rem' }}>
                                ${accounts.reduce((acc, curr) => acc + Number(curr.totalBalance), 0).toFixed(2)}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={28} />
                        </div>
                    </div>
                    <div className="stat-card" style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: '1px solid #334155',
                        padding: '1.5rem',
                        borderRadius: '20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div className="stat-info">
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clientes con Deuda</span>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '0.25rem' }}>
                                {accounts.length}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={28} />
                        </div>
                    </div>
                </div>

                <div className="table-container" style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="search-wrapper" style={{ maxWidth: '500px' }}>
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por cliente o factura..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <table className="products-table">
                        <thead>
                            <tr>
                                <th style={{ padding: '1.25rem 2rem' }}>Cliente</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Deuda más Antigua</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Facturas Pendientes</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Deuda Total</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem' }}>Cargando datos...</td></tr>
                            ) : filteredAccounts.length > 0 ? filteredAccounts.map(acc => (
                                <tr key={acc.clientId}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                <User size={18} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, color: 'white' }}>{acc.clientName}</span>
                                                {acc.phone && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{acc.phone}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', color: '#94a3b8' }}>
                                        {format(new Date(acc.oldestDebtDate), 'dd MMM, yyyy', { locale: es })}
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            <FileText size={14} />
                                            {acc.pendingInvoices} facturas
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <span style={{ fontWeight: 900, color: '#ef4444', fontSize: '1.1rem' }}>${Number(acc.totalBalance).toFixed(2)}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                            <button className="btn-icon-table edit" title="Ver Historial" onClick={() => handleHistoryClick(acc)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                <Eye size={20} />
                                            </button>
                                            <button className="btn-icon-table edit" title="Registrar Cobro" onClick={() => handlePayClick(acc)} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                <ArrowRight size={20} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>No hay cuentas pendientes</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {isPaymentModalOpen && selectedAccount && (
                    <div className="payment-overlay" onClick={() => setIsPaymentModalOpen(false)}>
                        <div className="payment-modal animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="pm-header">
                                <h3>Registrar Abono</h3>
                                <button className="pm-close" onClick={() => setIsPaymentModalOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleConfirmPayment}>
                                <div className="pm-body">
                                    <div className="pm-info-card">
                                        <div className="pm-row">
                                            <span>Cliente</span>
                                            <strong>{selectedAccount.clientName}</strong>
                                        </div>
                                        <div className="pm-row">
                                            <span>Pendientes</span>
                                            <strong>{selectedAccount.pendingInvoices} facturas</strong>
                                        </div>
                                        <div className="pm-row debt">
                                            <span>Deuda Global Actual</span>
                                            <strong>${Number(selectedAccount.totalBalance).toFixed(2)}</strong>
                                        </div>
                                    </div>

                                    <div className="pm-input-group">
                                        <label>Monto a Pagar</label>
                                        <div className="pm-input-wrapper">
                                            <DollarSign size={20} className="icon-dollar" />
                                            <input
                                                autoFocus
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                max={selectedAccount.totalBalance}
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                onFocus={() => setShowKeyboard(true)}
                                                inputMode="none"
                                                placeholder={Number(selectedAccount.totalBalance).toFixed(2)}
                                            />
                                        </div>
                                    </div>

                                    <div className="pm-quick-actions">
                                        <button type="button" onClick={() => setPaymentAmount((Number(selectedAccount.totalBalance) / 2).toFixed(2))}>50%</button>
                                        <button type="button" onClick={() => setPaymentAmount(Number(selectedAccount.totalBalance).toFixed(2))} className="active">Pagar Todo</button>
                                    </div>
                                </div>
                                <div className="pm-footer">
                                    <button type="button" className="pm-btn-cancel" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="pm-btn-confirm">Confirmar Pago</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isHistoryModalOpen && selectedAccount && (
                    <div className="payment-overlay" onClick={() => setIsHistoryModalOpen(false)}>
                        <div className="payment-modal history-modal animate-in zoom-in-95" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                            <div className="pm-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '8px', borderRadius: '10px' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0 }}>Historial de Pagos</h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{selectedAccount.clientName}</span>
                                    </div>
                                </div>
                                <button className="pm-close" onClick={() => setIsHistoryModalOpen(false)}><X size={20} /></button>
                            </div>
                            <div className="pm-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {loadingHistory ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando historial...</div>
                                ) : paymentHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No hay pagos registrados para este cliente.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {paymentHistory.map((payment) => (
                                            <div key={payment.id} className="history-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                                                <div
                                                    style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                    onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                                                >
                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
                                                            <DollarSign size={20} />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 700, color: 'white' }}>Abono Registrado</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                <Calendar size={12} />
                                                                <span>{format(new Date(payment.createdAt), "dd MMM, yyyy - hh:mm a", { locale: es })}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <span style={{ fontWeight: 900, color: '#10b981', fontSize: '1.2rem' }}>+${Number(payment.amount).toFixed(2)}</span>
                                                        <div style={{ color: '#64748b', transform: expandedPayment === payment.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                            <ArrowRight size={16} />
                                                        </div>
                                                    </div>
                                                </div>

                                                {expandedPayment === payment.id && payment.applications?.length > 0 && (
                                                    <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <h4 style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>Aplicación del Pago</h4>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {payment.applications.map((app: any) => (
                                                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'rgba(30, 41, 59, 0.8)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <strong style={{ color: 'white' }}>Venta #{app.saleId}</strong>
                                                                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Emitida: {format(new Date(app.sale.createdAt), 'dd/MM/yyyy')} • Total Orig: ${Number(app.sale.total).toFixed(2)}</span>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        <span style={{ fontWeight: 700, color: '#10b981' }}>Cubrió: ${Number(app.amountApplied).toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <style>{`
                    .payment-overlay {
                        position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(10px);
                        display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 1rem;
                    }
                    .payment-modal {
                        background: #0f172a; width: 100%; max-width: 400px;
                        border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);
                        box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8); overflow: hidden;
                    }
                    .pm-header {
                        padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05);
                        display: flex; justify-content: space-between; align-items: center;
                    }
                    .pm-header h3 { margin: 0; color: white; font-size: 1.1rem; font-weight: 800; }
                    .pm-close { background: none; border: none; color: #64748b; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; }
                    .pm-close:hover { background: rgba(255,255,255,0.05); color: white; }
                    .pm-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
                    .pm-info-card { background: rgba(30, 41, 59, 0.5); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 8px; }
                    .pm-row { display: flex; justify-content: space-between; font-size: 0.85rem; }
                    .pm-row span { color: #94a3b8; }
                    .pm-row strong { color: white; }
                    .pm-row.debt { margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); }
                    .pm-row.debt strong { color: #ef4444; font-size: 1rem; }
                    
                    .pm-input-wrapper { position: relative; margin-top: 8px; }
                    .icon-dollar { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #10b981; }
                    .pm-input-group label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
                    .pm-input-wrapper input {
                        width: 100%; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.3);
                        border-radius: 12px; padding: 1rem 1rem 1rem 2.5rem; font-size: 1.5rem;
                        font-weight: 900; color: #10b981; outline: none; transition: all 0.2s;
                    }
                    .pm-input-wrapper input:focus { border-color: #10b981; background: rgba(16, 185, 129, 0.1); }
                    
                    .pm-quick-actions { display: flex; gap: 8px; }
                    .pm-quick-actions button {
                        flex: 1; padding: 0.5rem; background: rgba(30, 41, 59, 0.5); border: 1px solid transparent;
                        border-radius: 8px; color: #94a3b8; font-size: 0.8rem; font-weight: 700; cursor: pointer;
                    }
                    .pm-quick-actions button:hover { background: rgba(255,255,255,0.05); }
                    .pm-quick-actions button.active { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }

                    .pm-footer { padding: 1.25rem 1.5rem; background: rgba(30, 41, 59, 0.3); display: flex; gap: 10px; }
                    .pm-btn-cancel { flex: 1; padding: 0.75rem; background: transparent; border: 1px solid #334155; border-radius: 10px; color: #cbd5e1; font-weight: 700; cursor: pointer; }
                    .pm-btn-confirm { flex: 2; padding: 0.75rem; background: #10b981; border: none; border-radius: 10px; color: white; font-weight: 800; cursor: pointer; }
                    .pm-btn-confirm:hover { background: #059669; }
                `}</style>

                <AnimatePresence>
                    {showKeyboard && (
                        <NumericKeyboard
                            value={paymentAmount}
                            onChange={setPaymentAmount}
                            onClose={() => setShowKeyboard(false)}
                            title="MONTO A PAGAR"
                        />
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default AccountsReceivable;
