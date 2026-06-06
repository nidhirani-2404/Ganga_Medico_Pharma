import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Image as ImageIcon,
  X,
  FileText,
  Filter
} from 'lucide-react';

export default function Inventory() {
  const { fetchWithAuth } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    category: 'Tablets',
    quantity: '0',
    purchasePrice: '',
    sellingPrice: '',
    expiryDate: '',
    manufacturer: '',
    description: ''
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const categories = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Ointment', 'Inhaler', 'Chewables', 'Drops', 'Powder', 'Other'];

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const url = `/api/medicines?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&status=${encodeURIComponent(status)}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setMedicines(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadMedicines();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [search, category, status]);

  const handleOpenAdd = () => {
    setModalType('add');
    setEditingId(null);
    setFormData({
      name: '',
      brandName: '',
      category: 'Tablets',
      quantity: '0',
      purchasePrice: '',
      sellingPrice: '',
      expiryDate: '',
      manufacturer: '',
      description: ''
    });
    setSelectedImage(null);
    setImagePreview(null);
    setError('');
    setShowModal(true);
  };

  const handleOpenEdit = (med) => {
    setModalType('edit');
    setEditingId(med.id);
    setFormData({
      name: med.name,
      brandName: med.brand_name,
      category: med.category,
      quantity: String(med.quantity),
      purchasePrice: String(med.purchase_price),
      sellingPrice: String(med.selling_price),
      expiryDate: med.expiry_date.split('T')[0],
      manufacturer: med.manufacturer,
      description: med.description || ''
    });
    setSelectedImage(null);
    setImagePreview(med.image_url ? med.image_url : null);
    setError('');
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    const { name, brandName, purchasePrice, sellingPrice, expiryDate, manufacturer } = formData;
    if (!name || !brandName || !purchasePrice || !sellingPrice || !expiryDate || !manufacturer) {
      setError('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      data.append(key, formData[key]);
    });

    if (selectedImage) {
      data.append('image', selectedImage);
    }

    try {
      let res;
      if (modalType === 'add') {
        res = await fetchWithAuth('/api/medicines', {
          method: 'POST',
          headers: {
            // Content-Type is auto-configured by browser when sending FormData
            'Content-Type': undefined
          },
          body: data
        });
      } else {
        // For edits, signal whether we keep or replace the old image
        data.append('keepImage', selectedImage ? 'false' : 'true');
        res = await fetchWithAuth(`/api/medicines/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': undefined
          },
          body: data
        });
      }

      if (res.ok) {
        setShowModal(false);
        loadMedicines();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save medicine.');
      }
    } catch (err) {
      console.error(err);
      setError('Network communication failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name} from inventory?`)) return;

    try {
      const res = await fetchWithAuth(`/api/medicines/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadMedicines();
      } else {
        alert('Failed to delete item.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isNearExpiry = (expiryDateStr) => {
    const exp = new Date(expiryDateStr);
    const today = new Date();
    const diff = (exp - today) / (1000 * 60 * 60 * 24);
    return diff <= 60; // Flag if expiring within 60 days
  };

  const getStatusBadge = (status, qty) => {
    if (qty === 0 || status === 'Out of Stock') {
      return <span className="px-2.5 py-1 text-[10px] font-bold text-red-700 bg-red-50 border border-red-150 rounded-full">Out of Stock</span>;
    }
    if (qty < 10 || status === 'Low Stock') {
      return <span className="px-2.5 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-150 rounded-full">Low Stock</span>;
    }
    return <span className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 rounded-full">In Stock</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search medicine name, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-600 font-semibold"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-xs">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-600 font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <button
            onClick={handleOpenAdd}
            className="ml-auto md:ml-0 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4">Image</th>
                <th className="p-4">Medicine Details</th>
                <th className="p-4">Category</th>
                <th className="p-4 text-center">Quantity</th>
                <th className="p-4 text-right">Prices (Rs.)</th>
                <th className="p-4 text-center">Expiry</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No medicines found matching the filters.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                    {/* Image */}
                    <td className="p-4">
                      {med.image_url ? (
                        <img
                          src={med.image_url}
                          alt={med.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-dashed border-slate-200">
                          <ImageIcon className="w-5 h-5 stroke-1" />
                        </div>
                      )}
                    </td>

                    {/* Details */}
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{med.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Brand: <span className="font-semibold text-slate-600">{med.brand_name}</span> | Mfg: {med.manufacturer}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="p-4 text-slate-600 font-semibold">{med.category}</td>

                    {/* Qty */}
                    <td className="p-4 text-center">
                      <span className={`font-bold text-sm ${med.quantity === 0 ? 'text-red-600' : med.quantity < 10 ? 'text-amber-500' : 'text-slate-700'}`}>
                        {med.quantity}
                      </span>
                    </td>

                    {/* Prices */}
                    <td className="p-4 text-right">
                      <div className="text-slate-600 font-medium">Sell: Rs. {parseFloat(med.selling_price).toFixed(2)}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">Cost: Rs. {parseFloat(med.purchase_price).toFixed(2)}</div>
                    </td>

                    {/* Expiry */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-semibold ${isNearExpiry(med.expiry_date) ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                          {new Date(med.expiry_date).toLocaleDateString()}
                        </span>
                        {isNearExpiry(med.expiry_date) && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" title="Expiring within 60 days" />
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      {getStatusBadge(med.stock_status, med.quantity)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(med)}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-primary-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id, med.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal Drawer */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">
                {modalType === 'add' ? 'Add New Medicine' : 'Edit Medicine Details'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Callout */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="e.g. Paracetamol 650mg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="e.g. Calpol"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Quantity Available *
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Purchase Price (Cost) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Rs."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Selling Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="Rs."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Manufacturer / Marketer *
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="e.g. Cipla Ltd"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Medicine Image (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {imagePreview && (
                <div className="relative inline-block border border-slate-200 rounded-xl overflow-hidden mt-2 shadow-sm">
                  <img src={imagePreview} alt="Preview" className="h-24 object-contain max-w-[120px]" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Description / Indications
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  placeholder="Usage details, storage specifications..."
                  rows="3"
                />
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Medicine'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
