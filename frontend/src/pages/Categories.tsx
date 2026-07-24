import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { productApi } from '../services/api';
import { Layers, Plus, Edit, Trash2, XCircle, CheckCircle, AlertCircle, Eye, EyeOff, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [showInactive, setShowInactive] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        colorHex: '#3b82f6',
        icon: 'Layers'
    });

    useEffect(() => {
        fetchCategories();
    }, [showInactive]);

    const fetchCategories = async () => {
        try {
            const res = await productApi.getCategories(showInactive);
            setCategories(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleOpenModal = (cat: any = null) => {
        if (cat) {
            setEditingCategory(cat);
            setFormData({
                name: cat.name,
                colorHex: cat.colorHex || '#3b82f6',
                icon: cat.icon || 'Layers'
            });
        } else {
            setEditingCategory(null);
            setFormData({
                name: '',
                colorHex: '#3b82f6',
                icon: 'Layers'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingCategory) {
                await productApi.updateCategory(editingCategory.id, formData);
                toast.success('Categoría actualizada');
            } else {
                await productApi.createCategory(formData);
                toast.success('Categoría creada');
            }
            setIsModalOpen(false);
            fetchCategories();
        } catch (error) {
            toast.error('Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Desactivar Categoría?',
            message: 'La categoría ya no aparecerá en el POS ni en la creación de productos, pero podrás restaurarla después.',
            onConfirm: async () => {
                try {
                    await productApi.deleteCategory(id);
                    toast.success('Categoría desactivada');
                    fetchCategories();
                } catch (error) {
                    toast.error('No se pudo desactivar');
                }
                setConfirmModal(null);
            }
        });
    };

    const handleRestore = async (id: number) => {
        try {
            await productApi.restoreCategory(id);
            toast.success('Categoría restaurada');
            fetchCategories();
        } catch (error) {
            toast.error('Error al restaurar');
        }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main">
                <header className="page-header">
                    <div className="header-text">
                        <h1>Gestión de Categorías</h1>
                        <p>Organiza tus productos por grupos</p>
                    </div>
                    <div className="header-tools">
                        <div className="view-toggles" style={{ display: 'flex', gap: '8px', borderRight: '1px solid #334155', paddingRight: '15px', marginRight: '15px' }}>
                            <button
                                className={`btn-toggle ${!showInactive ? 'active' : ''}`}
                                onClick={() => setShowInactive(false)}
                                title="Ver Activos"
                            >
                                <Eye size={18} />
                            </button>
                            <button
                                className={`btn-toggle ${showInactive ? 'active-red' : ''}`}
                                onClick={() => setShowInactive(true)}
                                title="Ver Desactivados"
                            >
                                <EyeOff size={18} />
                            </button>
                        </div>
                        <button className="btn-add" onClick={() => handleOpenModal()}>
                            <Plus size={18} />
                            <span>Nueva Categoría</span>
                        </button>
                    </div>
                </header>

                <div className="table-container">
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Ícono / Color</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length > 0 ? categories.map(cat => (
                                <tr key={cat.id}>
                                    <td className="t-name">
                                        {cat.name}
                                        {!cat.isActive && <span className="p-status inactive" style={{ marginLeft: '10px', fontSize: '10px' }}>Inactivo</span>}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '6px',
                                                background: cat.colorHex || '#3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                opacity: cat.isActive ? 1 : 0.4
                                            }}>
                                                <Layers size={14} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{cat.colorHex || '#3b82f6'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="t-actions">
                                            {cat.isActive ? (
                                                <>
                                                    <button className="btn-icon-table edit" onClick={() => handleOpenModal(cat)} title="Editar">
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="btn-icon-table delete" onClick={() => handleDelete(cat.id)} title="Desactivar">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button className="btn-icon-table restore" onClick={() => handleRestore(cat.id)} title="Restaurar" style={{ color: '#10b981' }}>
                                                    <RotateCcw size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3}>
                                        <div className="empty-state">
                                            <Layers size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                                            <p>No se encontraron categorías</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="product-modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <div>
                                    <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
                                    <p>Asigna un nombre y color distintivo</p>
                                </div>
                                <button className="btn-close" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="field">
                                        <label>Nombre de la Categoría</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Farmacia, Bebidas..."
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Color (Hex)</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="color"
                                                value={formData.colorHex}
                                                onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                                style={{ width: '50px', padding: '2px', height: '44px' }}
                                            />
                                            <input
                                                type="text"
                                                value={formData.colorHex}
                                                onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-main" disabled={loading}>
                                        <CheckCircle size={18} />
                                        {loading ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Guardar')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* MODAL DE CONFIRMACIÓN CUSTOM */}
                {confirmModal && confirmModal.isOpen && (
                    <div className="modal-overlay">
                        <div className="product-modal" style={{ maxWidth: '400px' }}>
                            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                                <div style={{ textAlign: 'center', width: '100%' }}>
                                    <div style={{
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 1.5rem',
                                        color: '#ef4444'
                                    }}>
                                        <AlertCircle size={32} />
                                    </div>
                                    <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{confirmModal.title}</h2>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>{confirmModal.message}</p>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center', gap: '1rem', paddingTop: '2rem' }}>
                                <button className="btn-ghost" onClick={() => setConfirmModal(null)} style={{ flex: 1 }}>Cancelar</button>
                                <button className="btn-main" onClick={confirmModal.onConfirm} style={{ background: '#ef4444', flex: 1 }}>
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
            `}</style>
        </div>
    );
};

export default Categories;
