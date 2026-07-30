import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Users, Edit3, CheckCircle, X, CreditCard, Phone, Mail, MapPin, User, FileText, Calendar, DollarSign, ArrowRight, Trash2, ShieldAlert, Truck } from 'lucide-react';
import { clientApi, adminAuthApi } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import VirtualKeyboard from '../components/VirtualKeyboard';
import NumericKeyboard from '../components/NumericKeyboard';
import { AnimatePresence } from 'framer-motion';

const Clients: React.FC = () => {
    const [clients, setClients] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showStatementModal, setShowStatementModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [statementData, setStatementData] = useState<any>(null);
    const [loadingStatement, setLoadingStatement] = useState(false);
    const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deletePin, setDeletePin] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [editPin, setEditPin] = useState('');
    const [showEditPinModal, setShowEditPinModal] = useState(false);
    const [pendingEdit, setPendingEdit] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        documentId: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
        deliveryId: null as number | null
    });
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [sellerFilter, setSellerFilter] = useState('');

    const [activeKeyboard, setActiveKeyboard] = useState<'qwerty' | 'numeric' | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

    useEffect(() => {
        fetchClients();
        if (isAdmin) {
            import('../services/api').then(m => m.adminAuthApi.getUsers()).then(res => setUsers(res.data)).catch(() => {});
        }
    }, []);

    const fetchClients = async () => {
        try {
            const res = await clientApi.getClients();
            setClients(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar clientes');
        }
    };

    const loadDeliveries = async () => {
        try {
            const { deliveryApi } = await import('../services/api');
            const res = await deliveryApi.getAll();
            setDeliveries(res.data);
        } catch {}
    };

    const handleOpenCreate = () => {
        setFormData({ name: '', documentId: '', phone: '', email: '', address: '', isActive: true, deliveryId: null });
        setEditingId(null);
        setShowModal(true);
        loadDeliveries();
    };

    const handleOpenEdit = (client: any) => {
        setFormData({
            name: client.name || '',
            documentId: client.documentId || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || '',
            isActive: client.isActive !== false,
            deliveryId: client.deliveryId || null
        });
        setEditingId(client.id);
        setShowModal(true);
        loadDeliveries();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        try {
            if (editingId) {
                if (user.role !== 'Super Admin' && user.role !== 'Admin' && !editPin) {
                    setShowEditPinModal(true);
                    return;
                }
                await clientApi.updateClient(editingId, { ...formData, pin: editPin || undefined });
                toast.success('Cliente actualizado con éxito');
                setEditPin('');
            } else {
                await clientApi.createClient(formData);
                toast.success('Cliente creado con éxito');
            }
            setShowModal(false);
            fetchClients();
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Error al guardar cliente';
            if (msg.includes('PIN')) { setEditPin(''); setShowEditPinModal(true); }
            toast.error(msg);
        }
    };

    const handleEditPinSubmit = async () => {
        if (!editPin) return;
        setPendingEdit(true);
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            await clientApi.updateClient(editingId!, { ...formData, pin: editPin });
            toast.success('Cliente actualizado con éxito');
            setShowEditPinModal(false);
            setEditPin('');
            setShowModal(false);
            fetchClients();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'PIN incorrecto');
            setEditPin('');
        } finally {
            setPendingEdit(false);
        }
    };

    const handleOpenStatement = async (client: any) => {
        try {
            setShowStatementModal(true);
            setLoadingStatement(true);
            setStatementData(null);
            setExpandedPayment(null);
            const res = await clientApi.getClientStatement(client.id);
            setStatementData(res.data);
        } catch (error) {
            toast.error("Error al cargar estado de cuenta");
            setShowStatementModal(false);
        } finally {
            setLoadingStatement(false);
        }
    };

    const filteredClients = clients.filter(c =>
        ((c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.documentId && c.documentId.toLowerCase().includes(search.toLowerCase()))) &&
        (!sellerFilter || c.createdById === Number(sellerFilter))
    );

    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const safeName = name || 'C';
        let hash = 0;
        for (let i = 0; i < safeName.length; i++) {
            hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash % colors.length)];
    };

    return (
        <>
        <div className="products-page">
            <Sidebar />
            <main className="products-main">
                <header className="page-header">
                    <div className="header-text">
                        <h1>Directorio de Clientes</h1>
                        <p>Gestión de clientes y facturación centralizada</p>
                    </div>
                    <div className="header-tools">
                        <div 
                            className="search-wrapper"
                            style={{ 
                                position: 'relative', 
                                width: '100%',
                                maxWidth: '350px',
                                flexShrink: 0,
                                margin: 0,
                                padding: 0
                            }}
                        >
                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o DNI..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onFocus={() => {
                                    setActiveField('search');
                                    setActiveKeyboard('qwerty');
                                }}
                                inputMode="none"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.875rem 60px 0.875rem 3rem',
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.95rem',
                                    transition: 'all 0.2s'
                                }}
                            />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    style={{
                                        position: 'absolute',
                                        right: '30px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        zIndex: 10
                                    }}
                                >
                                    <Trash2 size={20} strokeWidth={2.5} color="#ef4444" />
                                </button>
                            )}
                        </div>
                        {isAdmin && users.length > 0 && (
                            <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
                                style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.8rem', fontWeight: 700, outline: 'none', minWidth: '130px' }}>
                                <option value="">Vendedor: Todos</option>
                                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        )}
                        <button className="btn-add" onClick={handleOpenCreate}>
                            <UserPlus size={20} />
                            <span>Nuevo Cliente</span>
                        </button>
                    </div>
                </header>

                <div className="products-table-wrapper animate-in">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>CLIENTE</th>
                                <th>DOCUMENTO / DNI</th>
                                <th>CONTACTO</th>
                                <th>DIRECCIÓN</th>
                                {isAdmin && <th>VENDEDOR</th>}
                                <th>ESTADO</th>
                                <th style={{ textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length > 0 ? filteredClients.map(client => (
                                <tr key={client.id}>
                                    <td>
                                        <div className="product-cell">
                                            <div
                                                className="product-img"
                                                style={{
                                                    background: `${getAvatarColor(client.name)}20`,
                                                    color: getAvatarColor(client.name),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    fontWeight: '900',
                                                    border: `1px solid ${getAvatarColor(client.name)}40`
                                                }}
                                            >
                                                {(client.name || 'C').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="product-details">
                                                <span className="name">{client.name || 'Cliente sin nombre'}</span>
                                                <span className="sku" style={{ color: '#94a3b8' }}>ID: #{client.id.toString().padStart(4, '0')}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <CreditCard size={14} className="text-slate-500" />
                                            <span className="font-mono text-sm">{client.documentId || '---'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1">
                                            {client.phone && (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Phone size={12} className="text-blue-400" />
                                                    <span className="text-xs">{client.phone}</span>
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center gap-2 text-slate-400">
                                                    <Mail size={12} className="text-slate-500" />
                                                    <span className="text-xs">{client.email}</span>
                                                </div>
                                            )}
                                            {!client.phone && !client.email && <span className="text-slate-600">---</span>}
                                        </div>
                                    </td>
                                    <td style={{ maxWidth: '250px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                            <MapPin size={14} style={{ flexShrink: 0, color: '#64748b' }} />
                                            <span className="text-sm truncate-2" style={{ lineHeight: '1.2' }}>{client.address || 'Sin dirección registrada'}</span>
                                        </div>
                                    </td>
                                    {isAdmin && <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{client.createdBy?.name || '---'}</td>}
                                    <td>
                                        <span className={`status-badge ${client.isActive ? 'ok' : 'low'}`} style={{ padding: '6px 14px', border: '1px solid currentColor' }}>
                                            {client.isActive ? 'ACTIVO' : 'INACTIVO'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="t-actions" style={{ justifyContent: 'flex-end', gap: '8px' }}>
                                            <button className="btn-icon-table edit" onClick={() => handleOpenStatement(client)} title="Ver Estado de Cuenta" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                <FileText size={18} />
                                            </button>
                                            <button className="btn-icon-table edit" onClick={() => handleOpenEdit(client)} title="Editar Cliente">
                                                <Edit3 size={18} />
                                            </button>
                                            <button className="btn-icon-table delete" onClick={() => { setDeleteTarget(client); setDeletePin(''); }} title="Eliminar Cliente" style={{ color: '#ef4444' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state" style={{ padding: '4rem 0' }}>
                                            <Users size={64} opacity={0.1} />
                                            <p style={{ marginTop: '1rem', color: '#64748b' }}>No hay clientes que coincidan con la búsqueda</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="modal-overlay">
                        <div className="product-modal animate-in" style={{ maxWidth: '750px' }}>
                            <header className="modal-header">
                                <div>
                                    <h2>{editingId ? 'Actualizar Cliente' : 'Nuevo Cliente'}</h2>
                                    <p>Gestión de información y contacto comercial</p>
                                </div>
                                <button className="btn-close" onClick={() => setShowModal(false)}><X size={24} /></button>
                            </header>

                            <form onSubmit={handleSave} className="modal-body" style={{ padding: '1.5rem 2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    {/* Izquierda: Identificación */}
                                    <div className="p-section" style={{ border: 'none', padding: 0, margin: 0 }}>
                                        <h3 className="section-title" style={{ marginBottom: '1.25rem' }}><User size={16} /> Identificación</h3>
                                        <div className="field" style={{ marginBottom: '1.25rem' }}>
                                            <label>Nombre Completo / Razón Social <span className="required-star">*</span></label>
                                            <input 
                                                required type="text" value={formData.name} 
                                                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                                placeholder="Ej: Distribuidora Sol S.A." 
                                                onFocus={() => { setActiveField('name'); setActiveKeyboard('qwerty'); }}
                                                inputMode="none"
                                            />
                                        </div>
                                        <div className="field">
                                            <label>DNI / NIT / Documento</label>
                                            <div className="input-with-icon">
                                                <CreditCard size={16} />
                                                <input 
                                                    type="text" value={formData.documentId} 
                                                    onChange={e => setFormData({ ...formData, documentId: e.target.value })} 
                                                    placeholder="Ej: 0000-000000-000-0" 
                                                    onFocus={() => { setActiveField('documentId'); setActiveKeyboard('numeric'); }}
                                                    inputMode="none"
                                                />
                                            </div>
                                        </div>
                                        
                                        {editingId && (
                                            <div className="field" style={{ marginTop: '1.25rem' }}>
                                                <label style={{ marginBottom: '0.4rem' }}>Estado del Cliente</label>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'space-between',
                                                    gap: '1rem',
                                                    height: '45px',
                                                    background: '#0f172a60',
                                                    padding: '0 1.25rem',
                                                    borderRadius: '12px',
                                                    border: '1px solid #1e293b'
                                                }}>
                                                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: formData.isActive ? '#10b981' : '#ef4444' }}>
                                                        {formData.isActive ? 'ACTIVO' : 'INACTIVO'}
                                                    </span>
                                                    <label className="p-toggle" style={{ margin: 0 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.isActive}
                                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                                        />
                                                        <span className="p-slider"></span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Derecha: Contacto */}
                                    <div className="p-section" style={{ border: 'none', padding: 0, margin: 0 }}>
                                        <h3 className="section-title" style={{ marginBottom: '1.25rem' }}><Phone size={16} /> Datos de Contacto</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.25rem' }}>
                                            <div className="field">
                                                <label>Teléfono</label>
                                                <div className="input-with-icon">
                                                    <Phone size={16} />
                                                    <input 
                                                        type="tel" value={formData.phone} 
                                                        onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                                                        placeholder="7777-6666" 
                                                        onFocus={() => { setActiveField('phone'); setActiveKeyboard('numeric'); }}
                                                        inputMode="none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="field">
                                                <label>Email</label>
                                                <div className="input-with-icon">
                                                    <Mail size={16} />
                                                    <input 
                                                        type="email" value={formData.email} 
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })} 
                                                        placeholder="hola@ejemplo.com" 
                                                        onFocus={() => { setActiveField('email'); setActiveKeyboard('qwerty'); }}
                                                        inputMode="none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="field">
                                            <label>Dirección Física / Entrega</label>
                                            <div className="input-with-icon">
                                                <MapPin size={16} />
                                                <textarea 
                                                    value={formData.address} 
                                                    onChange={e => setFormData({ ...formData, address: e.target.value })} 
                                                    placeholder="Ciudad, Calle, Local..." 
                                                    onFocus={() => { setActiveField('address'); setActiveKeyboard('qwerty'); }}
                                                    inputMode="none"
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '0.75rem 1rem 0.75rem 2.8rem', 
                                                        borderRadius: '12px', 
                                                        background: '#0f172a', 
                                                        border: '1px solid #334155', 
                                                        color: 'white',
                                                        minHeight: '100px',
                                                        resize: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="field" style={{ marginTop: '1rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Truck size={14} /> Delivery Asignado</label>
                                            <select value={formData.deliveryId || ''} onChange={e => setFormData({ ...formData, deliveryId: e.target.value ? Number(e.target.value) : null })}
                                                style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.6rem 0.8rem', color: 'white', fontSize: '0.85rem', outline: 'none' }}>
                                                <option value="">Sin delivery</option>
                                                {deliveries.map(d => (<option key={d.id} value={d.id}>{d.name} {d.phone ? `(${d.phone})` : ''}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <footer className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                                    <button type="submit" className="btn-main">
                                        <CheckCircle size={20} />
                                        <span>{editingId ? 'Actualizar Cliente' : 'Registrar Cliente'}</span>
                                    </button>
                                </footer>
                            </form>
                        </div>
                    </div>
                )}

                {showStatementModal && (
                    <div className="modal-overlay">
                        <div className="payment-modal history-modal animate-in zoom-in-95" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                            <div className="pm-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '8px', borderRadius: '10px' }}>
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>Estado de Cuenta</h3>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                            {statementData ? statementData.client.name : 'Cargando...'}
                                        </span>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowStatementModal(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: '4px' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="pm-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {loadingStatement ? (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando datos del cliente...</div>
                                ) : statementData ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                        {/* Resumen */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Deuda Actual</span>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: statementData.summary.totalDebt > 0 ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
                                                    ${Number(statementData.summary.totalDebt).toFixed(2)}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>en {statementData.summary.pendingInvoices} facturas</span>
                                            </div>
                                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Total Pagado</span>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '0.25rem' }}>
                                                    ${Number(statementData.summary.totalPaid).toFixed(2)}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Histórico de abonos</span>
                                            </div>
                                            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1rem', borderRadius: '12px', border: '1px solid #334155' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Histórico de Créditos</span>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', marginTop: '0.25rem' }}>
                                                    ${Number(statementData.summary.totalHistoricallySold).toFixed(2)}
                                                </div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Ventas Facturadas</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                                            {/* Historial de Pagos */}
                                            <div>
                                                <h4 style={{ marginBottom: '1rem', color: 'white', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <DollarSign size={18} color="#10b981" /> Historial de Abonos
                                                </h4>
                                                {statementData.history.payments.length === 0 ? (
                                                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay abonos registrados.</div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                        {statementData.history.payments.map((payment: any) => (
                                                            <div key={payment.id} className="history-card" style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                                                                <div
                                                                    style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                                    onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                                                                >
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 600, color: 'white', fontSize: '0.9rem' }}>Abono Registrado</span>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                                            <Calendar size={12} />
                                                                            <span>{format(new Date(payment.createdAt), "dd MMM yyyy, hh:mm a", { locale: es })}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                                        <span style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>+${Number(payment.amount).toFixed(2)}</span>
                                                                        <div style={{ color: '#64748b', transform: expandedPayment === payment.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                                                            <ArrowRight size={16} />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {expandedPayment === payment.id && payment.applications?.length > 0 && (
                                                                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <h4 style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Distribución del Pago</h4>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                            {payment.applications.map((app: any) => (
                                                                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(30, 41, 59, 0.8)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                                        <strong style={{ color: '#cbd5e1' }}>Venta #{app.saleId}</strong>
                                                                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Emitida: {format(new Date(app.sale.createdAt), 'dd/MM/yyyy')}</span>
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

                                            {/* Historial de Facturas */}
                                            <div>
                                                <h4 style={{ marginBottom: '1rem', color: 'white', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <FileText size={18} color="#3b82f6" /> Facturas de Crédito
                                                </h4>
                                                {statementData.history.sales.length === 0 ? (
                                                    <div style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No hay ventas registradas.</div>
                                                ) : (
                                                    <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '12px' }}>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                            <thead>
                                                                <tr style={{ background: 'rgba(15, 23, 42, 0.5)', borderBottom: '1px solid #334155' }}>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8' }}># Venta</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', color: '#94a3b8' }}>Fecha</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8' }}>Total Venta</th>
                                                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#94a3b8' }}>Deuda Restante</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {statementData.history.sales.map((sale: any) => (
                                                                    <tr key={sale.id} style={{ borderBottom: '1px solid #334155' }}>
                                                                        <td style={{ padding: '0.75rem 1rem', color: 'white', fontWeight: 600 }}>{sale.id}</td>
                                                                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{format(new Date(sale.createdAt), 'dd MMM yyyy', { locale: es })}</td>
                                                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: 'white' }}>${Number(sale.total).toFixed(2)}</td>
                                                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: Number(sale.balance) > 0 ? '#ef4444' : '#10b981' }}>
                                                                            ${Number(sale.balance).toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>Error al cargar datos.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <AnimatePresence>
                    {activeKeyboard === 'qwerty' && (
                        <VirtualKeyboard 
                            value={activeField === 'search' ? search : (formData as any)[activeField || '']}
                            onChange={(val) => {
                                if (activeField === 'search') setSearch(val);
                                else setFormData({ ...formData, [activeField!]: val });
                            }}
                            onClose={() => setActiveKeyboard(null)}
                            onConfirm={() => setActiveKeyboard(null)}
                            title={`EDITANDO ${activeField?.toUpperCase()}`}
                        />
                    )}
                    {activeKeyboard === 'numeric' && (
                        <NumericKeyboard 
                            value={(formData as any)[activeField!]}
                            onChange={(val) => setFormData({ ...formData, [activeField!]: val })}
                            onClose={() => setActiveKeyboard(null)}
                            onConfirm={() => setActiveKeyboard(null)}
                            title={`EDITANDO ${activeField?.toUpperCase()}`}
                        />
                    )}
                </AnimatePresence>
            </main>
            <style>{`
                .header-tools { 
                    display: flex; 
                    gap: 1rem; 
                    align-items: center; 
                    overflow-x: auto;
                    padding: 4px 0;
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .header-tools::-webkit-scrollbar { display: none; }
                
                .search-wrapper input:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

                .products-table-wrapper { border: 1px solid #334155; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-radius: 20px; overflow: hidden; }
                .products-table { border-collapse: separate; border-spacing: 0; }
                .products-table th { 
                    border-bottom: 2px solid #334155; 
                    background: #0f172a; 
                    color: #64748b;
                    font-weight: 800;
                    padding: 0.95rem 1.5rem;
                }
                .products-table td { 
                    border-bottom: 1px solid #334155; 
                    padding: 0.65rem 1.5rem;
                }
                .products-table tr:hover td { background: #33415544; }
                .products-table tr:last-child td { border-bottom: none; }
                
                .truncate-2 {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .product-cell { display: flex; align-items: center; gap: 1rem; }
                .product-img { width: 42px; height: 42px; border-radius: 12px; overflow: hidden; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
                .product-details { display: flex; flex-direction: column; }
                .product-details .name { font-weight: 700; color: #f8fafc; font-size: 0.95rem; }
                .product-details .sku { font-size: 0.75rem; color: #64748b; font-family: monospace; }
                
                .status-badge {
                    font-size: 0.65rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    border-radius: 8px;
                    display: inline-block;
                }
                .status-badge.ok { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
                .status-badge.low { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

                .field label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 0.5rem; display: flex; align-items: center; min-height: 1.2rem; }
                .required-star { color: #ef4444; margin-left: 4px; font-size: 1.1rem; line-height: 0; position: relative; top: 2px; }

                .input-with-icon { position: relative; width: 100%; }
                .input-with-icon svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #475569; pointer-events: none; }
                .input-with-icon input { padding-left: 2.8rem !important; }
            `}</style>
        </div>

            {deleteTarget && (
                <div className="modal-overlay" style={{ zIndex: 5000, background: 'rgba(0,0,0,0.7)' }} onClick={() => { setDeleteTarget(null); setDeletePin(''); }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: '24px', padding: '2rem', width: '400px', maxWidth: '90vw', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <ShieldAlert size={28} style={{ color: '#ef4444', flexShrink: 0 }} />
                            <div>
                                <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>Eliminar Cliente</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Requiere PIN de Super Admin</p>
                            </div>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            ¿Eliminar a <strong style={{ color: 'white' }}>{deleteTarget.name}</strong>? Solo se puede eliminar si no tiene ventas registradas.
                        </p>
                        <input
                            type="password" autoComplete="off"
                            autoFocus
                            value={deletePin}
                            onChange={e => setDeletePin(e.target.value)}
                            placeholder="PIN de seguridad"
                            maxLength={6}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', marginBottom: '1.5rem' }}
                            onKeyDown={async e => {
                                if (e.key !== 'Enter' || !deletePin) return;
                                setIsDeleting(true);
                                try {
                                    await adminAuthApi.verifyPin(deletePin);
                                    const res = await clientApi.deleteClient(deleteTarget.id);
                                    toast.success(res.data?.message || 'Cliente eliminado');
                                    setDeleteTarget(null);
                                    setDeletePin('');
                                    fetchClients();
                                } catch (err: any) {
                                    toast.error(err.response?.data?.message || 'Error al eliminar');
                                } finally {
                                    setIsDeleting(false);
                                }
                            }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setDeleteTarget(null); setDeletePin(''); }} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
                                Cancelar
                            </button>
                            <button onClick={async () => {
                                if (!deletePin) return;
                                setIsDeleting(true);
                                try {
                                    await adminAuthApi.verifyPin(deletePin);
                                    const res = await clientApi.deleteClient(deleteTarget.id);
                                    toast.success(res.data?.message || 'Cliente eliminado');
                                    setDeleteTarget(null);
                                    setDeletePin('');
                                    fetchClients();
                                } catch (err: any) {
                                    toast.error(err.response?.data?.message || 'Error al eliminar');
                                } finally {
                                    setIsDeleting(false);
                                }
                            }} disabled={!deletePin || isDeleting} style={{ flex: 1.5, padding: '0.8rem', borderRadius: '12px', background: !deletePin || isDeleting ? '#334155' : '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: !deletePin || isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditPinModal && (
                <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setShowEditPinModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: '24px', padding: '2rem', width: '400px', maxWidth: '90vw', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                            <ShieldAlert size={28} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                            <div>
                                <h3 style={{ color: '#8b5cf6', margin: 0, fontSize: '1.2rem', fontWeight: 900 }}>PIN de Administrador</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Este cliente ya tiene ventas, requiere PIN de admin</p>
                            </div>
                        </div>
                        <input type="password" autoComplete="off" autoFocus value={editPin}
                            onChange={e => setEditPin(e.target.value)}
                            placeholder="PIN de seguridad"
                            maxLength={6}
                            onKeyDown={e => e.key === 'Enter' && handleEditPinSubmit()}
                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.3em', fontWeight: 'bold', outline: 'none', boxSizing: 'border-box', marginBottom: '1.5rem' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={() => { setShowEditPinModal(false); setEditPin(''); }} style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                            <button onClick={handleEditPinSubmit} disabled={!editPin || pendingEdit} style={{ flex: 1.5, padding: '0.8rem', borderRadius: '12px', background: !editPin || pendingEdit ? '#334155' : '#8b5cf6', color: 'white', border: 'none', fontWeight: 800, cursor: !editPin || pendingEdit ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                                {pendingEdit ? 'Validando...' : 'Autorizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Clients;
