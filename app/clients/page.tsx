'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Client, PackageType } from '@/types';
import ClientCard from '@/components/clients/ClientCard';
import ClientPlanner from '@/components/clients/ClientPlanner';
import AddClientModal from '@/components/clients/AddClientModal';
import Sidebar from '@/components/Sidebar';
import { 
  Plus, 
  Users, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  Menu, 
  Search, 
  Filter, 
  Sparkles,
  Zap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// API'den gelen client verisini frontend tipine dönüştür
interface ApiClient {
  id: string;
  name: string;
  logo: string | null;
  packageType: string;
  startDate: string;
  renewalDate: string;
  usedQuota: {
    reels: number;
    posts: number;
    stories: number;
  };
  plannedDates: {
    reels: string[];
    posts: string[];
    stories: string[];
  };
  hasPortalAccess?: boolean;
  portalUsername?: string | null;
  createdAt: string;
  
  // Sorumlu Kişiler
  socialUser?: { id: string, name: string, avatar: string | null, roleTitle: string } | null;
  designerUser?: { id: string, name: string, avatar: string | null, roleTitle: string } | null;
  reelsUser?: { id: string, name: string, avatar: string | null, roleTitle: string } | null;
  adsUser?: { id: string, name: string, avatar: string | null, roleTitle: string } | null;
  adsPeriod?: string | null;
  reelsQuota?: number;
  postsQuota?: number;
  storiesQuota?: number;
}

const mapApiClientToClient = (apiClient: ApiClient): Client => ({
  id: apiClient.id,
  name: apiClient.name,
  logo: apiClient.logo || undefined,
  package: apiClient.packageType as PackageType,
  startDate: apiClient.startDate,
  renewalDate: apiClient.renewalDate,
  usedQuota: apiClient.usedQuota,
  plannedDates: apiClient.plannedDates,
  hasPortalAccess: apiClient.hasPortalAccess,
  portalUsername: apiClient.portalUsername,
  
  // Custom Quota
  reelsQuota: apiClient.reelsQuota,
  postsQuota: apiClient.postsQuota,
  storiesQuota: apiClient.storiesQuota,
  
  // Yeni Alanlar
  socialUser: apiClient.socialUser,
  designerUser: apiClient.designerUser,
  reelsUser: apiClient.reelsUser,
  adsUser: apiClient.adsUser,
  adsPeriod: apiClient.adsPeriod,
});

export default function ClientsPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [searchQuery, setSearchQuery] = useState('');

  // Müşterileri API'den yükle
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/clients');
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Müşteriler yüklenemedi');
      }
      
      const data = await res.json();
      const mappedClients = data.clients.map(mapApiClientToClient);
      setClients(mappedClients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Sayfa yüklendiğinde müşterileri çek (Sadece admin ve yükleme bittiyse)
  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchClients();
    }
  }, [authLoading, isAdmin, fetchClients]);

  // Filter Logic
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const lowerQuery = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) || 
      c.package.toLowerCase().includes(lowerQuery)
    );
  }, [clients, searchQuery]);

  // Calculate stats
  const urgentCount = useMemo(() => {
    return clients.filter(c => {
      const renewalDate = new Date(c.renewalDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 3;
    }).length;
  }, [clients]);

  // Yetki Kontrolü - Hook'lardan SONRA yapılmalı
  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA]">
        <Loader2 size={32} className="text-slate-300 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAFA] p-4">
        <div className="text-center p-8 bg-white rounded-3xl shadow-xl shadow-slate-200/50 w-full max-w-sm border border-slate-100">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-rose-50/50">
              <AlertTriangle size={36} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Erişim Reddedildi</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">
                Bu alana yalnızca yetkili yöneticiler erişebilir. Lütfen giriş yapın veya ana sayfaya dönün.
            </p>
            <a href="/" className="inline-flex items-center justify-center w-full px-6 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-bold tracking-wide shadow-lg shadow-slate-900/20">
                Ana Sayfaya Dön
            </a>
        </div>
      </div>
    );
  }

  // Müşteri güncelleme (ClientPlanner'dan)
  const handleClientUpdate = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  // Yeni müşteri ekle
  const handleAddClient = async (data: any) => {
    try {
      setSaving(true);
      
      const renewalDate = new Date(data.startDate);
      renewalDate.setMonth(renewalDate.getMonth() + 1);
      
      const payload = {
        name: data.name,
        logo: data.logo || null,
        packageType: data.package,
        startDate: data.startDate,
        renewalDate: renewalDate.toISOString().split('T')[0],
        
        // Yeni Atamalar
        socialUserId: data.socialUserId,
        designerUserId: data.designerUserId,
        reelsUserId: data.reelsUserId,
        adsUserId: data.adsUserId,
        adsPeriod: data.adsPeriod,
        
        // Custom Quota
        reelsQuota: data.reelsQuota,
        postsQuota: data.postsQuota,
        storiesQuota: data.storiesQuota
      };

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const resData = await res.json();
        throw new Error(resData.error || 'Müşteri eklenemedi');
      }

      const resData = await res.json();
      const newClient = mapApiClientToClient(resData.client);
      setClients(prev => [newClient, ...prev]);
      setShowAddModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  // Müşteri sil
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz? Tüm görevleri de silinecek.')) {
      return;
    }

    try {
      setSaving(true);
      
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Müşteri silinemedi');
      }

      setClients(prev => prev.filter(c => c.id !== clientId));
      if (selectedClient?.id === clientId) {
        setSelectedClient(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        
        {/* === HEADER === */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-20 sticky top-0">
          <div className="max-w-[1600px] mx-auto w-full px-5 py-4">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               
               {/* Title & Mobile Menu */}
               <div className="flex items-center justify-between md:justify-start gap-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                       <Menu size={20} />
                    </button>
                    <div>
                       <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">Müşteriler</h1>
                       <div className="flex items-center gap-2">
                         <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                            Yönetim Paneli
                         </span>
                         {urgentCount > 0 && (
                            <span className="flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                               <AlertTriangle size={10} />
                               {urgentCount} Acil
                            </span>
                         )}
                       </div>
                    </div>
                  </div>
                  
                  {/* Mobile Add Button (Visible only on mobile) */}
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="md:hidden w-10 h-10 flex items-center justify-center bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform"
                    >
                      <Plus size={20} />
                    </button>
                  )}
               </div>

               {/* Actions & Search */}
               <div className="flex items-center gap-3 w-full md:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1 md:w-64 group">
                     <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                     </div>
                     <input 
                       type="text" 
                       placeholder="Müşteri ara..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none"
                     />
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={fetchClients}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-50"
                    title="Yenile"
                  >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  </button>
                  
                  {/* Desktop Add Button */}
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAddModal(true)}
                      disabled={saving}
                      className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-2xl hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50"
                    >
                      <Plus size={18} />
                      <span>Yeni Ekle</span>
                    </button>
                  )}
               </div>
             </div>
          </div>
        </header>

        {/* === CONTENT === */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-[#FAFAFA]">
          <div className="max-w-[1600px] mx-auto w-full px-5 py-8 pb-32">
             
             {/* Error Message */}
             {error && (
               <div className="flex items-center gap-3 p-4 mb-8 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl shadow-sm animate-in slide-in-from-top-2">
                 <div className="p-2 bg-rose-100 rounded-full">
                    <AlertTriangle size={18} />
                 </div>
                 <span className="font-medium text-sm">{error}</span>
                 <button onClick={fetchClients} className="ml-auto text-xs font-bold underline hover:no-underline">Tekrar Dene</button>
               </div>
             )}

             {/* Loading State */}
             {loading && !clients.length ? (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                 <Loader2 size={40} className="animate-spin text-slate-900 mb-4" />
                 <p className="text-xs font-black tracking-widest uppercase">Müşteriler Yükleniyor...</p>
               </div>
             ) : (
               <>
                 {/* Empty Search or No Clients State */}
                 {!loading && filteredClients.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-center">
                     <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-slate-50/50">
                        {searchQuery ? <Search size={40} className="text-slate-300" /> : <Users size={40} className="text-slate-300" />}
                     </div>
                     <h3 className="text-xl font-black text-slate-900 mb-2">
                        {searchQuery ? 'Sonuç Bulunamadı' : 'Henüz Müşteri Yok'}
                     </h3>
                     <p className="text-slate-500 text-sm mb-8 font-medium max-w-xs mx-auto">
                        {searchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı.' : 'Sisteme yeni müşteri ekleyerek başlayın.'}
                     </p>
                     {!searchQuery && isAdmin && (
                       <button 
                         onClick={() => setShowAddModal(true)}
                         className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl shadow-slate-900/20"
                       >
                         <Plus size={18} />
                         İlk Müşterini Ekle
                       </button>
                     )}
                   </div>
                 ) : (
                   /* grid-cols-responsive */
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     {filteredClients.map((client) => (
                       <ClientCard 
                         key={client.id}
                         client={client}
                         onClick={() => setSelectedClient(client)}
                       />
                     ))}
                   </div>
                 )}
               </>
             )}
          </div>
        </div>
      </main>

      {/* Client Planner Modal */}
      {selectedClient && (
        <ClientPlanner 
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={handleClientUpdate}
          onDelete={isAdmin ? handleDeleteClient : undefined}
        />
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddClient}
      />
    </div>
  );
}
