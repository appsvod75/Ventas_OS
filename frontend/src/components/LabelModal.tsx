import React, { forwardRef } from 'react';
import { X, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface LabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipment: any;
    businessConfig: any;
    labelFields: string[];
}

const LabelPreview = forwardRef<HTMLDivElement, { shipment: any; businessConfig: any; labelFields: string[] }>(
    ({ shipment, businessConfig, labelFields }, ref) => {
        const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        const fields = labelFields.length > 0 ? labelFields : ['businessName', 'clientName', 'phone', 'address', 'shippingDate', 'saleId', 'total'];

        return (
            <div ref={ref} style={{
                width: '70mm', padding: '3mm', background: 'white', color: 'black',
                fontFamily: "'Courier New', Courier, monospace", fontSize: '9pt', lineHeight: '1.3'
            }}>
                {fields.includes('businessName') && (
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '2mm', textTransform: 'uppercase' }}>
{businessConfig.businessName || 'Mi Negocio'}
                    </div>
                )}

                {fields.includes('saleId') && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                        <span>Venta #:</span>
                        <span style={{ fontWeight: 'bold' }}>{shipment.id}</span>
                    </div>
                )}

                {fields.includes('shippingDate') && shipment.shippingDate && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                        <span>Envío:</span>
                        <span style={{ fontWeight: 'bold' }}>{format(new Date(shipment.shippingDate), 'dd/MM/yy', { locale: es })}</span>
                    </div>
                )}

                {(!shipment.shippingDate && fields.includes('shippingDate')) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                        <span>Entrega:</span>
                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>INMEDIATA</span>
                    </div>
                )}

                {fields.includes('status') && (
                    <div style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '1mm', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        [{shipment.fulfillmentStatus === 'ENTREGADO' ? 'ENTREGADO' : shipment.fulfillmentStatus === 'DESPACHADO' ? 'DESPACHADO' : 'PENDIENTE'}]
                    </div>
                )}

                <div style={{ borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

                {fields.includes('clientName') && (
                    <div style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                        <span style={{ fontWeight: 'bold' }}>{shipment.client?.name || 'Cliente Varios'}</span>
                    </div>
                )}

                {fields.includes('phone') && shipment.client?.phone && (
                    <div style={{ fontSize: '8pt', marginBottom: '0.5mm' }}>
                        <span>Tel: {shipment.client.phone}</span>
                    </div>
                )}

                {fields.includes('address') && shipment.client?.address && (
                    <div style={{ fontSize: '8pt', marginBottom: '1mm' }}>
                        <span>{shipment.client.address}</span>
                    </div>
                )}

                {fields.includes('products') && (
                    <>
                        <div style={{ borderTop: '1px dashed #999', margin: '1.5mm 0' }} />
                        <div style={{ fontSize: '8pt', marginBottom: '0.5mm' }}>
                            {shipment.details?.map((d: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{d.product?.name || 'Producto'}</span>
                                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(d.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {fields.includes('total') && (
                    <>
                        <div style={{ borderTop: '1px dashed #999', margin: '1.5mm 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10pt' }}>
                            <span>TOTAL:</span>
                            <span>{formatCurrency(shipment.total)}</span>
                        </div>
                    </>
                )}

                <div style={{ borderTop: '1px solid #999', margin: '2mm 0 1mm' }} />
                <div style={{ textAlign: 'center', fontSize: '7pt', color: '#666' }}>
                    {businessConfig.businessName || 'Mi Negocio'} · {businessConfig.phone || ''}
                </div>
            </div>
        );
    }
);

LabelPreview.displayName = 'LabelPreview';

const LabelModal: React.FC<LabelModalProps> = ({ isOpen, onClose, shipment, businessConfig, labelFields }) => {
    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head>
                    <style>
                        @page { margin: 0; size: 70mm auto; }
                        body { margin: 0; padding: 0; }
                        @media print { body { margin: 0; } }
                    </style>
                </head>
                <body>${printRef.current?.innerHTML || ''}</body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" style={{ zIndex: 5000, background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1e293b', borderRadius: '20px', padding: '1.5rem',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 800 }}>Label de Envío</h3>
                            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                            <div ref={printRef}>
                                <LabelPreview shipment={shipment} businessConfig={businessConfig} labelFields={labelFields} />
                            </div>
                        </div>

                        <button onClick={handlePrint} style={{
                            width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                            background: '#3b82f6', color: 'white', fontWeight: 800, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer'
                        }}>
                            <Printer size={20} /> IMPRIMIR LABEL
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LabelModal;