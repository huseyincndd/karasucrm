'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Client, PackageType } from '@/types';
import ClientCard from '@/components/clients/ClientCard';
import ClientPlanner from '@/components/clients/ClientPlanner';
import AddClientModal from '@/components/clients/AddClientModal';
import Sidebar from '@/components/Sidebar';
import { Plus, Users, AlertTriangle, Loader2, RefreshCw, Menu } from 'lucide-react';
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
  createdAt: string;
}

const mapApiClientToClient = (apiClient: ApiClient): Client => ({
  id: apiClient.id,
  name: apiClient.name,
  logo: apiClient.logo || undefined,
  package: apiClient.packageType as PackageType,
  startDate: apiClient.startDate,
  renewalDate: apiClient.renewalDate,
  usedQuota: apiClient.usedQuota,
  plannedDates: apiClient.plannedDates
});

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

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

  // Sayfa yüklendiğinde müşterileri çek
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Calculate urgent clients count
  const urgentCount = clients.filter(c => {
    const renewalDate = new Date(c.renewalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  }).length;

  // Müşteri güncelleme (ClientPlanner'dan)
  const handleClientUpdate = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  // Yeni müşteri ekle
  const handleAddClient = async (data: { name: string; logo: string; startDate: string; package: PackageType }) => {
    try {
      setSaving(true);
      
      const renewalDate = new Date(data.startDate);
      renewalDate.setMonth(renewalDate.getMonth() + 1);
      
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          logo: data.logo || null,
          packageType: data.package,
          startDate: data.startDate,
          renewalDate: renewalDate.toISOString().split('T')[0]
        })
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
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-auto md:h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 md:py-0 gap-4 md:gap-0 flex-shrink-0">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                <Users size={20} className="text-slate-400" />
                <h1 className="text-xl font-semibold text-slate-900">Müşteriler</h1>
              </div>
            </div>
            <span className="text-sm text-slate-400">
              {clients.length} müşteri
            </span>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-full animate-pulse">
                <AlertTriangle size={12} />
                {urgentCount} acil yenileme
              </span>
            )}
            
            {/* Refresh button */}
            <button
              onClick={fetchClients}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Yenile"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Add button - sadece admin */}
          {isAdmin && (
            <button 
              onClick={() => setShowAddModal(true)}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
              Yeni Müşteri
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle size={20} />
              <span>{error}</span>
              <button onClick={fetchClients} className="ml-auto text-sm underline">Tekrar Dene</button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Müşteriler yükleniyor...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Client Grid */}
              {clients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {clients.map(client => (
                    <ClientCard 
                      key={client.id}
                      client={client}
                      onClick={() => setSelectedClient(client)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Users size={48} className="text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz müşteri yok</h3>
                  <p className="text-sm text-slate-500 mb-4">İlk müşterinizi ekleyerek başlayın</p>
                  {isAdmin && (
                    <button 
                      onClick={() => setShowAddModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={16} />
                      Yeni Müşteri Ekle
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
