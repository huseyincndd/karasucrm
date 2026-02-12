'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Filter,
  Users,
  AlertTriangle,
  Send,
  Loader2,
  RefreshCw,
  Check,
  Menu // Added Menu icon for mobile toggle
} from 'lucide-react';
import { 
  TaskStatus,
  ContentType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  DEPARTMENT_LABELS
} from '@/constants/staff';

// ===== GÖREVLER SAYFASI =====
// Admin: Tüm ekip üyelerinin görevlerini görür ve filtreleyebilir
// Normal kullanıcı: Sadece kendi görevlerini görür

// API'den gelen task tipi
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

// API'den gelen user tipi (staff olarak kullanılacak)
interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  avatar: string | null;
}

// Status configuration matching calendar page
const getStatusConfig = (status: TaskStatus) => {
  switch (status) {
    case 'beklemede':
      return { 
        label: 'Beklemede', 
        icon: Clock, 
        bg: 'bg-slate-50', 
        text: 'text-slate-600',
        border: 'border-slate-200'
      };
    case 'hazir':
      return { 
        label: 'Hazır', 
        icon: Hourglass, 
        bg: 'bg-amber-50', 
        text: 'text-amber-600',
        border: 'border-amber-200'
      };
    case 'tamamlandi':
      return { 
        label: 'Tamamlandı', 
        icon: CheckCircle2, 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-600',
        border: 'border-emerald-200'
      };
    default:
      return { 
        label: 'Beklemede', 
        icon: Clock, 
        bg: 'bg-slate-50', 
        text: 'text-slate-600',
        border: 'border-slate-200'
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
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${day} ${months[date.getMonth()]}`;
};

const getDaysUntil = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  // Reset time part for accurate day calculation
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  
  const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  // State
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [staff, setStaff] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params
      const params = new URLSearchParams();
      if (selectedStaff !== 'all' && isAdmin) {
        params.append('staffId', selectedStaff);
      }
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus);
      }
      
      // Active View Logic: Start from 5 days ago to capture recent pending tasks
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      params.append('startDate', fiveDaysAgo.toISOString().split('T')[0]);
      
      const url = `/api/tasks${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Görevler yüklenemedi');
      }
      
      const data = await res.json();
      
      // Client-side filtering: Hide past completed tasks unless specifically filtered
      const todayStr = new Date().toISOString().split('T')[0];
      const filteredResult = data.tasks.filter((t: ApiTask) => {
        // If user explicitly asks for 'tamamlandi', show them (within the 5-day range)
        if (selectedStatus === 'tamamlandi') return true;
        
        // Future & Today always show
        if (t.date >= todayStr) return true;
        
        // Past tasks: Hide if completed (Archived)
        return t.status !== 'tamamlandi';
      });

      setTasks(filteredResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [selectedStaff, selectedStatus, isAdmin]);

  // Fetch staff (for filter dropdown)
  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return; // Non-admins don't need staff list
    
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

  // Initial data fetch
  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
      fetchStaff();
    }
  }, [authLoading, user, fetchTasks, fetchStaff]);

  // Filter assignments based on user role (already filtered by API for non-admins)
  const filteredTasks = useMemo(() => {
    // API already filters for non-admins, but we need local filtering for admins
    let result = tasks;
    
    // Apply local filters if needed (for real-time UI updates)
    if (selectedStatus !== 'all') {
      result = result.filter(t => t.status === selectedStatus);
    }
    
    return result;
  }, [tasks, selectedStatus]);

  // Group tasks by staff member
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

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const beklemede = tasks.filter(t => t.status === 'beklemede').length;
    const hazir = tasks.filter(t => t.status === 'hazir').length;
    const tamamlandi = tasks.filter(t => t.status === 'tamamlandi').length;
    const urgent = tasks.filter(t => getDaysUntil(t.date) <= 1 && t.status === 'beklemede').length;
    const paylasim = tasks.filter(t => getDaysUntil(t.date) === 0 && t.status === 'hazir').length;
    
    return { total, beklemede, hazir, tamamlandi, urgent, paylasim };
  }, [tasks]);

  // Update task status
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Durum güncellenemedi');
      }

      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Bir hata oluştu');
    }
  };

  const StaffCard = ({ staffInfo, staffTasks }: { staffInfo: { id: string; name: string; avatar: string | null; roleTitle: string }; staffTasks: ApiTask[] }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const tamamlandiCount = staffTasks.filter(t => t.status === 'tamamlandi').length;
    const beklemedeCount = staffTasks.filter(t => t.status === 'beklemede').length;
    const urgentCount = staffTasks.filter(t => getDaysUntil(t.date) <= 1 && t.status === 'beklemede').length;
    const paylasimCount = staffTasks.filter(t => getDaysUntil(t.date) === 0 && t.status === 'hazir').length;

    if (staffTasks.length === 0 && selectedStaff === 'all') return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
        {/* Staff Header */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-t-xl"
        >
          <div className="flex items-center gap-3">
            {staffInfo.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={staffInfo.avatar} 
                alt={staffInfo.name}
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm border-2 border-white">
                {staffInfo.name.charAt(0)}
              </div>
            )}
            <div className="text-left w-full sm:w-auto">
              <h3 className="font-semibold text-slate-900">{staffInfo.name}</h3>
              <p className="text-xs text-slate-500">
                {staffInfo.roleTitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-2 sm:mt-0 ml-auto sm:ml-0">
            {/* Task Stats */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {paylasimCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full animate-pulse">
                  <Send size={12} />
                  {paylasimCount} Paylaş
                </span>
              )}
              {urgentCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-full">
                  <AlertTriangle size={12} />
                  {urgentCount} Acil
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                {beklemedeCount} Bekliyor
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
                {tamamlandiCount}/{staffTasks.length}
              </span>
            </div>
            
            <ChevronDown 
              size={20} 
              className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* Tasks List */}
        {isExpanded && (
          <div className="border-t border-slate-100">
            {staffTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm rounded-b-xl">
                Bu kullanıcıya atanmış görev yok
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staffTasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((task, index) => {
                  const statusConfig = getStatusConfig(task.status as TaskStatus);
                  const StatusIcon = statusConfig.icon;
                  const ContentIcon = getContentIcon(task.contentType as ContentType);
                  const contentColors = CONTENT_TYPE_COLORS[task.contentType as ContentType] || CONTENT_TYPE_COLORS.posts;
                  const daysUntil = getDaysUntil(task.date);
                  const isUrgent = daysUntil <= 1 && task.status === 'beklemede';
                  const shouldPublish = daysUntil === 0 && task.status === 'hazir';
                  
                  return (
                    <div 
                      key={task.id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 hover:bg-slate-50 transition-colors last:rounded-b-xl ${isUrgent ? 'bg-rose-50/50' : ''} ${shouldPublish ? 'bg-indigo-50/50' : ''}`}
                    >
                      {/* Client Logo */}
                      {task.clientLogo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={task.clientLogo} 
                          alt={task.clientName}
                          className="w-10 h-10 rounded-lg shadow-sm object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {task.clientName.charAt(0)}
                        </div>
                      )}
                      
                      {/* Task Info */}
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{task.clientName}</span>
                          {shouldPublish && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-medium rounded animate-pulse">
                              <Send size={10} />
                              PAYLAŞ
                            </span>
                          )}
                          {isUrgent && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs font-medium rounded">
                              <AlertTriangle size={10} />
                              ACİL
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`flex items-center gap-1 text-xs ${contentColors.text}`}>
                            <ContentIcon size={12} />
                            {CONTENT_TYPE_LABELS[task.contentType as ContentType] || task.contentType}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(task.date)}
                          </span>
                          {daysUntil >= 0 && task.status !== 'tamamlandi' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className={`text-xs ${daysUntil <= 1 && task.status === 'beklemede' ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                                {daysUntil === 0 ? 'Bugün' : `${daysUntil} gün`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdownId(activeDropdownId === task.id ? null : task.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:scale-105 ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                        >
                          <StatusIcon size={14} />
                          {statusConfig.label}
                          <ChevronDown size={14} className="opacity-50" />
                        </button>

                        {activeDropdownId === task.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveDropdownId(null)} 
                            />
                            <div className={`absolute left-0 sm:left-auto sm:right-0 w-36 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 animate-in fade-in zoom-in duration-100 ${index >= staffTasks.length - 2 ? 'bottom-full mb-1 origin-bottom-left sm:origin-bottom-right' : 'top-full mt-1 origin-top-left sm:origin-top-right'}`}>
                              {(['beklemede', 'hazir', 'tamamlandi'] as TaskStatus[]).map((status) => {
                                const optConfig = getStatusConfig(status);
                                const OptIcon = optConfig.icon;
                                const isSelected = task.status === status;
                                
                                return (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      handleStatusChange(task.id, status);
                                      setActiveDropdownId(null);
                                    }}
                                    className={`
                                      w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors
                                      ${isSelected ? 'bg-slate-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                                    `}
                                  >
                                    <OptIcon size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                    {optConfig.label}
                                    {isSelected && <Check size={12} className="ml-auto" />}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Loading state - AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">Yükleniyor...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-auto md:h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 md:py-0 gap-4 md:gap-0 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                <CheckSquare size={20} className="text-slate-400" />
                <h1 className="text-xl font-semibold text-slate-900">
                  {isAdmin ? 'Görevler' : 'Görevlerim'}
                </h1>
              </div>
            </div>
            <span className="text-sm text-slate-400">
              {filteredTasks.length} görev
            </span>
            
            {/* Stats badges */}
            {stats.paylasim > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-full animate-pulse">
                <Send size={12} />
                {stats.paylasim} paylaşılacak
              </span>
            )}
            {stats.urgent > 0 && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-medium rounded-full">
                <AlertTriangle size={12} />
                {stats.urgent} acil
              </span>
            )}
            
            {/* Refresh button */}
            <button
              onClick={fetchTasks}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Yenile"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Status Filter (everyone can use) */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
              <Filter size={14} className="text-slate-400" />
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'all')}
                className="bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="hazir">Hazır</option>
                <option value="tamamlandi">Tamamlandı</option>
              </select>
            </div>
            
            {/* Staff Filter (Admin only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                <Users size={14} className="text-slate-400" />
                <select 
                  value={selectedStaff}
                  onChange={(e) => {
                    setSelectedStaff(e.target.value);
                    // Re-fetch with new filter
                    setTimeout(fetchTasks, 0);
                  }}
                  className="bg-transparent text-sm text-slate-700 focus:outline-none"
                >
                  <option value="all">Tüm Ekip</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle size={20} />
              <span>{error}</span>
              <button onClick={fetchTasks} className="ml-auto text-sm underline">Tekrar Dene</button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">Görevler yükleniyor...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Empty State */}
              {Object.keys(tasksByStaff).length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <CheckSquare size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz görev yok</h3>
                  <p className="text-sm text-slate-500">
                    {isAdmin 
                      ? 'Müşteri planlamasından görev ekleyebilirsiniz' 
                      : 'Size atanmış görev bulunmuyor'}
                  </p>
                </div>
              ) : (
                // Staff Cards
                Object.values(tasksByStaff).map(({ staff: staffInfo, tasks: staffTasks }) => (
                  <StaffCard key={staffInfo.id} staffInfo={staffInfo} staffTasks={staffTasks} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
