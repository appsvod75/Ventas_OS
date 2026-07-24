import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { branchApi } from '../services/api';
import { Building, Plus, Edit, Trash2, MapPin, Phone, CheckCircle, XCircle, Home } from 'lucide-react';
import toast from 'react-hot-toast';

const BranchManagement: React.FC = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        isActive: true
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
        } catch (error) {
            toast.error('Error al cargar sucursales');
        }
    };

    const handleOpenModal = (branch: any = null) => {
        if (branch) {
            setEditingBranch(branch);
            setFormData({
                name: branch.name,
                address: branch.address || '',
                phone: branch.phone || '',
                isActive: branch.isActive
            });
        } else {
            setEditingBranch(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingBranch) {
                await branchApi.updateBranch(editingBranch.id, formData);
                toast.success('Sucursal actualizada');
            } else {
                await branchApi.createBranch(formData);
                toast.success('Sucursal creada');
            }
            setIsModalOpen(false);
            fetchBranches();
        } catch (error) {
            toast.error('Error al guardar sucursal');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de desactivar esta sucursal?')) {
            try {
                await branchApi.deleteBranch(id);
                toast.success('Sucursal desactivada');
                fetchBranches();
            } catch (error) {
                toast.error('Error al desactivar sucursal');
            }
        }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem' }}>
                <header className="page-header" style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                    <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="header-icon-container" style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            width: '64px', height: '64px',
                            borderRadius: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.2)'
                        }}>
                            <Building size={32} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Gestión de Sucursales</h1>
                            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Administra tus puntos de venta y bodegas</p>
                        </div>
                    </div>
                    <button className="btn-add" onClick={() => handleOpenModal()}>
                        <Plus size={18} />
                        <span>Nueva Sucursal</span>
                    </button>
                </header>

                <div className="table-container" style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th style={{ padding: '1.25rem 2rem' }}>Nombre</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Dirección</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Teléfono</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Estado</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.map(branch => (
                                <tr key={branch.id}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                                <Home size={18} color="#f59e0b" />
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'white' }}>{branch.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', color: '#94a3b8' }}>{branch.address || 'Sin dirección'}</td>
                                    <td style={{ padding: '1.25rem 2rem', color: '#94a3b8' }}>{branch.phone || 'Sin teléfono'}</td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <span className={`p-status ${branch.isActive ? 'active' : 'inactive'}`}>
                                            {branch.isActive ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                        <div className="t-actions">
                                            <button className="btn-icon-table edit" onClick={() => handleOpenModal(branch)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon-table delete" onClick={() => handleDelete(branch.id)} title="Desactivar">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="product-modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <div>
                                    <h2>{editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                                    <p>Configura los datos del punto de venta</p>
                                </div>
                                <button className="btn-close" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="field">
                                        <label>Nombre de la Sucursal</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Sucursal Central"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Dirección</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Ej: San Salvador, Calle Principal..."
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Teléfono</label>
                                        <input
                                            type="text"
                                            value={formData.phone}
                                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="Ej: 2222-2222"
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-main" disabled={loading}>
                                        <CheckCircle size={18} />
                                        {loading ? 'Guardando...' : (editingBranch ? 'Actualizar' : 'Crear Sucursal')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default BranchManagement;
