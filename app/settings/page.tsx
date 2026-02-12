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
  RefreshCw,
  Menu,
  CheckCircle2,
  Banknote,
  Briefcase
} from 'lucide-react';

// Yetenek Tipleri (Sabit Liste)
const CAPABILITY_TYPES = [
  { key: 'social_management', label: 'Sosyal Medya Yönetimi' },
  { key: 'post', label: 'Post / Story Tasarımı' }, // Eskiden "Graphic Design"
  { key: 'reels', label: 'Reels Video' },
  { key: 'meta_ads_15', label: 'Meta Reklam (1-15 Gün)' },
  { key: 'meta_ads_30', label: 'Meta Reklam (1-30 Gün)' },
];

interface Capability {
  type: string;
  price: number;
}

// API'den gelen kullanıcı tipi (Yeni Schema'ya göre)
interface ApiUser {
  id: string;
  username: string;
  name: string;
  roleTitle: string;    // Yeni: Görünen Unvan
  baseSalary: number;   // Yeni: Sabit Maaş
  avatar: string | null;
  isAdmin: boolean;
  createdAt: string;
  capabilities: Capability[]; // Yeni: Yetenekler
}

interface UserForm {
  name: string;
  username: string;
  password?: string;
  roleTitle: string;
  baseSalary: string; // Input için string tutuyoruz, gönderirken number yaparız
  isAdmin: boolean;
  capabilities: Record<string, string>; // type -> price (string olarak)
  selectedCapabilities: Record<string, boolean>; // type -> checklist durumu
}

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
  
  // Edit veya New Form State (Tek bir state kullanacağız, modal ile yönetilecek)
  const [formData, setFormData] = useState<UserForm>({
    name: '',
    username: '',
    password: '',
    roleTitle: '',
    baseSalary: '0',
    isAdmin: false,
    capabilities: {},
    selectedCapabilities: {}
  });
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null); // null ise "Yeni Ekle" modundayız
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Form Reset
  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      roleTitle: '',
      baseSalary: '0',
      isAdmin: false,
      capabilities: {},  // Fiyatlar
      selectedCapabilities: {} // Checkboxlar
    });
    setEditingUserId(null);
    setShowPassword(false);
  };

  // Düzenleme Modunu Başlat
  const handleStartEdit = (staff: ApiUser) => {
    setEditingUserId(staff.id);
    
    // Capabilities verisini form formatına çevir
    const caps: Record<string, string> = {};
    const selected: Record<string, boolean> = {};

    staff.capabilities.forEach(c => {
      caps[c.type] = c.price.toString();
      selected[c.type] = true;
    });

    setFormData({
      name: staff.name,
      username: staff.username,
      password: '', // Şifre boş gelir, değiştirilmek istenirse doldurulur
      roleTitle: staff.roleTitle,
      baseSalary: staff.baseSalary.toString(),
      isAdmin: staff.isAdmin,
      capabilities: caps,
      selectedCapabilities: selected
    });
    
    setShowAddModal(true); // Aynı modalı kullanıyoruz
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.roleTitle) return;
    
    // Yeni kullanıcı ise şifre zorunlu
    if (!editingUserId && (!formData.password || formData.password.length < 6)) {
      alert('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setSaving(true);
      
      // Capabilities Array'ini hazırla
      const capabilitiesPayload = Object.keys(formData.selectedCapabilities)
        .filter(key => formData.selectedCapabilities[key]) // Sadece seçili olanlar
        .map(key => ({
          type: key,
          price: parseFloat(formData.capabilities[key] || '0')
        }));

      const payload = {
        name: formData.name,
        username: formData.username,
        password: formData.password || undefined, // Boşsa gönderme (edit modunda)
        roleTitle: formData.roleTitle,
        baseSalary: formData.baseSalary,
        isAdmin: formData.isAdmin,
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
        capabilities: capabilitiesPayload
      };

      let res;
      if (editingUserId) {
        // UPDATE
        res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // CREATE
        res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'İşlem başarısız');
      }

      // Listeyi güncelle
      await fetchUsers();
      setShowAddModal(false);
      resetForm();
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

  const showSaveSuccessMessage = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleNameChange = (name: string) => {
    // Sadece yeni eklerken otomatik username oluştur
    if (!editingUserId) {
      setFormData(prev => ({
        ...prev,
        name,
        username: name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '')
      }));
    } else {
      setFormData(prev => ({ ...prev, name }));
    }
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
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 overflow-auto min-w-0">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Ekip Yönetimi</h1>
                <p className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1">Kullanıcı ekle, düzenle ve yeteneklerini tanımla</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-50 text-emerald-700 rounded-lg animate-pulse">
                  <Save size={16} />
                  <span className="text-xs md:text-sm font-medium">Kaydedildi!</span>
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

        <div className="p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
            {/* Error */}
            {error && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 md:p-4 bg-rose-50 text-rose-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
                <button onClick={fetchUsers} className="text-sm underline sm:ml-auto">Tekrar Dene</button>
              </div>
            )}

            {/* Add Staff Button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-900">Ekip Listesi</h2>
                <p className="text-xs md:text-sm text-slate-500">{staffList.length} kullanıcı</p>
              </div>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25 w-full sm:w-auto justify-center"
              >
                <Plus size={18} />
                Yeni Personel Ekle
              </button>
            </div>

            {/* Loading */}
            {loading ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Kullanıcılar yükleniyor...</p>
              </div>
            ) : (
              // Staff List (Grid / List)
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {staffList.map((staff) => (
                  <div key={staff.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          {staff.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={staff.avatar} 
                              alt={staff.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                              {staff.name.charAt(0)}
                            </div>
                          )}
                          {staff.isAdmin && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border-2 border-white" title="Admin">
                              <Shield size={10} className="text-white" />
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-semibold text-slate-900 line-clamp-1" title={staff.name}>{staff.name}</h3>
                          <p className="text-xs text-slate-500 font-mono">@{staff.username}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(staff)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(staff.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Role & Salary Info */}
                    <div className="px-5 py-3 bg-slate-50/50 space-y-2">
                       <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-slate-600">
                             <Briefcase size={14} />
                             <span className="font-medium truncate max-w-[120px]" title={staff.roleTitle}>{staff.roleTitle}</span>
                          </div>
                          {staff.baseSalary > 0 && (
                            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
                              <Banknote size={12} />
                              <span>{staff.baseSalary.toLocaleString('tr-TR')} ₺</span>
                            </div>
                          )}
                       </div>
                    </div>

                    {/* Capabilities Tags */}
                    <div className="px-5 py-4 min-h-[80px]">
                      <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Yetenekler</p>
                      <div className="flex flex-wrap gap-1.5">
                        {staff.capabilities.length > 0 ? (
                          staff.capabilities.map((cap) => (
                             <div key={cap.type} className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] text-slate-600 shadow-sm" title={`${cap.price} TL`}>
                               {CAPABILITY_TYPES.find(t => t.key === cap.type)?.label || cap.type}
                               <span className="text-indigo-600 font-bold ml-0.5 border-l border-slate-200 pl-1">
                                 {cap.price}₺
                               </span>
                             </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Yetenek tanımlanmamış.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Empty State */}
                {staffList.length === 0 && !loading && (
                  <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz personel yok</h3>
                    <p className="text-sm text-slate-500 mb-4">İlk personelinizi ekleyerek başlayın</p>
                    <button
                      onClick={() => {
                        resetForm();
                        setShowAddModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={18} />
                      Yeni Personel Ekle
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500">
              <h3 className="text-base sm:text-lg font-semibold text-white">
                {editingUserId ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 text-white/70 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Temel Bilgiler Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* İsim */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="text-rose-500">*</span> İsim Soyisim
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ad Soyad"
                    />
                 </div>

                 {/* Kullanıcı Adı */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="text-rose-500">*</span> Kullanıcı Adı
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '.') }))}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="kullanici.adi"
                      />
                    </div>
                 </div>

                 {/* Şifre (Sadece Create veya İsteğe Bağlı Update) */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {editingUserId ? 'Şifre (Değiştirmek için girin)' : <><span className="text-rose-500">*</span> Şifre</>}
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder={editingUserId ? '••••••••' : 'En az 6 karakter'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                 </div>

                 {/* Unvan */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <span className="text-rose-500">*</span> Görünen Unvan
                    </label>
                    <input
                      type="text"
                      value={formData.roleTitle}
                      onChange={(e) => setFormData(prev => ({ ...prev, roleTitle: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Örn: Sosyal Medya Yöneticisi"
                    />
                 </div>

                 {/* Sabit Maaş */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                       Sabit Maaş (Aylık)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₺</span>
                      <input
                        type="number"
                        min="0"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Parça başı çalışıyorsa 0 giriniz.</p>
                 </div>

                 {/* Admin Yetkisi */}
                 <div className="flex items-end pb-2">
                    <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors w-full border border-amber-100">
                      <input
                        type="checkbox"
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                        className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <Shield size={16} className="text-amber-600" />
                        <span className="text-sm font-medium text-amber-800">Admin Yetkisi</span>
                      </div>
                    </label>
                 </div>
              </div>

              {/* YETENEK MATRİSİ */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-indigo-600" />
                   Yetenekler ve Birim Fiyatlar
                </h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200">
                  {CAPABILITY_TYPES.map((cap) => {
                    const isSelected = formData.selectedCapabilities[cap.key] || false;
                    
                    return (
                      <div key={cap.key} className={`flex items-center justify-between p-3 sm:px-4 transition-colors ${isSelected ? 'bg-white' : ''}`}>
                         {/* Sol: Checkbox + Label */}
                         <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input 
                               type="checkbox"
                               checked={isSelected}
                               onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFormData(prev => ({
                                     ...prev,
                                     selectedCapabilities: { ...prev.selectedCapabilities, [cap.key]: checked }
                                  }));
                               }}
                               className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span className={`text-sm ${isSelected ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                               {cap.label}
                            </span>
                         </label>

                         {/* Sağ: Fiyat Input (Sadece seçiliyse görünür) */}
                         {isSelected && (
                           <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                              <span className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Birim Fiyat:</span>
                              <div className="relative w-24 sm:w-32">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">TL</span>
                                <input 
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={formData.capabilities[cap.key] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        capabilities: { ...prev.capabilities, [cap.key]: val }
                                    }));
                                  }}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm text-right pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                           </div>
                         )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2 px-1">
                   * Seçili yetenekler, görev atamalarında personelin listelenmesini sağlar. Fiyatlar otomatik cüzdana işlenir.
                </p>
              </div>
            </div>
            
            <div className="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 sm:py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors text-center"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingUserId ? 'Değişiklikleri Kaydet' : 'Personeli Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
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
