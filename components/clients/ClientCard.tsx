'use client';

import React from 'react';
import { Client, PACKAGE_LABELS, PACKAGE_QUOTAS } from '@/types';
import { Video, Image as ImageIcon, Circle, AlertTriangle, Globe, Calendar, ChevronRight } from 'lucide-react';

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
  const targetQuota = {
    reels: client.reelsQuota ?? defaultQuota.reels,
    posts: client.postsQuota ?? defaultQuota.posts,
    stories: client.storiesQuota ?? defaultQuota.stories
  };
  
  // Assigned Staff (if available)
  const assignedStaff = [
    client.socialUser,
    client.designerUser,
    client.reelsUser,
    client.adsUser
  ].filter(Boolean);

  // Helper for progress bar with detailed stats
  const renderQuotaItem = (
    type: 'reels' | 'posts' | 'stories', 
    icon: React.ReactNode, 
    colorClass: string, 
    bgClass: string,
    target: number,
    used: number,
    completed: number
  ) => {
    const validTarget = target || 1; 
    const plannedCount = Math.max(0, used - completed);
    // const remaining = Math.max(0, validTarget - used); unused

    // Progress calculations
    const completedPercent = Math.min((completed / validTarget) * 100, 100);
    // Planned percent should occupy space after completed, but not exceed 100% total
    const plannedPercent = Math.min((plannedCount / validTarget) * 100, 100 - completedPercent);
    const remainingPercent = Math.max(0, 100 - completedPercent - plannedPercent);

    return (
      <div className="group/item">
        <div className="flex items-center justify-between text-[10px] mb-1.5 font-medium">
           <div className="flex items-center gap-1.5">
              <span className={`${colorClass}`}>{icon}</span>
              <span className="text-slate-600 capitalize tracking-tight font-bold">
                {type === 'posts' ? 'Post' : type === 'stories' ? 'Story' : 'Reels'}
              </span>
           </div>
           
           <div className="flex items-center gap-1.5 tabular-nums">
              <span className="text-emerald-600" title="Tamamlanan">{completed}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-400" title="Planlanan">{plannedCount}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-500 font-bold" title="Hedef Kota">{validTarget}</span>
           </div>
        </div>
        
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex relative">
           {/* Completed Segment (Dolu / Renkli) */}
           <div 
             className={`h-full ${colorClass.replace('text-', 'bg-')} transition-all duration-500 ease-out`}
             style={{ width: `${completedPercent}%` }}
           />
           {/* Planned Segment (Hafif Renkli / Desatüre) */}
           <div 
             className={`h-full ${bgClass.replace('bg-', 'bg-').replace('-50', '-200')} transition-all duration-500 ease-out`}
             style={{ width: `${plannedPercent}%` }}
           />
        </div>
        
        {/* Hover Tooltip */}
        <div className="mt-1 flex justify-between text-[9px] text-slate-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
           <span>{completed > 0 && `${completed} tamam`}</span>
           <span>{plannedCount > 0 && `${plannedCount} planlı`}</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className={`
        group relative overflow-hidden bg-white rounded-2xl p-5 cursor-pointer transition-all duration-300
        hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 border border-transparent
        ${isUrgent ? 'ring-2 ring-rose-100' : 'hover:border-slate-100'}
      `}
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full opacity-50 transition-opacity group-hover:opacity-100" />
      
      {/* Header Section */}
      <div className="relative flex items-start gap-4 mb-5">
        <div className="relative flex-shrink-0">
          {client.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={client.logo} 
              alt={client.name}
              className="w-14 h-14 rounded-xl object-cover shadow-sm ring-2 ring-slate-50 group-hover:ring-slate-100 transition-all"
            />
          ) : (
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-sm bg-gradient-to-br ${
               client.package === 'premium' ? 'from-purple-500 to-indigo-600' :
               client.package === 'plus' ? 'from-blue-500 to-cyan-600' :
               'from-slate-500 to-slate-600'
            }`}>
              {client.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          
          {isUrgent && (
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-bold text-slate-900 text-lg truncate leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
            {client.name}
          </h3>
          
          <div className="flex flex-wrap gap-1.5 items-center">
             <span className={`
               inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide
               ${client.package === 'premium' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                 client.package === 'plus' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                 'bg-slate-50 text-slate-500 border border-slate-100'}
             `}>
               {PACKAGE_LABELS[client.package]}
             </span>

             {client.hasPortalAccess && (
               <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                 <Globe size={10} />
                 Portal
               </span>
             )}
          </div>
        </div>
        
        <ChevronRight className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all -mr-2" size={20} />
      </div>

      {/* Quota Section */}
      <div className="space-y-4 mb-5">
        {renderQuotaItem(
           'reels', 
           <Video size={12} />, 
           'text-rose-500', 
           'bg-rose-50', 
           targetQuota.reels, 
           client.usedQuota.reels, 
           client.usedQuota.reelsCompleted || 0
        )}
        {renderQuotaItem(
           'posts', 
           <ImageIcon size={12} />, 
           'text-blue-500', 
           'bg-blue-50', 
           targetQuota.posts, 
           client.usedQuota.posts, 
           client.usedQuota.postsCompleted || 0
        )}
        {renderQuotaItem(
           'stories', 
           <Circle size={12} />, 
           'text-purple-500', 
           'bg-purple-50', 
           targetQuota.stories, 
           client.usedQuota.stories, 
           client.usedQuota.storiesCompleted || 0
        )}
      </div>

      {/* Footer Info: Renewal Date & Staff */}
      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
         <div className={`flex items-center gap-1.5 text-xs font-medium ${isUrgent ? 'text-rose-600' : 'text-slate-400'}`}>
            <Calendar size={12} />
            <span>
               {daysLeft <= 0 ? (
                  <span className="font-bold">Süre doldu!</span>
               ) : (
                  <span><strong className="text-slate-700">{daysLeft} gün</strong> kaldı</span>
               )}
            </span>
         </div>

         {assignedStaff.length > 0 && (
            <div className="flex -space-x-1.5">
               {assignedStaff.slice(0, 3).map((s, i) => (
                  <div key={i} className="w-6 h-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center overflow-hidden" title={s?.name}>
                     {s?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar} alt="" className="w-full h-full object-cover" />
                     ) : (
                        <span className="text-[8px] font-bold text-slate-500">{s?.name?.charAt(0)}</span>
                     )}
                  </div>
               ))}
               {assignedStaff.length > 3 && (
                  <div className="w-6 h-6 rounded-full ring-2 ring-white bg-slate-50 flex items-center justify-center text-[8px] font-bold text-slate-500">
                     +{assignedStaff.length - 3}
                  </div>
               )}
            </div>
         )}
      </div>
    </div>
  );
};

export default ClientCard;
