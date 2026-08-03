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
    labelSections?: any;
}

const DEFAULT_SECTIONS = {
    section1: ['businessName', 'saleId', 'seller', 'shippingDate', 'status'],
    section2: ['clientName', 'phone', 'address', 'delivery'],
    section3: ['products', 'total']
};

const LabelPreview = forwardRef<HTMLDivElement, { shipment: any; businessConfig: any; labelFields: string[]; labelSections?: any }>(
    ({ shipment, businessConfig, labelFields, labelSections }, ref) => {
        const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        const flatFields = labelFields.length > 0 ? labelFields : ['businessName', 'clientName', 'phone', 'address', 'shippingDate', 'saleId', 'total'];
        const sections = labelSections && typeof labelSections === 'object'
            ? labelSections
            : DEFAULT_SECTIONS;

        const renderField = (field: string) => {
            switch (field) {
                case 'businessName':
                    return (
                        <div key={field} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11pt', marginBottom: '2mm', textTransform: 'uppercase' }}>
                            {businessConfig.businessName || 'Mi Negocio'}
                        </div>
                    );
                case 'saleId':
                    return (
                        <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>Venta #:</span>
                            <span style={{ fontWeight: 'bold' }}>{shipment.id}</span>
                        </div>
                    );
                case 'seller':
                    return shipment.user?.name ? (
                        <div key={field} style={{ fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>Vendedor: <span style={{ fontWeight: 'bold' }}>{shipment.user.name}</span></span>
                        </div>
                    ) : null;
                case 'shippingDate':
                    return shipment.shippingDate ? (
                        <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>Envío:</span>
                            <span style={{ fontWeight: 'bold' }}>{(() => {
                                const d = format(new Date(shipment.shippingDate), 'EEEE dd/MM/yyyy', { locale: es });
                                return d.charAt(0).toUpperCase() + d.slice(1);
                            })()}</span>
                        </div>
                    ) : (
                        <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>Entrega:</span>
                            <span style={{ fontWeight: 'bold', color: '#10b981' }}>INMEDIATA</span>
                        </div>
                    );
                case 'status':
                    return (
                        <div key={field} style={{ textAlign: 'center', fontSize: '8pt', marginBottom: '1mm', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            [{shipment.fulfillmentStatus === 'ENTREGADO' ? 'ENTREGADO' : shipment.fulfillmentStatus === 'DESPACHADO' ? 'DESPACHADO' : 'PENDIENTE'}]
                        </div>
                    );
                case 'clientName':
                    return (
                        <div key={field} style={{ fontSize: '9pt', marginBottom: '0.5mm' }}>
                            <span style={{ fontWeight: 'bold' }}>{shipment.client?.name || 'Cliente Varios'}</span>
                        </div>
                    );
                case 'phone':
                    return shipment.client?.phone ? (
                        <div key={field} style={{ fontSize: '8pt', marginBottom: '0.5mm' }}>
                            <span>Tel: {shipment.client.phone}</span>
                        </div>
                    ) : null;
                case 'address':
                    return shipment.client?.address ? (
                        <div key={field} style={{ fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>{shipment.client.address}</span>
                        </div>
                    ) : null;
                case 'delivery':
                    return shipment.delivery?.name ? (
                        <div key={field} style={{ fontSize: '8pt', marginBottom: '1mm' }}>
                            <span>Delivery: <span style={{ fontWeight: 'bold' }}>{shipment.delivery.name}</span>{shipment.delivery.phone ? ` · ${shipment.delivery.phone}` : ''}</span>
                        </div>
                    ) : null;
                case 'products':
                    return shipment.details?.length ? (
                        <div key={field} style={{ fontSize: '8pt', marginBottom: '0.5mm' }}>
                            {shipment.details.map((d: any, i: number) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{d.product?.name || 'Producto'}</span>
                                    <span style={{ fontWeight: 'bold' }}>{formatCurrency(d.subtotal)}</span>
                                </div>
                            ))}
                        </div>
                    ) : null;
                case 'total':
                    return (
                        <div key={field} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10pt' }}>
                            <span>TOTAL:</span>
                            <span>{formatCurrency(shipment.total)}</span>
                        </div>
                    );
                default:
                    return null;
            }
        };

        const renderSection = (fields: string[]) => {
            const visible = fields.filter((f: string) => flatFields.includes(f));
            if (visible.length === 0) return null;
            return (
                <div key={fields.join('-')}>
                    {visible.map(renderField)}
                </div>
            );
        };

        return (
            <div ref={ref} style={{
                width: '70mm', padding: '3mm', background: 'white', color: 'black',
                fontFamily: "'Courier New', Courier, monospace", fontSize: '9pt', lineHeight: '1.3'
            }}>
                {renderSection(sections.section1 || DEFAULT_SECTIONS.section1)}

                <div style={{ borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

                {renderSection(sections.section2 || DEFAULT_SECTIONS.section2)}

                <div style={{ borderTop: '1px dashed #999', margin: '1.5mm 0' }} />

                {renderSection(sections.section3 || DEFAULT_SECTIONS.section3)}

                <div style={{ borderTop: '1px solid #999', margin: '2mm 0 1mm' }} />
                <div style={{ textAlign: 'center', fontSize: '7pt', color: '#666' }}>
                    {businessConfig.businessName || 'Mi Negocio'} · {businessConfig.phone || ''}
                </div>
            </div>
        );
    }
);

LabelPreview.displayName = 'LabelPreview';

const LabelModal: React.FC<LabelModalProps> = ({ isOpen, onClose, shipment, businessConfig, labelFields, labelSections }) => {
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
                                <LabelPreview shipment={shipment} businessConfig={businessConfig} labelFields={labelFields} labelSections={labelSections} />
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