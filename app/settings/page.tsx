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
  Briefcase,
  Search,
  Sparkles,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

// Yetenek Tipleri (Sabit Liste)
const CAPABILITY_TYPES = [
  { key: 'social_management', label: 'Sosyal Medya Yönetimi' },
  { key: 'post', label: 'Post / Story Tasarımı' }, 
  { key: 'reels', label: 'Reels Video' },
  { key: 'meta_ads_15', label: 'Meta Reklam (1-15 Gün)' },
  { key: 'meta_ads_30', label: 'Meta Reklam (1-30 Gün)' },
];

interface Capability {
  type: string;
  price: number;
}

// API'den gelen kullanıcı tipi
interface ApiUser {
  id: string;
  username: string;
  name: string;
  roleTitle: string;    
  baseSalary: number;   
  avatar: string | null;
  isAdmin: boolean;
  createdAt: string;
  capabilities: Capability[]; 
}

interface UserForm {
  name: string;
  username: string;
  password?: string;
  roleTitle: string;
  baseSalary: string; 
  isAdmin: boolean;
  capabilities: Record<string, string>; 
  selectedCapabilities: Record<string, boolean>; 
  avatar?: string | null;
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
  
  // Form State
  const [formData, setFormData] = useState<UserForm>({
    name: '',
    username: '',
    password: '',
    roleTitle: '',
    baseSalary: '0',
    isAdmin: false,
    capabilities: {},
    selectedCapabilities: {},
    avatar: null
  });
  
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      capabilities: {},  
      selectedCapabilities: {},
      avatar: null 
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
      password: '', 
      roleTitle: staff.roleTitle,
      baseSalary: staff.baseSalary.toString(),
      isAdmin: staff.isAdmin,
      capabilities: caps,
      selectedCapabilities: selected,
      avatar: staff.avatar
    });
    
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.username || !formData.roleTitle) return;
    
    if (!editingUserId && (!formData.password || formData.password.length < 6)) {
      alert('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    try {
      setSaving(true);
      
      const capabilitiesPayload = Object.keys(formData.selectedCapabilities)
        .filter(key => formData.selectedCapabilities[key]) 
        .map(key => ({
          type: key,
          price: parseFloat(formData.capabilities[key] || '0')
        }));

      const payload = {
        name: formData.name,
        username: formData.username,
        password: formData.password || undefined, 
        roleTitle: formData.roleTitle,
        baseSalary: formData.baseSalary,
        isAdmin: formData.isAdmin,
        avatar: editingUserId ? formData.avatar : `https://i.pravatar.cc/150?u=${Date.now()}`,
        capabilities: capabilitiesPayload
      };

      let res;
      if (editingUserId) {
        res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
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

  // Filter & Sort
  const filteredStaff = staffList
    .filter(staff => 
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      staff.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.roleTitle.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // Adminler en üstte
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      return 0;
    });

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA]">
        <Loader2 size={32} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        
        {/* === HEADER (Sticky Glassmorphic) === */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-20 sticky top-0">
          <div className="max-w-[1600px] mx-auto w-full px-5 py-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               
               {/* Title & Mobile Menu */}
               <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                     <Menu size={20} />
                  </button>
                  <div>
                     <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Ayarlar & Ekip</h1>
                     <div className="flex items-center gap-2">
                       <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                          Yönetim Paneli
                       </span>
                     </div>
                  </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Search */}
                  <div className="relative flex-1 md:w-64 group">
                     <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                     </div>
                     <input 
                       type="text" 
                       placeholder="Personel ara..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none"
                     />
                  </div>

                  {/* Refresh */}
                  <button
                    onClick={fetchUsers}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                  
                  {/* Add Button */}
                  <button 
                    onClick={() => { resetForm(); setShowAddModal(true); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20"
                  >
                    <Plus size={18} />
                    <span className="hidden sm:inline">Yeni Personel</span>
                  </button>
               </div>
             </div>
          </div>
        </header>

        {/* === CONTENT === */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-[#FAFAFA]">
          <div className="max-w-[1600px] mx-auto w-full px-5 py-8 pb-32">
            
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 p-4 mb-8 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
                <div className="p-2 bg-rose-100 rounded-full">
                   <AlertTriangle size={18} />
                </div>
                <span className="font-medium text-sm">{error}</span>
                <button onClick={fetchUsers} className="ml-auto text-xs font-bold underline hover:no-underline">Tekrar Dene</button>
              </div>
            )}

            {/* Success Toast */}
            {saveSuccess && (
               <div className="fixed top-24 right-5 z-40 bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-bold">İşlem Başarılı!</span>
               </div>
            )}

            {/* Loading */}
            {loading && !staffList.length ? (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                 <Loader2 size={40} className="animate-spin text-slate-900 mb-4" />
                 <p className="text-xs font-black tracking-widest uppercase">Kullanıcılar Yükleniyor...</p>
               </div>
            ) : (
               <>
                 {/* Empty State */}
                 {!loading && filteredStaff.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-100/50">
                          {searchQuery ? <Search size={40} className="text-slate-300" /> : <Users size={40} className="text-slate-300" />}
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">
                         {searchQuery ? 'Sonuç Bulunamadı' : 'Ekip Listeniz Boş'}
                      </h3>
                      <p className="text-slate-500 text-sm mb-8 font-medium max-w-xs mx-auto">
                         {searchQuery ? 'Arama kriterlerine uygun personel yok.' : 'Yeni ekip arkadaşları ekleyerek CRM sisteminizi güçlendirin.'}
                      </p>
                      {!searchQuery && (
                         <button 
                           onClick={() => { resetForm(); setShowAddModal(true); }}
                           className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform"
                         >
                           İlk Personeli Ekle
                         </button>
                      )}
                   </div>
                 ) : (
                   /* STAFF GRID */
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredStaff.map((staff) => (
                        <div 
                          key={staff.id} 
                          className={`
                            group relative bg-white rounded-3xl p-5 border shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300
                            ${staff.isAdmin ? 'border-amber-200 bg-amber-50/30' : 'border-slate-100'}
                          `}
                        >
                           {/* Admin Badge */}
                           {staff.isAdmin && (
                              <div className="absolute top-4 right-4 z-10">
                                 <div className="bg-amber-100 text-amber-700 p-1.5 rounded-xl" title="Admin Yetkisi">
                                    <Shield size={16} />
                                 </div>
                              </div>
                           )}

                           {/* Header: Avatar & Names */}
                           <div className="flex flex-col items-center text-center mb-6 pt-2">
                              <div className="relative mb-4">
                                {staff.avatar ? (
                                   // eslint-disable-next-line @next/next/no-img-element
                                   <img src={staff.avatar} alt={staff.name} className="w-20 h-20 rounded-2xl object-cover shadow-lg shadow-indigo-500/10" />
                                ) : (
                                   <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-2xl font-black text-slate-400">
                                      {staff.name.charAt(0)}
                                   </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                                   <Sparkles size={14} className="text-indigo-500" />
                                </div>
                              </div>
                              
                              <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{staff.name}</h3>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">@{staff.username}</p>
                           </div>

                           {/* Info Chips */}
                           <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                              <div className="px-3 py-1.5 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                 <Briefcase size={14} className="text-indigo-500" />
                                 {staff.roleTitle || 'Unvan Yok'}
                              </div>
                              {staff.baseSalary > 0 && (
                                <div className="px-3 py-1.5 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                                   <Banknote size={14} />
                                   {staff.baseSalary.toLocaleString('tr-TR')} ₺
                                </div>
                              )}
                           </div>

                           {/* Capabilities/Skills Preview */}
                           <div className="pt-4 border-t border-slate-50">
                              <div className="flex items-center justify-between mb-3">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hizmet Fiyatları</span>
                                 <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{staff.capabilities.length}</span>
                              </div>
                              <div className="flex flex-col gap-1.5 h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                                 {staff.capabilities.length > 0 ? (
                                   staff.capabilities.map((cap) => {
                                      const label = CAPABILITY_TYPES.find(t => t.key === cap.type)?.label || cap.type;
                                      return (
                                        <div key={cap.type} className="flex items-center justify-between px-2.5 py-2 bg-slate-50/50 rounded-lg group/cap hover:bg-slate-50 transition-colors">
                                           <span className="text-[11px] font-bold text-slate-600 truncate max-w-[120px]" title={label}>{label}</span>
                                           <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 tabular-nums">
                                              {cap.price} ₺
                                           </span>
                                        </div>
                                      );
                                   })
                                 ) : (
                                   <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                      <span className="text-xs italic">Hizmet tanımlanmamış</span>
                                   </div>
                                 )}
                              </div>
                           </div>

                           {/* Actions Footer */}
                           <div className="mt-4 flex items-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                             <button 
                               onClick={() => handleStartEdit(staff)}
                               className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                             >
                               <Edit3 size={14} /> Düzenle
                             </button>
                             <button 
                               onClick={() => setShowDeleteModal(staff.id)}
                               className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                        </div>
                      ))}
                   </div>
                 )}
               </>
            )}

          </div>
        </div>
      </main>

      {/* === ADD/EDIT MODAL === */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto">
          {/* Modal Content */}
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 my-auto border border-white/20">
             
             {/* Header */}
             <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight">
                     {editingUserId ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}
                   </h3>
                   <p className="text-sm text-slate-500 font-medium">Bilgileri eksiksiz doldurduğunuzdan emin olun.</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                >
                  <X size={20} />
                </button>
             </div>

             {/* Form Container */}
             <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* Section: Kimlik */}
                <div className="space-y-5">
                   <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                      <User size={14} /> Kimlik Bilgileri
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-700">Ad Soyad</label>
                         <input 
                           type="text" 
                           placeholder="Örn: Ahmet Yılmaz"
                           value={formData.name}
                           onChange={(e) => handleNameChange(e.target.value)}
                           className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:font-normal"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-700">Kullanıcı Adı</label>
                         <input 
                           type="text" 
                           placeholder="username"
                           value={formData.username}
                           onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '.') }))}
                           className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                         />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-700">Unvan</label>
                         <input 
                           type="text" 
                           placeholder="Örn: Grafik Tasarımcı"
                           value={formData.roleTitle}
                           onChange={(e) => setFormData(prev => ({ ...prev, roleTitle: e.target.value }))}
                           className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                         />
                      </div>
                      <div className="space-y-1.5 relative">
                         <label className="text-xs font-bold text-slate-700">Şifre</label>
                         <input 
                           type={showPassword ? 'text' : 'password'}
                           placeholder={editingUserId ? '••••••••' : 'En az 6 haneli şifre'}
                           value={formData.password}
                           onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                           className="w-full pl-10 pr-10 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                         />
                         <Lock size={16} className="absolute left-3.5 top-[34px] text-slate-400" />
                         <button 
                           type="button" 
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-3.5 top-[34px] text-slate-400 hover:text-slate-600"
                         >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                         </button>
                      </div>
                   </div>
                </div>

                {/* Section: Finans & Yetki */}
                <div className="space-y-5">
                   <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                      <Shield size={14} /> Yetki ve Maaş
                   </h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5 relative">
                         <label className="text-xs font-bold text-slate-700">Sabit Maaş</label>
                         <input 
                           type="number" 
                           placeholder="0"
                           value={formData.baseSalary}
                           onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: e.target.value }))}
                           className="w-full pl-8 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                         />
                         <span className="absolute left-3.5 top-[34px] text-slate-400 font-bold">₺</span>
                      </div>
                      <div className="flex items-end">
                         <label className="w-full flex items-center justify-between p-3 bg-indigo-50 hover:bg-indigo-100 rounded-2xl cursor-pointer transition-colors border-2 border-transparent hover:border-indigo-200">
                             <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-colors ${formData.isAdmin ? 'bg-indigo-600 border-indigo-600' : 'border-indigo-300'}`}>
                                   {formData.isAdmin && <CheckCircle2 size={14} className="text-white" />}
                                </div>
                                <div>
                                   <span className="block text-sm font-bold text-indigo-900">Yönetici Yetkisi</span>
                                   <span className="block text-xs text-indigo-600/70">Tam erişim sağlar</span>
                                </div>
                             </div>
                             <input 
                               type="checkbox" 
                               checked={formData.isAdmin} 
                               onChange={(e) => setFormData(prev => ({ ...prev, isAdmin: e.target.checked }))}
                               className="hidden"
                             />
                         </label>
                      </div>
                   </div>
                </div>

                {/* Section: Yetenekler */}
                <div className="space-y-5">
                   <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest">
                         <Briefcase size={14} /> Yetenekler
                      </h4>
                      <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Otomatik Cüzdan</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3">
                      {CAPABILITY_TYPES.map((cap) => {
                          const isSelected = formData.selectedCapabilities[cap.key] || false;
                          return (
                             <div 
                               key={cap.key} 
                               className={`
                                 relative flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200
                                 ${isSelected ? 'bg-white border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-slate-50 border-transparent hover:bg-slate-100'}
                               `}
                             >
                                <label className="flex items-center gap-4 cursor-pointer flex-1 z-10">
                                   <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                      {isSelected && <CheckCircle2 size={14} className="text-white" />}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className={`text-sm font-bold ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>{cap.label}</span>
                                      <span className="text-[10px] text-slate-400">Yetenek aktif</span>
                                   </div>
                                   <input 
                                     type="checkbox"
                                     className="hidden"
                                     checked={isSelected}
                                     onChange={(e) => {
                                        const val = e.target.checked;
                                        setFormData(prev => ({
                                           ...prev,
                                           selectedCapabilities: { ...prev.selectedCapabilities, [cap.key]: val }
                                        }));
                                     }}
                                   />
                                </label>

                                {isSelected && (
                                   <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                                      <span className="text-xs font-bold text-slate-400 hidden sm:inline">Birim Fiyat:</span>
                                      <div className="relative w-28">
                                         <input 
                                            type="number"
                                            placeholder="0"
                                            min="0"
                                            value={formData.capabilities[cap.key] || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, capabilities: { ...prev.capabilities, [cap.key]: e.target.value } }))}
                                            className="w-full pl-3 pr-8 py-2 bg-indigo-50 border-none rounded-xl text-right font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
                                         />
                                         <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-400">TL</span>
                                      </div>
                                   </div>
                                )}
                             </div>
                          )
                      })}
                   </div>
                </div>

             </div>

             {/* Footer Actions */}
             <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
                 <button 
                   onClick={() => setShowAddModal(false)}
                   className="px-6 py-3 rounded-2xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                 >
                   Vazgeç
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={saving}
                   className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
                 >
                   {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                   {editingUserId ? 'Değişiklikleri Kaydet' : 'Personeli Oluştur'}
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* === DELETE CONFIRMATION MODAL === */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                 <AlertTriangle size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Emin misiniz?</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">
                 Seçilen personel ve o personele ait tüm görevler kalıcı olarak silinecektir. Bu işlem geri alınamaz.
              </p>
              <div className="grid grid-cols-2 gap-3">
                 <button 
                   onClick={() => setShowDeleteModal(null)}
                   className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
                 >
                   Vazgeç
                 </button>
                 <button 
                   onClick={() => handleDeleteStaff(showDeleteModal)}
                   className="py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/30"
                 >
                   Evet, Sil
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
