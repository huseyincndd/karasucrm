'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, User, Briefcase, Loader2, Info } from 'lucide-react';
import { Client } from '@/types';

// Servis Tipleri
const SERVICE_TYPES = [
  { value: 'social_media_management', label: 'Sosyal Medya Yönetimi' },
  { value: 'meta_ads', label: 'Meta Reklam Yönetimi' },
  { value: 'consultancy', label: 'Danışmanlık' },
  { value: 'other', label: 'Diğer Hizmet' }
];

interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  avatar: string | null;
  capabilities?: { type: string; price: number }[];
}

interface AddServiceModalProps {
  client: Client;
  staffList: ApiUser[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddServiceModal({ client, staffList, onClose, onSuccess }: AddServiceModalProps) {
  const [serviceType, setServiceType] = useState('social_media_management');
  const [staffId, setStaffId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [days, setDays] = useState(30);
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fiyatı otomatik hesapla
  useEffect(() => {
    if (!staffId || !serviceType) return;

    const staff = staffList.find(s => s.id === staffId);
    if (staff && staff.capabilities) {
      // Yetenek eşleştirmesi
      let capabilityType = '';
      if (serviceType === 'social_media_management') capabilityType = 'social_management';
      else if (serviceType === 'meta_ads') capabilityType = 'ad_management'; // Veya 'meta_ads_30' vs
      else if (serviceType === 'consultancy') capabilityType = 'consultancy';

      // Eğer capabilityType boşsa veya bulunamazsa 'other' veya varsayılan fiyat
      const capability = staff.capabilities.find(c => c.type === capabilityType);
      
      if (capability) {
        setPrice(capability.price);
      } else {
        // Yetenek bulunamazsa 0 veya manuel giriş bekler
        // Belki varsayılan bir fiyat?
      }
    }
  }, [staffId, serviceType, staffList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !startDate || !days || price < 0) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          userId: staffId,
          serviceType,
          startDate, // YYYY-MM-DD
          days: Number(days),
          price: Number(price)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Hizmet oluşturulamadı');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-900">Hizmet Ekle</h3>
            <p className="text-xs text-slate-500">{client.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg flex items-center gap-2">
              <Info size={16} />
              {error}
            </div>
          )}

          {/* Service Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" />
              Hizmet Tipi
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {SERVICE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Staff Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User size={14} className="text-slate-400" />
              Personel
            </label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              required
            >
              <option value="">Seçiniz...</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.name} ({staff.roleTitle})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                Başlangıç
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            {/* Days */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                Süre (Gün)
              </label>
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <DollarSign size={14} className="text-slate-400" />
              Hizmet Bedeli (TL)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₺</div>
            </div>
            <p className="text-xs text-slate-400">
              * Bu tutar personelin cüzdanına anında eklenecektir.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Hizmeti Başlat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
