import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  FileText,
  Calendar,
  DollarSign,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Search,
  RefreshCw,
  TrendingUp,
  Pill,
  CreditCard
} from 'lucide-react';

export default function Reports() {
  const { fetchWithAuth } = useAuth();
  
  // Selected Report Category
  const [reportType, setReportType] = useState('sales'); // 'sales' | 'stock'
  
  // Sales Query states
  const [salesType, setSalesType] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'yearly'
  const [queryDate, setQueryDate] = useState(new Date().toISOString().split('T')[0]);
  const [queryMonth, setQueryMonth] = useState(new Date().toISOString().slice(5, 7)); // 'MM'
  const [queryYear, setQueryYear] = useState(new Date().getFullYear().toString()); // 'YYYY'

  // Data states
  const [salesData, setSalesData] = useState({ sales: [], paymentBreakdown: [], medicineSales: [] });
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSalesTab, setActiveSalesTab] = useState('transactions'); // 'transactions' | 'medicines'

  const months = [
    { label: 'January', val: '01' }, { label: 'February', val: '02' }, { label: 'March', val: '03' },
    { label: 'April', val: '04' }, { label: 'May', val: '05' }, { label: 'June', val: '06' },
    { label: 'July', val: '07' }, { label: 'August', val: '08' }, { label: 'September', val: '09' },
    { label: 'October', val: '10' }, { label: 'November', val: '11' }, { label: 'December', val: '12' }
  ];

  const years = ['2025', '2026', '2027', '2028'];

  const loadSalesReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/reports/sales-report?type=${salesType}&date=${queryDate}&month=${queryMonth}&year=${queryYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStockReport = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/reports/stock-report');
      if (res.ok) {
        const data = await res.json();
        setStockData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportType === 'sales') {
      loadSalesReport();
    } else if (reportType === 'stock') {
      loadStockReport();
    }
  }, [reportType, salesType, queryDate, queryMonth, queryYear]);

  // ==========================================
  // EXPORT EXCEL HANDLER
  // ==========================================
  const exportToExcel = () => {
    let sheetData = [];
    let filename = '';

    if (reportType === 'sales') {
      filename = `sales_report_${salesType}_${Date.now()}.xlsx`;
      
      if (activeSalesTab === 'transactions') {
        sheetData = salesData.sales.map(row => ({
          'Invoice Number': row.invoice_number,
          'Sale Date': new Date(row.sale_date).toLocaleString(),
          'Customer Name': row.customer_name,
          'Mobile': row.customer_mobile || 'N/A',
          'Payment Method': row.payment_method,
          'Total Amount (Rs.)': parseFloat(row.total_amount)
        }));
      } else {
        sheetData = salesData.medicineSales.map(row => ({
          'Medicine Name': row.medicine_name,
          'Total Quantity Sold': parseInt(row.total_qty),
          'Total Revenue Generated (Rs.)': parseFloat(row.total_revenue)
        }));
      }
    } else if (reportType === 'stock' && stockData) {
      filename = `inventory_stock_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      const low = stockData.lowStock.map(s => ({
        'Drug Name': s.name,
        'Brand Name': s.brand_name,
        'Category': s.category,
        'Quantity': s.quantity,
        'Alert Flag': 'Low Stock'
      }));

      const exp = stockData.expiring.map(e => ({
        'Drug Name': e.name,
        'Brand Name': e.brand_name,
        'Category': 'N/A',
        'Quantity': e.quantity,
        'Expiry Date': new Date(e.expiry_date).toLocaleDateString(),
        'Alert Flag': 'Expiring Soon'
      }));

      sheetData = [...low, ...exp];
    }

    if (sheetData.length === 0) {
      alert('No data available to export.');
      return;
    }

    const ws = utils.json_to_sheet(sheetData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Report Data');
    writeFile(wb, filename);
  };

  // ==========================================
  // EXPORT PDF HANDLER
  // ==========================================
  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString();

    // Banner Header
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('GANGA MEDICO REPORT', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated Date: ${dateStr} | Chemist Management Portal`, 14, 23);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');

    if (reportType === 'sales') {
      const periodLabel = salesType === 'daily' 
        ? `Date: ${queryDate}` 
        : salesType === 'weekly' 
        ? 'Past 7 Days' 
        : salesType === 'monthly' 
        ? `Month: ${queryYear}-${queryMonth}` 
        : `Year: ${queryYear}`;

      if (activeSalesTab === 'transactions') {
        doc.text(`Sales Transactions Report (${periodLabel})`, 14, 45);

        const tableCols = ['Invoice', 'Date', 'Customer Name', 'Method', 'Total (Rs)'];
        const tableRows = salesData.sales.map(r => [
          r.invoice_number,
          new Date(r.sale_date).toLocaleDateString(),
          r.customer_name,
          r.payment_method,
          parseFloat(r.total_amount).toFixed(2)
        ]);

        doc.autoTable({
          startY: 52,
          head: [tableCols],
          body: tableRows,
          headStyles: { fillColor: [16, 185, 129] },
          theme: 'grid'
        });

        const totalRev = salesData.sales.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
        const finalY = doc.previousAutoTable.finalY + 12;
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Period Revenue: Rs. ${totalRev.toFixed(2)}`, 130, finalY);
      } else {
        doc.text(`Medicine Sales History Report (${periodLabel})`, 14, 45);

        const tableCols = ['Medicine Name', 'Quantity Sold', 'Total Revenue (Rs)'];
        const tableRows = salesData.medicineSales.map(r => [
          r.medicine_name,
          r.total_qty,
          parseFloat(r.total_revenue).toFixed(2)
        ]);

        doc.autoTable({
          startY: 52,
          head: [tableCols],
          body: tableRows,
          headStyles: { fillColor: [16, 185, 129] },
          theme: 'grid'
        });
      }

    } else if (reportType === 'stock' && stockData) {
      doc.text('Inventory Stock Alerts & Warnings Report', 14, 45);

      const tableCols = ['Medicine / Drug Name', 'Brand', 'Alert Flag', 'Qty Available', 'Details'];
      
      const low = stockData.lowStock.map(s => [
        s.name,
        s.brand_name,
        'Low Stock',
        s.quantity,
        'Requires replenishment (< 10 left)'
      ]);

      const exp = stockData.expiring.map(e => [
        e.name,
        e.brand_name,
        'Near Expiry',
        e.quantity,
        `Expiring on: ${new Date(e.expiry_date).toLocaleDateString()}`
      ]);

      doc.autoTable({
        startY: 52,
        head: [tableCols],
        body: [...low, ...exp],
        headStyles: { fillColor: [16, 185, 129] },
        theme: 'grid'
      });
    }

    const nameStr = `${reportType}_report_${Date.now()}.pdf`;
    doc.save(nameStr);
  };

  const getSalesTotal = () => {
    return salesData.sales.reduce((sum, r) => sum + parseFloat(r.total_amount), 0);
  };

  const getMethodTotal = (method) => {
    const found = salesData.paymentBreakdown.find(p => p.payment_method === method);
    return found ? parseFloat(found.total) : 0;
  };

  const getMethodCount = (method) => {
    const found = salesData.paymentBreakdown.find(p => p.payment_method === method);
    return found ? parseInt(found.count) : 0;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Category Switch tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setReportType('sales')}
          className={`flex items-center gap-1.5 px-6 py-3 font-bold text-xs tracking-wider border-b-2 transition-colors ${
            reportType === 'sales'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Sales & Revenue Report
        </button>
        <button
          onClick={() => setReportType('stock')}
          className={`flex items-center gap-1.5 px-6 py-3 font-bold text-xs tracking-wider border-b-2 transition-colors ${
            reportType === 'stock'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-4 h-4" />
          Inventory Stock Report
        </button>
      </div>

      {/* 2. Parameters Query Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Sales Query fields */}
        {reportType === 'sales' ? (
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={salesType}
              onChange={(e) => setSalesType(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-650"
            >
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary (7 Days)</option>
              <option value="monthly">Monthly Summary</option>
              <option value="yearly">Yearly Summary</option>
            </select>

            {salesType === 'daily' && (
              <input
                type="date"
                value={queryDate}
                onChange={(e) => setQueryDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-605"
              />
            )}

            {salesType === 'monthly' && (
              <div className="flex gap-2">
                <select
                  value={queryMonth}
                  onChange={(e) => setQueryMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-600"
                >
                  {months.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
                </select>
                <select
                  value={queryYear}
                  onChange={(e) => setQueryYear(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-600"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            {salesType === 'yearly' && (
              <select
                value={queryYear}
                onChange={(e) => setQueryYear(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none font-semibold text-slate-650"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-medium">
            Summarizing inventory items with warnings (Stock &lt; 10 or Expiring in 60 days).
          </div>
        )}

        {/* Export buttons */}
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={exportToPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-250 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            PDF Export
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel Export
          </button>
        </div>
      </div>

      {/* 3. Sales Breakdown Header Widgets */}
      {reportType === 'sales' && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Overall Sales</span>
            <p className="text-lg font-black text-slate-800 mt-1">Rs. {getSalesTotal().toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{salesData.sales.length} invoices generated</p>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-emerald-600">Cash Payments</span>
            <p className="text-lg font-black text-emerald-600 mt-1">Rs. {getMethodTotal('Cash').toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{getMethodCount('Cash')} sales completed</p>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-blue-600">UPI Payments</span>
            <p className="text-lg font-black text-blue-600 mt-1">Rs. {getMethodTotal('UPI').toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{getMethodCount('UPI')} sales completed</p>
          </div>
          <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-purple-600">Card Payments</span>
            <p className="text-lg font-black text-purple-600 mt-1">Rs. {getMethodTotal('Card').toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{getMethodCount('Card')} sales completed</p>
          </div>
        </div>
      )}

      {/* 4. Report Data Tables */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        {loading ? (
          <div className="p-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : reportType === 'sales' ? (
          
          // Sales Tab view
          <div>
            <div className="flex border-b border-slate-100 bg-slate-50 px-4">
              <button
                onClick={() => setActiveSalesTab('transactions')}
                className={`px-4 py-3 text-xs font-bold border-b-2 ${
                  activeSalesTab === 'transactions'
                    ? 'border-primary-600 text-primary-650'
                    : 'border-transparent text-slate-550'
                }`}
              >
                Detailed Invoices List
              </button>
              <button
                onClick={() => setActiveSalesTab('medicines')}
                className={`px-4 py-3 text-xs font-bold border-b-2 ${
                  activeSalesTab === 'medicines'
                    ? 'border-primary-600 text-primary-650'
                    : 'border-transparent text-slate-555'
                }`}
              >
                Medicine-wise Sales History
              </button>
            </div>

            {activeSalesTab === 'transactions' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Invoice No</th>
                      <th className="p-4">Checkout Date</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Method</th>
                      <th className="p-4 text-right">Invoice Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesData.sales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No sales recorded for the selected period.
                        </td>
                      </tr>
                    ) : (
                      salesData.sales.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{row.invoice_number}</td>
                          <td className="p-4 text-slate-650 font-medium">{new Date(row.sale_date).toLocaleString()}</td>
                          <td className="p-4 text-slate-600 font-bold">{row.customer_name}</td>
                          <td className="p-4 text-slate-500 font-semibold capitalize">{row.payment_method}</td>
                          <td className="p-4 text-right font-black text-slate-800">
                            Rs. {parseFloat(row.total_amount).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Medicine Name</th>
                      <th className="p-4 text-center">Total Quantity Sold</th>
                      <th className="p-4 text-right">Total Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {salesData.medicineSales.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-400">
                          No medicine sales recorded.
                        </td>
                      </tr>
                    ) : (
                      salesData.medicineSales.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{row.medicine_name}</td>
                          <td className="p-4 text-center font-bold text-slate-600">{row.total_qty} units</td>
                          <td className="p-4 text-right font-black text-primary-600">
                            Rs. {parseFloat(row.total_revenue).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : reportType === 'stock' && stockData ? (
          
          // Stock Alerts Table
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">Medicine / Drug Description</th>
                  <th className="p-4">Brand</th>
                  <th className="p-4 text-center">Alert Category</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockData.lowStock.length === 0 && stockData.expiring.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      All inventory medicines are in healthy stock and distant expiry.
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Low stock alerts */}
                    {stockData.lowStock.map((s, idx) => (
                      <tr key={`low-${idx}`} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-800">{s.name}</td>
                        <td className="p-4 text-slate-600 font-semibold">{s.brand_name}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 bg-red-50 text-red-650 border border-red-100 font-bold text-[9px] rounded-lg">Low Stock</span>
                        </td>
                        <td className="p-4 text-center font-bold text-red-650">{s.quantity}</td>
                        <td className="p-4 text-slate-500 italic">Inventory balance requires restocking.</td>
                      </tr>
                    ))}

                    {/* Expiry alerts */}
                    {stockData.expiring.map((e, idx) => (
                      <tr key={`exp-${idx}`} className="hover:bg-slate-50 transition-colors bg-amber-50/10">
                        <td className="p-4 font-bold text-slate-800">{e.name}</td>
                        <td className="p-4 text-slate-600 font-semibold">{e.brand_name}</td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 font-bold text-[9px] rounded-lg">Near Expiry</span>
                        </td>
                        <td className="p-4 text-center text-slate-600 font-semibold">{e.quantity}</td>
                        <td className="p-4 text-amber-700 font-semibold">
                          Expiring: {new Date(e.expiry_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        ) : null}

      </div>

    </div>
  );
}
