import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { statsApi } from '../services/api';
import { Search, User, DollarSign, Package, Calendar, TrendingUp, BarChart3, Filter } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

const SellerReport: React.FC = () => {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedSeller, setExpandedSeller] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await statsApi.getSalesBySeller(startDate, endDate);
            setData(res.data);
        } catch { toast.error('Error al cargar reporte'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="products-page">
            <Sidebar />
            <main className="products-main" style={{ padding: '2rem 4rem', overflow: 'auto' }}>
                <header className="page-header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Ventas por Vendedor</h1>
                        <p style={{ color: '#94a3b8' }}>Comisiones y detalle de ventas por vendedor</p>
                    </div>
                </header>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '2rem', background: '#1e293b', padding: '1.5rem', borderRadius: '16px', border: '1px solid #334155' }}>
                    <div className="field">
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Desde</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <div className="field">
                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Hasta</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.5rem', color: 'white' }} />
                    </div>
                    <button onClick={fetchData} className="btn-main" style={{ padding: '0.5rem 1.5rem', height: 'fit-content' }}>
                        <Filter size={16} /> Consultar
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Cargando...</div>
                ) : data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No hay ventas en el rango seleccionado</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {data.map((seller: any) => (
                            <div key={seller.userId} style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', overflow: 'hidden' }}>
                                <div onClick={() => setExpandedSeller(expandedSeller === seller.userId ? null : seller.userId)}
                                    style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: expandedSeller === seller.userId ? '1px solid #334155' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <User size={24} style={{ color: '#3b82f6' }} />
                                        <div>
                                            <h3 style={{ margin: 0, color: 'white', fontWeight: 800 }}>{seller.sellerName}</h3>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{seller.saleCount} ventas</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Ventas</div>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.1rem' }}>${Number(seller.totalSales).toFixed(2)}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Comisión</div>
                                            <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '1.1rem' }}>${Number(seller.totalCommission).toFixed(2)}</div>
                                        </div>
                                    </div>
                                </div>
                                {expandedSeller === seller.userId && (
                                    <div style={{ padding: '0 1.25rem 1rem' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #334155', color: '#64748b', fontWeight: 700 }}>
                                                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Fecha</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Venta</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'left' }}>Producto</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Cant</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Precio U.</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>Subtotal</th>
                                                    <th style={{ padding: '0.6rem', textAlign: 'right', color: '#f59e0b' }}>Comisión</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {seller.details.map((d: any, i: number) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={{ padding: '0.5rem 0.6rem', color: '#94a3b8' }}>{format(new Date(d.date), 'dd/MM', { locale: es })}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', color: '#94a3b8' }}>#{d.saleId}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', color: '#e2e8f0' }}>{d.productName}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#e2e8f0' }}>{d.quantity}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#94a3b8' }}>${Number(d.unitPrice).toFixed(2)}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#10b981' }}>${Number(d.subtotal).toFixed(2)}</td>
                                                        <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', color: '#f59e0b', fontWeight: 700 }}>${Number(d.commission).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default SellerReport;
