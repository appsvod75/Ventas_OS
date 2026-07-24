import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Filter, Receipt, Calendar, Edit, AlertTriangle, Lock, CheckCircle, XCircle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { expenseApi, Expense } from '../services/expense.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import VirtualKeyboard from '../components/VirtualKeyboard';
import NumericKeyboard from '../components/NumericKeyboard';
import { AnimatePresence } from 'framer-motion';
import { getUser, hasRole, ROLES } from '../utils/permissions';

const Expenses: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // States
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const user = getUser();
    const CURRENT_BRANCH_ID = user.branch_id || 1;

    const [activeKeyboard, setActiveKeyboard] = useState<'qwerty' | 'numeric' | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);

    // Edit/Delete states
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
    const [editDescription, setEditDescription] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');

    // PIN verification
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [confirmPin, setConfirmPin] = useState('');
    const [pendingAction, setPendingAction] = useState<{ type: 'EDIT' | 'DELETE'; expense: Expense } | null>(null);
    const [pinLoading, setPinLoading] = useState(false);

    const isAdmin = hasRole(ROLES.SUPER_ADMIN, ROLES.ADMIN);

    useEffect(() => {
        fetchExpenses();
    }, [selectedDate]);

    const fetchExpenses = async () => {
        try {
            setIsLoading(true);
            const res = await expenseApi.getDailyExpenses(CURRENT_BRANCH_ID, selectedDate);
            setExpenses(res.data);
        } catch (error) {
            toast.error('Error al cargar los gastos del día');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        try {
            setIsSubmitting(true);
            await expenseApi.registerExpense({
                branchId: CURRENT_BRANCH_ID,
                description,
                amount: parseFloat(amount),
                date: expenseDate
            });
            toast.success('Gasto registrado exitosamente');
            setIsModalOpen(false);
            setDescription('');
            setAmount('');
            fetchExpenses();
            // Reset modal data
            setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
            setDescription('');
            setAmount('');
        } catch (error) {
            toast.error('Error al registrar el gasto');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditClick = (expense: Expense) => {
        setPendingAction({ type: 'EDIT', expense });
        setConfirmPin('');
        setIsPinModalOpen(true);
    };

    const handleDeleteClick = (expense: Expense) => {
        setPendingAction({ type: 'DELETE', expense });
        setConfirmPin('');
        setIsPinModalOpen(true);
    };

    const handleConfirmPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinLoading(true);
        try {
            const { adminAuthApi } = await import('../services/api');
            await adminAuthApi.verifyPin(confirmPin);
            setIsPinModalOpen(false);
            setConfirmPin('');

            if (pendingAction?.type === 'EDIT') {
                const exp = pendingAction.expense;
                setEditingExpense(exp);
                setEditDescription(exp.description);
                setEditAmount(String(Number(exp.amount)));
                setEditDate(format(new Date(exp.createdAt), 'yyyy-MM-dd'));
            } else if (pendingAction?.type === 'DELETE') {
                setDeleteTarget(pendingAction.expense);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'PIN incorrecto');
        } finally {
            setPinLoading(false);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingExpense) return;
        try {
            await expenseApi.updateExpense(editingExpense.id, {
                description: editDescription,
                amount: parseFloat(editAmount),
                date: editDate
            });
            toast.success('Gasto actualizado con éxito');
            setEditingExpense(null);
            fetchExpenses();
        } catch (error) {
            toast.error('Error al actualizar el gasto');
            console.error(error);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await expenseApi.deleteExpense(deleteTarget.id);
            toast.success('Gasto eliminado permanentemente');
            setDeleteTarget(null);
            fetchExpenses();
        } catch (error) {
            toast.error('Error al eliminar el gasto');
            console.error(error);
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    return (
        <div className="expenses-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div className="header-info">
                        <div className="flex items-center gap-3">
                            <h1>Gestión de Gastos</h1>
                            <div className="date-browser">
                                <Calendar size={18} />
                                <input 
                                    type="date" 
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="date-selector-input"
                                />
                            </div>
                        </div>
                        <p className="header-subtitle">
                            Visualizando: {format(new Date(selectedDate + 'T12:00:00'), "d 'de' MMMM, yyyy", { locale: es })}
                        </p>
                    </div>
                    <button onClick={() => {
                        setExpenseDate(selectedDate); // Default to viewed date
                        setIsModalOpen(true);
                    }} className="btn-primary">
                        <Plus size={20} /> Registrar Gasto
                    </button>
                </header>

                <div className="stats-row">
                    <div className="stat-card">
                        <div className="stat-content">
                            <Receipt size={24} className="text-rose-400" />
                            <div>
                                <h3>Total Gastos (Hoy)</h3>
                                <p className="stat-value text-rose-400">{formatCurrency(totalExpenses)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-content">
                            <Calendar size={24} className="text-slate-400" />
                            <div>
                                <h3>Cantidad de Registros</h3>
                                <p className="stat-value text-slate-200">{expenses.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="table-container">
                    {isLoading ? (
                        <div className="loading-state">Cargando gastos...</div>
                    ) : expenses.length === 0 ? (
                        <div className="empty-state">
                            <Receipt size={48} className="empty-icon" />
                            <p>No se han registrado gastos para esta fecha</p>
                            <button onClick={() => {
                                setExpenseDate(selectedDate);
                                setIsModalOpen(true);
                            }} className="btn-secondary mt-4">
                                Registrar un gasto
                            </button>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Hora</th>
                                    <th>Descripción</th>
                                    <th>Registrado por</th>
                                        <th className="text-right">Monto</th>
                                        <th className="text-right" style={{ width: '100px' }}>Acciones</th>
                                    </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp) => (
                                    <tr key={exp.id}>
                                        <td>{format(new Date(exp.createdAt), 'hh:mm a')}</td>
                                        <td className="font-medium">{exp.description}</td>
                                        <td>{exp.user?.name || 'Usuario'}</td>
                                        <td className="text-right amounts font-bold text-rose-400">
                                            {formatCurrency(exp.amount)}
                                        </td>
                                        <td className="text-right">
                                            {isAdmin && (
                                                <div className="table-actions">
                                                    <button className="btn-icon-action edit" onClick={() => handleEditClick(exp)} title="Editar gasto">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="btn-icon-action delete" onClick={() => handleDeleteClick(exp)} title="Eliminar gasto">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {/* Modal de Registro */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Registrar Salida de Efectivo</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group">
                                <label>Concepto / Descripción</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ej. Pago de garrafón de agua"
                                    required
                                    autoFocus
                                    onFocus={() => { setActiveField('description'); setActiveKeyboard('qwerty'); }}
                                    inputMode="none"
                                />
                            </div>
                            <div className="form-group">
                                <label>Fecha del Gasto</label>
                                <div className="input-with-icon no-padding">
                                    <input
                                        type="date"
                                        value={expenseDate}
                                        onChange={(e) => setExpenseDate(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Monto ($)</label>
                                <div className="input-with-icon">
                                    <span className="icon">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        required
                                        onFocus={() => { setActiveField('amount'); setActiveKeyboard('numeric'); }}
                                        inputMode="none"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Guardando...' : 'Registrar Gasto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PIN Verification Modal */}
            {isPinModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: '#ef4444' }}>
                                    <Lock size={24} />
                                </div>
                                <div>
                                    <h2>Confirmación Requerida</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Ingresa tu PIN de administrador</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => { setIsPinModalOpen(false); setPendingAction(null); }}>×</button>
                        </div>
                        <form onSubmit={handleConfirmPin}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>PIN de Administrador</label>
                                    <div className="input-with-icon" style={{ display: 'flex', alignItems: 'center' }}>
                                        <Key size={18} style={{ position: 'absolute', left: '1rem', color: '#94a3b8' }} />
                                        <input
                                            autoFocus
                                            type="password" autoComplete="off"
                                            maxLength={6}
                                            value={confirmPin}
                                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                            placeholder="6 dígitos"
                                            required
                                            style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem', paddingLeft: '2rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => { setIsPinModalOpen(false); setPendingAction(null); }}>Cancelar</button>
                                <button type="submit" className="btn-primary" disabled={pinLoading} style={{ background: '#ef4444' }}>
                                    <CheckCircle size={18} />
                                    {pinLoading ? 'Verificando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Expense Modal */}
            {editingExpense && (
                <div className="modal-overlay" onClick={() => setEditingExpense(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Editar Gasto</h2>
                            <button className="close-btn" onClick={() => setEditingExpense(null)}>×</button>
                        </div>
                        <form onSubmit={handleEditSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Concepto / Descripción</label>
                                    <input
                                        type="text"
                                        inputMode="none"
                                        value={editDescription}
                                        onChange={(e) => setEditDescription(e.target.value)}
                                        onFocus={() => { setActiveField('editDescription'); setActiveKeyboard('qwerty'); }}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Fecha del Gasto</label>
                                    <div className="input-with-icon no-padding">
                                        <input
                                            type="date"
                                            value={editDate}
                                            onChange={(e) => setEditDate(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Monto ($)</label>
                                    <div className="input-with-icon">
                                        <span className="icon">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            inputMode="none"
                                            value={editAmount}
                                            onChange={(e) => setEditAmount(e.target.value)}
                                            onFocus={() => { setActiveField('editAmount'); setActiveKeyboard('numeric'); }}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setEditingExpense(null)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                    <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '12px', borderRadius: '12px', color: '#ef4444' }}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2>Eliminar Gasto</h2>
                                    <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Esta acción no se puede deshacer</p>
                                </div>
                            </div>
                            <button className="close-btn" onClick={() => setDeleteTarget(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', padding: '1rem' }}>
                                <p style={{ color: '#fca5a5', fontWeight: 600, margin: 0 }}>
                                    ¿Estás seguro de eliminar este gasto?
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem', marginBottom: 0 }}>
                                    <strong style={{ color: '#e2e8f0' }}>{deleteTarget.description}</strong> — {formatCurrency(deleteTarget.amount)}
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                            <button type="button" className="btn-primary" onClick={handleDeleteConfirm} style={{ background: '#dc2626' }}>
                                <Trash2 size={18} />
                                Eliminar permanentemente
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .expenses-page { display: flex; height: 100vh; background: #0f172a; color: white; overflow: hidden; }
                .dashboard-main { flex: 1; overflow-y: auto; padding: 2rem 4rem; }
                
                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
                .dash-header h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.25rem; }
                .dash-header p { color: #94a3b8; }
                
                .btn-primary { display: flex; align-items: center; gap: 0.5rem; background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: background 0.2s; }
                .btn-primary:hover:not(:disabled) { background: #2563eb; }
                .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
                
                .btn-secondary { background: rgba(255,255,255,0.1); color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; transition: background 0.2s; }
                .btn-secondary:hover { background: rgba(255,255,255,0.15); }

                .stats-row { display: flex; gap: 1rem; margin-bottom: 2rem; }
                .stat-card { background: #1e293b; border: 1px solid #334155; padding: 1.5rem; border-radius: 12px; flex: 1; }
                .stat-content { display: flex; align-items: center; gap: 1rem; }
                .stat-content h3 { font-size: 0.875rem; color: #94a3b8; margin-bottom: 0.25rem; font-weight: 600; text-transform: uppercase; }
                .stat-value { font-size: 1.75rem; font-weight: 800; margin: 0; }

                .table-container { background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
                .data-table { width: 100%; border-collapse: collapse; }
                .data-table th, .data-table td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid #334155; }
                .data-table th { background: rgba(15, 23, 42, 0.5); font-weight: 600; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .data-table tr:hover { background: rgba(255,255,255,0.02); }
                .data-table tr:last-child td { border-bottom: none; }
                
                .text-right { text-align: right !important; }
                .font-medium { font-weight: 500; }
                .font-bold { font-weight: 700; }

                .loading-state, .empty-state { padding: 4rem; text-align: center; color: #94a3b8; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .empty-icon { color: #475569; margin-bottom: 1rem; }

                /* Modal Styles */
                .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
                .modal-content { background: #1e293b; width: 100%; max-width: 500px; border-radius: 16px; border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.4); overflow: hidden; }
                .modal-header { padding: 1.5rem; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
                .close-btn { background: none; border: none; color: #94a3b8; font-size: 1.5rem; cursor: pointer; transition: color 0.2s; }
                .close-btn:hover { color: white; }
                
                .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group label { font-size: 0.875rem; font-weight: 600; color: #cbd5e1; }
                .form-group input { background: #0f172a; border: 1px solid #334155; padding: 0.75rem 1rem; border-radius: 8px; color: white; font-size: 1rem; outline: none; transition: border-color 0.2s; }
                .form-group input:focus { border-color: #3b82f6; }
                
                .input-with-icon { position: relative; display: flex; align-items: center; }
                .input-with-icon .icon { position: absolute; left: 1rem; color: #94a3b8; font-weight: 600; }
                .input-with-icon input { padding-left: 2rem; width: 100%; }
                
                .modal-footer { padding-top: 1rem; margin-top: 0.5rem; display: flex; justify-content: flex-end; gap: 1rem; border-top: 1px solid rgba(255,255,255,0.05); }

                .table-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
                .btn-icon-action { background: transparent; border: none; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                .btn-icon-action.edit { color: #3b82f6; }
                .btn-icon-action.edit:hover { background: rgba(59, 130, 246, 0.15); }
                .btn-icon-action.delete { color: #ef4444; }
                .btn-icon-action.delete:hover { background: rgba(239, 68, 68, 0.15); }

                .header-info h1 { margin: 0; }
                .header-subtitle { font-size: 0.95rem; font-weight: 500; margin-top: 0.25rem; }
                .date-browser { 
                    display: flex; 
                    align-items: center; 
                    gap: 0.75rem; 
                    background: rgba(30, 41, 59, 0.8); 
                    padding: 0.5rem 1rem; 
                    border-radius: 12px; 
                    border: 1px solid #334155;
                    transition: all 0.2s;
                }
                .date-browser:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
                .date-browser svg { color: #3b82f6; }
                .date-selector-input { 
                    background: transparent; 
                    border: none; 
                    color: white; 
                    font-weight: 700; 
                    font-size: 0.9rem; 
                    outline: none;
                    cursor: pointer;
                }
                .date-selector-input::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }

                .input-with-icon.no-padding input { padding-left: 1rem; }
            `}</style>

            <AnimatePresence>
                {activeKeyboard === 'qwerty' && (
                    <VirtualKeyboard 
                        value={activeField === 'description' ? description : activeField === 'editDescription' ? editDescription : ''}
                        onChange={(val) => {
                            if (activeField === 'description') setDescription(val);
                            else if (activeField === 'editDescription') setEditDescription(val);
                        }}
                        onClose={() => setActiveKeyboard(null)}
                        onConfirm={() => setActiveKeyboard(null)}
                        title={`EDITANDO ${activeField?.toUpperCase()}`}
                    />
                )}
                {activeKeyboard === 'numeric' && (
                    <NumericKeyboard 
                        value={activeField === 'amount' ? amount : activeField === 'editAmount' ? editAmount : ''}
                        onChange={(val) => {
                            if (activeField === 'amount') setAmount(val);
                            else if (activeField === 'editAmount') setEditAmount(val);
                        }}
                        onClose={() => setActiveKeyboard(null)}
                        onConfirm={() => setActiveKeyboard(null)}
                        title={`INGRESANDO ${activeField?.toUpperCase()}`}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Expenses;
