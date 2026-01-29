'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  AlertTriangle,
  Eye,
  EyeOff,
  User,
  Lock,
  Shield,
  Loader2,
  RefreshCw
} from 'lucide-react';

type DepartmentType = 'video' | 'design' | 'content';

// API'den gelen kullanıcı tipi
interface ApiUser {
  id: string;
  username: string;
  name: string;
  role: string;
  department: string;
  avatar: string | null;
  isAdmin: boolean;
  createdAt: string;
}

interface NewStaffForm {
  name: string;
  username: string;
  password: string;
  role: string;
  department: DepartmentType;
  isAdmin: boolean;
}

interface EditForm {
  name?: string;
  username?: string;
  password?: string;
  role?: string;
  department?: string;
  isAdmin?: boolean;
}

const DEPARTMENT_LABELS: Record<DepartmentType, string> = {
  video: 'Reels Yapımcıları',
  design: 'Story Yapımcıları',
  content: 'Gönderi Yapımcıları'
};

const ROLE_SUGGESTIONS: Record<DepartmentType, string[]> = {
  video: ['Video Editor', 'Motion Designer', 'Videographer', 'Video Producer'],
  design: ['Graphic Designer', 'Senior Designer', 'UI/UX Designer', 'Art Director'],
  content: ['Content Creator', 'Social Media Manager', 'Copywriter', 'Content Strategist'],
};

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // State
  const [staffList, setStaffList] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingStaff, setEditingStaff] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({});
  
  // Password visibility states
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({}); // For edit inputs per user
  const [showNewPassword, setShowNewPassword] = useState(false); // For add modal
  
  const [newStaffForm, setNewStaffForm] = useState<NewStaffForm>({
    name: '',
    username: '',
    password: '',
    role: '',
    department: 'design',
    isAdmin: false
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Kullanıcıları API'den yükle
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/users');
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kullanıcılar yüklenemedi');
      }
      
      const data = await res.json();
      setStaffList(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sayfa yüklendiğinde kullanıcıları çek
  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user?.isAdmin, fetchUsers]);

  // Admin kontrolü
  useEffect(() => {
    if (!authLoading && user && !user.isAdmin) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Yeni kullanıcı ekle
  const handleAddStaff = async () => {
    if (!newStaffForm.name || !newStaffForm.username || !newStaffForm.password || !newStaffForm.role) return;

    try {
      setSaving(true);
      
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStaffForm,
          avatar: `https://i.pravatar.cc/150?u=${Date.now()}`
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kullanıcı eklenemedi');
      }

      const data = await res.json();
      setStaffList(prev => [data.user, ...prev]);
      setShowAddModal(false);
      setNewStaffForm({ name: '', username: '', password: '', role: '', department: 'design', isAdmin: false });
      showSaveSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Kullanıcı sil
  const handleDeleteStaff = async (id: string) => {
    try {
      setSaving(true);
      
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kullanıcı silinemedi');
      }

      setStaffList(prev => prev.filter(s => s.id !== id));
      setShowDeleteModal(null);
      showSaveSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Kullanıcı düzenleme başlat
  const handleEditStaff = (staff: ApiUser) => {
    setEditingStaff(staff.id);
    setEditForm({
      name: staff.name,
      username: staff.username,
      role: staff.role,
      department: staff.department,
      isAdmin: staff.isAdmin,
      password: ''
    });
    // Reset visibility for this user
    setShowPasswordMap(prev => ({ ...prev, [staff.id]: false }));
  };

  // Kullanıcı güncelle
  const handleSaveEdit = async () => {
    if (!editingStaff || !editForm.name || !editForm.username || !editForm.role) return;

    try {
      setSaving(true);
      
      // Boş şifreyi gönderme
      const updateData = { ...editForm };
      if (!updateData.password) {
        delete updateData.password;
      }
      
      const res = await fetch(`/api/users/${editingStaff}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kullanıcı güncellenemedi');
      }

      const data = await res.json();
      setStaffList(prev => prev.map(s => s.id === editingStaff ? data.user : s));
      setEditingStaff(null);
      setEditForm({});
      showSaveSuccessMessage();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const showSaveSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'video': return 'bg-rose-100 text-rose-700';
      case 'design': return 'bg-blue-100 text-blue-700';
      case 'content': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const toggleEditPasswordVisibility = (id: string) => {
    setShowPasswordMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNameChange = (name: string) => {
    setNewStaffForm(prev => ({
      ...prev,
      name,
      username: name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
    }));
  };

  // Yükleniyor veya admin değilse
  if (authLoading || !user?.isAdmin) {
    return (
      <div className="flex h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Ekip Yönetimi</h1>
              <p className="text-sm text-slate-500 mt-1">Kullanıcı ekle, düzenle ve sil</p>
            </div>
            
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg animate-pulse">
                  <Save size={18} />
                  <span className="text-sm font-medium">Kaydedildi!</span>
                </div>
              )}
              
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Yenile"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-lg">
                <AlertTriangle size={20} />
                <span>{error}</span>
                <button onClick={fetchUsers} className="ml-auto text-sm underline">Tekrar Dene</button>
              </div>
            )}

            {/* Add Staff Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Ekip Üyeleri</h2>
                <p className="text-sm text-slate-500">{staffList.length} kullanıcı</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
              >
                <Plus size={18} />
                Yeni Kullanıcı Ekle
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Kullanıcılar yükleniyor...</p>
              </div>
            ) : (
              <>
                {/* Staff List by Department */}
                {(['video', 'design', 'content'] as DepartmentType[]).map((dept) => {
                  const deptStaff = staffList.filter(s => s.department === dept);
                  if (deptStaff.length === 0) return null;

                  return (
                    <div key={dept} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className={`px-5 py-3 border-b border-slate-100 ${getDepartmentColor(dept)} bg-opacity-50`}>
                        <h3 className="font-semibold text-sm">{DEPARTMENT_LABELS[dept]}</h3>
                      </div>
                      
                      <div className="divide-y divide-slate-100">
                        {deptStaff.map((staff) => (
                          <div key={staff.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                            {/* Avatar */}
                            <div className="relative">
                              {staff.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img 
                                  src={staff.avatar} 
                                  alt={staff.name}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                                  {staff.name.charAt(0)}
                                </div>
                              )}
                              {staff.isAdmin && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                  <Shield size={10} className="text-white" />
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            {editingStaff === staff.id ? (
                              <div className="flex-1 grid grid-cols-5 gap-3 items-center">
                                <input
                                  type="text"
                                  value={editForm.name || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                                  placeholder="İsim"
                                />
                                <input
                                  type="text"
                                  value={editForm.username || ''}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                                  placeholder="Kullanıcı adı"
                                />
                                <div className="relative">
                                  <input
                                    type={showPasswordMap[staff.id] ? "text" : "password"}
                                    value={editForm.password || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 pr-8"
                                    placeholder="Yeni şifre"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => toggleEditPasswordVisibility(staff.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10 p-1"
                                    tabIndex={-1}
                                  >
                                    {showPasswordMap[staff.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                  </button>
                                </div>
                                <select
                                  value={editForm.department || 'design'}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  <option value="video">Reels Yapımcıları</option>
                                  <option value="design">Story Yapımcıları</option>
                                  <option value="content">Gönderi Yapımcıları</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                    className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    title="Kaydet"
                                  >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                  </button>
                                  <button
                                    onClick={() => { setEditingStaff(null); setEditForm({}); }}
                                    className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                    title="İptal"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-slate-900">{staff.name}</p>
                                    {staff.isAdmin && (
                                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-500">{staff.role}</p>
                                </div>

                                {/* Credentials */}
                                <div className="flex items-center gap-6 text-sm">
                                  <div className="flex items-center gap-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <User size={14} className="text-slate-400" />
                                    <span className="font-mono text-slate-900 select-all">{staff.username}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-400 px-3 py-1.5 rounded-lg border border-transparent">
                                    <Lock size={14} />
                                    <span className="font-mono text-xs">••••••</span>
                                  </div>
                                </div>

                                {/* Department Badge */}
                                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getDepartmentColor(staff.department)}`}>
                                  {DEPARTMENT_LABELS[staff.department as DepartmentType] || staff.department}
                                </span>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditStaff(staff)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Düzenle"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteModal(staff.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {staffList.length === 0 && !loading && (
                  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz ekip üyesi yok</h3>
                    <p className="text-sm text-slate-500 mb-4">İlk ekip üyenizi ekleyerek başlayın</p>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={18} />
                      Yeni Kullanıcı Ekle
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500">
              <h3 className="text-lg font-semibold text-white">Yeni Kullanıcı Ekle</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="text-rose-500">*</span> İsim Soyisim
                </label>
                <input
                  type="text"
                  value={newStaffForm.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  placeholder="Ahmet Yılmaz"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="text-rose-500">*</span> Kullanıcı Adı
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={newStaffForm.username}
                    onChange={(e) => setNewStaffForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-mono"
                    placeholder="ahmet.yilmaz"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Giriş yaparken kullanılacak</p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="text-rose-500">*</span> Şifre
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newStaffForm.password}
                    onChange={(e) => setNewStaffForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-10 pr-12 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 font-mono"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1">En az 6 karakter</p>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Departman</label>
                <select
                  value={newStaffForm.department}
                  onChange={(e) => setNewStaffForm(prev => ({ ...prev, department: e.target.value as DepartmentType, role: '' }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="video">Reels Yapımcıları</option>
                  <option value="design">Story Yapımcıları</option>
                  <option value="content">Gönderi Yapımcıları</option>
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="text-rose-500">*</span> Pozisyon
                </label>
                <input
                  type="text"
                  value={newStaffForm.role}
                  onChange={(e) => setNewStaffForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                  placeholder="Video Editor"
                  list="role-suggestions"
                />
                <datalist id="role-suggestions">
                  {ROLE_SUGGESTIONS[newStaffForm.department].map((role) => (
                    <option key={role} value={role} />
                  ))}
                </datalist>
              </div>

              {/* Admin Checkbox */}
              <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
                <input
                  type="checkbox"
                  checked={newStaffForm.isAdmin}
                  onChange={(e) => setNewStaffForm(prev => ({ ...prev, isAdmin: e.target.checked }))}
                  className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                />
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Admin yetkisi ver</span>
                </div>
              </label>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddStaff}
                disabled={!newStaffForm.name || !newStaffForm.username || !newStaffForm.password || newStaffForm.password.length < 6 || !newStaffForm.role || saving}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Kullanıcı Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Kullanıcıyı Sil</h3>
              <p className="text-sm text-slate-500">
                Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
              </p>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleDeleteStaff(showDeleteModal)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
