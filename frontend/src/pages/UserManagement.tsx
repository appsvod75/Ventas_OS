import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { adminAuthApi, branchApi } from '../services/api';
import { Users as UsersIcon, Plus, Edit, Shield, MapPin, CheckCircle, XCircle, UserPlus, ToggleLeft, ToggleRight, Lock, Key } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Security states
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [confirmPin, setConfirmPin] = useState('');
    const [pendingAction, setPendingAction] = useState<any>(null);
    const [pinLoading, setPinLoading] = useState(false);

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'Super Admin';

    const [formData, setFormData] = useState({
        name: '',
        pin: '',
        roleId: '3', // default Cajero (Vendedor)
        branchId: '',
        isActive: true
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, branchesRes] = await Promise.all([
                adminAuthApi.getUsers(),
                branchApi.getBranches()
            ]);
            setUsers(usersRes.data);
            setBranches(branchesRes.data);
            if (branchesRes.data.length > 0 && !formData.branchId) {
                setFormData(prev => ({ ...prev, branchId: branchesRes.data[0].id.toString() }));
            }
        } catch (error) {
            toast.error('Error al cargar datos');
        }
    };

    const handleOpenModal = async (user: any = null) => {
        if (user) {
            // Require PIN to open edit modal for ANY user
            setPendingAction({ type: 'EDIT', user });
            setConfirmPin('');
            setIsPinModalOpen(true);
            return;
        }
        
        // Creating new user also requires PIN (though maybe not, but user said "edicion")
        // User said: "si alguien se quiere pasar de vivo y cambiarle... que ese boton de editar y el de desactivacion soliciten PIN"
        // Let's stick to Edit and Toggle Status.

        setEditingUser(null);
        setFormData({
            name: '',
            pin: '',
            roleId: '3',
            branchId: branches[0]?.id.toString() || '',
            isActive: true
        });
        setIsModalOpen(true);
    };

    const proceedWithEdit = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            pin: '',
            roleId: user.roleId.toString(),
            branchId: user.branchId.toString(),
            isActive: user.isActive
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser && !formData.pin) {
            toast.error('El PIN es requerido para nuevos usuarios');
            return;
        }
        setLoading(true);
        try {
            if (editingUser) {
                await adminAuthApi.updateUser(editingUser.id, formData);
                toast.success('Usuario actualizado');
            } else {
                await adminAuthApi.createUser(formData);
                toast.success('Usuario creado');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error('Error al guardar usuario');
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (user: any) => {
        setPendingAction({ type: 'TOGGLE', user });
        setConfirmPin('');
        setIsPinModalOpen(true);
    };

    const proceedWithToggle = async (user: any) => {
        try {
            await adminAuthApi.updateUser(user.id, { ...user, isActive: !user.isActive });
            toast.success(`Usuario ${!user.isActive ? 'activado' : 'desactivado'}`);
            fetchData();
        } catch (error) {
            toast.error('Error al cambiar estado');
        }
    };

    const handleConfirmPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinLoading(true);
        try {
            await adminAuthApi.verifyPin(confirmPin);
            setIsPinModalOpen(false);
            
            if (pendingAction.type === 'EDIT') {
                proceedWithEdit(pendingAction.user);
            } else if (pendingAction.type === 'TOGGLE') {
                proceedWithToggle(pendingAction.user);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'PIN incorrecto');
        } finally {
            setPinLoading(false);
            setPendingAction(null);
        }
    };

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem' }}>
                <header className="page-header" style={{ marginBottom: '3rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.5rem' }}>
                    <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div className="header-icon-container" style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            width: '64px', height: '64px',
                            borderRadius: '18px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            <UsersIcon size={32} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>Gestión de Personal</h1>
                            <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Administra accesos, roles y sucursales del equipo</p>
                        </div>
                    </div>
                    <button className="btn-add" onClick={() => handleOpenModal()}>
                        <UserPlus size={18} />
                        <span>Nuevo Usuario</span>
                    </button>
                </header>

                <div className="table-container" style={{ background: '#1e293b', borderRadius: '24px', border: '1px solid #334155', overflow: 'hidden' }}>
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th style={{ padding: '1.25rem 2rem' }}>Nombre</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Rol</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Sucursal</th>
                                <th style={{ padding: '1.25rem 2rem' }}>Estado</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ fontWeight: 600, color: 'white' }}>{user.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID #{user.id}</div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Shield size={14} color={user.role.name === 'Admin' ? '#f59e0b' : '#3b82f6'} />
                                            <span style={{ fontWeight: 500 }}>{user.role.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                                            <MapPin size={14} />
                                            <span>{user.branch?.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem' }}>
                                        <span className={`p-status ${user.isActive ? 'active' : 'inactive'}`}>
                                            {user.isActive ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                                        <div className="t-actions">
                                            <button className="btn-icon-table edit" onClick={() => handleOpenModal(user)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                className="btn-icon-table"
                                                onClick={() => toggleStatus(user)}
                                                title={user.isActive ? 'Desactivar' : 'Activar'}
                                                style={{ color: user.isActive ? '#ef4444' : '#10b981' }}
                                            >
                                                {user.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {isPinModalOpen && (
                    <div className="modal-overlay">
                        <div className="product-modal" style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: '#ef4444' }}>
                                        <Lock size={24} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem' }}>Confirmación Requerida</h2>
                                        <p style={{ fontSize: '0.85rem' }}>Ingresa tu PIN de administrador</p>
                                    </div>
                                </div>
                                <button className="btn-close" onClick={() => setIsPinModalOpen(false)}><XCircle size={24} /></button>
                            </div>
                            <form onSubmit={handleConfirmPin}>
                                <div className="modal-body">
                                    <div className="field">
                                        <label>PIN de Administrador</label>
                                        <div className="input-with-icon">
                                            <Key size={18} />
                                            <input
                                                autoFocus
                                                type="password" autoComplete="off"
                                                maxLength={6}
                                                value={confirmPin}
                                                onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                                                placeholder="6 dígitos"
                                                required
                                                style={{ textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.2rem' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setIsPinModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-main" disabled={pinLoading} style={{ background: '#ef4444' }}>
                                        <CheckCircle size={18} />
                                        {pinLoading ? 'Verificando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="product-modal" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <div>
                                    <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                                    <p>Configura el acceso y permisos</p>
                                </div>
                                <button className="btn-close" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
                            </div>

                            <form onSubmit={handleSave}>
                                <div className="modal-body">
                                    <div className="field">
                                        <label>Nombre Completo</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Ej: Juan Pérez"
                                        />
                                    </div>
                                    <div className="field">
                                        <label>PIN de Acceso (6 dígitos)</label>
                                        <input
                                            type="password" autoComplete="off"
                                            maxLength={6}
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                                            placeholder={editingUser ? "Dejar en blanco para no cambiar" : "Ej: 123456"}
                                            required={!editingUser}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="field">
                                            <label>Rol / Permisos</label>
                                            <select
                                                value={formData.roleId}
                                                onChange={e => setFormData({ ...formData, roleId: e.target.value })}
                                            >
                                                {isSuperAdmin && <option value="1">Super Admin</option>}
                                                <option value="2">Administrador</option>
                                                <option value="3">Cajero / Vendedor</option>
                                            </select>
                                        </div>
                                        <div className="field">
                                            <label>Sucursal Asignada</label>
                                            <select
                                                value={formData.branchId}
                                                onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                            >
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                    <button type="submit" className="btn-main" disabled={loading}>
                                        <CheckCircle size={18} />
                                        {loading ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear Usuario')}
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

export default UserManagement;
