import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { purchaseApi } from '../services/api';
import { Truck, Search, ArrowRight, Package, CreditCard, X, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import NumericKeyboard from '../components/NumericKeyboard';
import { AnimatePresence } from 'framer-motion';

interface PayModalProps {
    purchase: any;
    onClose: () => void;
    onSuccess: () => void;
}

const PayModal: React.FC<PayModalProps> = ({ purchase, onClose, onSuccess }) => {
    const [amount, setAmount] = useState(Number(purchase.balance).toFixed(2));
    const [loading, setLoading] = useState(false);
    const [markingPaid, setMarkingPaid] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const balance = Number(purchase.balance);
    const parsedAmount = Number(amount);
    const isOverPay = parsedAmount > balance;
    const isInvalid = isNaN(parsedAmount) || parsedAmount <= 0 || isOverPay;

    const handlePay = async () => {
        if (isInvalid) return;
        setLoading(true);
        try {
            await purchaseApi.payPurchase(purchase.id, parsedAmount);
            toast.success(`Pago de $${parsedAmount.toFixed(2)} registrado y gasto generado`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al registrar el pago');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async () => {
        setMarkingPaid(true);
        try {
            await purchaseApi.markAsPaid(purchase.id);
            toast.success('Factura marcada como pagada (sin generar gasto)');
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al marcar la factura');
        } finally {
            setMarkingPaid(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#1e293b', borderRadius: '24px', border: '1px solid #334155',
                    width: '100%', maxWidth: '480px', overflow: 'hidden',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                            <div style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CreditCard size={18} />
                            </div>
                            <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Registrar Pago</h2>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>El pago se registrará como gasto del día automáticamente</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Invoice Info */}
                <div style={{ padding: '1.5rem 2rem', background: 'rgba(15,23,42,0.5)', borderBottom: '1px solid #334155' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Proveedor</span>
                        <span style={{ color: 'white', fontWeight: 700 }}>{purchase.provider?.name || 'Proveedor Genérico'}</span>
                    </div>
                    {purchase.invoiceNumber && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Factura</span>
                            <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.9rem' }}>{purchase.invoiceNumber}</span>
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Total Factura</span>
                        <span style={{ color: 'white', fontWeight: 600 }}>${Number(purchase.total).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #334155' }}>
                        <span style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 700 }}>Saldo Pendiente</span>
                        <span style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.2rem' }}>${balance.toFixed(2)}</span>
                    </div>
                </div>

                {/* Amount Input */}
                <div style={{ padding: '1.5rem 2rem' }}>
                    <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                        Monto a Pagar
                    </label>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontWeight: 700, fontSize: '1.1rem' }}>$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            onFocus={() => setKeyboardOpen(true)}
                            inputMode="none"
                            min="0.01"
                            max={balance}
                            step="0.01"
                            style={{
                                width: '100%', padding: '0.9rem 1rem 0.9rem 2.2rem',
                                background: '#0f172a', border: `1px solid ${isOverPay ? '#ef4444' : '#334155'}`,
                                borderRadius: '12px', color: 'white', fontWeight: 700,
                                fontSize: '1.4rem', outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            autoFocus
                        />
                    </div>
                    {isOverPay && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#ef4444', fontSize: '0.8rem' }}>
                            <AlertCircle size={14} />
                            <span>El monto no puede superar el saldo pendiente</span>
                        </div>
                    )}

                    {/* Quick buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
                        <button
                            onClick={() => setAmount(balance.toFixed(2))}
                            style={{ flex: 1, padding: '0.6rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', color: '#10b981', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            Pago Total
                        </button>
                        <button
                            onClick={() => setAmount((balance / 2).toFixed(2))}
                            style={{ flex: 1, padding: '0.6rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}
                        >
                            50% (${(balance / 2).toFixed(2)})
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Marcar como pagada - para facturas ya cubiertas externamente */}
                    <button
                        onClick={handleMarkAsPaid}
                        disabled={markingPaid || loading}
                        style={{
                            width: '100%', padding: '0.7rem', borderRadius: '12px',
                            border: '1px dashed #475569', background: 'transparent',
                            color: '#64748b', fontWeight: 600, fontSize: '0.85rem',
                            cursor: markingPaid || loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                    >
                        <CheckCircle2 size={15} />
                        {markingPaid ? 'Procesando...' : 'Ya fue pagada — Solo marcar como saldada (sin registrar gasto)'}
                    </button>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={onClose}
                            style={{ flex: 1, padding: '0.85rem', background: 'transparent', border: '1px solid #334155', borderRadius: '12px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handlePay}
                            disabled={isInvalid || loading}
                            style={{
                                flex: 2, padding: '0.85rem', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: isInvalid || loading ? 'not-allowed' : 'pointer',
                                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                background: isInvalid || loading ? '#334155' : 'linear-gradient(135deg, #10b981, #059669)',
                                color: isInvalid || loading ? '#64748b' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <CheckCircle2 size={18} />
                            {loading ? 'Procesando...' : `Confirmar Pago $${isNaN(parsedAmount) ? '0.00' : parsedAmount.toFixed(2)}`}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {keyboardOpen && (
                    <NumericKeyboard
                        value={amount}
                        onChange={(val) => setAmount(val)}
                        onClose={() => setKeyboardOpen(false)}
                        onConfirm={() => setKeyboardOpen(false)}
                        title="MONTO A PAGAR"
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const AccountsPayable: React.FC = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await purchaseApi.getAccountsPayable();
            setAccounts(res.data);
        } catch (error) {
            toast.error('Error al cargar cuentas por pagar');
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.provider?.name?.toLowerCase().includes(filter.toLowerCase()) ||
        acc.id.toString().includes(filter) ||
        acc.invoiceNumber?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem' }}>
                <div className="page-header" style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                    <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="header-icon-container" style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            width: '64px', height: '64px',
                            borderRadius: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}>
                            <Truck size={32} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Cuentas por Pagar</h1>
                            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Gestión de deudas con proveedores y facturas al crédito</p>
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
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total por Pagar</span>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#f59e0b', marginTop: '0.25rem' }}>
                                ${accounts.reduce((acc, curr) => acc + Number(curr.balance), 0).toFixed(2)}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Proveedores Pendientes</span>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '0.25rem' }}>
                                {new Set(accounts.map(a => a.providerId)).size}
                            </div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={28} />
                        </div>
                    </div>
                </div>

                <div className="table-container" style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="search-wrapper" style={{ maxWidth: '500px' }}>
                            <Search size={20} />
                            <input
                                type="text"
                                placeholder="Buscar por proveedor, factura o ID..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                            />
                        </div>
                    </div>

                    <table className="products-table">
                        <thead>
                            <tr>
                                <th style={{ padding: '1.25rem 2rem' }}>Fecha / Compra</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Proveedor</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Sucursal</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Total Factura</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Saldo Pendiente</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem' }}>Cargando datos...</td></tr>
                            ) : filteredAccounts.length > 0 ? filteredAccounts.map(acc => (
                                <tr key={acc.id}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 700, color: '#f8fafc' }}>{format(new Date(acc.createdAt), 'dd MMM, yyyy', { locale: es })}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Comp #{acc.id}{acc.invoiceNumber ? ` · ${acc.invoiceNumber}` : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px', height: '36px',
                                                borderRadius: '10px',
                                                background: '#0f172a',
                                                border: '1px solid #334155',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#64748b'
                                            }}>
                                                <Truck size={18} />
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{acc.provider?.name || 'Proveedor Genérico'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', color: '#94a3b8' }}>{acc.branch?.name}</td>
                                    <td style={{ padding: '1.25rem 2rem', fontWeight: 600 }}>${Number(acc.total).toFixed(2)}</td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <span style={{ fontWeight: 900, color: '#ef4444', fontSize: '1.1rem' }}>${Number(acc.balance).toFixed(2)}</span>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                        <button
                                            onClick={() => setSelectedPurchase(acc)}
                                            title="Registrar Pago"
                                            style={{
                                                marginLeft: 'auto',
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                                borderRadius: '10px',
                                                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.2)'; }}
                                            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)'; }}
                                        >
                                            <ArrowRight size={16} /> Pagar
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>No hay deudas pendientes</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {selectedPurchase && (
                <PayModal
                    purchase={selectedPurchase}
                    onClose={() => setSelectedPurchase(null)}
                    onSuccess={fetchAccounts}
                />
            )}
        </div>
    );
};

export default AccountsPayable;
