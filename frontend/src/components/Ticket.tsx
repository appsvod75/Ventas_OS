import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketProps {
    sale: any;
    businessConfig: {
        businessName: string;
        address: string;
        phone: string;
        ticketHeader: string;
        ticketFooter: string;
        ticketWidth?: string;
        enableQrCode?: boolean;
    };
}

const Ticket = forwardRef<HTMLDivElement, TicketProps>(({ sale, businessConfig }, ref) => {
    if (!sale) return null;

    const ticketWidth = businessConfig.ticketWidth || '58mm';

    const formatCurrency = (val: number | string) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    return (
        <div ref={ref} className="ticket-printable">
            <style>{`
                .ticket-printable {
                    width: ${ticketWidth};
                    padding: 5mm;
                    background: white;
                    color: black;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 10pt;
                    line-height: 1.2;
                }
                .ticket-header {
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .ticket-business-name {
                    font-weight: bold;
                    font-size: 14pt;
                    text-transform: uppercase;
                    margin-bottom: 2mm;
                }
                .ticket-divider {
                    border-bottom: 1px dashed black;
                    margin: 3mm 0;
                }
                .ticket-info-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9pt;
                    margin-bottom: 1mm;
                }
                .ticket-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 3mm 0;
                }
                .ticket-table th {
                    border-bottom: 1px solid black;
                    text-align: left;
                    font-size: 9pt;
                }
                .ticket-table td {
                    padding: 1mm 0;
                    vertical-align: top;
                }
                .ticket-totals {
                    margin-top: 3mm;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    font-weight: bold;
                }
                .grand-total {
                    font-size: 12pt;
                    margin-top: 1mm;
                    border-top: 1px solid black;
                    padding-top: 1mm;
                }
                .ticket-footer {
                    text-align: center;
                    margin-top: 8mm;
                    font-size: 9pt;
                    font-style: italic;
                }
                .qr-placeholder {
                    width: 30mm;
                    height: 30mm;
                    margin: 5mm auto;
                    border: 1px solid #eee;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 8pt;
                    color: #999;
                }

                @media print {
                    @page {
                        margin: 0;
                        size: ${ticketWidth} auto;
                    }
                    body {
                        margin: 0;
                    }
                }
            `}</style>

            <header className="ticket-header">
                <div className="ticket-business-name">{businessConfig.businessName || 'Mi Negocio'}</div>
                <div className="ticket-address">{businessConfig.address || 'San Salvador, El Salvador'}</div>
                <div className="ticket-phone">Tel: {businessConfig.phone || '0000-0000'}</div>
                <div className="ticket-divider" />
                <div className="custom-header">{businessConfig.ticketHeader}</div>
            </header>

            <section className="ticket-details">
                <div className="ticket-info-row">
                    <span>Ticket #:</span>
                    <span>{sale.id}</span>
                </div>
                <div className="ticket-info-row">
                    <span>Fecha:</span>
                    <span>{format(new Date(sale.createdAt), "dd/MM/yy HH:mm")}</span>
                </div>
                <div className="ticket-info-row">
                    <span>Cajero:</span>
                    <span>{sale.user?.name || 'Sistema'}</span>
                </div>
                {sale.client && (
                    <div className="ticket-info-row">
                        <span>Cliente:</span>
                        <span>{sale.client.name}</span>
                    </div>
                )}
                <div className="ticket-info-row">
                    <span>Pago:</span>
                    <span>{sale.paymentMethod}</span>
                </div>
            </section>

            <div className="ticket-divider" />

            <table className="ticket-table">
                <thead>
                    <tr>
                        <th style={{ width: '10%' }}>C.</th>
                        <th style={{ width: '60%' }}>Desc.</th>
                        <th style={{ width: '30%', textAlign: 'right' }}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.details?.map((item: any, idx: number) => (
                        <tr key={idx}>
                            <td colSpan={3} style={{ padding: '0.5mm 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ flex: 1 }}>{item.quantity} x {item.product?.name || 'Producto'}</span>
                                    <span style={{ textAlign: 'right', minWidth: '15mm' }}>{formatCurrency(item.subtotal)}</span>
                                </div>
                                {item.notes && (
                                    <div style={{ fontSize: '8pt', fontStyle: 'italic', marginLeft: '3mm', marginTop: '0.5mm' }}>
                                        - {item.notes}
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="ticket-divider" />

            <section className="ticket-totals">
                    {sale.shipping > 0 && (
                    <div className="total-row" style={{ borderTop: '1px dashed #999', paddingTop: '1mm', marginTop: '1mm' }}>
                        <span>Envío:</span>
                        <span>{formatCurrency(sale.shipping)}</span>
                    </div>
                )}
                <div className="total-row grand-total" style={{ borderTop: 'none', borderBottom: '1px solid black', paddingBottom: '1mm', marginBottom: '1mm' }}>
                    <span>TOTAL:</span>
                    <span>{formatCurrency(sale.total)}</span>
                </div>
                <div className="total-row">
                    <span>Recibido:</span>
                    <span>{formatCurrency(sale.amountTendered ?? sale.total)}</span>
                </div>
                <div className="total-row">
                    <span>Cambio:</span>
                    <span>{formatCurrency(sale.change ?? 0)}</span>
                </div>
            </section>

            {/* QR Dinámico (Condicional) */}
            {businessConfig.enableQrCode && (
                <div style={{ textAlign: 'center', margin: '5mm auto' }}>
                    <img 
                        src={`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(`SALE:${sale.id}|TOTAL:${sale.total}|DATE:${sale.createdAt}`)}&choe=UTF-8`}
                        alt="Ticket QR"
                        style={{ width: '35mm', height: '35mm' }}
                    />
                    <div style={{ fontSize: '7pt', color: '#666', marginTop: '1mm' }}>#{sale.id}</div>
                </div>
            )}

            <footer className="ticket-footer">
                <p>{businessConfig.ticketFooter || '¡Vuelva pronto!'}</p>
                <div className="ticket-divider" />
                <p style={{ fontSize: '7pt', color: '#666' }}>Potenciado por Antigravity AI</p>
            </footer>
        </div>
    );
});

Ticket.displayName = 'Ticket';

export default Ticket;
