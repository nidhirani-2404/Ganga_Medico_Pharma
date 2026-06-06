import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import {
  Settings,
  Lock,
  UserPlus,
  Database,
  Trash2,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react';

export default function AdminSettings() {
  const { fetchWithAuth, user } = useAuth();
  
  // Tab states
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'staff' | 'database'

  // Change Password states
  const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  // Manage Staff states
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffFormData, setStaffFormData] = useState({ username: '', password: '', role: 'staff', fullName: '' });
  const [staffMsg, setStaffMsg] = useState('');
  const [staffError, setStaffError] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);

  // Database Backup/Restore states
  const [restoreFile, setRestoreFile] = useState(null);
  const [dbMsg, setDbMsg] = useState('');
  const [dbError, setDbError] = useState('');
  const [dbRunning, setDbRunning] = useState(false);

  // ==========================================
  // CHANGE PASSWORD HANDLER
  // ==========================================
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdError('');

    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    setPwdSaving(true);
    try {
      const res = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          oldPassword: pwdData.oldPassword,
          newPassword: pwdData.newPassword
        })
      });

      if (res.ok) {
        setPwdMsg('Password updated successfully.');
        setPwdData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        setPwdError(data.error || 'Failed to change password.');
      }
    } catch (err) {
      setPwdError('Server communication error.');
    } finally {
      setPwdSaving(false);
    }
  };

  // ==========================================
  // MANAGE STAFF HANDLERS
  // ==========================================
  const loadStaff = async () => {
    if (user.role !== 'admin') return;
    setLoadingStaff(true);
    try {
      const res = await fetchWithAuth('/api/auth/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'staff') {
      loadStaff();
    }
  }, [activeTab]);

  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffMsg('');
    setStaffError('');

    const { username, password, role, fullName } = staffFormData;
    if (!username || !password || !fullName) {
      setStaffError('Please fill in all fields.');
      return;
    }

    setStaffSaving(true);
    try {
      const res = await fetchWithAuth('/api/auth/staff', {
        method: 'POST',
        body: JSON.stringify(staffFormData)
      });

      if (res.ok) {
        setStaffMsg('Staff member registered.');
        setStaffFormData({ username: '', password: '', role: 'staff', fullName: '' });
        loadStaff();
      } else {
        const data = await res.json();
        setStaffError(data.error || 'Failed to register staff.');
      }
    } catch (err) {
      setStaffError('Network error.');
    } finally {
      setStaffSaving(false);
    }
  };

  const handleDeleteStaff = async (id, usernameToDelete) => {
    if (!window.confirm(`Are you sure you want to remove staff member: ${usernameToDelete}?`)) return;

    try {
      const res = await fetchWithAuth(`/api/auth/staff/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadStaff();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove staff member.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // DATABASE ACTIONS
  // ==========================================
  const handleBackup = () => {
    // We direct the browser to hit the download endpoint
    const url = `${window.location.origin}/api/admin/backup`;
    
    // To pass token, we can do a fetch, get blob, and download using file-saver
    // Or we open a new tab if authorization was session-based.
    // Let's download programmatically to send authentication token header
    setDbMsg('');
    setDbError('');
    setDbRunning(true);
    
    const token = localStorage.getItem('token');
    
    fetch('/api/admin/backup', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Backup failed.');
      return res.blob();
    })
    .then(blob => {
      const filename = `backup_village_medical_store_${new Date().toISOString().split('T')[0]}.sql`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setDbMsg('Database backup file generated and downloaded successfully.');
    })
    .catch(err => {
      setDbError(err.message || 'Error occurred while saving backup.');
    })
    .finally(() => {
      setDbRunning(false);
    });
  };

  const handleRestoreSubmit = async (e) => {
    e.preventDefault();
    setDbMsg('');
    setDbError('');

    if (!restoreFile) {
      setDbError('Please select a SQL backup file first.');
      return;
    }

    if (!window.confirm('WARNING: Restoring the database will overwrite all existing customer, medicine, sales, and visit records. Do you wish to proceed?')) {
      return;
    }

    setDbRunning(true);
    const data = new FormData();
    data.append('backup', restoreFile);

    try {
      const res = await fetchWithAuth('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': undefined },
        body: data
      });

      if (res.ok) {
        setDbMsg('Database restored successfully from backup.');
        setRestoreFile(null);
      } else {
        const errData = await res.json();
        setDbError(errData.error || 'Failed to restore database.');
      }
    } catch (err) {
      console.error(err);
      setDbError('Restore failed. Connection issue.');
    } finally {
      setDbRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('password')}
          className={`flex items-center gap-1.5 px-6 py-3 font-bold text-xs tracking-wider border-b-2 transition-colors ${
            activeTab === 'password'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-4 h-4" />
          Update Password
        </button>
        {user && user.role === 'admin' && (
          <>
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-1.5 px-6 py-3 font-bold text-xs tracking-wider border-b-2 transition-colors ${
                activeTab === 'staff'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Manage Staff Roster
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-6 py-3 font-bold text-xs tracking-wider border-b-2 transition-colors ${
                activeTab === 'database'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              Database Backups
            </button>
          </>
        )}
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl">
        
        {/* TAB 1: Password panel */}
        {activeTab === 'password' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Change Password</h3>
              <p className="text-[10px] text-slate-400">Securely update your portal login password</p>
            </div>

            {pwdMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {pwdMsg}
              </div>
            )}
            {pwdError && (
              <div className="p-3 bg-red-50 border border-red-250 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {pwdError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Password *</label>
                <input
                  type="password"
                  value={pwdData.oldPassword}
                  onChange={(e) => setPwdData({ ...pwdData, oldPassword: e.target.value })}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Password *</label>
                <input
                  type="password"
                  value={pwdData.newPassword}
                  onChange={(e) => setPwdData({ ...pwdData, newPassword: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={pwdData.confirmPassword}
                  onChange={(e) => setPwdData({ ...pwdData, confirmPassword: e.target.value })}
                  placeholder="Retype new password"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm"
                disabled={pwdSaving}
              >
                {pwdSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Staff List & Registration */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              
              {/* Staff List */}
              <div className="space-y-4 pb-6 md:pb-0">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Current Staff</h3>
                  <p className="text-[10px] text-slate-400">Active accounts authorized to log sales & inventory</p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {loadingStaff ? (
                    <div className="py-8 text-center text-slate-400">Loading...</div>
                  ) : (
                    staffList.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-700">{s.full_name}</p>
                          <p className="text-[10px] text-slate-400">User: {s.username} | Role: {s.role}</p>
                        </div>
                        {s.username !== user.username && (
                          <button
                            onClick={() => handleDeleteStaff(s.id, s.username)}
                            className="p-1 rounded text-red-500 hover:bg-red-50"
                            title="Remove account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Staff form */}
              <div className="space-y-4 pt-6 md:pt-0 md:pl-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Register Staff</h3>
                  <p className="text-[10px] text-slate-400">Add a new worker profile to the store roster</p>
                </div>

                {staffMsg && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold">
                    {staffMsg}
                  </div>
                )}
                {staffError && (
                  <div className="p-2.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">
                    {staffError}
                  </div>
                )}

                <form onSubmit={handleAddStaffSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Worker Name *</label>
                    <input
                      type="text"
                      value={staffFormData.fullName}
                      onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Username *</label>
                    <input
                      type="text"
                      value={staffFormData.username}
                      onChange={(e) => setStaffFormData({ ...staffFormData, username: e.target.value })}
                      placeholder="Lowercase login ID"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Login Password *</label>
                    <input
                      type="password"
                      value={staffFormData.password}
                      onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Roster Role</label>
                    <select
                      value={staffFormData.role}
                      onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                    >
                      <option value="staff">Chemist / Staff Member</option>
                      <option value="billing">Billing Agent (POS Only)</option>
                      <option value="admin">Store Admin</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm"
                    disabled={staffSaving}
                  >
                    {staffSaving ? 'Registering...' : 'Register Worker'}
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Database actions panel */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Database Safety Utilities</h3>
              <p className="text-[10px] text-slate-400">Generate local SQL backup scripts or restore historical profiles</p>
            </div>

            {dbMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {dbMsg}
              </div>
            )}
            {dbError && (
              <div className="p-3 bg-red-50 border border-red-250 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-shake">
                <AlertTriangle className="w-4 h-4" />
                {dbError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              {/* Backup block */}
              <div className="space-y-3 pb-6 sm:pb-0">
                <div className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary-600" />
                  <h4 className="text-xs font-bold text-slate-800">Export SQL Dump</h4>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Downloads a `.sql` file compiling all inventory medicines, visitor aggregates, credit invoices, customer registers, and transactions. Highly recommended before server modifications.
                </p>
                <button
                  onClick={handleBackup}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  disabled={dbRunning}
                >
                  <Database className="w-4 h-4" />
                  {dbRunning ? 'Generating...' : 'Export Backup'}
                </button>
              </div>

              {/* Restore block */}
              <div className="space-y-3 pt-6 sm:pt-0 sm:pl-6">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-red-500" />
                  <h4 className="text-xs font-bold text-slate-800">Import SQL Backup</h4>
                </div>
                <p className="text-[10px] text-slate-550 leading-relaxed">
                  Upload a previously exported `.sql` file to reconstruct the database. All existing values will be completely overwritten!
                </p>

                <form onSubmit={handleRestoreSubmit} className="space-y-3">
                  <input
                    type="file"
                    accept=".sql"
                    onChange={(e) => setRestoreFile(e.target.files[0])}
                    className="text-xs w-full"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    disabled={dbRunning || !restoreFile}
                  >
                    <Upload className="w-4 h-4" />
                    {dbRunning ? 'Running Restore...' : 'Restore Database'}
                  </button>
                </form>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
