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
                <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Deliverys</h1>
                        <p style={{ color: '#94a3b8' }}>Repartidores registrados</p>
                    </div>
                    <button className="btn-add" onClick={() => { setEditing(null); setForm({ name: '', phone: '' }); setShowModal(true); }}><Plus size={20} /> Nuevo</button>
                </header>
                <div className="products-table-wrapper">
                    <table className="products-table">
                        <thead><tr><th>NOMBRE</th><th>TELÉFONO</th><th>ESTADO</th><th style={{ textAlign: 'right' }}>ACCIONES</th></tr></thead>
                        <tbody>
                            {items.map(d => (
                                <tr key={d.id}>
                                    <td><span style={{ fontWeight: 700, color: '#e2e8f0' }}>{d.name}</span></td>
                                    <td style={{ color: '#94a3b8' }}>{d.phone || '---'}</td>
                                    <td><span className={`badge ${d.isActive ? 'badge-success' : 'badge-warning'}`}>{d.isActive ? 'ACTIVO' : 'INACTIVO'}</span></td>
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
                        <div className="modal-body" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="field"><label>Nombre</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre del repartidor" /></div>
                            <div className="field"><label>Teléfono</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="7000-0000" /></div>
                            <footer className="modal-footer" style={{ padding: '0.75rem 0 0' }}>
                                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className="btn-main" onClick={handleSave}><CheckCircle size={18} /> {editing ? 'Actualizar' : 'Guardar'}</button>
                            </footer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deliveries;
