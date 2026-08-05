import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Calendar, CreditCard, Banknote, UserPlus, X, ShoppingCart, Plus, CheckCircle2, ChevronRight, Save, Building2, Delete, User, Phone, Mail, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clientApi, adminAuthApi } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import VirtualKeyboard from './VirtualKeyboard';
import NumericKeyboard from './NumericKeyboard';

interface CheckoutModalProps {
    orderTotal: number;
    shipping?: number;
    onClose: () => void;
    onConfirm: (paymentMethod: string, amountTendered: number, targetClient: any | null, dueDate?: string, customDate?: string, shippingDate?: string, userId?: number, deliveryId?: number, clientAddressId?: number | null) => void;
}

const PaymentMethod = {
    CASH: 'EFECTIVO',
    CARD: 'TARJETA',
    TRANSFER: 'TRANSFERENCIA',
    CREDIT: 'CREDITO'
};

const CheckoutModal: React.FC<CheckoutModalProps> = ({ orderTotal, shipping = 0, onClose, onConfirm }) => {
    const [method, setMethod] = useState(PaymentMethod.CASH);
    const [amountTendered, setAmountTendered] = useState<string>('');
    const user = JSON.parse(localStorage.getItem('user') || '{"name": "Usuario"}');
    const isAdmin = user?.role === 'Admin' || user?.id === 1;
    const [clients, setClients] = useState<any[]>([]);
    const [searchClient, setSearchClient] = useState('');
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
    const [isAmountKeyboardOpen, setIsAmountKeyboardOpen] = useState(false);
    const [isNewClientKeyboardOpen, setIsNewClientKeyboardOpen] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [isPartialPayment, setIsPartialPayment] = useState(false);
    const [sellers, setSellers] = useState<any[]>([]);
    const [selectedSellerId, setSelectedSellerId] = useState<number | null>(null);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [searchDelivery, setSearchDelivery] = useState('');
    const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
    const [showNewDeliveryForm, setShowNewDeliveryForm] = useState(false);
    const [newDeliveryName, setNewDeliveryName] = useState('');
    const [deliveryFiltered, setDeliveryFiltered] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

    const isTablet = true; // FORZADO PARA PC (Videos): window.matchMedia('(min-width: 901px) and (max-width: 1300px)').matches;

    const [dueDate, setDueDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const minDueDate = format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    const [saleDate, setSaleDate] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [shippingDate, setShippingDate] = useState<string>('');

    const [newClientData, setNewClientData] = useState({
        name: '',
        documentId: '',
        phone: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        setSaleDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        const loadData = async () => {
            try {
                const [clientsRes, usersRes, deliveriesRes] = await Promise.all([
                    clientApi.getClients(),
                    isAdmin ? adminAuthApi.getUsers() : Promise.resolve({ data: [] }),
                    import('../services/api').then(m => m.deliveryApi.getAll()).catch(() => ({ data: [] }))
                ]);
                setClients(clientsRes.data);
                setDeliveries(deliveriesRes.data || []);
                if (isAdmin && usersRes.data?.length) {
                    setSellers(usersRes.data);
                    setSelectedSellerId(usersRes.data.find((u: any) => u.id === user.id)?.id || user.id);
                }
            } catch (err) {
                console.error("Error loading data", err);
            }
        };
        loadData();
    }, []);

    const remainingBalance = useMemo(() => {
        if (!isPartialPayment) return 0;
        const tendered = parseFloat(amountTendered) || 0;
        return Math.max(0, orderTotal - tendered);
    }, [amountTendered, orderTotal, isPartialPayment]);

    const changeDue = useMemo(() => {
        if (isPartialPayment) return 0;
        const tendered = parseFloat(amountTendered) || 0;
        if (tendered > orderTotal) {
            return tendered - orderTotal;
        }
        return 0;
    }, [amountTendered, orderTotal, isPartialPayment]);

    const canConfirm = useMemo(() => {
        const tendered = parseFloat(amountTendered) || 0;
        if (!selectedClient) return false;
        if (isPartialPayment) {
            return tendered > 0;
        }
        if (method === PaymentMethod.CASH) {
            return tendered >= orderTotal - 0.01;
        }
        return true;
    }, [amountTendered, orderTotal, method, isPartialPayment, selectedClient]);

    const handleCreateClient = async () => {
        if (!newClientData.name || !newClientData.phone) return;
        try {
            const res = await clientApi.createClient(newClientData);
            setClients(prev => [...prev, res.data.data]);
            const refetched = await clientApi.getClients();
            setClients(refetched.data);
            const created = refetched.data.find((c: any) => c.id === res.data.data.id) || res.data.data;
            setSelectedClient(created);
            const def = (created.addresses || []).find((a: any) => a.isDefault) || (created.addresses || [])[0];
            setSelectedAddressId(def ? def.id : null);
            setShowNewClientForm(false);
            setSearchClient('');
            toast.success("Cliente creado con éxito");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Error al crear cliente");
        }
    };

    const confirmSale = () => {
        if (!canConfirm) return;
        const shipDate = shipping ? (shippingDate || undefined) : undefined;
        const delId = selectedDelivery?.id || undefined;
        if (isPartialPayment) {
            const partialAmount = parseFloat(amountTendered) || 0;
            const paymentLabel = method + '+CREDITO';
            onConfirm(paymentLabel, partialAmount, selectedClient, dueDate, isAdmin ? saleDate : undefined, shipDate, selectedSellerId || undefined, delId, selectedAddressId);
            return;
        }
        const finalTendered = method === PaymentMethod.CASH ? (parseFloat(amountTendered) || orderTotal) : orderTotal;
        onConfirm(method, finalTendered, selectedClient, method === PaymentMethod.CREDIT ? dueDate : undefined, isAdmin ? saleDate : undefined, shipDate, selectedSellerId || undefined, delId, selectedAddressId);
    };

    useEffect(() => {
        setDeliveryFiltered(deliveries.filter((d: any) => 
            d.name.toLowerCase().includes(searchDelivery.toLowerCase())
        ));
    }, [searchDelivery, deliveries]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchClient.toLowerCase()) ||
        (c.documentId && c.documentId.toLowerCase().includes(searchClient.toLowerCase()))
    );

    const highlightMatch = (text: string | null, query: string) => {
        if (!text) return null;
        if (!query) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === query.toLowerCase() 
                        ? <strong key={`hl-${i}`} style={{ color: '#10b981', fontWeight: 900 }}>{part}</strong>
                        : <span key={`hl-${i}`}>{part}</span>
                )}
            </span>
        );
    };

    return (
        <div className={`checkout-overlay ${isClientSearchFocused ? 'search-active' : ''}`} onClick={onClose}>
            
            <AnimatePresence>
                {showNewClientForm && (
                    <div className="new-client-overlay" onClick={e => e.stopPropagation()}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="new-client-modal"
                        >
                            <div className="new-client-header">
                                <div>
                                    <h3>NUEVO CLIENTE</h3>
                                    <p>Registra los datos para la factura</p>
                                </div>
                                <button onClick={() => setShowNewClientForm(false)} className="btn-close-client">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="new-client-body">
                                <div className="nc-field">
                                    <label>Nombre Completo / Razón Social <span className="nc-req">*</span></label>
                                    <div className="nc-input-wrapper">
                                        <User size={18} />
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newClientData.name}
                                            onChange={e => setNewClientData({ ...newClientData, name: e.target.value })}
                                            placeholder="Ej: Milton Garcia"
                                        />
                                    </div>
                                </div>

                                <div className="nc-row">
                                    <div className="nc-field">
                                        <label>DUI / NIT / DNI</label>
                                        <div className="nc-input-wrapper">
                                            <CreditCard size={18} />
                                            <input
                                                type="text"
                                                value={newClientData.documentId}
                                                onChange={e => setNewClientData({ ...newClientData, documentId: e.target.value })}
                                                placeholder="Opcional"
                                            />
                                        </div>
                                    </div>
                                    <div className="nc-field">
                                        <label>Teléfono <span className="nc-req">*</span></label>
                                        <div className="nc-input-wrapper">
                                            <Phone size={18} />
                                            <input
                                                required
                                                type="text"
                                                value={newClientData.phone}
                                                onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })}
                                                placeholder="Número de teléfono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="nc-field" style={{ marginTop: '0.75rem' }}>
                                    <label>Email</label>
                                    <div className="nc-input-wrapper">
                                        <Mail size={18} />
                                        <input
                                            type="email"
                                            value={newClientData.email}
                                            onChange={e => setNewClientData({ ...newClientData, email: e.target.value })}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                                <div className="nc-field" style={{ marginTop: '0.75rem' }}>
                                    <label>Dirección</label>
                                    <div className="nc-input-wrapper">
                                        <MapPin size={18} />
                                        <input
                                            type="text"
                                            value={newClientData.address}
                                            onChange={e => setNewClientData({ ...newClientData, address: e.target.value })}
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="new-client-footer">
                                <button onClick={() => setShowNewClientForm(false)} className="nc-btn-cancel">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateClient}
                                    disabled={!newClientData.name || !newClientData.phone}
                                    className={`nc-btn-save ${!newClientData.name || !newClientData.phone ? 'disabled' : ''}`}
                                >
                                    Guardar Cliente
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <motion.div 
                className={`checkout-layout-wrapper ${isClientSearchFocused ? 'search-mode' : ''}`} 
                onClick={e => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                <div className="checkout-modal">
                    <div className="checkout-header">
                        <div>
                            <h3>Finalizar Venta</h3>
                            <p>Completa los detalles del pago</p>
                        </div>
                        <button onClick={onClose} className="btn-close-modal">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="checkout-content">
                        <div className="total-display-card">
                            <span className="total-label">TOTAL A PAGAR</span>
                            <span className="total-amount">${orderTotal.toFixed(2)}</span>
                            <div className="total-breakdown">
                                <span>Subtotal: ${(orderTotal - shipping).toFixed(2)}</span>
                                {shipping > 0 && <span>Envío: ${shipping.toFixed(2)}</span>}
                            </div>
                        </div>

                        <div className="section-card">
                            <h4 className="section-title"><Search size={14} /> CLIENTE</h4>
                            {selectedClient ? (
                                <div className="selected-client-card">
                                    <div className="client-avatar"><UserPlus size={18} /></div>
                                    <div className="client-info">
                                        <p className="client-name">{selectedClient.name}</p>
                                        <p className="client-meta">{selectedClient.documentId || 'Sin DNI'}</p>
                                    </div>
                                    <button onClick={() => { setSelectedClient(null); setSelectedAddressId(null); }} className="btn-remove-client"><X size={16} /></button>
                                    {(shipping > 0 || (selectedClient.addresses || []).length > 0) && (
                                        <div style={{ marginTop: '0.75rem', width: '100%' }}>
                                            {(() => {
                                                const addresses = selectedClient.addresses || [];
                                                if (addresses.length === 0) {
                                                    return <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Cliente sin direcciones registradas.</p>;
                                                }
                                                return (
                                                    <>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
                                                            <MapPin size={13} /> Dirección de entrega
                                                        </label>
                                                        <select
                                                            value={selectedAddressId ?? ''}
                                                            onChange={e => setSelectedAddressId(e.target.value ? Number(e.target.value) : null)}
                                                            style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '0.5rem 0.75rem', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                                                        >
                                                            {addresses.map((a: any) => (
                                                                <option key={a.id} value={a.id}>
                                                                    {a.label ? `${a.label}: ` : ''}{a.address}{a.zone ? ` (${a.zone.name})` : ''}{a.isDefault ? ' (default)' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="client-search-container">
                                    <div className="search-input-wrapper">
                                        <Search size={16} className="search-icon" />
                                        <input
                                            type="text" placeholder="Buscar cliente..."
                                            value={searchClient} onChange={e => setSearchClient(e.target.value)}
                                            onFocus={() => setIsClientSearchFocused(true)}
                                            inputMode="none"
                                        />
                                        {searchClient && (
                                            <div className="client-results-dropdown">
                                                {filteredClients.length > 0 ? (
                                                    filteredClients.map(c => (
                                                        <button key={`client-${c.id}`} onClick={() => { setSelectedClient(c); setSearchClient(''); const def = (c.addresses || []).find((a: any) => a.isDefault) || (c.addresses || [])[0]; setSelectedAddressId(def ? def.id : null); }} className="result-item">
                                                            <div className="result-name">{highlightMatch(c.name, searchClient)}</div>
                                                            <div className="result-meta">{highlightMatch(c.documentId, searchClient)}</div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-slate-400 text-xs font-bold">Sin resultados</div>
                                                )}
                                                <button onClick={() => setShowNewClientForm(true)} className="btn-create-client-dropdown">
                                                    <Plus size={16} /> Crear Cliente "{searchClient}"
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="payment-methods-section">
                            <div className="payment-grid">
                                <button onClick={() => setMethod(PaymentMethod.CASH)} className={`pay-method-btn ${method === PaymentMethod.CASH ? 'active cash' : ''}`}>
                                    <Banknote size={20} /> <span>EFECTIVO</span>
                                </button>
                                <button onClick={() => setMethod(PaymentMethod.CARD)} className={`pay-method-btn ${method === PaymentMethod.CARD ? 'active card' : ''}`}>
                                    <CreditCard size={20} /> <span>TARJETA</span>
                                </button>
                                <button onClick={() => setMethod(PaymentMethod.TRANSFER)} className={`pay-method-btn ${method === PaymentMethod.TRANSFER ? 'active transfer' : ''}`}>
                                    <Building2 size={20} /> <span>TRANSF.</span>
                                </button>
                                {!isPartialPayment && (
                                <button onClick={() => selectedClient ? setMethod(PaymentMethod.CREDIT) : toast.error("Selecciona un cliente")} className={`pay-method-btn ${method === PaymentMethod.CREDIT ? 'active credit' : ''} ${!selectedClient ? 'disabled' : ''}`}>
                                    <UserPlus size={20} /> <span>CRÉDITO</span>
                                </button>
                                )}
                            </div>
                        </div>

                        <div className="section-card">
                            <h4 className="section-title">TIPO DE PAGO</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <button type="button" onClick={() => { setIsPartialPayment(false); setAmountTendered(''); if (method === PaymentMethod.CREDIT) setMethod(PaymentMethod.CASH); }} style={{ padding: '0.7rem', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', background: !isPartialPayment ? '#10b981' : '#1e293b', color: !isPartialPayment ? 'white' : '#64748b', boxShadow: !isPartialPayment ? '0 4px 12px rgba(16,185,129,0.3)' : 'none' }}>
                                    PAGO TOTAL
                                </button>
                                <button type="button" onClick={() => { setIsPartialPayment(true); setMethod(PaymentMethod.CASH); if (!selectedClient) toast('Selecciona un cliente para pago parcial', { icon: 'ℹ️' }); }} style={{ padding: '0.7rem', borderRadius: '12px', border: 'none', fontWeight: 900, fontSize: '0.8rem', cursor: 'pointer', background: isPartialPayment ? '#f59e0b' : '#1e293b', color: isPartialPayment ? 'white' : '#64748b', boxShadow: isPartialPayment ? '0 4px 12px rgba(245,158,11,0.3)' : 'none' }}>
                                    PAGO PARCIAL
                                </button>
                            </div>
                        </div>

                        {isPartialPayment && (
                            <div className="section-card">
                                <h4 className="section-title"><UserPlus size={14} /> SALDO PENDIENTE</h4>
                                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>ADEUDA:</span>
                                        <span style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: 900 }}>${remainingBalance.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700 }}>VENCE:</span>
                        <input 
                            type="date"
                            value={dueDate}
                            min={minDueDate}
                            onChange={e => setDueDate(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}
                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAdmin && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginTop: '0.25rem' }}>
                                <Calendar size={12} style={{ color: '#64748b' }} />
                                <span style={{ color: '#64748b', fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap' }}>FACTURACIÓN (ADMIN):</span>
                                <input 
                                    type="datetime-local"
                                    value={saleDate}
                                    onChange={e => setSaleDate(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.65rem', fontWeight: 700, outline: 'none', fontFamily: 'inherit', flex: 1 }}
                                />
                            </div>
                        )}
                        {sellers.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '8px', marginTop: '0.25rem' }}>
                                <User size={14} style={{ color: '#818cf8' }} />
                                <span style={{ color: '#818cf8', fontSize: '0.65rem', fontWeight: 800, whiteSpace: 'nowrap' }}>VENDEDOR:</span>
                                {isAdmin ? (
                                    <select value={selectedSellerId || ''} onChange={e => setSelectedSellerId(Number(e.target.value))}
                                        style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.7rem', fontWeight: 700, outline: 'none', fontFamily: 'inherit', flex: 1, cursor: 'pointer' }}>
                                        {sellers.map((s: any) => (
                                            <option key={s.id} value={s.id} style={{ background: '#1e293b', color: 'white' }}>{s.name}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 700 }}>{user.name}</span>
                                )}
                            </div>
                        )}

                        {shipping > 0 && (
                            <div className="section-card">
                                <h4 className="section-title"><Calendar size={14} /> FECHA DE ENVÍO</h4>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', background: !shippingDate ? 'rgba(16,185,129,0.1)' : '#1e293b', padding: '0.4rem 0.75rem', borderRadius: '8px', border: `1px solid ${!shippingDate ? 'rgba(16,185,129,0.2)' : '#334155'}`, color: !shippingDate ? '#10b981' : '#64748b', fontWeight: 700, fontSize: '0.7rem' }}>
                                        <input type="radio" name="shipType" checked={!shippingDate} onChange={() => setShippingDate('')} style={{ accentColor: '#10b981' }} />
                                        Inmediato
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', background: shippingDate ? 'rgba(245,158,11,0.1)' : '#1e293b', padding: '0.4rem 0.75rem', borderRadius: '8px', border: `1px solid ${shippingDate ? 'rgba(245,158,11,0.2)' : '#334155'}`, color: shippingDate ? '#f59e0b' : '#64748b', fontWeight: 700, fontSize: '0.7rem' }}>
                                        <input type="radio" name="shipType" checked={!!shippingDate} onChange={() => setShippingDate(format(new Date(), 'yyyy-MM-dd'))} style={{ accentColor: '#f59e0b' }} />
                                        Programado
                                    </label>
                                    {shippingDate && (
                                        <input type="date" value={shippingDate} onChange={e => setShippingDate(e.target.value)} style={{ flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'white', fontSize: '0.75rem', fontWeight: 700, outline: 'none', fontFamily: 'inherit' }} />
                                    )}
                                </div>
                            </div>
                        )}

                        {method === PaymentMethod.CREDIT && (
                            <div className="section-card">
                                <h4 className="section-title"><Calendar size={14} /> FECHA DE VENCIMIENTO</h4>
                                <div className="amount-input-wrapper date-input-wrapper">
            <input 
                type="date"
                value={dueDate}
                min={minDueDate}
                onChange={e => setDueDate(e.target.value)}
                className="checkout-date-input"
            />
                                </div>
                            </div>
                        )}

                        <div className="section-card">
                            <h4 className="section-title"><Truck size={14} /> DELIVERY/ENCOMENDISTA</h4>
                            {selectedDelivery ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '0.4rem 0.75rem' }}>
                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: '0.8rem' }}>{selectedDelivery.name}</span>
                                    <button onClick={() => setSelectedDelivery(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}><X size={14} /></button>
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <input type="text" placeholder="Buscar encomendista..." value={searchDelivery}
                                        onChange={e => setSearchDelivery(e.target.value)}
                                        style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'white', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' }} />
                                    {searchDelivery && deliveryFiltered.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', marginTop: '2px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            {deliveryFiltered.map((d: any) => (
                                                <button type="button" key={d.id} onClick={() => { setSelectedDelivery(d); setSearchDelivery(''); }}
                                                    style={{ width: '100%', textAlign: 'left', padding: '0.4rem 0.6rem', cursor: 'pointer', borderBottom: '1px solid #0f172a', fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600, transition: 'background 0.15s', background: 'transparent', border: 'none', display: 'block', fontFamily: 'inherit' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#0f172a'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                    {d.name} {d.phone ? `(${d.phone})` : ''}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {searchDelivery && deliveryFiltered.length === 0 && (
                                        <div onClick={async () => {
                                            if (!searchDelivery.trim()) return;
                                            try {
                                                const { deliveryApi } = await import('../services/api');
                                                const res = await deliveryApi.create({ name: searchDelivery.trim() });
                                                setDeliveries([...deliveries, res.data]);
                                                setSelectedDelivery(res.data);
                                                setSearchDelivery('');
                                            } catch {}
                                        }} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', marginTop: '2px', padding: '0.5rem 0.6rem', cursor: 'pointer', color: '#3b82f6', fontWeight: 700, fontSize: '0.75rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                                            <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} /> Crear "{searchDelivery}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className={`section-card amount-card ${isPartialPayment ? 'partial' : ''}`}>
                            <h4 className="section-title"><Banknote size={14} /> {isPartialPayment ? 'ABONO HOY' : 'MONTO RECIBIDO'}</h4>
                            <div className="amount-input-wrapper">
                                <span className="currency-symbol">$</span>
                                <input 
                                    type="text" 
                                    value={method === PaymentMethod.CASH || isPartialPayment ? amountTendered : orderTotal.toFixed(2)}
                                    onChange={e => (method === PaymentMethod.CASH || isPartialPayment) && setAmountTendered(e.target.value.replace(/[^0-9.]/g, ''))}
                                    placeholder={orderTotal.toFixed(2)}
                                    className="checkout-amount-input"
                                    onFocus={() => (method === PaymentMethod.CASH || isPartialPayment) && setIsAmountKeyboardOpen(true)}
                                    inputMode="none"
                                />
                            </div>
                            {method === PaymentMethod.CASH && !isPartialPayment && changeDue > 0 && (
                                <div className="change-display-premium">
                                    <span className="change-label">SU CAMBIO:</span>
                                    <strong className="change-amount">${changeDue.toFixed(2)}</strong>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="checkout-footer">
                        <button onClick={onClose} className="btn-cancel">Cancelar</button>
                        <button onClick={confirmSale} disabled={!canConfirm} className={`btn-confirm ${canConfirm ? 'ready' : 'disabled'}`}>
                            <CheckCircle2 size={20} /> CONFIRMAR
                        </button>
                    </div>
                </div>
            </motion.div>

            <AnimatePresence>
                {isClientSearchFocused && (
                    <VirtualKeyboard 
                        value={searchClient}
                        onChange={setSearchClient}
                        onClose={() => setIsClientSearchFocused(false)}
                        title="BUSCAR CLIENTE"
                    />
                )}
                {isAmountKeyboardOpen && (
                    <NumericKeyboard 
                        value={amountTendered}
                        onChange={setAmountTendered}
                        onClose={() => setIsAmountKeyboardOpen(false)}
                        title="MONTO RECIBIDO"
                        showExact={true}
                        exactAmount={orderTotal}
                        onConfirm={() => setIsAmountKeyboardOpen(false)}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .checkout-overlay {
                    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.75);
                    backdrop-filter: blur(12px); display: flex; align-items: center;
                    justify-content: center; padding: 1rem; z-index: 2000;
                }
                .checkout-modal {
                    background: #0f172a; width: min(420px, 92vw);
                    border-radius: 20px; box-shadow: 0 40px 80px -15px rgba(0,0,0,0.6);
                    overflow: hidden; display: flex; flex-direction: column;
                    border: 1px solid rgba(255,255,255,0.1);
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .checkout-header { 
                    padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; 
                    background: transparent; border-bottom: 1px solid rgba(255,255,255,0.05); 
                }
                .checkout-header h3 { font-size: 1.1rem; font-weight: 900; color: white; margin: 0; }
                .checkout-header p { font-size: 0.65rem; color: #94a3b8; margin: 2px 0 0; font-weight: 700; }
                .btn-close-modal { color: #64748b; transition: color 0.2s; background: rgba(255,255,255,0.05); border-radius: 50%; padding: 4px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
                .btn-close-modal:hover { color: white; background: #ef4444; }

                .checkout-content { padding: 10px 16px; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; overflow-x: hidden; }
                .checkout-content::-webkit-scrollbar { width: 4px; }
                .checkout-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                
                .total-display-card { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
                .total-label { font-size: 0.6rem; font-weight: 900; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; }
                .total-amount { font-size: 2.5rem; font-weight: 900; color: #10b981; display: block; line-height: 1; margin-top: 2px; }
                .total-breakdown { display: flex; justify-content: center; gap: 1rem; margin-top: 4px; font-size: 0.65rem; font-weight: 700; color: #64748b; }
                .total-breakdown span { background: rgba(255,255,255,0.03); padding: 2px 8px; border-radius: 6px; }

                .section-card { display: flex; flex-direction: column; gap: 4px; }
                .section-title { font-size: 0.65rem; font-weight: 800; color: #cbd5e1; text-transform: uppercase; display: flex; align-items: center; gap: 4px; margin-bottom: 2px; }
                
                .search-input-wrapper { display: flex; align-items: center; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 0 10px; height: 38px; position: relative; transition: all 0.2s; }
                .search-input-wrapper:focus-within { border-color: #3b82f6; background: rgba(0,0,0,0.4); box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
                .search-input-wrapper input { flex: 1; padding: 0; height: 100%; border: none; background: transparent; font-weight: 700; outline: none; color: white; font-size: 0.85rem; }
                .search-icon { color: #64748b; margin-right: 8px; }
                
                .selected-client-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 12px; display: flex; align-items: center; gap: 10px; }
                .client-avatar { width: 32px; height: 32px; background: rgba(59,130,246,0.2); color: #60a5fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
                .client-name { font-weight: 800; color: white; font-size: 0.85rem; }
                .client-meta { font-size: 0.65rem; color: #94a3b8; font-weight: 700; }
                .btn-remove-client { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
                .btn-remove-client:hover { background: rgba(239, 68, 68, 0.1); }
                
                .payment-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
                .pay-method-btn { padding: 8px 4px; border-radius: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: #94a3b8; transition: all 0.2s; border: none; cursor: pointer; }
                .pay-method-btn span { font-weight: 900; font-size: 0.6rem; letter-spacing: 0.02em; }
                .pay-method-btn svg { width: 14px; height: 14px; }
                .pay-method-btn.active.cash { background: rgba(16,185,129,0.15); border-color: #10b981; color: #10b981; box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
                .pay-method-btn.active.card { background: rgba(59,130,246,0.15); border-color: #3b82f6; color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.2); }
                .pay-method-btn.active.transfer { background: rgba(139,92,246,0.15); border-color: #8b5cf6; color: #a78bfa; box-shadow: 0 4px 12px rgba(139,92,246,0.2); }
                .pay-method-btn.active.credit { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #fbbf24; box-shadow: 0 4px 12px rgba(245,158,11,0.2); }
                .pay-method-btn.disabled { opacity: 0.3; pointer-events: none; }

                .amount-input-wrapper { display: flex; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; height: 44px; padding: 0 12px; gap: 8px; }
                .amount-input-wrapper input { font-size: 1.6rem; font-weight: 900; width: 100%; height: 100%; padding: 0; border: none; outline: none; text-align: center; background: transparent; color: white; }
                .amount-input-wrapper input::placeholder { color: rgba(255,255,255,0.2); }
                .currency-prefix { font-size: 1rem; font-weight: 900; color: #64748b; }
                
                .date-input-wrapper { height: 32px; padding: 0 10px; }
                .checkout-date-input { width: 100%; background: transparent; border: none; outline: none; color: white; font-weight: 700; font-size: 0.75rem !important; text-align: left; font-family: inherit; }
                .checkout-date-input::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.5; transition: opacity 0.2s; }
                .checkout-date-input::-webkit-calendar-picker-indicator:hover { opacity: 1; }

                .change-display-premium { 
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                    padding: 8px 16px; border-radius: 10px; display: flex; 
                    justify-content: space-between; align-items: center; 
                    box-shadow: 0 4px 12px rgba(16,185,129,0.3); 
                    border: 1px solid rgba(255,255,255,0.2);
                    margin-top: 8px;
                }
                .change-label { color: rgba(255,255,255,0.9); font-weight: 800; font-size: 0.7rem; letter-spacing: 0.05em; margin: 0; }
                .change-amount { color: white; font-size: 1.5rem; font-weight: 900; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); margin: 0; align-self: center; }

                .checkout-footer { padding: 10px 16px; display: flex; gap: 8px; background: transparent; border-top: 1px solid rgba(255,255,255,0.05); }
                .btn-confirm { flex: 2; height: 42px; border-radius: 10px; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.2); border: none; cursor: pointer; transition: transform 0.1s; }
                .btn-confirm.ready:active { transform: scale(0.96); }
                .btn-confirm.disabled { background: rgba(255,255,255,0.1); color: #64748b; box-shadow: none; pointer-events: none; }
                .btn-cancel { flex: 1; font-weight: 800; color: #94a3b8; font-size: 0.75rem; background: none; border: none; cursor: pointer; transition: color 0.1s; }
                .btn-cancel:hover { color: white; }

                .checkout-layout-wrapper { display: flex; align-items: center; gap: 20px; transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
                .checkout-layout-wrapper.search-mode { gap: 0; }
                
                .external-checkout-keypad { 
                    width: 300px; 
                    background: rgba(255, 255, 255, 0.35); 
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(200%);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px; 
                    padding: 1rem; 
                    box-shadow: 0 30px 60px rgba(0,0,0,0.3); 
                    display: flex; flex-direction: column; gap: 10px; 
                }
                .keypad-header { font-size: 0.6rem; font-weight: 900; color: white; background: #0f172a; padding: 4px 10px; border-radius: 100px; display: inline-block; align-self: center; letter-spacing: 0.1em; opacity: 0.9; }
                .keypad-grid-external { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
                .key-btn-ext { 
                    height: 50px; background: rgba(255, 255, 255, 0.85);
                    border-radius: 12px; font-size: 1.25rem; font-weight: 900; 
                    color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                    transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .key-btn-ext:active { transform: scale(0.88); background: white; box-shadow: 0 0 20px rgba(59,130,246,0.6); border: 1px solid #3b82f6; }
                .back-btn-ext { background: #fee2e2; color: #ef4444; }
                .quick-amounts-external { display: flex; gap: 8px; margin-top: 0px; }
                .quick-btn-ext { flex: 1; padding: 10px; border-radius: 10px; font-weight: 900; font-size: 0.75rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
                .exact-btn-ext { background: #10b981; color: white; box-shadow: 0 4px 12px rgba(16,185,129,0.2); }
                .exact-btn-ext:active { transform: scale(0.95); }
                
                .client-results-dropdown { 
                    position: absolute; top: 100%; left: 0; right: 0; background: #1e293b; 
                    border-radius: 12px; z-index: 1000; box-shadow: 0 20px 40px rgba(0,0,0,0.4); 
                    border: 1px solid rgba(255,255,255,0.1); overflow: hidden; margin-top: 4px;
                }
                .result-item { width: 100%; padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); transition: all 0.2s; color: white; background: transparent; border-top: none; border-left: none; border-right: none; cursor: pointer; }
                .result-item:hover { background: rgba(59,130,246,0.15); padding-left: 18px; }
                .result-name { font-weight: 800; font-size: 0.85rem; color: white; margin-bottom: 2px; }
                .result-meta { font-size: 0.65rem; color: #94a3b8; }
                .btn-create-client-dropdown { width: 100%; padding: 12px; color: #38bdf8; font-weight: 800; font-size: 0.75rem; background: rgba(56, 189, 248, 0.1); display: flex; align-items: center; justify-content: center; gap: 8px; border: none; cursor: pointer; transition: background 0.2s; }
                .btn-create-client-dropdown:hover { background: rgba(56, 189, 248, 0.2); }

                .new-client-overlay {
                    position: fixed; inset: 0; z-index: 6000;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
                    padding: 1rem;
                }
                .new-client-modal {
                    background: #ffffff; width: min(420px, 92vw);
                    border-radius: 24px; overflow: hidden;
                    box-shadow: 0 30px 60px -15px rgba(0,0,0,0.5);
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .new-client-header {
                    padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .new-client-header h3 { font-size: 1.25rem; font-weight: 900; color: #0f172a; margin: 0; }
                .new-client-header p { font-size: 0.75rem; color: #64748b; margin: 4px 0 0; font-weight: 700; }
                .btn-close-client { color: #94a3b8; transition: color 0.2s; background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }
                .btn-close-client:hover { color: #ef4444; background: #fee2e2; }
                
                .new-client-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
                .nc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
                .nc-field { display: flex; flex-direction: column; gap: 6px; }
                .nc-field label { font-size: 0.65rem; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                .nc-req { color: #ef4444; }
                .nc-input-wrapper {
                    position: relative; display: flex; align-items: center;
                    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
                    transition: all 0.2s;
                }
                .nc-input-wrapper:focus-within { border-color: #3b82f6; background: white; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .nc-input-wrapper svg { position: absolute; left: 12px; color: #94a3b8; pointer-events: none; }
                .nc-input-wrapper input {
                    width: 100%; padding: 12px 12px 12px 36px; border: none; background: transparent;
                    font-size: 0.85rem; font-weight: 700; color: #0f172a; outline: none;
                }
                
                .new-client-footer {
                    padding: 16px 24px; background: #fafafa; border-top: 1px solid #f1f5f9;
                    display: flex; gap: 12px;
                }
                .nc-btn-cancel {
                    flex: 1; padding: 14px; background: none; border: none;
                    font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase;
                    cursor: pointer; transition: color 0.2s;
                }
                .nc-btn-cancel:hover { color: #0f172a; }
                .nc-btn-save {
                    flex: 2; padding: 14px; background: #3b82f6; color: white; border: none;
                    border-radius: 12px; font-size: 0.8rem; font-weight: 900; text-transform: uppercase;
                    letter-spacing: 0.05em; cursor: pointer; transition: all 0.2s;
                    box-shadow: 0 4px 12px rgba(59,130,246,0.25);
                }
                .nc-btn-save:hover { background: #2563eb; transform: translateY(-1px); }
                .nc-btn-save:active { transform: translateY(1px); }
                .nc-btn-save.disabled { opacity: 0.5; pointer-events: none; box-shadow: none; background: #94a3b8; }
            `}</style>
        </div>
    );
};

export default CheckoutModal;
