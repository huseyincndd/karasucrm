'use client';

import React, { useState, useEffect } from 'react';
import { PackageType, PACKAGE_LABELS } from '@/types';
import { X, User, Loader2, Calendar } from 'lucide-react';

interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  capabilities: { type: string }[];
}

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('plus');
  const [customQuotas, setCustomQuotas] = useState<{reels: number | string, posts: number | string, stories: number | string}>({ reels: 0, posts: 0, stories: 0 });

  // Sorumlu Kişiler State'i
  const [socialUserId, setSocialUserId] = useState<string>('');
  const [designerUserId, setDesignerUserId] = useState<string>('');
  const [reelsUserId, setReelsUserId] = useState<string>('');
  const [adsUserId, setAdsUserId] = useState<string>('');
  const [adsPeriod, setAdsPeriod] = useState<string>('1-30'); // Default 1-30

  // Kullanıcı Listesi
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Kullanıcıları yükle
  useEffect(() => {
    if (isOpen) {
      setLoadingUsers(true);
      fetch('/api/users')
        .then(res => res.json())
        .then(data => setUsers(data.users || []))
        .catch(err => console.error('Users load failed', err))
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrelenmiş Kullanıcı Listeleri
  const socialUsers = users.filter(u => u.capabilities.some(c => c.type === 'social_management'));
  const designerUsers = users.filter(u => u.capabilities.some(c => c.type === 'post')); // 'graphic' yerine 'post' kullanılıyor
  const reelsUsers = users.filter(u => u.capabilities.some(c => c.type === 'reels'));
  const adsUsers = users.filter(u => u.capabilities.some(c => c.type.startsWith('meta_ads')));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    onAdd({
      name: name.trim(),
      logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=64`,
      startDate,
      package: selectedPackage,
      // Yeni Atamalar
      socialUserId: socialUserId || null,
      designerUserId: designerUserId || null,
      reelsUserId: reelsUserId || null,
      adsUserId: adsUserId || null,
      adsPeriod: adsUserId ? adsPeriod : null,
      
      // Custom Quota (Ensure number)
      reelsQuota: selectedPackage === 'custom' ? Number(customQuotas.reels === '' ? 0 : customQuotas.reels) : undefined,
      postsQuota: selectedPackage === 'custom' ? Number(customQuotas.posts === '' ? 0 : customQuotas.posts) : undefined,
      storiesQuota: selectedPackage === 'custom' ? Number(customQuotas.stories === '' ? 0 : customQuotas.stories) : undefined
    });
    
    // Reset Form
    setName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setSelectedPackage('plus');
    setSocialUserId('');
    setDesignerUserId('');
    setReelsUserId('');
    setAdsUserId('');
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
            <h2 className="text-lg font-semibold text-slate-900">Yeni Müşteri Ekle</h2>
            <p className="text-xs text-slate-500">Müşteri detaylarını ve sorumlu ekibi belirleyin</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="overflow-y-auto p-6">
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
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest">
                      Sosyal Medya Yöneticisi
                    </label>
                    <select
                      value={socialUserId}
                      onChange={e => setSocialUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seçiniz...</option>
                      {socialUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Grafik Tasarımcı */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest">
                      Grafik Tasarımcı
                    </label>
                    <select
                      value={designerUserId}
                      onChange={e => setDesignerUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seçiniz...</option>
                      {designerUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reels Uzmanı */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest">
                      Reels Video Uzmanı
                    </label>
                    <select
                      value={reelsUserId}
                      onChange={e => setReelsUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Seçiniz...</option>
                      {reelsUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Meta Reklam Uzmanı */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest">
                        Meta Reklam Uzmanı
                      </label>
                      <select
                        value={adsUserId}
                        onChange={e => setAdsUserId(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Seçiniz...</option>
                        {adsUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>
                    {/* Reklam Dönemi (Eğer reklamcı seçildiyse) */}
                    {adsUserId && (
                       <div className="w-1/3">
                         <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-in-widest truncate">
                           Dönem
                         </label>
                         <select
                           value={adsPeriod}
                           onChange={e => setAdsPeriod(e.target.value)}
                           className="w-full px-2 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            Müşteri Ekle
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddClientModal;
