import React, { useEffect, useState } from 'react';
import { supabase } from '../createClient';
import { 
  Users, Search, User, Shield, Mail, Lock, Trash2, Edit3,
  AlertCircle, Check, X, Eye, EyeOff, ArrowLeft, Clock,
  UserCheck, UserX, Save, Plus, Filter
} from 'lucide-react';

const AdminUserManagement = () => {
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: 'user',
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // SHA-256 hash function (matching your auth system)
  const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'hackerai-salt-2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const results = [];

      // 1. Fetch from profiles (regular approved users)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      (profiles || []).forEach(p => {
        results.push({
          ...p,
          source: 'profiles',
          sourceTable: 'profiles',
          sourceId: p.id,
          user_id: p.user_id || p.id,
          displayRole: p.role || 'user',
          status: 'approved',
          password: null, // profiles don't store password
        });
      });

      // 2. Fetch from pending_registrations (all statuses)
      const { data: pending } = await supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      // Avoid duplicates by id
      const profileIds = new Set((profiles || []).map(p => p.id));
      (pending || []).forEach(p => {
        if (!profileIds.has(p.id)) {
          results.push({
            ...p,
            source: 'pending_registrations',
            sourceTable: 'pending_registrations',
            sourceId: p.id,
            user_id: p.user_id || p.id,
            displayRole: p.role || 'user',
            status: p.status || 'pending',
            password: p.password || null,
            full_name: `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.trim(),
          });
        }
      });

      // 3. Fetch from staff_users
      const { data: staff } = await supabase
        .from('staff_users')
        .select('*')
        .order('created_at', { ascending: false });

      (staff || []).forEach(s => {
        results.push({
          ...s,
          source: 'staff_users',
          sourceTable: 'staff_users',
          sourceId: s.id,
          user_id: s.user_id || s.id,
          displayRole: s.role || 'staff',
          status: s.is_active ? 'approved' : 'inactive',
          password: s.password || null,
          email: s.email || '',
          username: s.user_id || '',
          full_name: s.full_name || '',
          first_name: s.full_name?.split(' ')[0] || '',
          last_name: s.full_name?.split(' ').slice(1).join(' ') || '',
          created_at: s.created_at,
        });
      });

      setUsers(results);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== FILTER USERS =====
  const filteredUsers = users.filter(user => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      user.full_name?.toLowerCase().includes(search) ||
      user.first_name?.toLowerCase().includes(search) ||
      user.last_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.username?.toLowerCase().includes(search) ||
      user.user_id?.toString().toLowerCase().includes(search);

    const matchesRole = roleFilter === 'all' || user.displayRole === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // ===== DELETE USER =====
  const handleDeleteUser = async (user) => {
    const userName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    
    if (!window.confirm(
      `⚠️ DELETE USER\n\nAre you sure you want to permanently delete ${userName}?\n\n` +
      `This will remove their record from ${user.sourceTable} table.\n` +
      `This action CANNOT be undone!`
    )) return;

    if (!window.confirm(
      `FINAL CONFIRMATION\n\n` +
      `Type "DELETE" in the next prompt to confirm permanent deletion of ${userName}.`
    )) return;

    const confirmation = prompt(`To confirm deletion of ${userName}, type "DELETE":`);
    if (confirmation !== 'DELETE') {
      alert('Deletion cancelled.');
      return;
    }

    setSaving(true);
    try {
      if (user.sourceTable === 'profiles') {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.sourceId);
        if (error) throw error;
      } else if (user.sourceTable === 'pending_registrations') {
        const { error } = await supabase
          .from('pending_registrations')
          .delete()
          .eq('id', user.sourceId);
        if (error) throw error;
      } else if (user.sourceTable === 'staff_users') {
        const { error } = await supabase
          .from('staff_users')
          .delete()
          .eq('id', user.sourceId);
        if (error) throw error;
      }

      alert(`✅ ${userName} has been permanently deleted.`);
      fetchAllUsers();
    } catch (err) {
      alert(`❌ Deletion failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ===== OPEN EDIT MODAL =====
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: user.email || '',
      username: user.username || user.user_id || '',
      password: '',
      confirmPassword: '',
      full_name: user.full_name || `${user.first_name || ''} ${user.middle_name || ''} ${user.last_name || ''}`.trim(),
      role: user.displayRole || 'user',
      is_active: user.is_active !== false && user.status !== 'rejected',
    });
    setError('');
    setShowEditModal(true);
  };

 // ===== SAVE EDIT =====
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setError('');

    if (editForm.password && editForm.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);

    try {
      const table = selectedUser.sourceTable;
      const recordId = selectedUser.sourceId;
      const updateData = {};

      if (table === 'profiles') {
        // profiles table: has first_name, last_name, full_name, email, username, is_active, role
        const nameParts = editForm.full_name.trim().split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
        updateData.full_name = editForm.full_name.trim();
        updateData.email = editForm.email;
        updateData.username = editForm.username;
        updateData.is_active = editForm.is_active;
        updateData.role = editForm.role || 'user';

      } else if (table === 'pending_registrations') {
        // pending_registrations: has first_name, last_name, email, username, status
        const nameParts = editForm.full_name.trim().split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
        updateData.email = editForm.email;
        updateData.username = editForm.username;
        updateData.status = editForm.is_active ? 'approved' : 'rejected';

      } else if (table === 'staff_users') {
        // staff_users: has full_name, email, user_id, is_active, role
        updateData.full_name = editForm.full_name.trim();
        updateData.email = editForm.email;
        updateData.user_id = editForm.username;
        updateData.is_active = editForm.is_active;
        updateData.role = editForm.role || 'staff';
      }

      // Hash and update password if provided
      if (editForm.password) {
        const hashed = await hashPassword(editForm.password);
        updateData.password = hashed;
      }

      console.log(`Updating ${table} id=${recordId}:`, updateData);

      const { error: updateError } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', recordId);

      if (updateError) {
        // Try with different ID field if 'id' fails
        if (updateError.message?.includes('column "id" does not exist') || 
            updateError.code === '42703') {
          // Try user_id field instead
          const { error: retryError } = await supabase
            .from(table)
            .update(updateData)
            .eq('user_id', selectedUser.user_id || recordId);
          
          if (retryError) throw retryError;
        } else {
          throw updateError;
        }
      }

      alert(`✅ ${editForm.full_name.trim() || editForm.email} has been updated.`);
      setShowEditModal(false);
      fetchAllUsers();

    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update user. Check console for details.');
    } finally {
      setSaving(false);
    }
  };
  // ===== STATS =====
  const stats = {
    total: users.length,
    users: users.filter(u => u.displayRole === 'user' || !u.displayRole).length,
    staff: users.filter(u => u.displayRole === 'staff').length,
    admins: users.filter(u => u.displayRole === 'admin').length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'approved' || u.is_active === true).length,
  };

  // ===== STATUS BADGE =====
  const StatusBadge = ({ user }) => {
    let color = 'bg-gray-100 text-gray-700';
    let label = 'Unknown';

    if (user.status === 'approved' || user.is_active === true) {
      color = 'bg-green-100 text-green-700';
      label = 'Active';
    } else if (user.status === 'pending') {
      color = 'bg-yellow-100 text-yellow-700';
      label = 'Pending';
    } else if (user.status === 'rejected' || user.is_active === false) {
      color = 'bg-red-100 text-red-700';
      label = 'Inactive';
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
        {label}
      </span>
    );
  };

  // ===== ROLE BADGE =====
  const RoleBadge = ({ role }) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      staff: 'bg-blue-100 text-blue-700',
      moderator: 'bg-indigo-100 text-indigo-700',
      user: 'bg-green-100 text-green-700',
    };
    const color = colors[role] || 'bg-gray-100 text-gray-600';
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold ${color}`}>
        {role || 'user'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-semibold">Loading all users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-600" />
              User Management
            </h1>
            <p className="text-slate-500 mt-1">
              View, edit, and manage all user accounts (regular, staff, admin)
            </p>
          </div>
          <button
            onClick={fetchAllUsers}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Users', value: stats.total, color: 'bg-blue-50 border-blue-200 text-blue-700', icon: Users },
            { label: 'Regular', value: stats.users, color: 'bg-green-50 border-green-200 text-green-700', icon: User },
            { label: 'Staff', value: stats.staff, color: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Shield },
            { label: 'Admins', value: stats.admins, color: 'bg-purple-50 border-purple-200 text-purple-700', icon: Shield },
            { label: 'Pending', value: stats.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700', icon: Clock },
            { label: 'Active', value: stats.active, color: 'bg-green-50 border-green-200 text-green-700', icon: UserCheck },
          ].map((stat, i) => (
            <div key={i} className={`p-4 rounded-xl border ${stat.color} shadow-sm`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold opacity-70">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className="w-7 h-7 opacity-70" />
              </div>
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, username, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Roles</option>
              <option value="user">Regular User</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="approved">Active</option>
              <option value="pending">Pending</option>
              <option value="rejected">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">#</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Name</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Username</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Email</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Role</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Source</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold">No users found matching your criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={`${user.sourceTable}-${user.sourceId}`} className="border-b border-slate-200 hover:bg-slate-50 transition">
                      <td className="px-4 py-4 text-sm text-slate-500 font-mono">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            user.displayRole === 'admin' ? 'bg-purple-600' :
                            user.displayRole === 'staff' ? 'bg-blue-600' : 'bg-green-600'
                          }`}>
                            {(user.first_name?.charAt(0) || user.full_name?.charAt(0) || '?').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">
                              {user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {(user.user_id || user.id || '').toString().slice(0, 12)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-700">
                          {user.username || user.user_id || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">{user.email || 'N/A'}</td>
                      <td className="px-4 py-4"><RoleBadge role={user.displayRole} /></td>
                      <td className="px-4 py-4">
                        <span className="text-xs px-2 py-1 bg-slate-100 rounded font-mono">
                          {user.sourceTable}
                        </span>
                      </td>
                      <td className="px-4 py-4"><StatusBadge user={user} /></td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition"
                            title="Edit user"
                          >
                            <Edit3 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition"
                            title="Delete user"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
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

        <div className="mt-4 text-sm text-slate-500 text-center">
          Showing {filteredUsers.length} of {users.length} total users
        </div>
      </div>

    {/* ===== EDIT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Edit User
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {selectedUser && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl">
                <p className="text-sm font-bold text-slate-700">
                  Editing: {selectedUser.full_name || selectedUser.email}
                </p>
                <p className="text-xs text-slate-500">
                  Table: {selectedUser.sourceTable} · Role: {selectedUser.displayRole}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Full Name - READ ONLY (display only) */}
              <div>
                <label className="text-sm font-bold text-slate-700">
                  <User className="w-4 h-4 inline mr-1 text-purple-600" />
                  Full Name
                </label>
                <div className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-600 mt-1 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{editForm.full_name || 'Unknown'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Name cannot be edited. Contact user to update their profile.</p>
              </div>

              {/* Username / Work ID */}
              <div>
                <label className="text-sm font-bold text-slate-700">
                  <User className="w-4 h-4 inline mr-1 text-purple-600" />
                  {selectedUser?.sourceTable === 'staff_users' ? 'Work ID' : 'Username'}
                </label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                  required
                  placeholder={selectedUser?.sourceTable === 'staff_users' ? 'Work ID number' : 'Username'}
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-bold text-slate-700">
                  <Mail className="w-4 h-4 inline mr-1 text-purple-600" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm({...editForm, email: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                  required
                />
              </div>

              {/* Role (only editable for staff_users) */}
              {selectedUser?.sourceTable === 'staff_users' && (
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    <Shield className="w-4 h-4 inline mr-1 text-purple-600" />
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm({...editForm, role: e.target.value})}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1 bg-white"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              {/* Active Status Toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                  <UserCheck className="w-4 h-4 text-green-600" />
                  Account Active:
                </label>
                <button
                  type="button"
                  onClick={() => setEditForm({...editForm, is_active: !editForm.is_active})}
                  className={`relative w-12 h-6 rounded-full transition cursor-pointer ${
                    editForm.is_active ? 'bg-green-500' : 'bg-red-400'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition shadow ${
                    editForm.is_active ? 'left-7' : 'left-1'
                  }`} />
                </button>
                <span className="text-sm font-medium text-slate-700">
                  {editForm.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Change Password Section */}
              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-yellow-600" />
                  Change Password <span className="text-xs font-normal text-slate-400">(leave blank to keep current)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-sm font-bold text-slate-700">New Password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editForm.password}
                      onChange={e => setEditForm({...editForm, password: e.target.value})}
                      placeholder="Min 6 characters"
                      minLength={6}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <label className="text-sm font-bold text-slate-700">Confirm Password</label>
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={editForm.confirmPassword}
                      onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})}
                      placeholder="Repeat password"
                      minLength={6}
                      className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none mt-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {editForm.password && editForm.password.length > 0 && editForm.password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">Password must be at least 6 characters</p>
                )}
                {editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || (editForm.password && editForm.password !== editForm.confirmPassword)}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Changes</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 border border-slate-300 rounded-xl hover:bg-slate-50 font-bold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;