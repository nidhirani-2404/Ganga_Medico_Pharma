import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { X, Printer, Download, Receipt } from 'lucide-react';

export default function InvoiceModal({ isOpen, onClose, invoiceId, saleData }) {
  if (!isOpen || !saleData) return null;

  const { sale, items } = saleData;

  // 1. Download PDF using jsPDF + jspdf-autotable
  const downloadPDF = () => {
    const doc = new jsPDF();
    
    // Header banner
    doc.setFillColor(16, 185, 129); // Emerald Green Primary
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('GANGA MEDICO', 14, 20);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('A Care for Rural Health | Lic No: DL-VILL-100234', 14, 30);
    
    // Invoice Metadata
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAIL', 14, 55);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${sale.invoice_number}`, 14, 63);
    doc.text(`Date: ${new Date(sale.sale_date).toLocaleString()}`, 14, 69);
    doc.text(`Payment Method: ${sale.payment_method}`, 14, 75);
    
    // Customer Info
    doc.text(`Customer Name: ${sale.customer_name}`, 120, 63);
    doc.text(`Mobile: ${sale.customer_mobile || 'N/A'}`, 120, 69);
    doc.text(`Store Address: Bidupur RS, Jandaha Road, Vaishali`, 120, 75);
    
    // Table content
    const tableColumns = ['#', 'Medicine & Brand', 'Qty', 'Unit Price (Rs)', 'Total Price (Rs)'];
    const tableRows = items.map((item, idx) => [
      idx + 1,
      item.medicine_name,
      item.quantity,
      parseFloat(item.unit_price).toFixed(2),
      parseFloat(item.total_price).toFixed(2)
    ]);
    
    doc.autoTable({
      startY: 85,
      head: [tableColumns],
      body: tableRows,
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
      theme: 'grid',
      margin: { horizontal: 14 }
    });
    
    const finalY = doc.previousAutoTable.finalY + 15;
    
    // Totals
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total Amount: Rs. ${parseFloat(sale.total_amount).toFixed(2)}`, 140, finalY);
    
    // Footer notes
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for purchasing! Get well soon.', 14, finalY + 10);
    doc.text('Owners: Mukul Kumar & Kundan Kumar | Contact: 9955550233, 6200952854', 14, finalY + 14);
    
    doc.save(`${sale.invoice_number}.pdf`);
  };

  // 2. Direct Window Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm no-print">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-800">Invoice: {sale.invoice_number}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content / Printable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print-area bg-white text-slate-800">
          {/* Pharmacy Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-xl font-bold text-primary-600 leading-tight">GANGA MEDICO</h1>
              <p className="text-[10px] font-semibold text-slate-400">Bidupur RS, Jandaha Road, Vaishali, Pin - 844502</p>
              <p className="text-[10px] text-slate-500 mt-1">Owners: Mukul Kumar & Kundan Kumar</p>
              <p className="text-[10px] text-slate-500">Contact: 9955550233, 6200952854</p>
            </div>
            <div className="text-left sm:text-right text-xs">
              <p className="font-bold text-slate-800">RECEIPT SUMMARY</p>
              <p className="text-[11px] text-slate-600 mt-1">Invoice: {sale.invoice_number}</p>
              <p className="text-[11px] text-slate-600">Date: {new Date(sale.sale_date).toLocaleString()}</p>
              <p className="text-[11px] text-slate-600">Mode: {sale.payment_method}</p>
            </div>
          </div>

          {/* Customer info */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <p className="text-slate-400">Billed To:</p>
              <p className="font-bold text-slate-800 mt-0.5">{sale.customer_name}</p>
            </div>
            <div>
              <p className="text-slate-400">Mobile Number:</p>
              <p className="font-bold text-slate-800 mt-0.5">{sale.customer_mobile || 'N/A'}</p>
            </div>
          </div>

          {/* Table of items */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400">
                  <th className="py-2">Item Name</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Price (Rs.)</th>
                  <th className="py-2 text-right">Amount (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 text-slate-700 font-medium">
                      {item.medicine_name}
                    </td>
                    <td className="py-2 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-2 text-right text-slate-600">{parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 text-right text-slate-800 font-semibold">{parseFloat(item.total_price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end border-t border-slate-200 pt-4">
            <div className="w-48 text-right space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal:</span>
                <span>Rs. {parseFloat(sale.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-100 pt-1">
                <span>Total Amount:</span>
                <span className="text-primary-600">Rs. {parseFloat(sale.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Print note */}
          <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
            <p>Thank you for shopping with us! Get well soon.</p>
            <p className="mt-0.5">Please bring this receipt for return or exchange claims within 3 days.</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
          <button
            onClick={downloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
