/**
 * Google Apps Script Webhook para envío de tickets de LuckyPOS
 * Desplegar como: Aplicación Web
 * Acceso: Cualquier persona (incluso anónima) - para facilitar el no-cors
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { saleId, total, clientName, clientEmail, businessName, items } = data;

    const subject = `Ticket de Venta #${saleId} - ${businessName}`;
    
    let itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 5px; border-bottom: 1px solid #eee;">${item.quantity} x ${item.product}</td>
        <td style="padding: 5px; border-bottom: 1px solid #eee; text-align: right;">$${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
        <h2 style="text-align: center; color: #333;">${businessName}</h2>
        <p style="text-align: center; color: #666;">Gracias por su preferencia, <strong>${clientName}</strong>.</p>
        <hr style="border: 0; border-top: 1px dashed #ccc;">
        <div style="padding: 10px 0;">
          <p><strong>Ticket #:</strong> ${saleId}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9f9f9;">
              <th style="text-align: left; padding: 5px;">Producto</th>
              <th style="text-align: right; padding: 5px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div style="text-align: right; padding: 15px 0;">
          <h3 style="margin: 0;">TOTAL: $${Number(total).toFixed(2)}</h3>
        </div>
        <hr style="border: 0; border-top: 1px dashed #ccc;">
        <p style="text-align: center; color: #999; font-size: 12px;">Este es un comprobante digital generado automáticamente por LuckyPOS.</p>
      </div>
    `;

    MailApp.sendEmail({
      to: clientEmail,
      subject: subject,
      htmlBody: htmlBody
    });

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
