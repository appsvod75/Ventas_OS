import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { deliveryApi } from '../services/api';
import { Truck, Plus, Edit3, X, Phone, CheckCircle, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const Deliveries: React.FC = () => {
    const [items, setItems] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', phone: '' });

    const fetchData = async () => { try { const res = await deliveryApi.getAll(); setItems(res.data); } catch {} };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!form.name.trim()) return toast.error('Nombre requerido');
        try {
            if (editing) await deliveryApi.update(editing.id, form);
            else await deliveryApi.create(form);
            toast.success(editing ? 'Actualizado' : 'Creado');
            setShowModal(false);
            fetchData();
        } catch { toast.error('Error al guardar'); }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem', overflow: 'auto' }}>
                <header className="page-header" style={{ marginBottom: '2rem' }}>
                    <div className="header-text">
                        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Deliverys</h1>
                        <p style={{ color: '#94a3b8', margin: '0.25rem 0 0' }}>Repartidores registrados</p>
                    </div>
                    <div className="header-tools">
                        <button className="btn-erp" onClick={() => { setEditing(null); setForm({ name: '', phone: '' }); setShowModal(true); }}><Plus size={18} /> Nuevo</button>
                    </div>
                </header>
                <div className="products-table-wrapper">
                    <table className="products-table">
                        <thead><tr><th>NOMBRE</th><th>TELÉFONO</th><th>ESTADO</th><th style={{ textAlign: 'right' }}>ACCIONES</th></tr></thead>
                        <tbody>
                            {items.map(d => (
                                <tr key={d.id}>
                                    <td><span style={{ fontWeight: 700, color: '#e2e8f0' }}>{d.name}</span></td>
                                    <td style={{ color: '#94a3b8' }}>{d.phone || '---'}</td>
                                    <td>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', width: 'fit-content' }}>
                                            <input type="checkbox" checked={d.isActive} onChange={async () => {
                                                await deliveryApi.update(d.id, { isActive: !d.isActive });
                                                fetchData();
                                            }} style={{ accentColor: '#10b981', width: '16px', height: '16px', cursor: 'pointer' }} />
                                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: d.isActive ? '#10b981' : '#64748b' }}>{d.isActive ? 'ACTIVO' : 'INACTIVO'}</span>
                                        </label>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button className="btn-icon-table edit" onClick={() => { setEditing(d); setForm({ name: d.name, phone: d.phone || '' }); setShowModal(true); }}><Edit3 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()} className="product-modal animate-in" style={{ maxWidth: '450px' }}>
                        <header className="modal-header">
                            <h2 style={{ color: 'white', fontWeight: 800 }}>{editing ? 'Editar Delivery' : 'Nuevo Delivery'}</h2>
                            <button className="btn-close" onClick={() => setShowModal(false)}><X size={24} /></button>
                        </header>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="field"><label>Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del repartidor" /></div>
                            <div className="field"><label>Teléfono</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="7000-0000" /></div>
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '0.5rem 1.25rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleSave} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle size={16} /> {editing ? 'Actualizar' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deliveries;
