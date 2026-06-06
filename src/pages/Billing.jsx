import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import InvoiceModal from '../components/InvoiceModal';
import {
  Search,
  ShoppingCart,
  Trash2,
  DollarSign,
  User,
  Plus,
  Check,
  AlertTriangle,
  Receipt,
  UserPlus,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Billing() {
  const { fetchWithAuth } = useAuth();
  
  // Checkout States
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [walkInMobile, setWalkInMobile] = useState('');

  const [medicines, setMedicines] = useState([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState(false);

  const [walkInVillage, setWalkInVillage] = useState('');
  const [walkInAddress, setWalkInAddress] = useState('');
  const [showLocationDetails, setShowLocationDetails] = useState(false);

  const medInputRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Auto-focus medicine search input on mount
  useEffect(() => {
    if (medInputRef.current) {
      medInputRef.current.focus();
    }
  }, []);

  const handleCustomerKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (customers.length > 0) {
        selectCustomer(customers[0]);
      }
    }
  };

  const handleMedicineKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (medicines.length > 0) {
        selectMedicine(medicines[0]);
      }
    }
  };

  // Cart
  const [cart, setCart] = useState([]); // Array of { id, name, brand_name, availableQty, selling_price, quantity }
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Post Submission Invoicing Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [createdInvoiceId, setCreatedInvoiceId] = useState(null);
  const [createdInvoiceData, setCreatedInvoiceData] = useState(null);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lookups
  const searchCustomers = async () => {
    try {
      const res = await fetchWithAuth(`/api/customers?search=${encodeURIComponent(customerSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const searchMedicines = async () => {
    try {
      const res = await fetchWithAuth(`/api/medicines?search=${encodeURIComponent(medicineSearch)}`);
      if (res.ok) {
        const data = await res.json();
        // Only display medicines that are actually in stock or low stock
        setMedicines(data.filter(m => m.quantity > 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (customerSearch) {
      searchCustomers();
      setShowCustDropdown(true);
    } else {
      setCustomers([]);
      setShowCustDropdown(false);
    }
  }, [customerSearch]);

  useEffect(() => {
    if (medicineSearch) {
      searchMedicines();
      setShowMedDropdown(true);
    } else {
      setMedicines([]);
      setShowMedDropdown(false);
    }
  }, [medicineSearch]);

  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setWalkInName(c.name);
    setWalkInMobile(c.mobile || '');
    setWalkInVillage(c.village || '');
    setWalkInAddress(c.address || '');
    setCustomerSearch('');
    setShowCustDropdown(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setWalkInName('Walk-in Customer');
    setWalkInMobile('');
    setWalkInVillage('');
    setWalkInAddress('');
    setCustomerSearch('');
    setShowCustDropdown(false);
  };

  const selectMedicine = (m) => {
    // Check if medicine is already in cart
    const existing = cart.find(item => item.id === m.id);
    if (existing) {
      if (existing.quantity >= m.quantity) {
        alert(`Cannot add more. Only ${m.quantity} units are in stock.`);
        return;
      }
      setCart(
        cart.map(item =>
          item.id === m.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, {
        id: m.id,
        name: m.name,
        brand_name: m.brand_name,
        availableQty: m.quantity,
        selling_price: m.selling_price,
        quantity: 1
      }]);
    }
    setMedicineSearch('');
    setShowMedDropdown(false);
  };

  const updateCartQty = (id, newQty, maxQty) => {
    const qty = parseInt(newQty);
    if (isNaN(qty) || qty <= 0) return;
    if (qty > maxQty) {
      alert(`Only ${maxQty} units are in stock.`);
      return;
    }
    setCart(
      cart.map(item =>
        item.id === id ? { ...item, quantity: qty } : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.selling_price) * item.quantity, 0);
  };

  const resetBilling = () => {
    setSelectedCustomer(null);
    setWalkInName('Walk-in Customer');
    setWalkInMobile('');
    setWalkInVillage('');
    setWalkInAddress('');
    setCart([]);
    setPaymentMethod('Cash');
    setError('');
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setError('');

    if (cart.length === 0) {
      setError('Please add at least one medicine to the bill.');
      return;
    }

    setSubmitting(true);
    const checkoutBody = {
      customerId: selectedCustomer ? selectedCustomer.id : null,
      customerName: walkInName,
      customerMobile: walkInMobile,
      customerAddress: walkInAddress,
      customerVillage: walkInVillage,
      items: cart.map(item => ({ id: item.id, quantity: item.quantity })),
      paymentMethod
    };

    try {
      const res = await fetchWithAuth('/api/sales', {
        method: 'POST',
        body: JSON.stringify(checkoutBody)
      });

      const data = await res.json();
      if (res.ok) {
        // Fetch new bill data to open overlay print modal
        const invoiceRes = await fetchWithAuth(`/api/sales/${data.saleId}`);
        if (invoiceRes.ok) {
          const invData = await invoiceRes.json();
          setCreatedInvoiceData(invData);
          setCreatedInvoiceId(data.saleId);
          setShowInvoiceModal(true);
        }
        resetBilling();
      } else {
        setError(data.error || 'Failed to complete transaction.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection failure. Could not checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Grid: POS Item builder */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Customer Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <User className="w-4 h-4 text-primary-600" />
                1. Customer Billing Profile
              </h3>
              {(selectedCustomer || (walkInName !== 'Walk-in Customer' && walkInName !== '') || walkInMobile || walkInVillage || walkInAddress) && (
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-[10px] font-bold text-red-500 hover:text-red-650 hover:underline flex items-center gap-0.5"
                >
                  <X className="w-3 h-3" />
                  Reset Profile
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Customer Name *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWalkInName(val);
                      setCustomerSearch(val);
                      setShowCustDropdown(true);
                      if (selectedCustomer && val !== selectedCustomer.name) {
                        setSelectedCustomer(null);
                      }
                    }}
                    onFocus={() => {
                      if (blurTimeoutRef.current) {
                        clearTimeout(blurTimeoutRef.current);
                      }
                      if (walkInName === 'Walk-in Customer') {
                        setWalkInName('');
                        setCustomerSearch('');
                      }
                      setShowCustDropdown(true);
                    }}
                    onBlur={() => {
                      // Slight delay to allow clicking dropdown items
                      blurTimeoutRef.current = setTimeout(() => {
                        setShowCustDropdown(false);
                        if (!walkInName.trim()) {
                          setWalkInName('Walk-in Customer');
                        }
                      }, 200);
                    }}
                    placeholder="Search name/phone or enter new..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    required
                  />
                </div>

                {/* Dropdown results */}
                {showCustDropdown && customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 customer-dropdown">
                    {customers.map(c => (
                      <div
                        key={c.id}
                        onMouseDown={() => selectCustomer(c)}
                        className="p-3 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="font-bold">{c.name}</p>
                          <p className="text-[10px] text-slate-400">Mob: {c.mobile || 'N/A'} | Village: {c.village || 'N/A'}</p>
                        </div>
                        <Check className="w-4 h-4 text-primary-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Billing Mobile */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={walkInMobile}
                  onChange={(e) => setWalkInMobile(e.target.value)}
                  placeholder="10-digit phone"
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
              </div>
            </div>

            {/* Optional Location Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowLocationDetails(!showLocationDetails)}
                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 hover:underline"
              >
                {showLocationDetails ? '− Hide Location Details' : '+ Add Location details (Optional)'}
              </button>
            </div>

            {showLocationDetails && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Village/Location</label>
                  <input
                    type="text"
                    value={walkInVillage}
                    onChange={(e) => setWalkInVillage(e.target.value)}
                    placeholder="Village Name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Home Address</label>
                  <input
                    type="text"
                    value={walkInAddress}
                    onChange={(e) => setWalkInAddress(e.target.value)}
                    placeholder="Home address"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>
            )}

            {selectedCustomer && (
              <div className="p-3 bg-primary-50/50 border border-primary-100 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-primary-700">Linked Profile: {selectedCustomer.name} (Mob: {selectedCustomer.mobile || 'No Mobile'} | Village: {selectedCustomer.village || 'No Village'})</span>
              </div>
            )}
          </div>

          {/* Add Medicines */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Plus className="w-4 h-4 text-primary-600" />
              2. Add Medicines to Invoice
            </h3>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                ref={medInputRef}
                type="text"
                placeholder="Search inventory for drug name, brand..."
                value={medicineSearch}
                onChange={(e) => setMedicineSearch(e.target.value)}
                onKeyDown={handleMedicineKeyDown}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />

              {/* Medicine dropdown */}
              {showMedDropdown && medicines.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 medicine-dropdown">
                  {medicines.map(m => (
                    <div
                      key={m.id}
                      onClick={() => selectMedicine(m)}
                      className="p-3 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold">{m.name}</p>
                        <p className="text-[10px] text-slate-400">Brand: {m.brand_name} | Cat: {m.category} | Stock: {m.quantity}</p>
                      </div>
                      <span className="text-[10px] font-bold text-primary-600">Rs. {parseFloat(m.selling_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Medicines Roster</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Drug Description</th>
                    <th className="p-4 text-center">Unit Price</th>
                    <th className="p-4 text-center">Checkout Qty</th>
                    <th className="p-4 text-right">Subtotal</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        No medicines added. Search above to add items.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[9px] text-slate-400">Brand: {item.brand_name} | Max Available: {item.availableQty}</div>
                        </td>
                        <td className="p-4 text-center text-slate-600 font-semibold">Rs. {parseFloat(item.selling_price).toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateCartQty(item.id, e.target.value, item.availableQty)}
                            className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs"
                            min="1"
                            max={item.availableQty}
                          />
                        </td>
                        <td className="p-4 text-right text-slate-800 font-bold">
                          Rs. {(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Grid: Checkout Drawer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 h-fit">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <ShoppingCart className="w-4 h-4 text-primary-600" />
            3. Summary & Payment
          </h3>

          {/* Cart calculations */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Roster Items:</span>
              <span className="font-bold">{cart.reduce((sum, i) => sum + i.quantity, 0)} units</span>
            </div>
            
            <div className="flex justify-between items-baseline border-t border-slate-100 pt-3">
              <span className="text-xs font-bold text-slate-800">Total Bill Amount:</span>
              <span className="text-xl font-black text-primary-600">
                Rs. {getCartTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Method Form */}
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Cash">Cash Payment</option>
                <option value="UPI">UPI / Digital (GPay/PhonePe)</option>
                <option value="Card">Card Payment</option>
              </select>
            </div>

            {/* Error messaging */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-650 rounded-xl text-[10px] font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              disabled={submitting}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Generate Invoice & Checkout
                </>
              )}
            </button>
          </form>

          {/* Quick links */}
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-[10px] text-slate-400">
            <span>Customer not found?</span>
            <Link to="/customers" className="font-bold text-primary-600 hover:underline flex items-center gap-0.5">
              <UserPlus className="w-3.5 h-3.5" />
              Register Customer
            </Link>
          </div>

        </div>

      </div>

      {/* Invoice modal overlay */}
      {showInvoiceModal && createdInvoiceData && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          invoiceId={createdInvoiceId}
          saleData={createdInvoiceData}
        />
      )}

    </div>
  );
}
