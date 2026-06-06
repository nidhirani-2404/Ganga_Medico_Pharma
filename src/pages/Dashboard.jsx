import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  Pill,
  Users,
  Bell,
  Clock,
  ThumbsUp,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { fetchWithAuth } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      const res = await fetchWithAuth('/api/reports/dashboard-summary');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      } else {
        setError('Failed to fetch dashboard data.');
      }
    } catch (err) {
      console.error(err);
      setError('Network connection error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-red-500 border border-red-100 bg-red-50 rounded-2xl max-w-md mx-auto mt-12">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-500 animate-bounce" />
        <p className="font-bold">Error loading dashboard</p>
        <p className="text-xs mt-1">{error}</p>
        <button onClick={loadDashboardData} className="mt-4 px-4 py-2 text-xs bg-red-600 text-white rounded-xl font-bold">
          Retry Connection
        </button>
      </div>
    );
  }

  const {
    revenueToday,
    revenueMonthly,
    salesTodayCount,
    lowStockMedicines,
    recentSales,
    topMedicines,
    notifications
  } = data;

  return (
    <div className="space-y-6">
      
      {/* 1. Header welcome banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Welcome to Ganga Medico Panel</h2>
          <p className="text-xs text-slate-500 mt-0.5">Here is an overview of today's retail activity and stock status.</p>
        </div>
        <button
          onClick={() => navigate('/billing')}
          className="flex items-center gap-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
        >
          <Receipt className="w-4 h-4" />
          Create POS Bill
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </button>
      </div>

      {/* 2. Stat Cards widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card A: Today's Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Total Sales</span>
            <h3 className="text-2xl font-black text-slate-800">Rs. {revenueToday.toFixed(2)}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold block">{salesTodayCount} bills generated today</span>
          </div>
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card B: Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">This Month's Sales</span>
            <h3 className="text-2xl font-black text-slate-800">Rs. {revenueMonthly.toFixed(2)}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">Cumulative monthly revenue</span>
          </div>
          <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card C: Today's Bills Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Invoices</span>
            <h3 className="text-2xl font-black text-slate-800">{salesTodayCount}</h3>
            <span className="text-[10px] text-slate-400 font-semibold block">Completed billing checkouts</span>
          </div>
          <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. Main content splits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Urgent Alerts warnings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between h-fit">
          <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">Urgent Store Warnings</h3>
              <p className="text-[10px] text-slate-500">Low stock level alerts and warnings</p>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                <ThumbsUp className="w-8 h-8 stroke-1 mb-2 text-slate-300" />
                <p className="text-xs font-semibold">Store status normal</p>
                <p className="text-[10px]">No active inventory warnings</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 text-xs">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${notif.type === 'Out of Stock' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 leading-snug break-words">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Columns: Tables grid */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Sales Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-5 h-5 text-primary-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recently Generated Invoices</h3>
                <p className="text-[10px] text-slate-500">Last 5 bills completed at the counter</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-slate-400 font-bold border-b border-slate-150">
                    <th className="pb-2">Invoice No.</th>
                    <th className="pb-2">Customer Name</th>
                    <th className="pb-2 text-center">Payment</th>
                    <th className="pb-2 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No billing transactions logged today yet.
                      </td>
                    </tr>
                  ) : (
                    recentSales.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 font-bold text-slate-800">{s.invoice_number}</td>
                        <td className="py-2.5 text-slate-600 font-semibold">{s.customer_name}</td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[9px] rounded-lg">{s.payment_method}</span>
                        </td>
                        <td className="py-2.5 text-right font-black text-primary-600">Rs. {parseFloat(s.total_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Grid of Product Summaries: Low Stock & Popular Medicines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Low Stock Medicines */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Low-Stock Alert List</h3>
                <p className="text-[10px] text-slate-500">Medicines running low (Quantity &lt; 10)</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-slate-150">
                      <th className="pb-2">Medicine</th>
                      <th className="pb-2 text-center">In Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockMedicines.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-8 text-center text-emerald-600 font-semibold">
                          All medicines in stock.
                        </td>
                      </tr>
                    ) : (
                      lowStockMedicines.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2">
                            <span className="font-bold text-slate-700 block">{m.name}</span>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Mfg: {m.brand_name}</span>
                          </td>
                          <td className="py-2 text-center">
                            <span className={`px-2 py-0.5 font-bold text-[10px] rounded-lg ${m.quantity === 0 ? 'bg-red-50 text-red-650' : 'bg-amber-50 text-amber-650'}`}>
                              {m.quantity} Qty
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Popular Medicines */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="mb-4 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">Top-Selling Medicines</h3>
                <p className="text-[10px] text-slate-500">Most sold items by volume</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-slate-150">
                      <th className="pb-2">Medicine</th>
                      <th className="pb-2 text-center">Qty Sold</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topMedicines.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400">
                          No sales recorded.
                        </td>
                      </tr>
                    ) : (
                      topMedicines.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 font-bold text-slate-750">{m.medicine_name.split(' (')[0]}</td>
                          <td className="py-2 text-center text-slate-600 font-black">{m.sold_qty}</td>
                          <td className="py-2 text-right text-primary-600 font-bold">Rs. {parseFloat(m.total_revenue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
