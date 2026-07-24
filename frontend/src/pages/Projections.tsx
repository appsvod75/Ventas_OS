import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import NumericKeyboard from '../components/NumericKeyboard';
import { projectionApi, branchApi } from '../services/api';
import toast from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';

const Projections: React.FC = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<number>(0);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [projection, setProjection] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingGoal, setEditingGoal] = useState({
        monthYear: new Date().toISOString().slice(0, 7),
        targetAmount: 0,
        totalWorkDays: 30,
        manualSales: 0,
        manualDays: 0
    });
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField] = useState<'target' | 'days' | null>(null);

    const getDaysInMonth = (monthStr: string) => {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    };

    // Fetch Branches
    useEffect(() => {
        branchApi.getBranches().then(res => {
            const data = res.data || [];
            setBranches(data);
            if (data.length > 0) setSelectedBranch(data[0].id);
        }).catch(err => console.error(err));
    }, []);

    // Fetch Data
    const loadData = async () => {
        if (!selectedBranch) return;
        setIsLoading(true);
        try {
            const [projRes, histRes] = await Promise.all([
                projectionApi.getProjection(selectedBranch, selectedMonth).catch(() => ({ data: null })),
                projectionApi.getGoals(selectedBranch).catch(() => ({ data: [] }))
            ]);
            setProjection(projRes.data);
            setHistory(histRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [selectedBranch, selectedMonth]);

    // PROTECTED CALCULATIONS
    const stats = useMemo(() => {
        if (!projection) return null;
        const currentSales = Number(projection.currentSales) || 0;
        const targetAmount = Number(projection.targetAmount) || 0;
        const elapsed = Number(projection.elapsedDays) || 0;
        const totalWorkDays = Number(projection.totalWorkDays) || 30;

        // Use backend calculated values if available
        const daysLeft = projection.daysLeft !== undefined ? Number(projection.daysLeft) : Math.max(0, totalWorkDays - elapsed);
        const needed = projection.dailyNeeded !== undefined ? Number(projection.dailyNeeded) : (daysLeft > 0 ? (targetAmount - currentSales) / daysLeft : 0);
        const avg = projection.dailyAverage !== undefined ? Number(projection.dailyAverage) : (currentSales / Math.max(1, elapsed));
        const projected = Number(projection.projection) || (avg * totalWorkDays);
        const progress = targetAmount > 0 ? (currentSales / targetAmount) * 100 : 0;

        return { avg, projected, progress, daysLeft, needed, currentSales, targetAmount, elapsed, totalWorkDays };
    }, [projection]);

    const handleSaveGoal = async () => {
        try {
            await projectionApi.upsertGoal({ branchId: selectedBranch, ...editingGoal });
            toast.success('¡META ACTUALIZADA!');
            setShowEditor(false);
            loadData();
        } catch (err) {
            toast.error("Error al guardar");
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#020617', color: 'white', fontFamily: 'sans-serif' }}>
            <Sidebar />
            <main style={{ flex: 1, padding: '40px', overflowY: 'auto', background: '#0f172a' }}>

                {/* HEADER */}
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ color: 'white', fontSize: '28px', fontWeight: '900', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>
                            Proyecciones <span style={{ color: '#34d399', fontSize: '12px' }}>V2</span>
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', margin: '5px 0' }}>Tablero de Gestión Predictiva</p>
                    </div>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ background: '#1e293b', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }} />
                        <select value={selectedBranch} onChange={e => setSelectedBranch(Number(e.target.value))} style={{ background: '#1e293b', color: 'white', border: 'none', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <button
                            onClick={() => {
                                setEditingGoal({
                                    monthYear: selectedMonth,
                                    targetAmount: 0,
                                    totalWorkDays: getDaysInMonth(selectedMonth),
                                    manualSales: 0,
                                    manualDays: 0
                                });
                                setShowEditor(true);
                            }}
                            style={{ background: '#059669', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}
                        >
                            + Nueva Meta
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>CARGANDO...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

                        {/* CURRENT STATS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                            {stats ? (
                                <>
                                    <div style={{ background: 'rgba(52, 211, 153, 0.05)', padding: '25px', borderRadius: '25px', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
                                        <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>Avance de Meta</p>
                                        <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#34d399', margin: '10px 0' }}>{Math.round(stats.progress)}%</p>
                                        <p style={{ fontSize: '10px' }}>${stats.currentSales.toLocaleString()} de ${stats.targetAmount.toLocaleString()}</p>
                                    </div>
                                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '25px', border: '1px solid #334155' }}>
                                        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pronóstico</p>
                                        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>${Math.round(stats.projected).toLocaleString()}</p>
                                        <p style={{ fontSize: '10px', color: '#475569' }}>Cierre proyectado</p>
                                    </div>
                                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '25px', border: '1px solid #334155' }}>
                                        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Promedio Diario</p>
                                        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '10px 0' }}>${Math.round(stats.avg).toLocaleString()}</p>
                                        <p style={{ fontSize: '10px', color: '#475569' }}>{stats.elapsed} días activos (con ventas)</p>
                                    </div>
                                    <div style={{ background: '#1e293b', padding: '25px', borderRadius: '25px', border: '1px solid #334155' }}>
                                        <p style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Meta Diaria</p>
                                        <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24', margin: '10px 0' }}>${Math.round(stats.needed).toLocaleString()}</p>
                                        <p style={{ fontSize: '10px', color: '#475569' }}>{stats.daysLeft} días restantes de operación</p>
                                    </div>
                                </>
                            ) : (
                                <div style={{ background: '#1e293b', padding: '40px', borderRadius: '25px', textAlign: 'center', gridColumn: '1/-1', border: '1px dashed #334155' }}>
                                    <p style={{ color: '#64748b', fontWeight: 'bold' }}>SIN META PARA ESTE MES</p>
                                    <button onClick={() => {
                                        setEditingGoal({
                                            monthYear: selectedMonth,
                                            targetAmount: 0,
                                            totalWorkDays: getDaysInMonth(selectedMonth),
                                            manualSales: 0,
                                            manualDays: 0
                                        });
                                        setShowEditor(true);
                                    }} style={{ marginTop: '20px', background: 'transparent', border: '1px solid #34d399', color: '#34d399', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '10px' }}>Crear Meta Ahora</button>
                                </div>
                            )}
                        </div>

                        {/* VELOCITY CHART */}
                        <section style={{ background: '#1e293b', padding: '30px', border: '1px solid #334155', borderRadius: '30px' }}>
                            <h2 style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '30px' }}>Velocidad de Ventas</h2>
                            {projection && projection.dailySales && projection.dailySales.length > 0 ? (
                                <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
                                    {(() => {
                                        const maxVal = Math.max(...projection.dailySales.map((d: any) => d.total), 1);
                                        return projection.dailySales.map((d: any, i: number) => {
                                            const h = (d.total / maxVal) * 100;
                                            return (
                                                <div key={i} title={`Día ${d.day}: $${d.total}`} style={{ flex: 1, height: `${Math.max(2, h)}%`, background: 'rgba(52, 211, 153, 0.3)', borderTop: '2px solid #34d399', borderRadius: '4px 4px 0 0' }}></div>
                                            );
                                        });
                                    })()}
                                </div>
                            ) : (
                                <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #334155', borderRadius: '20px', color: '#475569', fontSize: '11px', fontWeight: 'bold' }}>
                                    NO HAY VENTAS REGISTRADAS ESTE MES
                                </div>
                            )}
                        </section>

                        {/* HISTORY CARDS GRID */}
                        <section>
                            <h2 style={{ fontSize: '12px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: '20px' }}>Historial de Metas</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                {history.length > 0 ? history.map(g => {
                                    const perc = Math.min(100, Math.round(((g.current_sales || 0) / g.targetAmount) * 100));
                                    return (
                                        <div
                                            key={g.id}
                                            onClick={() => setSelectedMonth(g.monthYear)}
                                            style={{ background: '#1e293b', padding: '25px', borderRadius: '30px', border: '1px solid #334155', cursor: 'pointer', transition: 'transform 0.2s', transform: 'scale(1)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{g.monthYear}</span>
                                                <button onClick={() => { setEditingGoal(g); setShowEditor(true); }} style={{ background: 'transparent', border: 'none', color: '#34d399', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>EDITAR</button>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                                <div>
                                                    <p style={{ fontSize: '9px', color: '#64748b' }}>META</p>
                                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#34d399' }}>${g.targetAmount.toLocaleString()}</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '9px', color: '#64748b' }}>LOGRADO</p>
                                                    <p style={{ fontSize: '18px', fontWeight: 'bold' }}>${(g.current_sales || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#020617', borderRadius: '10px', marginTop: '15px', overflow: 'hidden' }}>
                                                <div style={{ width: `${perc}%`, height: '100%', background: '#34d399', borderRadius: '10px' }}></div>
                                            </div>
                                            <p style={{ textAlign: 'center', fontSize: '10px', color: '#64748b', marginTop: '10px', fontWeight: 'bold' }}>{perc}% COMPLETADO</p>
                                        </div>
                                    )
                                }) : (
                                    <div style={{ gridColumn: '1/-1', padding: '40px', textAlign: 'center', color: '#475569', fontSize: '11px', fontWeight: 'bold', border: '1px dashed #334155', borderRadius: '20px' }}>
                                        NO HAY METAS HISTÓRICAS DISPONIBLES
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {/* MODAL EDITOR */}
                {showEditor && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                        <div style={{ background: '#0f172a', width: '100%', maxWidth: '350px', borderRadius: '40px', border: '1px solid #334155', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ background: '#059669', padding: '30px', textAlign: 'center' }}>
                                <h2 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', fontStyle: 'italic' }}>Configurar Meta</h2>
                            </div>
                            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginLeft: '10px' }}>Periodo</label>
                                    <input
                                        type="month"
                                        value={editingGoal.monthYear}
                                        onChange={e => {
                                            const m = e.target.value;
                                            setEditingGoal({ ...editingGoal, monthYear: m, totalWorkDays: getDaysInMonth(m) });
                                        }}
                                        style={{ width: '100%', background: '#1e293b', border: 'none', padding: '15px', color: 'white', borderRadius: '15px', marginTop: '5px', fontWeight: 'bold', outline: 'none' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginLeft: '10px' }}>Monto Meta ($)</label>
                                    <input type="number" inputMode="none" placeholder="0.00" value={editingGoal.targetAmount || ''} onChange={e => setEditingGoal({ ...editingGoal, targetAmount: Number(e.target.value) })} onFocus={() => { setActiveField('target'); setShowKeyboard(true); }} style={{ width: '100%', background: '#020617', border: 'none', padding: '20px', color: '#34d399', borderRadius: '20px', marginTop: '5px', fontWeight: '900', fontSize: '28px', textAlign: 'center', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginLeft: '10px' }}>Días de Operación (Proyección)</label>
                                    <input type="number" inputMode="none" placeholder="30" value={editingGoal.totalWorkDays || ''} onChange={e => setEditingGoal({ ...editingGoal, totalWorkDays: Number(e.target.value) })} onFocus={() => { setActiveField('days'); setShowKeyboard(true); }} style={{ width: '100%', background: '#1e293b', border: 'none', padding: '15px', color: 'white', borderRadius: '15px', marginTop: '5px', fontWeight: 'bold', outline: 'none', textAlign: 'center' }} />
                                    <p style={{ fontSize: '9px', color: '#475569', marginTop: '5px', textAlign: 'center' }}>Por defecto: días del mes</p>
                                </div>
                                <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                    <button onClick={() => setShowEditor(false)} style={{ flex: 1, background: 'transparent', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase' }}>Cerrar</button>
                                    <button onClick={handleSaveGoal} style={{ flex: 2, background: '#059669', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>Guardar Meta</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <AnimatePresence>
                {showKeyboard && (
                    <NumericKeyboard
                        value={activeField === 'target' ? String(editingGoal.targetAmount || '') : String(editingGoal.totalWorkDays || '')}
                        onChange={(val) => {
                            if (activeField === 'target') {
                                setEditingGoal({ ...editingGoal, targetAmount: Number(val) });
                            } else {
                                setEditingGoal({ ...editingGoal, totalWorkDays: Number(val) });
                            }
                        }}
                        onClose={() => { setShowKeyboard(false); setActiveField(null); }}
                        title={activeField === 'target' ? 'MONTO META' : 'DÍAS DE OPERACIÓN'}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Projections;
