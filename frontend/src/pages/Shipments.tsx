import React, { useState, useEffect } from 'react';
import { Package, Search, Clock, CheckCircle2, Truck, AlertCircle, X, Printer, Eye } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import LabelModal from '../components/LabelModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    VENDIDO: { label: 'Vendido', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: Clock },
    DESPACHADO: { label: 'Despachado', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Truck },
    ENTREGADO: { label: 'Entregado', color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 }
};

const Shipments: React.FC = () => {
    const [shipments, setShipments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [labelShipment, setLabelShipment] = useState<any>(null);
    const [config, setConfig] = useState<any>({});
    const [editingDelivery, setEditingDelivery] = useState<number | null>(null);
    const [deliveryDateInput, setDeliveryDateInput] = useState('');
    const [detailShipment, setDetailShipment] = useState<any>(null);

    const fetchShipments = async () => {
        try {
            setLoading(true);
            const params = filter ? `?status=${filter}` : '';
            const res = await api.get(`/sales/shipments/list${params}`);
            setShipments(res.data);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar envíos');
        } finally {
            setLoading(false);
        }
    };

    const handleDeliveryDateChange = async (id: number) => {
        if (!deliveryDateInput) return;
        try {
            await api.patch(`/sales/${id}/delivery-date`, { deliveryDate: deliveryDateInput });
            toast.success('Fecha de entrega actualizada');
            setEditingDelivery(null);
            fetchShipments();
        } catch { toast.error('Error al actualizar fecha'); }
    };

    useEffect(() => {
        fetchShipments();
        api.get('/config').then(r => setConfig(r.data)).catch(() => {});
    }, [filter]);

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            await api.patch(`/sales/${id}/fulfillment`, { status: newStatus });
            toast.success(`Estado actualizado a ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
            fetchShipments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error al actualizar estado');
        }
    };

    const nextStatus = (current: string) => {
        if (current === 'VENDIDO') return 'DESPACHADO';
        if (current === 'DESPACHADO') return 'ENTREGADO';
        return null;
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="products-page" style={{ display: 'flex', height: '100vh', background: '#0f172a', color: 'white' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div className="header-text">
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Envíos</h1>
                        <p style={{ color: '#64748b' }}>Gestión de entregas programadas</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['', 'VENDIDO', 'DESPACHADO', 'ENTREGADO'].map(s => (
                            <button key={s || 'all'} onClick={() => setFilter(s)} style={{
                                padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                                background: filter === s ? '#3b82f6' : '#1e293b', color: filter === s ? 'white' : '#64748b'
                            }}>
                                {s ? STATUS_CONFIG[s]?.label : 'Todos'}
                            </button>
                        ))}
                    </div>
                </header>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>Cargando envíos...</div>
                ) : shipments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                        <Package size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>No hay envíos registrados</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {shipments.map(s => {
                            const cfg = STATUS_CONFIG[s.fulfillmentStatus] || STATUS_CONFIG.VENDIDO;
                            const StatusIcon = cfg.icon;
                            const next = nextStatus(s.fulfillmentStatus);
                            const isOverdue = s.fulfillmentStatus === 'VENDIDO' && s.shippingDate && new Date(s.shippingDate) < new Date();
                            return (
                                <div key={s.id} style={{
                                    background: '#1e293b', borderRadius: '16px', padding: '1.25rem', border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.2)' : '#334155'}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <StatusIcon size={22} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                                                <strong style={{ fontSize: '0.95rem' }}>#{s.id} — {s.client?.name || 'Cliente Varios'}</strong>
                                                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '6px', background: cfg.bg, color: cfg.color, fontWeight: 800 }}>{cfg.label}</span>
                                                {isOverdue && <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 800 }}>ATRASADO</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                                                <span>{s.details?.length} producto{s.details?.length !== 1 ? 's' : ''}</span>
                                                <span>{formatCurrency(s.total)}</span>
                                                {s.shippingDate && <span>Despacho: {format(new Date(s.shippingDate), 'dd/MM/yy', { locale: es })}</span>}
                                                {!s.shippingDate && <span style={{ color: '#10b981' }}>Despacho inmediato</span>}
                                                <span>{s.user?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem', marginRight: '0.5rem' }}>
                                            {editingDelivery === s.id ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <input type="date" value={deliveryDateInput} onChange={e => setDeliveryDateInput(e.target.value)} style={{ width: '130px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '3px 8px', color: 'white', fontSize: '0.75rem', fontWeight: 700, outline: 'none' }} />
                                                    <button onClick={() => handleDeliveryDateChange(s.id)} style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>OK</button>
                                                    <button onClick={() => setEditingDelivery(null)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, padding: '4px 8px' }}>✕</button>
                                                </span>
                                            ) : (
                                                <button onClick={() => { setEditingDelivery(s.id); setDeliveryDateInput(s.deliveryDate ? format(new Date(s.deliveryDate), 'yyyy-MM-dd') : ''); }} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer', background: s.deliveryDate ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.05)', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                                    📅 {s.deliveryDate ? format(new Date(s.deliveryDate), 'dd/MM/yy') : 'Fijar Fecha Entrega'}
                                                </button>
                                            )}
                                        </div>
                                        <button onClick={() => setDetailShipment(s)} style={{
                                            padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }} title="Ver detalle">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => setLabelShipment(s)} style={{
                                            padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }} title="Ver label">
                                            <Printer size={16} />
                                        </button>
                                        {next && (
                                            <button onClick={() => handleUpdateStatus(s.id, next)} style={{
                                                padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer',
                                                background: STATUS_CONFIG[next].bg, color: STATUS_CONFIG[next].color
                                            }}>
                                                {next === 'DESPACHADO' ? 'Despachar' : 'Entregar'}
                                            </button>
                                        )}
                                        {s.fulfillmentStatus !== 'ENTREGADO' && (
                                            <button onClick={() => handleUpdateStatus(s.id, 'ENTREGADO')} style={{
                                                padding: '0.5rem', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} title="Marcar entregado">
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {detailShipment && (
                <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={() => setDetailShipment(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: '#1e293b', borderRadius: '20px', width: 'min(600px, 92vw)', maxHeight: 'min(90vh, 700px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'white' }}>Detalle de Venta #{detailShipment.id}</h2>
                            <button onClick={() => setDetailShipment(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '0.8rem' }}>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Cliente:</span> <span style={{ color: 'white', fontWeight: 700 }}>{detailShipment.client?.name || 'Clientes Varios'}</span></div>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Tel:</span> <span style={{ color: 'white' }}>{detailShipment.client?.phone || '---'}</span></div>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Dirección:</span> <span style={{ color: 'white' }}>{detailShipment.client?.address || '---'}</span></div>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Vendedor:</span> <span style={{ color: 'white' }}>{detailShipment.user?.name}</span></div>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Pago:</span> <span style={{ color: 'white' }}>{detailShipment.paymentMethod}</span></div>
                                <div><span style={{ color: '#64748b', fontWeight: 700 }}>Estado:</span> <span style={{ color: STATUS_CONFIG[detailShipment.fulfillmentStatus]?.color || '#94a3b8', fontWeight: 800 }}>{STATUS_CONFIG[detailShipment.fulfillmentStatus]?.label || detailShipment.fulfillmentStatus}</span></div>
                                {detailShipment.shippingDate && <div><span style={{ color: '#64748b', fontWeight: 700 }}>Despacho:</span> <span style={{ color: 'white' }}>{format(new Date(detailShipment.shippingDate), 'dd/MM/yy', { locale: es })}</span></div>}
                                {detailShipment.deliveryDate && <div><span style={{ color: '#64748b', fontWeight: 700 }}>Entrega:</span> <span style={{ color: 'white' }}>{format(new Date(detailShipment.deliveryDate), 'dd/MM/yy', { locale: es })}</span></div>}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead><tr style={{ borderBottom: '1px solid #334155' }}>
                                    <th style={{ textAlign: 'left', padding: '0.5rem 0.5rem', color: '#64748b', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Producto</th>
                                    <th style={{ textAlign: 'center', padding: '0.5rem', color: '#64748b', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Cant</th>
                                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#64748b', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Precio</th>
                                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#64748b', fontWeight: 800, fontSize: '0.65rem', textTransform: 'uppercase' }}>Subtotal</th>
                                </tr></thead>
                                <tbody>
                                    {detailShipment.details?.map((d: any, i: number) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '0.5rem', color: 'white' }}>{d.product?.name || 'Producto'}</td>
                                            <td style={{ textAlign: 'center', padding: '0.5rem', color: '#94a3b8' }}>{d.quantity}</td>
                                            <td style={{ textAlign: 'right', padding: '0.5rem', color: '#94a3b8' }}>${Number(d.unitPrice || 0).toFixed(2)}</td>
                                            <td style={{ textAlign: 'right', padding: '0.5rem', color: 'white', fontWeight: 700 }}>${Number(d.subtotal || 0).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div style={{ borderTop: '1px solid #334155', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.75rem' }}>TOTAL</span>
                                <span style={{ color: '#10b981', fontWeight: 900, fontSize: '1.2rem' }}>${Number(detailShipment.total || 0).toFixed(2)}</span>
                            </div>
                            {detailShipment.shipping > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Envío:</span>
                                    <span style={{ color: '#818cf8', fontWeight: 700, fontSize: '0.85rem' }}>${Number(detailShipment.shipping).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <LabelModal
                isOpen={!!labelShipment}
                onClose={() => setLabelShipment(null)}
                shipment={labelShipment || {}}
                businessConfig={config}
                labelFields={config.labelFields ? JSON.parse(config.labelFields) : []}
            />
        </div>
    );
};

export default Shipments;