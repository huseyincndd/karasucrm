'use client';

import React, { useState, useEffect } from 'react';
import { PackageType, PACKAGE_LABELS, Client } from '@/types';
import { X, User, Loader2, Calendar, Check } from 'lucide-react';

interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  capabilities: { type: string }[];
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd?: (data: any) => void;
  onUpdate?: (id: string, data: any) => void;
  clientToEdit?: Client | null;
}

// Helper Component for MultiSelect
const UserMultiSelect = ({ 
  label, 
  users, 
  selectedIds, 
  onChange 
}: { 
  label: string, 
  users: ApiUser[], 
  selectedIds: string[], 
  onChange: (ids: string[]) => void 
}) => {
  const [open, setOpen] = useState(false);
  
  const toggleSelection = (id: string) => {
     if (selectedIds.includes(id)) {
        onChange(selectedIds.filter(x => x !== id));
     } else {
        onChange([...selectedIds, id]);
     }
  };

  const selectedNames = users
    .filter(u => selectedIds.includes(u.id))
    .map(u => u.name)
    .join(', ');

  return (
    <div className={`bg-slate-50 p-3 rounded-lg border border-slate-200 relative transition-all ${open ? 'z-50 ring-2 ring-indigo-100' : ''}`}>
      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest">{label}</label>
      <div 
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm min-h-[38px] cursor-pointer flex items-center justify-between"
      >
         <span className={`truncate ${selectedIds.length ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
            {selectedIds.length === 0 ? 'Seçiniz...' : selectedNames}
         </span>
         <span className="text-slate-400 text-xs ml-2">▼</span>
      </div>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-[60] max-h-48 overflow-y-auto p-1 text-left">
             {users.length === 0 ? (
               <div className="p-2 text-xs text-slate-400 text-center">Uygun personel yok</div>
             ) : (
               users.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => toggleSelection(u.id)}
                    className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer rounded-md"
                  >
                     <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${selectedIds.includes(u.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                        {selectedIds.includes(u.id) && <Check size={10} className="text-white" />}
                     </div>
                     <span className="text-sm text-slate-700">{u.name}</span>
                  </div>
               ))
             )}
          </div>
        </>
      )}
    </div>
  )
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAdd, onUpdate, clientToEdit }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('plus');
  const [customQuotas, setCustomQuotas] = useState<{reels: number | string, posts: number | string, stories: number | string}>({ reels: 0, posts: 0, stories: 0 });

  // Sorumlu Kişiler State'i (Array)
  const [socialUserIds, setSocialUserIds] = useState<string[]>([]);
  const [designerUserIds, setDesignerUserIds] = useState<string[]>([]);
  const [reelsUserIds, setReelsUserIds] = useState<string[]>([]);
  const [adsUserIds, setAdsUserIds] = useState<string[]>([]);
  const [adsPeriod, setAdsPeriod] = useState<string>('1-30'); // Default 1-30

  // Kullanıcı Listesi
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Initialize form when clientToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (clientToEdit) {
        setName(clientToEdit.name);
        setStartDate(clientToEdit.startDate);
        setSelectedPackage(clientToEdit.package);
        
        // Map users to IDs
        setSocialUserIds(clientToEdit.socialUsers?.map(u => u.id) || []);
        setDesignerUserIds(clientToEdit.designerUsers?.map(u => u.id) || []);
        setReelsUserIds(clientToEdit.reelsUsers?.map(u => u.id) || []);
        setAdsUserIds(clientToEdit.adsUsers?.map(u => u.id) || []);
        setAdsPeriod(clientToEdit.adsPeriod || '1-30');

        if (clientToEdit.package === 'custom') {
          setCustomQuotas({
            reels: clientToEdit.reelsQuota || 0,
            posts: clientToEdit.postsQuota || 0,
            stories: clientToEdit.storiesQuota || 0
          });
        }
      } else {
        // Reset defaults
        setName('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setSelectedPackage('plus');
        setSocialUserIds([]);
        setDesignerUserIds([]);
        setReelsUserIds([]);
        setAdsUserIds([]);
        setAdsPeriod('1-30');
        setCustomQuotas({ reels: 0, posts: 0, stories: 0 });
      }

      setLoadingUsers(true);
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setUsers(data.users || []))
        .catch(err => console.error('Users load failed', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, clientToEdit]);

  if (!isOpen) return null;

  // Filtrelenmiş Kullanıcı Listeleri
  const socialUsers = users.filter(u => u.capabilities.some(c => c.type === 'social_management'));
  const designerUsers = users.filter(u => u.capabilities.some(c => c.type === 'post')); 
  const reelsUsers = users.filter(u => u.capabilities.some(c => c.type === 'reels'));
  const adsUsers = users.filter(u => u.capabilities.some(c => c.type.startsWith('meta_ads')));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const payload = {
      name: name.trim(),
      logo: clientToEdit?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=64`,
      startDate,
      package: selectedPackage,
      // Yeni Atamalar (Array)
      socialUserIds,
      designerUserIds,
      reelsUserIds,
      adsUserIds,
      adsPeriod: adsUserIds.length > 0 ? adsPeriod : null,
      
      // Custom Quota (Ensure number)
      reelsQuota: selectedPackage === 'custom' ? Number(customQuotas.reels === '' ? 0 : customQuotas.reels) : undefined,
      postsQuota: selectedPackage === 'custom' ? Number(customQuotas.posts === '' ? 0 : customQuotas.posts) : undefined,
      storiesQuota: selectedPackage === 'custom' ? Number(customQuotas.stories === '' ? 0 : customQuotas.stories) : undefined
    };
    
    if (clientToEdit && onUpdate) {
      onUpdate(clientToEdit.id, payload);
    } else if (onAdd) {
      onAdd(payload);
    }
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{clientToEdit ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}</h2>
            <p className="text-xs text-slate-500">Müşteri detaylarını ve sorumlu ekibi belirleyin</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto p-6 pb-64">
          <form id="addClientForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. Müşteri Temel Bilgileri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Logo & Name */}
              <div className="space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      {name ? (
                        <span className="text-xl font-bold text-white">
                          {name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      ) : (
                        <span className="text-xl font-bold text-white/50">?</span>
                      )}
                    </div>
                    <div className="w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Müşteri Adı <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Örn: Nike"
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                 </div>

                 {/* Start Date */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Başlangıç Tarihi
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                 </div>
              </div>

              {/* Package Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Paket Seçimi <span className="text-rose-500">*</span>
                </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(['vitrin', 'plus', 'premium', 'custom'] as PackageType[]).map(pkg => (
                      <button
                        key={pkg}
                        type="button"
                        onClick={() => setSelectedPackage(pkg)}
                        className={`
                          flex items-center justify-between px-4 py-2.5 rounded-lg text-sm border transition-all text-left
                          ${selectedPackage === pkg 
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-medium ring-1 ring-indigo-600' 
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <span>{PACKAGE_LABELS[pkg]}</span>
                        {selectedPackage === pkg && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
                      </button>
                    ))}
                  </div>

                  {/* Custom Quota Inputs */}
                  {selectedPackage === 'custom' && (
                    <div className="grid grid-cols-3 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Reels</label>
                        <input
                          type="number"
                          min="0"
                          value={customQuotas.reels}
                          onChange={e => setCustomQuotas({...customQuotas, reels: e.target.value === '' ? '' : parseInt(e.target.value)})}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Post</label>
                        <input
                          type="number"
                          min="0"
                          value={customQuotas.posts}
                          onChange={e => setCustomQuotas({...customQuotas, posts: e.target.value === '' ? '' : parseInt(e.target.value)})}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Story</label>
                        <input
                          type="number"
                          min="0"
                          value={customQuotas.stories}
                          onChange={e => setCustomQuotas({...customQuotas, stories: e.target.value === '' ? '' : parseInt(e.target.value)})}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-2 px-1">
                    {selectedPackage === 'vitrin' && 'Aylık: 4 Reels, 8 Post, 8 Story'}
                    {selectedPackage === 'plus' && 'Aylık: 6 Reels, 12 Post, 12 Story'}
                    {selectedPackage === 'premium' && 'Aylık: 10 Reels, 20 Post, 20 Story'}
                    {selectedPackage === 'custom' && 'Manuel olarak belirlenen kotalar geçerli olacaktır.'}
                  </p>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* 2. Sorumlu Ekibi Belirle */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User size={16} className="text-indigo-600" />
                Sorumlu Ekip Ataması
              </h3>
              
              {loadingUsers ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Loader2 size={24} className="animate-spin mx-auto text-indigo-500 mb-2" />
                  <p className="text-xs text-slate-500">Personel listesi yükleniyor...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Sosyal Medya Yöneticisi */}
                  <UserMultiSelect 
                    label="Sosyal Medya Yöneticileri"
                    users={socialUsers}
                    selectedIds={socialUserIds}
                    onChange={setSocialUserIds}
                  />

                  {/* Grafik Tasarımcı */}
                  <UserMultiSelect 
                    label="Grafik Tasarımcılar"
                    users={designerUsers}
                    selectedIds={designerUserIds}
                    onChange={setDesignerUserIds}
                  />

                  {/* Reels Uzmanı */}
                  <UserMultiSelect 
                    label="Reels Video Uzmanları"
                    users={reelsUsers}
                    selectedIds={reelsUserIds}
                    onChange={setReelsUserIds}
                  />

                  {/* Meta Reklam Uzmanı */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <UserMultiSelect 
                        label="Meta Reklam Uzmanları"
                        users={adsUsers}
                        selectedIds={adsUserIds}
                        onChange={setAdsUserIds}
                      />
                    </div>
                    {/* Reklam Dönemi (Eğer reklamcı seçildiyse) */}
                    {adsUserIds.length > 0 && (
                       <div className="w-1/3">
                         <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest truncate">
                           Dönem
                         </label>
                         <select
                           value={adsPeriod}
                           onChange={e => setAdsPeriod(e.target.value)}
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-[38px] mt-[1px]"
                         >
                           <option value="1-30">1-30</option>
                           <option value="1-15">1-15</option>
                         </select>
                       </div>
                    )}
                  </div>

                </div>
              )}
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            form="addClientForm"
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
          >
            {clientToEdit ? 'Değişiklikleri Kaydet' : 'Müşteri Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;
