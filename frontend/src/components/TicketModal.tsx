import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer, CheckCircle2, Mail, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Ticket from './Ticket';
import toast from 'react-hot-toast';

interface TicketModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: any;
    businessConfig: any;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, sale, businessConfig }) => {
    const [sendingEmail, setSendingEmail] = useState(false);
    const printRef = React.useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const handleSendEmail = async () => {
        if (!businessConfig.emailWebhookUrl) {
            toast.error('Webhook de correo no configurado');
            return;
        }

        const email = sale.client?.email;
        if (!email) {
            toast.error('El cliente no tiene un correo registrado');
            return;
        }

        try {
            setSendingEmail(true);
            const response = await fetch(businessConfig.emailWebhookUrl, {
                method: 'POST',
                mode: 'no-cors', // Common for GAS webhooks
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    saleId: sale.id,
                    total: sale.total,
                    clientName: sale.client.name,
                    clientEmail: email,
                    businessName: businessConfig.businessName,
                    items: sale.details.map((d: any) => ({
                        product: d.product?.name || d.productName,
                        quantity: d.quantity,
                        subtotal: d.subtotal
                    }))
                }),
            });
            
            // With mode 'no-cors', we won't get a proper success status,
            // but the request is sent.
            toast.success('Solicitud de envío enviada');
        } catch (error) {
            console.error('Error sending email:', error);
            toast.error('Error al intentar enviar el correo');
        } finally {
            setSendingEmail(false);
        }
    };

    if (!isOpen) return null;

    const ticketWidth = businessConfig.ticketWidth || '58mm';

    return ReactDOM.createPortal(
        <AnimatePresence>
            <div className="ticket-modal-overlay">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="ticket-modal-container"
                >
                    <div className="ticket-modal-header">
                        <div className="header-status">
                            <div className="status-icon">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3>Venta Exitosa</h3>
                                <p>Vista previa del ticket de venta</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="btn-close-ticket">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="ticket-modal-content">
                        {businessConfig.enableEmailTickets && sale.client?.email && (
                            <div style={{ width: '100%', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: '#3b82f6' }}><Mail size={24} /></div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Enviar a Cliente</p>
                                    <p style={{ margin: 0, fontSize: '0.95rem', color: 'white', fontWeight: 600 }}>{sale.client.email}</p>
                                </div>
                                <button 
                                    onClick={handleSendEmail} 
                                    disabled={sendingEmail}
                                    style={{ 
                                        background: '#3b82f6', border: 'none', borderRadius: '10px', 
                                        padding: '8px 16px', color: 'white', fontWeight: 700, 
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                                    }}
                                >
                                    {sendingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                    Enviar
                                </button>
                            </div>
                        )}

                        <div className="ticket-preview-wrapper" style={{ width: ticketWidth }}>
                            <div className="ticket-paper">
                                <Ticket sale={sale} businessConfig={businessConfig} ref={printRef} />
                            </div>
                        </div>
                    </div>

                    <div className="ticket-modal-footer">
                        <button onClick={onClose} className="btn-secondary-full">
                            Cerrar
                        </button>
                        <button onClick={handlePrint} className="btn-primary-full">
                            <Printer size={20} />
                            Imprimir Ticket
                        </button>
                    </div>
                </motion.div>

                <style>{`
                    .ticket-modal-overlay {
                        position: fixed;
                        inset: 0;
                        background: rgba(0, 0, 0, 0.85);
                        backdrop-filter: blur(10px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 9999;
                        padding: 1rem;
                    }
                    .ticket-modal-container {
                        background: #0f172a;
                        width: 100%;
                        max-width: 480px;
                        border-radius: 24px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 40px 100px -20px rgba(0,0,0,0.8);
                        display: flex;
                        flex-direction: column;
                        max-height: 90vh;
                        overflow: hidden;
                    }
                    .ticket-modal-header {
                        padding: 1.25rem 1.5rem;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                    }
                    .header-status {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    .status-icon {
                        width: 40px;
                        height: 40px;
                        background: rgba(16, 185, 129, 0.1);
                        color: #10b981;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .header-status h3 {
                        margin: 0;
                        font-size: 1.1rem;
                        font-weight: 800;
                        color: white;
                    }
                    .header-status p {
                        margin: 0;
                        font-size: 0.75rem;
                        color: #64748b;
                    }
                    .btn-close-ticket {
                        background: none;
                        border: none;
                        color: #64748b;
                        cursor: pointer;
                        padding: 4px;
                    }
                    .ticket-modal-content {
                        flex: 1;
                        padding: 1.5rem;
                        background: #1e293b50;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    .ticket-preview-wrapper {
                        background: white;
                        border-radius: 4px;
                        padding: 0;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        transform-origin: top center;
                    }
                    .ticket-paper {
                        background: white;
                        color: black;
                    }
                    .ticket-modal-footer {
                        padding: 1.25rem;
                        display: flex;
                        gap: 12px;
                        background: rgba(10, 15, 29, 0.5);
                        border-top: 1px solid rgba(255, 255, 255, 0.05);
                        flex-shrink: 0;
                    }
                    .btn-secondary-full {
                        flex: 1;
                        padding: 12px;
                        background: rgba(255, 255, 255, 0.05);
                        border: none;
                        border-radius: 12px;
                        color: #94a3b8;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .btn-primary-full {
                        flex: 2;
                        padding: 12px;
                        background: #10b981;
                        border: none;
                        border-radius: 12px;
                        color: white;
                        font-weight: 800;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .btn-primary-full:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
                    }

                    @media print {
                        body > *:not(#portal-root) {
                            display: none !important;
                        }
                        .ticket-modal-overlay {
                            background: white !important;
                            padding: 0 !important;
                            backdrop-filter: none !important;
                        }
                        .ticket-modal-container {
                            border: none !important;
                            box-shadow: none !important;
                            background: white !important;
                            width: 100% !important;
                            max-width: none !important;
                            max-height: none !important;
                            border-radius: 0 !important;
                        }
                        .ticket-modal-header, .ticket-modal-footer {
                            display: none !important;
                        }
                        .ticket-modal-content {
                            padding: 0 !important;
                            margin: 0 !important;
                            background: white !important;
                        }
                        .ticket-preview-wrapper {
                            box-shadow: none !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        @page {
                            margin: 0;
                            size: ${ticketWidth} auto;
                        }
                    }
                `}</style>
            </div>
        </AnimatePresence>,
        document.getElementById('portal-root') || document.body
    );
};

export default TicketModal;
