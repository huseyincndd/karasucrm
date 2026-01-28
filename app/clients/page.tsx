'use client';

import React, { useState } from 'react';
import { Client, PackageType, PACKAGE_QUOTAS } from '@/types';
import { MOCK_CLIENTS } from '@/constants/clients';
import ClientCard from '@/components/clients/ClientCard';
import ClientPlanner from '@/components/clients/ClientPlanner';
import AddClientModal from '@/components/clients/AddClientModal';
import Sidebar from '@/components/Sidebar';
import { Plus, Users, AlertTriangle } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Calculate urgent clients count
  const SIMULATED_TODAY = new Date(2026, 0, 27);
  const urgentCount = clients.filter(c => {
    const renewalDate = new Date(c.renewalDate);
    const daysLeft = Math.ceil((renewalDate.getTime() - SIMULATED_TODAY.getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  }).length;

  const handleClientUpdate = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
  };

  const handleAddClient = (data: { name: string; logo: string; startDate: string; package: PackageType }) => {
    const renewalDate = new Date(data.startDate);
    renewalDate.setMonth(renewalDate.getMonth() + 1);
    
    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: data.name,
      logo: data.logo,
      package: data.package,
      startDate: data.startDate,
      renewalDate: renewalDate.toISOString().split('T')[0],
      usedQuota: { reels: 0, posts: 0, stories: 0 },
      plannedDates: { reels: [], posts: [], stories: [] }
    };
    
    setClients(prev => [...prev, newClient]);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-slate-400" />
              <h1 className="text-xl font-semibold text-slate-900">Müşteriler</h1>
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
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} />
            Yeni Müşteri
          </button>
        </div>

        {/* Client Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {clients.map(client => (
              <ClientCard 
                key={client.id}
                client={client}
                onClick={() => setSelectedClient(client)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Client Planner Modal */}
      {selectedClient && (
        <ClientPlanner 
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onUpdate={handleClientUpdate}
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
