import React, { useState, useEffect } from 'react';
import { Search, Building2, Plus, Edit3, CheckCircle, X, Phone, Mail, MapPin, User, Trash2 } from 'lucide-react';
import { providerApi } from '../services/api';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import VirtualKeyboard from '../components/VirtualKeyboard';
import NumericKeyboard from '../components/NumericKeyboard';
import { AnimatePresence } from 'framer-motion';

const Suppliers: React.FC = () => {
    const [providers, setProviders] = useState<any[]>([]);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeKeyboard, setActiveKeyboard] = useState<'qwerty' | 'numeric' | null>(null);
    const [activeField, setActiveField] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        vendor: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            const res = await providerApi.getProviders();
            setProviders(res.data);
        } catch (error) {
            toast.error('Error al cargar proveedores');
        }
    };

    const handleOpenCreate = () => {
        setFormData({ name: '', vendor: '', phone: '', email: '', address: '' });
        setEditingId(null);
        setShowModal(true);
    };

    const handleOpenEdit = (p: any) => {
        setFormData({
            name: p.name || '',
            vendor: p.vendor || '',
            phone: p.phone || '',
            email: p.email || '',
            address: p.address || ''
        });
        setEditingId(p.id);
        setShowModal(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('El nombre del proveedor es obligatorio');
            return;
        }
        try {
            if (editingId) {
                await providerApi.updateProvider(editingId, formData);
                toast.success('Proveedor actualizado con éxito');
            } else {
                await providerApi.createProvider(formData);
                toast.success('Proveedor creado con éxito');
            }
            setShowModal(false);
            fetchProviders();
        } catch (error) {
            toast.error('Error al guardar proveedor');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Desactivar este proveedor?')) return;
        try {
            await providerApi.deleteProvider(id);
            toast.success('Proveedor desactivado');
            fetchProviders();
        } catch (error) {
            toast.error('Error al desactivar proveedor');
        }
    };

    const filtered = providers.filter(p =>
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.vendor || '').toLowerCase().includes(search.toLowerCase())
    );

    const getAvatarColor = (name: string) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
        const safeName = name || 'P';
        let hash = 0;
        for (let i = 0; i < safeName.length; i++) {
            hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash % colors.length)];
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main">
                <header className="page-header">
                    <div className="header-text">
                        <h1>Directorio de Proveedores</h1>
                        <p>Gestión de proveedores y contactos</p>
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
                                placeholder="Buscar por nombre o contacto..."
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
                        <button className="btn-add" onClick={handleOpenCreate}>
                            <Building2 size={20} />
                            <span>Nuevo Proveedor</span>
                        </button>
                    </div>
                </header>

                <div className="products-table-wrapper animate-in">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>PROVEEDOR</th>
                                <th>CONTACTO</th>
                                <th>TELÉFONO</th>
                                <th>EMAIL</th>
                                <th>DIRECCIÓN</th>
                                <th style={{ textAlign: 'right' }}>ACCIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id} className={!p.isActive ? 'row-inactive' : ''}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                background: getAvatarColor(p.name),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 800,
                                                fontSize: '1rem',
                                                color: 'white',
                                                flexShrink: 0
                                            }}>
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {p.vendor ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                                                <User size={14} /> {p.vendor}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#475569' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {p.phone ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                                                <Phone size={14} /> {p.phone}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#475569' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {p.email ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                                                <Mail size={14} /> {p.email}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#475569' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {p.address ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8' }}>
                                                <MapPin size={14} /> {p.address}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#475569' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => handleOpenEdit(p)} title="Editar">
                                                <Edit3 size={16} />
                                            </button>
                                            <button className="btn-icon danger" onClick={() => handleDelete(p.id)} title="Desactivar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="empty-table">
                            <Building2 size={48} />
                            <p>{search ? 'Sin resultados para esta búsqueda' : 'No hay proveedores registrados'}</p>
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-container modal-medium" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
                                <button className="modal-close" onClick={() => setShowModal(false)}>
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Nombre del proveedor *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            onFocus={() => { setActiveKeyboard('qwerty'); setActiveField('name'); }}
                                            placeholder="Ej: Distribuidora Farmacéutica S.A."
                                            inputMode="none"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Persona de contacto</label>
                                        <input
                                            type="text"
                                            value={formData.vendor}
                                            onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                            onFocus={() => { setActiveKeyboard('qwerty'); setActiveField('vendor'); }}
                                            placeholder="Nombre del vendedor o representante"
                                            inputMode="none"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Teléfono</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                onFocus={() => { setActiveKeyboard('numeric'); setActiveField('phone'); }}
                                                placeholder="Ej: 7777-8888"
                                                inputMode="none"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Correo electrónico</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                onFocus={() => { setActiveKeyboard('qwerty'); setActiveField('email'); }}
                                                placeholder="proveedor@ejemplo.com"
                                                inputMode="none"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Dirección</label>
                                        <textarea
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            onFocus={() => { setActiveKeyboard('qwerty'); setActiveField('address'); }}
                                            placeholder="Dirección física del proveedor"
                                            rows={2}
                                            inputMode="none"
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        <CheckCircle size={16} /> {editingId ? 'Actualizar Proveedor' : 'Guardar Proveedor'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {activeKeyboard === 'qwerty' && activeField && (
                <VirtualKeyboard
                    value={formData[activeField as keyof typeof formData] as string}
                    onChange={(val) => setFormData({ ...formData, [activeField]: val })}
                    onClose={() => setActiveKeyboard(null)}
                />
            )}
            {activeKeyboard === 'numeric' && activeField && (
                <NumericKeyboard
                    value={formData[activeField as keyof typeof formData] as string}
                    onChange={(val) => setFormData({ ...formData, [activeField]: val })}
                    onClose={() => setActiveKeyboard(null)}
                />
            )}
        </div>
    );
};

export default Suppliers;
