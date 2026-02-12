'use client';

import React from 'react';
import { Client, PACKAGE_LABELS, PACKAGE_QUOTAS } from '@/types';
import { Video, Image as ImageIcon, Circle, AlertTriangle, Globe } from 'lucide-react';

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onClick }) => {
  // Calculate days until renewal
  const renewalDate = new Date(client.renewalDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3;
  
  const defaultQuota = PACKAGE_QUOTAS[client.package] || PACKAGE_QUOTAS.vitrin;
  const quota = {
    reels: client.reelsQuota ?? defaultQuota.reels,
    posts: client.postsQuota ?? defaultQuota.posts,
    stories: client.storiesQuota ?? defaultQuota.stories
  };
  
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
        {client.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={client.logo} 
            alt={client.name}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
            {client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
        )}
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
          {client.hasPortalAccess && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 ml-1 bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Globe size={9} />
              Portal
            </span>
          )}
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
        {/* Helper function logic inline for cleaner code */}
        {[
          { 
            type: 'reels', 
            icon: <Video size={12} className="text-rose-500" />, 
            used: reelsUsed, 
            completed: client.usedQuota.reelsCompleted || 0,
            total: quota.reels,
            color: 'bg-rose-500',
            lightColor: 'bg-rose-200'
          },
          { 
            type: 'posts', 
            icon: <ImageIcon size={12} className="text-blue-500" />, 
            used: postsUsed, 
            completed: client.usedQuota.postsCompleted || 0,
            total: quota.posts,
            color: 'bg-blue-500',
            lightColor: 'bg-blue-200'
          },
          { 
            type: 'stories', 
            icon: <Circle size={12} className="text-purple-500" />, 
            used: storiesUsed, 
            completed: client.usedQuota.storiesCompleted || 0,
            total: quota.stories,
            color: 'bg-purple-500',
            lightColor: 'bg-purple-200'
          }
        ].map((item, idx) => {
          const completedPercent = Math.min((item.completed / item.total) * 100, 100);
          const onlyPlannedCount = Math.max(0, item.used - item.completed);
          const onlyPlannedPercent = Math.min((onlyPlannedCount / item.total) * 100, 100 - completedPercent);
          
          return (
            <div key={idx} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between text-[10px] mb-1">
                 <div className="flex items-center gap-1.5">
                    {item.icon}
                    <span className="text-slate-600 font-medium capitalize">{item.type === 'posts' ? 'Post' : item.type === 'stories' ? 'Story' : 'Reels'}</span>
                 </div>
                 <div className="flex items-center gap-1.5 font-medium">
                    <span className="text-emerald-600" title="Tamamlanan">{item.completed}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-600" title="Planlanan (Bekleyen)">{onlyPlannedCount}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-400" title="Toplam Kota">{item.total}</span>
                 </div>
              </div>
              
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex w-full">
                <div 
                  className={`h-full ${item.color} transition-all`}
                  style={{ width: `${completedPercent}%` }}
                />
                <div 
                  className={`h-full ${item.lightColor} transition-all`}
                  style={{ width: `${onlyPlannedPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientCard;
