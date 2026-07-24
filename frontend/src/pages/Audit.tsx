import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Calendar, User as UserIcon, MapPin, Info, RefreshCw, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { auditApi } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const Audit: React.FC = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isSuperAdmin = currentUser.role === 'Super Admin';

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await auditApi.getLogs();
            setLogs(res.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getActionBadgeClass = (action: string) => {
        if (action.includes('CREATE')) return 'badge-create';
        if (action.includes('UPDATE')) return 'badge-update';
        if (action.includes('DELETE')) return 'badge-delete';
        if (action.includes('FAILURE')) return 'badge-failure';
        if (action.includes('SUCCESS')) return 'badge-success';
        return 'badge-default';
    };

    const getActionLabel = (action: string) => {
        const labels: Record<string, string> = {
            'LOGIN_SUCCESS': 'Inicio de Sesión',
            'LOGIN_FAILURE': 'Intento Fallido',
            'CREATE_PRODUCT': 'Producto Creado',
            'UPDATE_PRODUCT': 'Producto Actualizado',
            'DELETE_PRODUCT': 'Producto Eliminado',
            'CREATE_CATEGORY': 'Categoría Creada',
            'CREATE_SALE': 'Venta Realizada'
        };
        return labels[action] || action;
    };

    return (
        <div className="audit-page">
            <Sidebar />

            <main className="audit-main">
                <header className="page-header">
                    <div className="header-text">
                        <h1>Bitácora de Auditoría</h1>
                        <p>Registro histórico de actividades del sistema</p>
                    </div>

                    <div className="header-tools">
                        <div className="search-wrapper">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Buscar acción, usuario o detalle..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button className="btn-refresh" onClick={fetchLogs} disabled={loading}>
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Recargar
                        </button>
                    </div>
                </header>

                <div className="audit-content">
                    {loading ? (
                        <div className="loading-state">
                            <RefreshCw size={48} className="animate-spin" />
                            <p>Cargando registros...</p>
                        </div>
                    ) : (
                        <div className="audit-timeline">
                            {filteredLogs.map((log) => (
                                <div key={log.id} className="audit-item animate-in">
                                    <div className="audit-time-box">
                                        <span className="time">{format(new Date(log.timestamp), 'HH:mm')}</span>
                                        <span className="date">{format(new Date(log.timestamp), 'dd MMM', { locale: es })}</span>
                                    </div>

                                    <div className="audit-icon-line">
                                        <div className={`audit-icon ${getActionBadgeClass(log.action)}`}>
                                            <History size={16} />
                                        </div>
                                        <div className="line"></div>
                                    </div>

                                    <div className="audit-details">
                                        <div className="details-header">
                                            <span className={`action-badge ${getActionBadgeClass(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                            <div className="meta-info">
                                                <div className="meta-item">
                                                    <UserIcon size={12} />
                                                    <span>{log.user?.name || 'Sistema'}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <MapPin size={12} />
                                                    <span>{log.branch?.name || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="details-body">
                                            {log.details ? (
                                                <div className="json-details">
                                                    <Info size={14} />
                                                    <code>{log.details}</code>
                                                </div>
                                            ) : (
                                                <p className="no-details">Sin detalles adicionales registrados.</p>
                                            )}
                                        </div>

                                        {log.ipAddress && (
                                            <div className="details-footer">
                                                <span>IP: {log.ipAddress}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {filteredLogs.length === 0 && (
                                <div className="empty-state">
                                    <History size={64} opacity={0.1} />
                                    <p>No se encontraron registros de auditoría.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                .audit-page { display: flex; height: 100vh; background: #0f172a; color: white; }
                .audit-main { flex: 1; padding: 2.5rem; overflow-y: auto; display: flex; flex-direction: column; }

                .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5rem; }
                .header-text h1 { font-size: 2.2rem; font-weight: 800; color: #f8fafc; }
                .header-text p { color: #64748b; font-size: 1rem; }

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
                .search-wrapper { position: relative; width: 400px; }
                .search-wrapper svg { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #475569; }
                .search-wrapper input { 
                    width: 100%; 
                    padding: 0.8rem 1rem 0.8rem 3.2rem; 
                    background: #1e293b; border: 1px solid #334155; border-radius: 16px; color: white; outline: none; transition: border-color 0.2s;
                }
                .search-wrapper input:focus { border-color: #3b82f6; }

                .btn-refresh {
                    background: #0f172a; color: #94a3b8; border: 1px solid #334155; padding: 0.8rem 1.5rem; border-radius: 16px; font-weight: 700; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; transition: all 0.2s;
                }
                .btn-refresh:hover { background: #1e293b; color: white; border-color: #3b82f6; }

                .audit-content { flex: 1; }

                .audit-timeline { margin-left: 100px; display: flex; flex-direction: column; gap: 0; }
                
                .audit-item { display: flex; min-height: 120px; }
                
                .audit-time-box { width: 80px; display: flex; flex-direction: column; align-items: flex-end; padding-top: 1rem; gap: 4px; border-right: none; margin-right: 20px; }
                .audit-time-box .time { font-size: 1.1rem; font-weight: 800; color: #f8fafc; }
                .audit-time-box .date { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }

                .audit-icon-line { display: flex; flex-direction: column; align-items: center; margin-right: 25px; }
                .audit-icon { 
                    width: 40px; height: 40px; border-radius: 50%; background: #1e293b; border: 4px solid #0f172a; z-index: 10; display: flex; align-items: center; justify-content: center; color: #94a3b8;
                }
                .audit-icon-line .line { flex: 1; width: 2px; background: #1e293b; }
                .audit-item:last-child .line { display: none; }

                .audit-details { 
                    flex: 1; background: #1e293b; border-radius: 24px; padding: 1.5rem; border: 1px solid #334155; margin-bottom: 2rem; transition: transform 0.2s;
                }
                .audit-item:hover .audit-details { transform: translateX(10px); border-color: #3b82f633; }

                .details-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .action-badge { padding: 4px 14px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
                
                .badge-create { background: #10b98120; color: #10b981; }
                .badge-update { background: #3b82f620; color: #3b82f6; }
                .badge-delete { background: #ef444420; color: #ef4444; }
                .badge-failure { background: #ef444430; color: #ef4444; }
                .badge-success { background: #10b98130; color: #10b981; }
                .badge-default { background: #64748b20; color: #64748b; }

                .audit-icon.badge-create { background: #10b98110; color: #10b981; }
                .audit-icon.badge-update { background: #3b82f610; color: #3b82f6; }
                .audit-icon.badge-delete { background: #ef444410; color: #ef4444; }

                .meta-info { display: flex; gap: 1.5rem; color: #64748b; }
                .meta-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 600; }

                .details-body { margin-top: 0.5rem; }
                .json-details { background: #0f172a; padding: 1rem; border-radius: 12px; display: flex; align-items: start; gap: 1rem; border: 1px solid #0f172a; }
                .json-details code { font-family: 'JetBrains Mono', monospace; font-size: 0.8rem; color: #94a3b8; word-break: break-all; }
                .no-details { font-size: 0.9rem; color: #475569; font-style: italic; }

                .details-footer { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed #334155; font-size: 0.7rem; color: #475569; font-weight: 700; }

                .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5rem; color: #475569; gap: 1.5rem; font-weight: 700; }
                
                .animate-in { animation: slideIn 0.3s ease-out forwards; opacity: 0; }
                @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
                
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default Audit;
