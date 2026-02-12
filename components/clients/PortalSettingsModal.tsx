'use client';

import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import { X, Globe, Save, Loader2, Key, User, Trash2, AlertTriangle } from 'lucide-react';

interface PortalSettingsModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const PortalSettingsModal: React.FC<PortalSettingsModalProps> = ({ client, isOpen, onClose, onUpdate }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Eğer mevcut bir username varsa doldurabiliriz ama şifre güvenlik nedeniyle boş gelir
      // Client tipinde portalUsername varsa onu kullanalım
      if (client.portalUsername) {
        setUsername(client.portalUsername);
      } else if (client.hasPortalAccess) {
        // Portal erişimi var ama username prop'u henüz gelmediyse (eski client objesi olabilir), 
        // client isminden türetip öneri sunabiliriz
        const suggested = client.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        setUsername(suggested);
      } else {
        // Yeni erişim, öneri sun
        const suggested = client.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        setUsername(suggested);
      }
      setPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, client]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/clients/${client.id}/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Portal ayarları kaydedilemedi');
      }

      setSuccess('Portal erişimi başarıyla ayarlandı');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Müşterinin portal erişimini kaldırmak istediğinize emin misiniz?')) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/clients/${client.id}/portal`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erişim kaldırılamadı');
      }

      setSuccess('Portal erişimi kaldırıldı');
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-indigo-900">
            <Globe size={20} className="text-indigo-600" />
            <h3 className="font-semibold">Portal Erişimi</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-rose-50 text-rose-700 rounded-lg text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
              <Save size={16} />
              {success}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm"
                  placeholder="ornekfirma"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Yeni Şifre
              </label>
               <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" // Görünür şifre olsun ki admin ne verdiğini bilsin
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-mono"
                  placeholder="Şifre belirleyin..."
                  required
                  minLength={6}
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">En az 6 karakter olmalı</p>
            </div>

            <div className="pt-4 flex items-center justify-between gap-3">
              {client.hasPortalAccess && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Erişimi Kaldır
                </button>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all ml-auto
                  ${loading ? 'bg-slate-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20'}
                `}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {client.hasPortalAccess ? 'Bilgileri Güncelle' : 'Erişimi Aç'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PortalSettingsModal;
