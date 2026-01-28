'use client';

import React from 'react';
import { Client, PACKAGE_LABELS, PACKAGE_QUOTAS } from '@/types';
import { Video, Image as ImageIcon, Circle, AlertTriangle } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

const SIMULATED_TODAY = new Date(2026, 0, 27);

const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  // Calculate days until renewal
  const renewalDate = new Date(client.renewalDate);
  const daysLeft = Math.ceil((renewalDate.getTime() - SIMULATED_TODAY.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3;
  
  const quota = PACKAGE_QUOTAS[client.package];
  
  // Calculate usage percentages
  const reelsUsed = client.usedQuota.reels;
  const postsUsed = client.usedQuota.posts;
  const storiesUsed = client.usedQuota.stories;

  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-xl border-2 p-4 cursor-pointer transition-all duration-200
        hover:shadow-lg hover:-translate-y-0.5
        ${isUrgent ? 'border-rose-300 shadow-rose-100' : 'border-slate-200 hover:border-slate-300'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={client.logo} 
          alt={client.name}
          className="w-12 h-12 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
          <span className={`
            inline-block text-[10px] font-medium px-2 py-0.5 rounded mt-1
            ${client.package === 'premium' ? 'bg-purple-100 text-purple-700' :
              client.package === 'plus' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'}
          `}>
            {PACKAGE_LABELS[client.package]}
          </span>
        </div>
      </div>

      {/* Renewal Alert */}
      <div className={`
        flex items-center gap-2 px-3 py-2 rounded-lg mb-4 text-sm
        ${isUrgent 
          ? 'bg-rose-50 text-rose-700 animate-pulse' 
          : 'bg-slate-50 text-slate-600'}
      `}>
        {isUrgent && <AlertTriangle size={14} className="text-rose-500" />}
        <span className="font-medium">
          {daysLeft <= 0 
            ? 'Süre doldu!' 
            : `${daysLeft} gün kaldı`}
        </span>
        <span className="text-xs opacity-70">yenilemeye</span>
      </div>

      {/* Quota Overview */}
      <div className="space-y-2">
        {/* Reels */}
        <div className="flex items-center gap-2">
          <Video size={12} className="text-rose-500" />
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-rose-500 rounded-full transition-all"
              style={{ width: `${(reelsUsed / quota.reels) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 min-w-[32px] text-right">
            {reelsUsed}/{quota.reels}
          </span>
        </div>

        {/* Posts */}
        <div className="flex items-center gap-2">
          <ImageIcon size={12} className="text-blue-500" />
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(postsUsed / quota.posts) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 min-w-[32px] text-right">
            {postsUsed}/{quota.posts}
          </span>
        </div>

        {/* Stories */}
        <div className="flex items-center gap-2">
          <Circle size={12} className="text-purple-500" />
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${(storiesUsed / quota.stories) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 min-w-[32px] text-right">
            {storiesUsed}/{quota.stories}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
