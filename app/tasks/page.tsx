'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CheckSquare, 
  Calendar, 
  Video, 
  Image as ImageIcon, 
  Circle,
  Clock,
  CheckCircle2,
  Hourglass,
  ChevronDown,
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  Check,
  Menu,
} from 'lucide-react';
import { 
  TaskStatus,
  ContentType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS
} from '@/constants/staff';

// ===== TİPLER & LOGIC (Mantık Değişmedi) =====

interface ApiTask {
  id: string;
  title: string | null;
  contentType: string;
  date: string;
  status: string;
  clientId: string;
  clientName: string;
  clientLogo: string | null;
  clientPackage?: string;
  staffId: string;
  staffName: string;
  staffAvatar: string | null;
  staffRoleTitle?: string;
  createdAt: string;
}

interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  avatar: string | null;
}

const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case 'beklemede':
      return { 
        label: 'Bekliyor', 
        icon: Clock, 
        color: 'text-slate-500', // Daha minimal
        bg: 'bg-slate-100', // Light surface
        dot: 'bg-slate-400'
      };
    case 'hazir':
      return { 
        label: 'Hazır', 
        icon: Hourglass, 
        color: 'text-amber-500', 
        bg: 'bg-amber-100/50', 
        dot: 'bg-amber-400'
      };
    case 'tamamlandi':
      return { 
        label: 'Tamam', 
        icon: CheckCircle2, 
        color: 'text-emerald-500', 
        bg: 'bg-emerald-100/50', 
        dot: 'bg-emerald-400'
      };
    default:
      return { 
        label: 'Bekliyor', 
        icon: Clock, 
        color: 'text-slate-500',
        bg: 'bg-slate-100',
        dot: 'bg-slate-400'
      };
  }
};

const getContentIcon = (type: ContentType) => {
  switch (type) {
    case 'reels': return Video;
    case 'posts': return ImageIcon;
    case 'stories': return Circle;
    default: return Circle;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${day} ${months[date.getMonth()]}`;
};

const getDaysUntil = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

// ===== YENİ BİLEŞENLER (Mobile-First / Social App Style) =====

// ... (imports remain same)

const SocialTaskCard = ({ task, onStatusChange }: { task: ApiTask, onStatusChange: (id: string, status: TaskStatus) => void }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const statusConfig = getStatusConfig(task.status as TaskStatus);
  const StatusIcon = statusConfig.icon;
  const ContentIcon = getContentIcon(task.contentType as ContentType);
  const contentColors = CONTENT_TYPE_COLORS[task.contentType as ContentType] || CONTENT_TYPE_COLORS.posts;
  const daysUntil = getDaysUntil(task.date);
  const isUrgent = daysUntil <= 1 && task.status === 'beklemede';
  const shouldPublish = daysUntil === 0 && task.status === 'hazir';

  // Click outside to close menu ref
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <div className={`relative mb-3 last:mb-0 transition-all touch-pan-y ${isMenuOpen ? 'z-50' : 'z-0'} ${!isMenuOpen ? 'active:scale-[0.99]' : ''}`}>
      {/* CARD CONTAINER - iOS Style 'Inset Grouped' Look */}
      <div className={`
        bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80
        flex items-stretch gap-4 relative
        ${isUrgent ? 'ring-1 ring-rose-200 bg-rose-50/10' : ''}
        ${shouldPublish ? 'ring-1 ring-indigo-200 bg-indigo-50/10' : ''}
      `}>
         
         {/* LEFT VISUAL (Logo + Type Badge) */}
        <div className="relative flex-shrink-0 self-start">
          {task.clientLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.clientLogo} alt={task.clientName} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-slate-50" />
          ) : (
             <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                {task.clientName.charAt(0)}
             </div>
          )}
          {/* Badge */}
          <div className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${contentColors.bg} shadow-sm z-10`}>
             <ContentIcon size={12} className={contentColors.text} />
          </div>
        </div>

        {/* MIDDLE CONTENT */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-base truncate leading-tight">
               {task.clientName}
            </h4>
            {/* Urgent / Status Tags inline */}
            {isUrgent && <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">ACİL</span>}
            {shouldPublish && <span className="bg-indigo-100 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md animate-pulse">PAYLAŞ</span>}
          </div>

          {/* Subtitle / Title */}
          <div className="text-sm text-slate-500 truncate font-medium">
             {task.title || CONTENT_TYPE_LABELS[task.contentType as ContentType] || 'İçerik'}
          </div>

          {/* Date & Countdown */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
             <Calendar size={11} />
             <span>{formatDate(task.date)}</span>
             {daysUntil >= 0 && daysUntil <= 5 && task.status !== 'tamamlandi' && (
               <>
                 <span className="w-1 h-1 rounded-full bg-slate-300" />
                 <span className={daysUntil <= 1 ? 'text-rose-500 font-bold' : ''}>
                   {daysUntil === 0 ? 'Bugün' : `${daysUntil} gün`}
                 </span>
               </>
             )}
          </div>
        </div>

        {/* RIGHT ACTION BUTTON (Dynamic Pill) */}
        <div className="flex flex-col justify-center relative">
           <button
             onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
             }}
             className={`
               h-9 pl-3 pr-2.5 rounded-full flex items-center gap-1.5 text-xs font-bold transition-all relative z-10
               ${statusConfig.bg} ${statusConfig.color}
               ${!isMenuOpen ? 'active:scale-95' : ''}
             `}
           >
             <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
             <span>{statusConfig.label}</span>
             <ChevronDown size={12} className={`transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
           </button>

           {/* DROPDOWN MENU - Properly Positioned */}
           {isMenuOpen && (
             <div 
               ref={menuRef}
               onMouseDown={(e) => e.stopPropagation()} // Stop visual click-through
               onClick={(e) => e.stopPropagation()}
               className="absolute right-0 top-[calc(100%+8px)] w-48 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-200 origin-top-right"
             >
                {(['beklemede', 'hazir', 'tamamlandi'] as TaskStatus[]).map((s) => {
                  const cfg = getStatusConfig(s);
                  const isActive = task.status === s;
                  return (
                    <button 
                     key={s}
                     onClick={(e) => {
                       e.stopPropagation();
                       onStatusChange(task.id, s);
                       setIsMenuOpen(false);
                     }}
                     className={`
                       w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold border-b border-slate-50 last:border-0 transition-colors cursor-pointer
                       ${isActive ? 'bg-slate-50 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}
                     `}
                    >
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                      {isActive && <Check size={14} className="ml-auto text-slate-900" />}
                    </button>
                  )
                })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

// ===== MAIN PAGE =====

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [staff, setStaff] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch Logic (Same as before)
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (selectedStaff !== 'all' && isAdmin) params.append('staffId', selectedStaff);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      params.append('startDate', fiveDaysAgo.toISOString().split('T')[0]);
      const res = await fetch(`/api/tasks${params.toString() ? '?' + params.toString() : ''}`);
      if (!res.ok) throw new Error('Görevler yüklenemedi');
      const data = await res.json();
      const todayStr = new Date().toISOString().split('T')[0];
      const filteredResult = data.tasks.filter((t: ApiTask) => {
        if (selectedStatus === 'tamamlandi') return true;
        if (t.date >= todayStr) return true;
        return t.status !== 'tamamlandi';
      });
      setTasks(filteredResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [selectedStaff, selectedStatus, isAdmin]);

  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.users);
      }
    } catch (err) {
      console.error('Staff fetch error:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
      fetchStaff();
    }
  }, [authLoading, user, fetchTasks, fetchStaff]);

  // Derived Values
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedStatus !== 'all') {
      result = result.filter(t => t.status === selectedStatus);
    }
    return result;
  }, [tasks, selectedStatus]);

  const tasksByStaff = useMemo(() => {
    const grouped: Record<string, { staff: { id: string; name: string; avatar: string | null; roleTitle: string }; tasks: ApiTask[] }> = {};
    filteredTasks.forEach(task => {
      if (!grouped[task.staffId]) {
        grouped[task.staffId] = {
          staff: {
            id: task.staffId,
            name: task.staffName,
            avatar: task.staffAvatar,
            roleTitle: task.staffRoleTitle || '',
          },
          tasks: []
        };
      }
      grouped[task.staffId].tasks.push(task);
    });
    return grouped;
  }, [filteredTasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const beklemede = tasks.filter(t => t.status === 'beklemede').length;
    const hazir = tasks.filter(t => t.status === 'hazir').length;
    const tamamlandi = tasks.filter(t => t.status === 'tamamlandi').length;
    const urgent = tasks.filter(t => getDaysUntil(t.date) <= 1 && t.status === 'beklemede').length;
    const paylasim = tasks.filter(t => getDaysUntil(t.date) === 0 && t.status === 'hazir').length;
    return { total, beklemede, hazir, tamamlandi, urgent, paylasim };
  }, [tasks]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Durum güncellenemedi');
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  // Loading State
  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-50">
        <Sidebar isOpen={false} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Filter Chips Helper
  const FilterChip = ({ label, active, onClick, count }: { label: string, active: boolean, onClick: () => void, count?: number }) => (
    <button 
      onClick={onClick}
      className={`
        relative px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 flex-shrink-0
        ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'}
      `}
    >
      {label}
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        
        {/* === MOBILE-FIRST HEADER === */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-20">
          <div className="max-w-3xl mx-auto w-full">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl active:scale-95 transition-transform"
                >
                  <Menu size={22} />
                </button>
                <div className="flex flex-col">
                   <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                     {isAdmin ? 'Ekip Görevleri' : 'Görevlerim'}
                   </h1>
                   <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
                     {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                   </span>
                </div>
              </div>
              
              <button 
                 onClick={fetchTasks}
                 className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors active:scale-95"
              >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Scrollable Filters (Instagram-style) */}
            <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 no-scrollbar mask-gradient-right">
              {/* Status Filters */}
              <FilterChip 
                label="Tümü" 
                active={selectedStatus === 'all'} 
                onClick={() => setSelectedStatus('all')} 
                count={tasks.length}
              />
              <FilterChip 
                label="Bekleyen" 
                active={selectedStatus === 'beklemede'} 
                onClick={() => setSelectedStatus('beklemede')} 
                count={stats.beklemede}
              />
               <FilterChip 
                label="Hazır" 
                active={selectedStatus === 'hazir'} 
                onClick={() => setSelectedStatus('hazir')} 
                count={stats.hazir}
              />
              <FilterChip 
                label="Acil" 
                active={false} // Just a quick jump filter conceptually, but for now purely visual or could select status
                onClick={() => { /* Filter logic if needed */ }}
                count={stats.urgent}
              />
              
              {/* Staff Filter (Admin) - Integrated into scroll */}
              {isAdmin && (
                <>
                  <div className="w-px h-6 bg-slate-200 mx-1 flex-shrink-0" />
                  <select 
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-500 focus:outline-none flex-shrink-0 cursor-pointer"
                  >
                    <option value="all">Tüm Ekip</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </>
              )}
            </div>
           </div>
        </header>

        {/* === SCROLLABLE CONTENT === */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-[#FAFAFA]">
          <div className="max-w-3xl mx-auto w-full px-4 pt-4 pb-24">
            
            {/* Alert Banner (If Urgent tasks exist) */}
            {(stats.urgent > 0 || stats.paylasim > 0) && (
               <div className="mb-6 grid grid-cols-2 gap-3">
                  {stats.urgent > 0 && (
                    <div className="bg-rose-500 rounded-2xl p-3 text-white shadow-lg shadow-rose-500/20 flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-2xl font-black leading-none">{stats.urgent}</span>
                          <span className="text-[10px] font-bold opacity-80 uppercase">Geciken / Acil</span>
                       </div>
                       <AlertTriangle size={24} className="opacity-50" />
                    </div>
                  )}
                  {stats.paylasim > 0 && (
                    <div className="bg-indigo-500 rounded-2xl p-3 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-between">
                       <div className="flex flex-col">
                          <span className="text-2xl font-black leading-none">{stats.paylasim}</span>
                          <span className="text-[10px] font-bold opacity-80 uppercase">Paylaşılacak</span>
                       </div>
                       <Send size={24} className="opacity-50" />
                    </div>
                  )}
               </div>
            )}

            {/* Loading / Empty / List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-wide">Yükleniyor...</p>
              </div>
            ) : Object.keys(tasksByStaff).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <CheckSquare size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Hiç Görev Yok</h3>
                <p className="text-sm text-slate-500">Şu an için listeniz bomboş!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.values(tasksByStaff).map(({ staff: staffInfo, tasks: staffTasks }) => (
                  <div key={staffInfo.id}>
                    {/* Staff Section Title */}
                    <div className="flex items-center gap-3 mb-3 px-1">
                       {staffInfo.avatar ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={staffInfo.avatar} className="w-8 h-8 rounded-full border border-white shadow-sm object-cover" alt="" />
                       ) : (
                         <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                            {staffInfo.name.charAt(0)}
                         </div>
                       )}
                       <h3 className="text-sm font-bold text-slate-800">{staffInfo.name}</h3>
                       <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                          {staffTasks.length}
                       </span>
                    </div>

                    {/* Tasks List */}
                    <div className="flex flex-col gap-3">
                      {staffTasks
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((task) => (
                          <SocialTaskCard key={task.id} task={task} onStatusChange={handleStatusChange} />
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Bottom Safe Area Spacer */}
            <div className="h-12" />
          </div>
        </div>
      </main>
    </div>
  );
}
