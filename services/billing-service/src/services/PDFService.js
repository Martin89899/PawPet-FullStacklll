const PDFDocument = require('pdfkit');

/**
 * Servicio para generación de PDFs
 */
class PDFService {
  /**
   * Generar PDF de factura
   */
  async generateInvoicePDF(invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        // Capturar el PDF en chunks
        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          reject(error);
        });

        // Generar contenido del PDF
        this._generateInvoiceContent(doc, invoice);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generar contenido del PDF de factura
   */
  _generateInvoiceContent(doc, invoice) {
    // Configuración inicial
    doc.fontSize(12);
    const pageWidth = doc.page.width;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Encabezado
    doc.fontSize(20).text('PAWPET VETERINARY CLINIC', margin, 50, { align: 'center' });
    doc.fontSize(12).text('Invoice', margin, 80, { align: 'center' });
    
    // Línea separadora
    doc.moveTo(margin, 100).lineTo(pageWidth - margin, 100).stroke();

    // Información de la factura
    doc.fontSize(14).text(`Invoice #: ${invoice.invoiceNumber}`, margin, 120);
    doc.fontSize(12).text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, margin, 140);
    doc.fontSize(12).text(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}`, margin, 160);
    
    // Status badge
    const statusColor = this._getStatusColor(invoice.status);
    doc.fillColor(statusColor);
    doc.fontSize(12).text(`Status: ${invoice.status.toUpperCase()}`, pageWidth - margin - 150, 120);
    doc.fillColor('black');

    // Información del cliente y paciente
    doc.fontSize(14).text('Bill To:', margin, 200);
    doc.fontSize(12).text(`Client ID: ${invoice.clientId}`, margin, 220);
    doc.fontSize(12).text(`Patient ID: ${invoice.patientId}`, margin, 240);
    
    if (invoice.veterinarianId) {
      doc.fontSize(12).text(`Veterinarian ID: ${invoice.veterinarianId}`, margin, 260);
    }

    // Tabla de items
    const tableTop = 320;
    const itemHeight = 25;
    const headerHeight = 30;

    // Encabezados de tabla
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Description', margin, tableTop);
    doc.text('Qty', margin + 300, tableTop);
    doc.text('Unit Price', margin + 350, tableTop);
    doc.text('Total', margin + 450, tableTop);

    // Línea después de encabezados
    doc.moveTo(margin, tableTop + headerHeight - 5).lineTo(pageWidth - margin, tableTop + headerHeight - 5).stroke();

    // Items de la factura
    doc.font('Helvetica');
    let currentY = tableTop + headerHeight;
    
    invoice.items.forEach((item, index) => {
      const itemY = currentY + (index * itemHeight);
      
      // Descripción (con wrap si es necesario)
      doc.text(item.description, margin, itemY, { width: 280 });
      doc.text(item.quantity.toString(), margin + 300, itemY);
      doc.text(`$${item.unitPrice.toFixed(2)}`, margin + 350, itemY);
      doc.text(`$${item.totalPrice.toFixed(2)}`, margin + 450, itemY);
    });

    // Línea después de items
    const itemsEndY = currentY + (invoice.items.length * itemHeight) + 10;
    doc.moveTo(margin, itemsEndY).lineTo(pageWidth - margin, itemsEndY).stroke();

    // Totales
    const totalsY = itemsEndY + 20;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Subtotal:', margin + 350, totalsY);
    doc.text(`$${invoice.subtotal.toFixed(2)}`, margin + 450, totalsY);
    
    if (invoice.taxAmount > 0) {
      doc.text('Tax:', margin + 350, totalsY + 20);
      doc.text(`$${invoice.taxAmount.toFixed(2)}`, margin + 450, totalsY + 20);
    }

    // Total
    doc.fontSize(14).text('TOTAL:', margin + 350, totalsY + 40);
    doc.text(`$${invoice.totalAmount.toFixed(2)}`, margin + 450, totalsY + 40);

    // Notas
    if (invoice.notes) {
      doc.fontSize(12).font('Helvetica');
      doc.text('Notes:', margin, totalsY + 80);
      doc.text(invoice.notes, margin, totalsY + 100, { width: contentWidth });
    }

    // Footer
    const footerY = doc.page.height - 100;
    doc.fontSize(10).text('Thank you for choosing PawPet Veterinary Clinic!', margin, footerY, { align: 'center' });
    doc.fontSize(10).text('This is a computer-generated invoice and does not require a signature.', margin, footerY + 15, { align: 'center' });

    // Contact information
    doc.fontSize(9).text('PawPet Veterinary Clinic | 123 Pet Street | City, State 12345 | Phone: (555) 123-4567 | Email: info@pawpet.com', margin, footerY + 30, { align: 'center' });
  }

  /**
   * Obtener color según estado
   */
  _getStatusColor(status) {
    switch (status) {
      case 'paid':
        return 'green';
      case 'pending':
        return 'orange';
      case 'cancelled':
        return 'red';
      case 'refunded':
        return 'purple';
      default:
        return 'black';
    }
  }

  /**
   * Generar PDF de recibo
   */
  async generateReceiptPDF(payment, invoice) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          reject(error);
        });

        this._generateReceiptContent(doc, payment, invoice);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generar contenido del PDF de recibo
   */
  _generateReceiptContent(doc, payment, invoice) {
    const pageWidth = doc.page.width;
    const margin = 50;

    // Encabezado
    doc.fontSize(20).text('PAYMENT RECEIPT', margin, 50, { align: 'center' });
    doc.fontSize(16).text(`Invoice #${invoice.invoiceNumber}`, margin, 80, { align: 'center' });

    // Línea separadora
    doc.moveTo(margin, 110).lineTo(pageWidth - margin, 110).stroke();

    // Información del pago
    doc.fontSize(14).text('Payment Information', margin, 140);
    doc.fontSize(12).text(`Receipt ID: ${payment.id}`, margin, 165);
    doc.fontSize(12).text(`Payment Date: ${new Date(payment.paymentDate).toLocaleDateString()}`, margin, 185);
    doc.fontSize(12).text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, margin, 205);
    doc.fontSize(12).text(`Transaction ID: ${payment.transactionId || 'N/A'}`, margin, 225);

    // Información del monto
    doc.fontSize(14).text('Amount', margin, 265);
    doc.fontSize(16).text(`$${payment.amount.toFixed(2)}`, margin, 290);

    // Información de la factura
    doc.fontSize(14).text('Invoice Details', margin, 330);
    doc.fontSize(12).text(`Invoice Number: ${invoice.invoiceNumber}`, margin, 355);
    doc.fontSize(12).text(`Invoice Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, margin, 375);
    doc.fontSize(12).text(`Client ID: ${invoice.clientId}`, margin, 395);
    doc.fontSize(12).text(`Patient ID: ${invoice.patientId}`, margin, 415);

    // Footer
    const footerY = doc.page.height - 100;
    doc.fontSize(10).text('Payment processed successfully. Thank you!', margin, footerY, { align: 'center' });
    doc.fontSize(9).text('PawPet Veterinary Clinic | 123 Pet Street | City, State 12345', margin, footerY + 20, { align: 'center' });
  }

  /**
   * Generar PDF de reporte de facturación
   */
  async generateBillingReportPDF(reportData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', (chunk) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });

        doc.on('error', (error) => {
          reject(error);
        });

        this._generateBillingReportContent(doc, reportData);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generar contenido del PDF de reporte
   */
  _generateBillingReportContent(doc, reportData) {
    const pageWidth = doc.page.width;
    const margin = 50;

    // Encabezado
    doc.fontSize(20).text('BILLING REPORT', margin, 50, { align: 'center' });
    doc.fontSize(14).text(`Period: ${reportData.startDate} - ${reportData.endDate}`, margin, 80, { align: 'center' });

    // Línea separadora
    doc.moveTo(margin, 110).lineTo(pageWidth - margin, 110).stroke();

    // Estadísticas
    doc.fontSize(16).text('Summary Statistics', margin, 140);
    doc.fontSize(12).text(`Total Invoices: ${reportData.stats.total_invoices}`, margin, 170);
    doc.fontSize(12).text(`Paid Invoices: ${reportData.stats.paid_invoices}`, margin, 190);
    doc.fontSize(12).text(`Pending Invoices: ${reportData.stats.pending_invoices}`, margin, 210);
    doc.fontSize(12).text(`Total Amount: $${reportData.stats.total_amount.toFixed(2)}`, margin, 230);
    doc.fontSize(12).text(`Paid Amount: $${reportData.stats.paid_amount.toFixed(2)}`, margin, 250);

    // Footer
    const footerY = doc.page.height - 100;
    doc.fontSize(10).text('PawPet Veterinary Clinic - Billing Report', margin, footerY, { align: 'center' });
    doc.fontSize(9).text(`Generated on ${new Date().toLocaleDateString()}`, margin, footerY + 20, { align: 'center' });
  }
}

module.exports = new PDFService();
