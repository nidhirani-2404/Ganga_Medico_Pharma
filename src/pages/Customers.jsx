import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import {
  Plus,
  Search,
  User,
  Phone,
  MapPin,
  X,
  History,
  Pencil,
  Trash2
} from 'lucide-react';

export default function Customers() {
  const { fetchWithAuth } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  
  // Profile Detail state
  const [showProfile, setShowProfile] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    village: '',
    notes: ''
  });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/customers?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(loadCustomers, 300);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleOpenAdd = () => {
    setModalType('add');
    setFormData({ name: '', mobile: '', address: '', village: '', notes: '' });
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (c, e) => {
    e.stopPropagation(); // Avoid triggering open profile
    setModalType('edit');
    setEditingId(c.id);
    setFormData({
      name: c.name,
      mobile: c.mobile || '',
      address: c.address || '',
      village: c.village || '',
      notes: c.notes || ''
    });
    setSelectedPhoto(null);
    setPhotoPreview(c.photo_url || null);
    setError('');
    setShowModal(true);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError('Customer name is required.');
      return;
    }

    setSaving(true);
    setError('');

    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (selectedPhoto) {
      data.append('photo', selectedPhoto);
    }

    try {
      let res;
      if (modalType === 'add') {
        res = await fetchWithAuth('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': undefined },
          body: data
        });
      } else {
        data.append('keepPhoto', selectedPhoto ? 'false' : 'true');
        res = await fetchWithAuth(`/api/customers/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': undefined },
          body: data
        });
      }

      if (res.ok) {
        setShowModal(false);
        loadCustomers();
        // If profile details page is open, refresh it as well
        if (showProfile && activeProfile && activeProfile.customer.id === editingId) {
          viewCustomerProfile(editingId);
        }
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save customer.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to transmit form data.');
    } finally {
      setSaving(false);
    }
  };

  const viewCustomerProfile = async (id) => {
    setProfileLoading(true);
    setShowProfile(true);
    try {
      const res = await fetchWithAuth(`/api/customers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveProfile(data);
      }
    } catch (err) {
      console.error(err);
      setShowProfile(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete profile for ${name}?`)) return;

    try {
      const res = await fetchWithAuth(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadCustomers();
      } else {
        alert('Failed to delete customer.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Action Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search name, phone, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <User className="w-12 h-12 stroke-1 mx-auto text-slate-300 mb-2" />
            <h4 className="font-bold text-slate-700">No customers registered</h4>
            <p className="text-xs">Add customers to link bills, track credit and visitor histories.</p>
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c.id}
              onClick={() => viewCustomerProfile(c.id)}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-primary-400 transition-all duration-300 cursor-pointer flex justify-between gap-4"
            >
              <div className="flex gap-4">
                {/* Photo avatar */}
                <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400 stroke-1" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm truncate">{c.name}</h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{c.mobile || 'No Mobile'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{c.village || 'No Village'}</span>
                  </div>
                </div>
              </div>

              {/* Edit & Delete Actions */}
              <div className="flex items-center justify-end">
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => handleOpenEdit(c, e)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-primary-600 transition-colors"
                    title="Edit Customer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(c.id, c.name, e)}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Customer Profile Side Drawer / Modal Detail */}
      {showProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-screen bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-250">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Customer Profile</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            {profileLoading || !activeProfile ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto p-6 space-y-6">
                
                {/* 1. Header Card Details */}
                <div className="flex flex-col sm:flex-row gap-5 items-center bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-white flex items-center justify-center flex-shrink-0">
                    {activeProfile.customer.photo_url ? (
                      <img src={activeProfile.customer.photo_url} alt={activeProfile.customer.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-slate-400 stroke-1" />
                    )}
                  </div>
                  <div className="flex-grow min-w-0 text-center sm:text-left space-y-1">
                    <h2 className="text-lg font-black text-slate-800">{activeProfile.customer.name}</h2>
                    <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                      <Phone className="w-3.5 h-3.5" /> {activeProfile.customer.mobile || 'No mobile listed'}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {activeProfile.customer.address ? `${activeProfile.customer.address}, ` : ''}{activeProfile.customer.village || 'No Village'}
                    </p>
                  </div>
                </div>

                {/* Notes box */}
                {activeProfile.customer.notes && (
                  <div className="bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Special Notes</span>
                    <p className="text-xs text-slate-600 leading-relaxed italic">{activeProfile.customer.notes}</p>
                  </div>
                )}

                {/* Purchase History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <History className="w-4 h-4 text-primary-600" />
                    Purchase History (Recent Invoices)
                  </h4>
                  {activeProfile.purchases.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">No purchase history recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {activeProfile.purchases.map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-xl text-xs">
                          <div>
                            <span className="font-bold text-slate-700">{p.invoice_number}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{new Date(p.sale_date).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">Rs. {parseFloat(p.total_amount).toFixed(2)}</span>
                            <span className="text-[10px] block text-slate-400 capitalize">{p.payment_method}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">
                {modalType === 'add' ? 'Register Customer' : 'Edit Customer Account'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Enter 10-digit number"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Village Name
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                    placeholder="Village Name"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Customer Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {photoPreview && (
                <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-1">
                  <img src={photoPreview} alt="Preview" className="h-16 w-16 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhoto(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Home/Shop Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="House No, Ward/Street details..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Customer Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Credit behaviors, medical conditions..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  rows="3"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-250 rounded-xl hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Register Profile'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
