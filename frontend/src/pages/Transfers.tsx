import React, { useState, useEffect } from 'react';
import { Truck, Search, Filter, Eye, CheckCircle2, XCircle, Clock, ArrowRight, User, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { inventoryApi, branchApi } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Transfers: React.FC = () => {
    const [transfers, setTransfers] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [overrideOriginId, setOverrideOriginId] = useState<number | ''>('');

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser.role === 'Admin' || currentUser.role === 'Super Admin';

    useEffect(() => {
        fetchTransfers();
        fetchBranches();
    }, [statusFilter, branchFilter]);

    useEffect(() => {
        if (selectedTransfer) {
            setOverrideOriginId(selectedTransfer.fromBranchId || '');
        }
    }, [selectedTransfer]);

    const fetchTransfers = async () => {
        try {
            setLoading(true);
            const res = await inventoryApi.getTransfers({
                status: statusFilter || undefined,
                branchId: branchFilter ? Number(branchFilter) : undefined
            });
            setTransfers(res.data);
        } catch (error) {
            toast.error('Error al cargar traslados');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await branchApi.getBranches();
            setBranches(res.data);
        } catch (error) { console.error(error); }
    };

    const handleConfirm = async (id: number) => {
        if (isAdmin && !overrideOriginId) return toast.error('Debe seleccionar sucursal de origen');
        if (isAdmin && overrideOriginId === selectedTransfer?.toBranchId) return toast.error('Origen y destino deben ser diferentes');

        if (!window.confirm('¿Confirmar que la mercancía ha sido enviada y recibida?')) return;
        const loadingToast = toast.loading('Confirmando traslado...');
        try {
            await inventoryApi.confirmTransfer(id, { from_branch_id: overrideOriginId });
            toast.success('Traslado confirmado y stock actualizado', { id: loadingToast });
            fetchTransfers();
            if (selectedTransfer?.id === id) setSelectedTransfer(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al confirmar', { id: loadingToast });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="badge-pending"><Clock size={12} /> Pendiente</span>;
            case 'COMPLETED': return <span className="badge-success"><CheckCircle2 size={12} /> Completado</span>;
            case 'CANCELLED': return <span className="badge-danger"><XCircle size={12} /> Cancelado</span>;
            default: return <span>{status}</span>;
        }
    };

    return (
        <div className="transfers-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div>
                        <h1>Gestión de Traslados</h1>
                        <p>Solicitudes y movimientos entre sucursales</p>
                    </div>
                </header>

                <div className="controls-bar">
                    <div className="filters">
                        <div className="filter-group">
                            <label><Filter size={14} /> Estado</label>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="PENDING">Pendientes</option>
                                <option value="COMPLETED">Completados</option>
                            </select>
                        </div>
                        {isAdmin && (
                            <div className="filter-group">
                                <label><Filter size={14} /> Sucursal</label>
                                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                                    <option value="">Todas</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="transfers-container">
                    <div className="transfers-list">
                        {loading ? (
                            <div className="loading-state">Cargando traslados...</div>
                        ) : transfers.length === 0 ? (
                            <div className="empty-state">No hay traslados registrados</div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Fecha</th>
                                        <th>Origen</th>
                                        <th>Destino</th>
                                        <th>Solicitado por</th>
                                        <th>Estado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transfers.map(t => (
                                        <tr key={t.id} onClick={() => setSelectedTransfer(t)} className={selectedTransfer?.id === t.id ? 'selected' : ''}>
                                            <td>#{t.id}</td>
                                            <td>{format(new Date(t.createdAt), 'dd MMM, HH:mm', { locale: es })}</td>
                                            <td><div className="branch-tag origin">{t.fromBranch?.name || '---'}</div></td>
                                            <td><div className="branch-tag destination">{t.toBranch?.name}</div></td>
                                            <td>{t.user?.name}</td>
                                            <td>{getStatusBadge(t.status)}</td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setSelectedTransfer(t); }}><Eye size={18} /></button>
                                                    {isAdmin && t.status === 'PENDING' && (
                                                        <button 
                                                            className="btn-icon success" 
                                                            onClick={(e) => { e.stopPropagation(); handleConfirm(t.id); }}
                                                            title="Confirmar Envío"
                                                        >
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {selectedTransfer && (
                        <div className="transfer-details-panel animate-in-right">
                            <div className="panel-header">
                                <h3>Detalle del Traslado #{selectedTransfer.id}</h3>
                                <button className="close-btn" onClick={() => setSelectedTransfer(null)}><XCircle size={20} /></button>
                            </div>
                            
                            <div className="panel-info">
                                <div className="info-grid">
                                    <div className="info-item">
                                        <label>Desde (Origen)</label>
                                        {isAdmin && selectedTransfer.status === 'PENDING' ? (
                                            <select 
                                                value={overrideOriginId} 
                                                onChange={(e) => setOverrideOriginId(Number(e.target.value))}
                                                className="edit-select"
                                            >
                                                <option value="">Seleccionar Origen</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p>{selectedTransfer.fromBranch?.name || 'A definir por Admin'}</p>
                                        )}
                                    </div>
                                    <div className="info-item">
                                        <ArrowRight size={20} style={{ margin: 'auto', opacity: 0.5 }} />
                                    </div>
                                    <div className="info-item">
                                        <label>Hacia (Destino)</label>
                                        <p>{selectedTransfer.toBranch?.name}</p>
                                    </div>
                                </div>

                                <div className="meta-info">
                                    <div className="meta-item"><User size={14} /> {selectedTransfer.user?.name}</div>
                                    <div className="meta-item"><Calendar size={14} /> {format(new Date(selectedTransfer.createdAt), 'PPPP p', { locale: es })}</div>
                                </div>

                                <div className="items-list">
                                    <h4>Productos ({selectedTransfer.details.length})</h4>
                                    <div className="items-table-wrapper">
                                        <table className="items-table">
                                            <thead>
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Cant.</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedTransfer.details.map((d: any) => (
                                                    <tr key={d.id}>
                                                        <td>{d.product?.name}</td>
                                                        <td style={{ fontWeight: 800 }}>{d.quantity}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {isAdmin && selectedTransfer.status === 'PENDING' && (
                                    <div className="panel-actions">
                                        <button className="btn-confirm-transfer" onClick={() => handleConfirm(selectedTransfer.id)}>
                                            <CheckCircle2 size={18} /> Confirmar Traslado
                                        </button>
                                        <p className="helper-text">Al confirmar, se descontará del origen y se sumará al destino.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
            <style>{`
                .transfers-container { display: flex; gap: 1.5rem; margin-top: 1.5rem; height: calc(100vh - 200px); }
                .transfers-list { flex: 1; background: rgba(30, 41, 59, 0.5); border-radius: 12px; overflow: auto; }
                .transfer-details-panel { width: 400px; background: #1e293b; border-left: 4px solid #3b82f6; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: -10px 0 25px rgba(0,0,0,0.4); transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                .panel-header { padding: 1.25rem; background: rgba(255,255,255,0.03); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .panel-info { padding: 1.5rem; flex: 1; overflow: auto; }
                .info-grid { display: grid; grid-template-columns: 1fr 40px 1fr; align-items: center; margin-bottom: 1.5rem; background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; }
                .info-item label { display: block; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
                .info-item p { font-weight: 800; color: #3b82f6; }
                .meta-info { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.5rem; }
                .meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #94a3b8; }
                .items-list h4 { font-size: 0.9rem; margin-bottom: 10px; color: #fff; }
                .items-table { width: 100%; border-collapse: collapse; }
                .items-table th { text-align: left; padding: 8px; font-size: 0.75rem; color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .items-table td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.02); font-size: 0.85rem; }
                .badge-pending { color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
                .badge-success { color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
                .badge-danger { color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; }
                .btn-confirm-transfer { width: 100%; background: #10b981; color: white; border: none; padding: 0.8rem; border-radius: 8px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 1rem; }
                .btn-confirm-transfer:hover { background: #059669; }
                .helper-text { font-size: 0.7rem; color: #94a3b8; text-align: center; margin-top: 8px; }
                .branch-tag { padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; display: inline-block; }
                .origin { background: rgba(30, 41, 59, 0.8); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }
                .destination { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
                .animate-in-right { animation: animateInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes animateInRight {
                    from { opacity: 0; transform: translateX(30px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default Transfers;
