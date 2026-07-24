import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Package,
    ArrowLeft,
    RefreshCw,
    TrendingUp,
    AlertTriangle,
    ShoppingCart,
    Search,
    Filter,
    ArrowUpDown,
    CheckCircle2,
    XCircle,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import { inventoryApi, branchApi, productApi } from '../services/api';

interface LowStockItem {
    productId: number;
    sku: string;
    name: string;
    imageUrl?: string;
    branch: string;
    branchId: number;
    stock: number;
    minStock: number;
    maxStock: number;
    sales7: number;
    sales15: number;
    sales30: number;
    dailyAvg: string;
    suggested: number;
    recommendedProvider?: {
        id: number;
        name: string;
        lastCost: number | null;
    } | null;
}

const Replenishment: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<LowStockItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState<string>('all');
    const [branches, setBranches] = useState<{ id: number, name: string }[]>([]);
    const [coverageDays, setCoverageDays] = useState(15);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reportRes, branchesRes] = await Promise.all([
                inventoryApi.getLowStockReport(),
                branchApi.getBranches()
            ]);
            setItems(reportRes.data);
            setBranches(branchesRes.data);
        } catch (error) {
            toast.error('Error al cargar datos de reposición');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesBranch = selectedBranch === 'all' || item.branchId.toString() === selectedBranch;
        return matchesSearch && matchesBranch;
    });

    const handleIgnoreBranch = async (productId: number, branchId: number, productName: string, branchName: string) => {
        if (confirm(`¿Ignorar "${productName}" en ${branchName}? Ya no aparecerá en sugerencias para esta sucursal.`)) {
            try {
                await inventoryApi.updateInventory(branchId, productId, { minStock: 0 });
                toast.success('Producto ignorado en esta sucursal');
                fetchData();
            } catch (error) {
                toast.error('Error al actualizar inventario');
            }
        }
    };

    return (
        <div className="replenishment-page">
            <Sidebar />
            <main className="dashboard-main">
                <header className="dash-header">
                    <div className="header-left">
                        <div className="flex items-center gap-4">
                            <div>
                                <h1>Reposición de Stock</h1>
                                <p>Productos por debajo del mínimo y sugerencias de compra</p>
                            </div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <div className="coverage-selector">
                            <label>Días de Cobertura:</label>
                            <select value={coverageDays} onChange={(e) => setCoverageDays(Number(e.target.value))}>
                                <option value={7}>7 días (1 sem)</option>
                                <option value={15}>15 días (2 sem)</option>
                                <option value={30}>30 días (1 mes)</option>
                            </select>
                        </div>
                        <button className="refresh-btn" onClick={fetchData} disabled={loading}>
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </header>

                <div className="controls-grid">
                    <div className="search-box">
                        <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 5 }} />
                        <input
                            type="text"
                            placeholder="Buscar por SKU o Nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: '12px', 
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
                                <Trash2 size={20} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                    <div className="filter-box">
                        <Filter size={20} />
                        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                            <option value="all">Todas las Sucursales</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="report-container">
                    {loading ? (
                        <div className="loading-state">
                            <RefreshCw size={48} className="animate-spin" />
                            <p>Calculando sugerencias de compra...</p>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="empty-state">
                            <CheckCircle2 size={64} style={{ color: '#10b981' }} />
                            <h3>¡Todo al día!</h3>
                            <p>No hay productos con stock bajo el mínimo{searchTerm ? ' para esta búsqueda' : ''}.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="analysis-table">
                                <thead>
                                    <tr>
                                        <th>PRODUCTO</th>
                                        <th>SUCURSAL</th>
                                        <th className="text-right">STOCK</th>
                                        <th className="text-right">MÍN</th>
                                        <th className="text-center">VENTAS (7d/15d/30d)</th>
                                        <th className="text-right">PROM. DÍA</th>
                                        <th className="text-right action-col">SUGERIDO</th>
                                        <th>PROVEEDOR RECOMENDADO</th>
                                        <th className="text-center">ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => {
                                        const dailyAvgNum = parseFloat(item.dailyAvg);
                                        const leadTime = 7;
                                        const suggested = Math.max(0, Math.ceil((dailyAvgNum * (leadTime + coverageDays)) - item.stock));

                                        return (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="prod-cell">
                                                        <div className="prod-img-mini">
                                                            <img src={item.imageUrl || `https://picsum.photos/seed/${item.productId}/50`} alt="" />
                                                        </div>
                                                        <div className="prod-info-mini">
                                                            <span className="sku">{item.sku}</span>
                                                            <span className="name">{item.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="branch-badge">{item.branch}</span>
                                                </td>
                                                <td className="text-right">
                                                    <span className={`stock-val ${item.stock <= 0 ? 'critical' : 'warning'}`}>
                                                        {item.stock}
                                                    </span>
                                                </td>
                                                <td className="text-right font-bold text-slate-400">{item.minStock}</td>
                                                <td className="text-center">
                                                    <div className="sales-stats">
                                                        <span>{item.sales7}</span>
                                                        <span className="divider">/</span>
                                                        <span>{item.sales15}</span>
                                                        <span className="divider">/</span>
                                                        <span>{item.sales30}</span>
                                                    </div>
                                                </td>
                                                <td className="text-right font-mono text-emerald-400">{item.dailyAvg}</td>
                                                <td className="text-right">
                                                    <div className="suggested-box">
                                                        <ShoppingCart size={16} />
                                                        <span>{suggested}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {item.recommendedProvider ? (
                                                        <div className="recommended-provider">
                                                            <div className="rp-name">{item.recommendedProvider.name}</div>
                                                            {item.recommendedProvider.lastCost && (
                                                                <div className="rp-cost">Último costo: ${item.recommendedProvider.lastCost.toFixed(2)}</div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="no-provider">No enlazado</span>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        className="deactivate-btn"
                                                        title="Ignorar en esta sucursal"
                                                        onClick={() => handleIgnoreBranch(item.productId, item.branchId, item.name, item.branch)}
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            <style>{`
                .dashboard-main { flex: 1; display: flex; flex-direction: column; padding: 2rem 4rem; overflow: hidden; min-height: 0; }
                
                .back-btn, .refresh-btn { 
                    background: rgba(30, 41, 59, 0.5); 
                    border: 1px solid rgba(255,255,255,0.1); 
                    color: #94a3b8; 
                    width: 44px; 
                    height: 44px; 
                    border-radius: 12px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    cursor: pointer; 
                    transition: all 0.3s;
                }
                .back-btn:hover, .refresh-btn:hover { background: #1e293b; color: white; border-color: ${user.color_hex || '#3b82f6'}; }
                .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

                .dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; background: rgba(30, 41, 59, 0.2); padding: 1.5rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.05); }
                .dash-header h1 { font-size: 2rem; font-weight: 900; letter-spacing: -0.04em; margin: 0; }
                .dash-header p { color: #94a3b8; font-size: 0.95rem; margin: 0.25rem 0 0 0; }

                .header-actions { display: flex; align-items: center; gap: 1rem; }
                .coverage-selector { display: flex; align-items: center; gap: 0.75rem; background: rgba(30, 41, 59, 0.5); padding: 0.5rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
                .coverage-selector label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
                .coverage-selector select { background: transparent; border: none; color: ${user.color_hex || '#3b82f6'}; font-weight: 800; cursor: pointer; outline: none; }

                .report-container { flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden; }

                .controls-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 2rem; }
                .search-box, .filter-box { 
                    background: #1e293b; 
                    border: 1px solid #334155; 
                    border-radius: 12px; 
                    position: relative;
                    padding: 0;
                    color: #64748b;
                    transition: all 0.3s;
                }
                .search-box:focus-within, .filter-box:focus-within { border-color: ${user.color_hex || '#3b82f6'}; box-shadow: 0 0 0 2px ${user.color_hex ? user.color_hex + '33' : 'rgba(59, 130, 246, 0.2)'}; }
                .search-box input, .filter-box select { 
                    flex: 1; 
                    background: transparent; 
                    border: none; 
                    height: 44px; 
                    color: white; 
                    outline: none; 
                    font-size: 0.95rem; 
                    padding: 0 45px 0 3rem;
                    width: 100%;
                }
                .filter-box select option {
                    background: #1e293b;
                    color: white;
                }

                .prod-cell { display: flex; align-items: center; gap: 0.75rem; }
                .prod-img-mini { width: 40px; height: 40px; border-radius: 8px; overflow: hidden; background: #0f172a; flex-shrink: 0; }
                .prod-img-mini img { width: 100%; height: 100%; object-fit: cover; }
                .prod-info-mini { display: flex; flex-direction: column; gap: 0.15rem; }
                .prod-cell .sku { font-size: 0.65rem; font-weight: 800; color: ${user.color_hex || '#3b82f6'}; font-family: monospace; }
                .prod-cell .name { font-weight: 700; color: #f1f5f9; font-size: 0.85rem; }

                .branch-badge { background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
                
                .stock-val { font-weight: 900; font-size: 1rem; padding: 4px 10px; border-radius: 8px; }
                .stock-val.warning { background: rgba(245, 158, 11, 0.1); color: #fbbf24; }
                .stock-val.critical { background: rgba(239, 68, 68, 0.1); color: #f87171; }

                .sales-stats { display: flex; align-items: center; gap: 0.5rem; justify-content: center; font-weight: 700; background: rgba(15, 23, 42, 0.3); padding: 6px 12px; border-radius: 8px; font-family: monospace; }
                .sales-stats .divider { color: #334155; }
                
                .suggested-box { background: #10b981; color: white; padding: 6px 12px; border-radius: 10px; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 900; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2); }
                
                .deactivate-btn { background: transparent; border: none; color: #64748b; cursor: pointer; transition: all 0.3s; padding: 0.5rem; border-radius: 8px; }
                .deactivate-btn:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

                .loading-state, .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.5rem; padding: 4rem; text-align: center; }
                .empty-state h3 { font-size: 1.5rem; font-weight: 900; margin: 0; }
                .empty-state p { color: #94a3b8; font-size: 1.1rem; }

                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                /* RECOMMENDED PROVIDER STYLES */
                .recommended-provider { display: flex; flex-direction: column; gap: 2px; }
                .rp-name { font-weight: 700; color: ${user.color_hex || '#3b82f6'}; font-size: 0.85rem; }
                .rp-cost { font-size: 0.7rem; color: #64748b; font-weight: 600; }
                .no-provider { font-size: 0.75rem; color: #475569; font-style: italic; }
            `}</style>
        </div>
    );
};

export default Replenishment;
