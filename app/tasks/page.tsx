'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
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
  Send
} from 'lucide-react';
import { 
  STAFF_MEMBERS, 
  MOCK_ASSIGNMENTS, 
  TaskAssignment,
  TaskStatus,
  StaffMember,
  ContentType,
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_COLORS,
  DEPARTMENT_LABELS
} from '@/constants/staff';

// ===== ADMIN VIEW =====
// This page shows all tasks for all team members (admin view)
// Non-admin users will only see their own tasks (future implementation)

const SIMULATED_TODAY = new Date(2026, 0, 27);

// Status configuration matching calendar page:
// - beklemede (Waiting) = White/Slate
// - hazir (Ready, waiting for its day) = Yellow/Amber  
// - tamamlandi (Completed) = Green/Emerald
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
  }
};

const getContentIcon = (type: ContentType) => {
  switch (type) {
    case 'reels': return Video;
    case 'posts': return ImageIcon;
    case 'stories': return Circle;
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
  const diff = Math.ceil((date.getTime() - SIMULATED_TODAY.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function TasksPage() {
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [assignments, setAssignments] = useState<TaskAssignment[]>(MOCK_ASSIGNMENTS);

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter(a => {
      if (selectedStaff !== 'all' && a.staffId !== selectedStaff) return false;
      if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
      return true;
    });
  }, [assignments, selectedStaff, selectedStatus]);

  // Group assignments by staff member
  const assignmentsByStaff = useMemo(() => {
    const grouped: Record<string, TaskAssignment[]> = {};
    
    STAFF_MEMBERS.forEach(staff => {
      grouped[staff.id] = filteredAssignments.filter(a => a.staffId === staff.id);
    });
    
    return grouped;
  }, [filteredAssignments]);

  // Stats
  const stats = useMemo(() => {
    const total = assignments.length;
    const beklemede = assignments.filter(a => a.status === 'beklemede').length;
    const hazir = assignments.filter(a => a.status === 'hazir').length;
    const tamamlandi = assignments.filter(a => a.status === 'tamamlandi').length;
    // Acil: only 'beklemede' tasks with close deadline (hazir is ready, not urgent)
    const urgent = assignments.filter(a => getDaysUntil(a.date) <= 1 && a.status === 'beklemede').length;
    // Paylaş: 'hazir' tasks that are due today
    const paylasim = assignments.filter(a => getDaysUntil(a.date) === 0 && a.status === 'hazir').length;
    
    return { total, beklemede, hazir, tamamlandi, urgent, paylasim };
  }, [assignments]);

  // Update task status
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setAssignments(prev => prev.map(a => 
      a.id === taskId ? { ...a, status: newStatus } : a
    ));
  };

  // Staff card component
  const StaffCard = ({ staff, tasks }: { staff: StaffMember; tasks: TaskAssignment[] }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const tamamlandiCount = tasks.filter(t => t.status === 'tamamlandi').length;
    const beklemedeCount = tasks.filter(t => t.status === 'beklemede').length;
    // Acil: only 'beklemede' tasks with close deadline
    const urgentCount = tasks.filter(t => getDaysUntil(t.date) <= 1 && t.status === 'beklemede').length;
    // Paylaşım: 'hazir' tasks that are due today
    const paylasimCount = tasks.filter(t => getDaysUntil(t.date) === 0 && t.status === 'hazir').length;

    if (tasks.length === 0 && selectedStaff === 'all') return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Staff Header */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={staff.avatar} 
              alt={staff.name}
              className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
            />
            <div className="text-left">
              <h3 className="font-semibold text-slate-900">{staff.name}</h3>
              <p className="text-xs text-slate-500">{staff.role} • {DEPARTMENT_LABELS[staff.department]}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Task Stats */}
            <div className="flex items-center gap-2">
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
                {tamamlandiCount}/{tasks.length}
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
            {tasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-sm">
                Bu kullanıcıya atanmış görev yok
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(task => {
                  const statusConfig = getStatusConfig(task.status);
                  const StatusIcon = statusConfig.icon;
                  const ContentIcon = getContentIcon(task.contentType);
                  const contentColors = CONTENT_TYPE_COLORS[task.contentType];
                  const daysUntil = getDaysUntil(task.date);
                  // Acil: only 'beklemede' tasks with close deadline
                  const isUrgent = daysUntil <= 1 && task.status === 'beklemede';
                  // Paylaş: 'hazir' tasks that are due today
                  const shouldPublish = daysUntil === 0 && task.status === 'hazir';
                  
                  return (
                    <div 
                      key={task.id}
                      className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${isUrgent ? 'bg-rose-50/50' : ''} ${shouldPublish ? 'bg-indigo-50/50' : ''}`}
                    >
                      {/* Client Logo */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={task.clientLogo} 
                        alt={task.clientName}
                        className="w-10 h-10 rounded-lg shadow-sm"
                      />
                      
                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 truncate">{task.clientName}</span>
                          {shouldPublish && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-medium rounded animate-pulse">
                              <Send size={10} />
                              PAYLAŞ
                            </span>
                          )}
                          {isUrgent && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 text-xs font-medium rounded animate-pulse">
                              <AlertTriangle size={10} />
                              ACİL
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">{task.title}</p>
                      </div>
                      
                      {/* Content Type Badge */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${contentColors.bg} ${contentColors.text}`}>
                        <ContentIcon size={14} />
                        <span className="text-xs font-medium">{CONTENT_TYPE_LABELS[task.contentType]}</span>
                      </div>
                      
                      {/* Date */}
                      <div className={`flex items-center gap-1.5 text-sm ${isUrgent ? 'text-rose-600 font-medium' : 'text-slate-500'}`}>
                        <Calendar size={14} />
                        <span>{formatDate(task.date)}</span>
                        {daysUntil === 0 && <span className="text-xs">(Bugün)</span>}
                        {daysUntil === 1 && <span className="text-xs">(Yarın)</span>}
                      </div>
                      
                      {/* Status Dropdown */}
                      <div className="relative">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`
                            appearance-none px-3 py-1.5 pr-8 rounded-lg border text-sm font-medium cursor-pointer
                            ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}
                            focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-300
                          `}
                        >
                          <option value="beklemede">Beklemede</option>
                          <option value="hazir">Hazır</option>
                          <option value="tamamlandi">Tamamlandı</option>
                        </select>
                        <ChevronDown size={14} className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${statusConfig.text}`} />
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

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={20} className="text-slate-400" />
              <h1 className="text-xl font-semibold text-slate-900">Görevler</h1>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                Admin
              </span>
            </div>
            
            {/* Stats */}
            <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-slate-200">
              <span className="text-sm text-slate-500">
                Toplam: <strong className="text-slate-700">{stats.total}</strong>
              </span>
              {stats.urgent > 0 && (
                <span className="flex items-center gap-1 text-sm text-rose-600 animate-pulse">
                  <AlertTriangle size={14} />
                  {stats.urgent} Acil
                </span>
              )}
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-3">
            {/* Staff Filter */}
            <div className="relative">
              <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Tüm Ekip</option>
                {STAFF_MEMBERS.map(staff => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'all')}
                className="appearance-none pl-9 pr-8 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">Tüm Durumlar</option>
                <option value="beklemede">Beklemede</option>
                <option value="hazir">Hazır</option>
                <option value="tamamlandi">Tamamlandı</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 bg-white border-b border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Beklemede - White/Slate */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-slate-200">
                <Clock size={20} className="text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-700">{stats.beklemede}</p>
                <p className="text-xs text-slate-500">Beklemede</p>
              </div>
            </div>
            
            {/* Hazır - Yellow/Amber */}
            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-lg">
                <Hourglass size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.hazir}</p>
                <p className="text-xs text-amber-600">Hazır</p>
              </div>
            </div>
            
            {/* Tamamlandı - Green/Emerald */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="w-10 h-10 flex items-center justify-center bg-emerald-100 rounded-lg">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.tamamlandi}</p>
                <p className="text-xs text-emerald-600">Tamamlandı</p>
              </div>
            </div>
            
            {/* Acil - Red/Rose */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${stats.urgent > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${stats.urgent > 0 ? 'bg-rose-100' : 'bg-slate-100'}`}>
                <AlertTriangle size={20} className={stats.urgent > 0 ? 'text-rose-600' : 'text-slate-400'} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${stats.urgent > 0 ? 'text-rose-700' : 'text-slate-400'}`}>{stats.urgent}</p>
                <p className={`text-xs ${stats.urgent > 0 ? 'text-rose-600' : 'text-slate-400'}`}>Acil Görev</p>
              </div>
            </div>
          </div>
        </div>

        {/* Staff Task Lists */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-5xl mx-auto">
            {selectedStaff === 'all' ? (
              // Show all staff members
              STAFF_MEMBERS.map(staff => (
                <StaffCard 
                  key={staff.id} 
                  staff={staff} 
                  tasks={assignmentsByStaff[staff.id] || []} 
                />
              ))
            ) : (
              // Show only selected staff
              <StaffCard 
                staff={STAFF_MEMBERS.find(s => s.id === selectedStaff)!} 
                tasks={assignmentsByStaff[selectedStaff] || []} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
