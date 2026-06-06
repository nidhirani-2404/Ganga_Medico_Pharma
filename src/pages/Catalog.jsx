import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Image as ImageIcon, CheckCircle, ShieldAlert, XCircle, LogIn, HeartPulse } from 'lucide-react';

export default function Catalog() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const navigate = useNavigate();

  const categories = ['All', 'Tablets', 'Capsules', 'Syrup', 'Injection', 'Ointment', 'Inhaler', 'Chewables', 'Drops', 'Powder', 'Other'];

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const url = `/api/medicines?search=${encodeURIComponent(search)}${category !== 'All' ? `&category=${encodeURIComponent(category)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMedicines(data);
      }
    } catch (err) {
      console.error('Catalog load failure:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(loadCatalog, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, category]);

  const getCatalogStatus = (qty) => {
    if (qty === 0) {
      return {
        label: 'Currently Not Available',
        badge: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="w-3.5 h-3.5 text-red-500" />
      };
    }
    if (qty < 10) {
      return {
        label: 'Limited Stock',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
      };
    }
    return {
      label: 'Available',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. Public Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-100 rounded-lg text-primary-600">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-none">Ganga Medico</h1>
            <p className="text-[10px] font-semibold text-slate-450 mt-0.5">Vaishali Chemist Catalog</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-sm"
        >
          <LogIn className="w-4 h-4" />
          Staff Sign In
        </button>
      </header>

      {/* 2. Page Content Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {/* Banner section */}
        <div className="bg-gradient-to-r from-primary-600 to-emerald-600 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/4 translate-x-1/4">
            <HeartPulse className="w-72 h-72" />
          </div>
          <div className="max-w-xl space-y-2">
            <h2 className="text-xl md:text-2xl font-extrabold leading-tight">Check Medicine Prices & Availability</h2>
            <p className="text-xs md:text-sm text-primary-100 font-light">
              Welcome to our online medical stock catalog. Search for prescriptions, general medicines, and home care remedies available at our chemist counter in Bidupur, Vaishali.
            </p>
          </div>
        </div>

        {/* Searching & Categorizing Row */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by drug name or brand name (e.g. Paracetamol, Mox)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>

          {/* Category badges list */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3.5 py-1.5 text-[11px] font-bold rounded-xl border whitespace-nowrap transition-colors ${
                  category === cat
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat === 'All' ? 'All Medicines' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List of Cards */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : medicines.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
            <Search className="w-12 h-12 mx-auto stroke-1 text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700">No matching medicines in stock</h3>
            <p className="text-xs mt-1">Please try modifying your keywords or select another category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {medicines.map((med) => {
              const status = getCatalogStatus(med.quantity);
              return (
                <div
                  key={med.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-primary-300 transition-all duration-300 flex flex-col"
                >
                  {/* Photo area */}
                  <div className="h-44 bg-slate-50 relative flex items-center justify-center border-b border-slate-100">
                    {med.image_url ? (
                      <img
                        src={med.image_url}
                        alt={med.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-10 h-10 stroke-1 text-slate-300" />
                        <span className="text-[10px] mt-1 font-medium">No Image Available</span>
                      </div>
                    )}
                    {/* Floating category */}
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-lg text-[9px]">
                      {med.category}
                    </span>
                  </div>

                  {/* Body description */}
                  <div className="p-4 flex-grow flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight line-clamp-2">
                          {med.name}
                        </h4>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                        Brand: <span className="text-slate-600">{med.brand_name}</span> | Mfg: {med.manufacturer}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2.5 line-clamp-2 leading-relaxed">
                        {med.description || 'General medicine used as prescribed by healthcare professionals.'}
                      </p>
                    </div>

                    {/* Footer values */}
                    <div className="border-t border-slate-100 pt-3 space-y-2.5">
                      {/* Availability badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold w-fit ${status.badge}`}>
                        {status.icon}
                        <span>{status.label}</span>
                      </div>

                      {/* Selling price */}
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">MRP PRICE:</span>
                        <span className="text-base font-extrabold text-primary-600">
                          Rs. {parseFloat(med.selling_price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 3. Footer banner */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between gap-4 items-center">
          <div className="text-center sm:text-left">
            <p className="font-bold text-slate-200">Ganga Medico</p>
            <p className="mt-0.5 text-[10px] text-slate-500">Location: Bidupur RS, Jandaha Road, Vaishali, Pin - 844502</p>
          </div>
          <div className="text-center sm:text-right text-[10px] text-slate-500">
            <p>Owners: Mukul Kumar & Kundan Kumar | Contacts: 9955550233, 6200952854</p>
            <p className="mt-0.5">&copy; 2026 Ganga Medico. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
