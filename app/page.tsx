'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Calendar from '@/components/Calendar';
import DayModal from '@/components/DayModal';
import { ViewMode, FilterState } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { DEPARTMENT_LABELS } from '@/constants/staff';

// API'den gelen task tipi (TasksPage ile uyumlu)
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
  staffRole?: string;
  staffDepartment?: string;
  createdAt: string;
}

// MOCK_TASKS yapısına dönüştürme (Calendar bileşeni için)
const mapToCalendarTask = (task: ApiTask) => ({
  id: task.id,
  title: task.title || `${task.clientName} - ${task.contentType}`,
  clientName: task.clientName,
  platform: task.contentType === 'posts' ? 'Post' : task.contentType === 'reels' ? 'Reel' : 'Story',
  status: task.status === 'hazir' ? 'Ready' : task.status === 'tamamlandi' ? 'Published' : 'Todo', // Eski tiplere map etme (Calendar beklediği için)
  date: task.date,
  assignees: [{ 
    id: task.staffId, 
    name: task.staffName, 
    role: task.staffRole || 'Staff', 
    avatar: task.staffAvatar || `https://ui-avatars.com/api/?name=${task.staffName}` 
  }],
  caption: '',
  fileUrl: null,
  comments: [],
  // Ek alanlar (yeni tipler için)
  rawStatus: task.status,
  rawContentType: task.contentType,
  clientLogo: task.clientLogo,
  staffDepartment: task.staffDepartment
});

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const isClient = user?.isClient ?? false;
  
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mobile check on mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      setViewMode('Week');
    }
  }, []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [filters, setFilters] = useState<FilterState>({
    client: 'All',
    platform: 'All',
    status: 'All',
    search: ''
  });
  
  // Data State
  const [tasks, setTasks] = useState<any[]>([]); // Calendar task tipini kullanacak
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedDay, setSelectedDay] = useState<{ date: string; dayNum: number } | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      // Format as YYYY-MM-DD without timezone shift
      const startDate = new Date(year, month, 1).toLocaleDateString('en-CA');
      const endDate = new Date(year, month + 1, 0).toLocaleDateString('en-CA'); // Last day of month

      const res = await fetch(`/api/tasks?startDate=${startDate}&endDate=${endDate}`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Görevler yüklenemedi');
      }
      
      const data = await res.json();
      const mappedTasks = data.tasks.map(mapToCalendarTask);
      setTasks(mappedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
    }
  }, [authLoading, user, fetchTasks]);

  const handleDayClick = (date: string, dayNum: number) => {
    setSelectedDay({ date, dayNum });
  };

  const handleCloseModal = () => {
    setSelectedDay(null);
    // Refresh tasks when modal closes to reflect changes
    fetchTasks();
  };

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filters.client !== 'All' && task.clientName !== filters.client) return false;
      if (filters.platform !== 'All' && task.platform !== filters.platform) return false;
      
      // Status mapping for filter
      const taskStatusMap: Record<string, string> = {
        'beklemede': 'Todo',
        'hazir': 'Ready',
        'tamamlandi': 'Published'
      };
      
      // Support both raw status matches (new) and legacy mapped status matches
      if (filters.status !== 'All') {
        const mappedStatus = taskStatusMap[task.rawStatus] || task.status;
        if (mappedStatus !== filters.status && task.rawStatus !== filters.status && task.status !== filters.status) return false;
      }
      
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [filters, tasks]);

  // Tasks for selected day
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return tasks.filter(task => task.date === selectedDay.date);
  }, [selectedDay, tasks]);

  // Extract unique clients for the filter dropdown
  const clients = useMemo(() => Array.from(new Set(tasks.map(t => t.clientName))), [tasks]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-50 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* 2. Top Bar (Filters) */}
        <TopBar 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          filters={filters}
          setFilters={setFilters}
          clients={clients}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onMenuClick={() => setIsSidebarOpen(true)}
          isClient={isClient}
        />

        {/* Client Banner */}
        {isClient && (
          <div className="px-4 md:px-6 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <p className="text-xs text-indigo-600 font-medium">📅 İçerik takviminizi görüntülüyorsunuz • Detaylar için Planlarım sayfasını ziyaret edin</p>
          </div>
        )}

        {/* 3. Calendar Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">Takvim yükleniyor...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-rose-50 text-rose-700 p-4 rounded-lg flex items-center gap-3">
              <AlertTriangle size={20} />
              <span>{error}</span>
              <button onClick={fetchTasks} className="ml-auto underline text-sm">Tekrar Dene</button>
            </div>
          </div>
        ) : (
          <Calendar 
            tasks={filteredTasks} 
            onDayClick={isClient ? undefined : handleDayClick}
            currentDate={currentDate}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* 4. Day Modal Overlay - Müşteriler için gizli */}
      {!isClient && selectedDay && (
        <DayModal 
          isOpen={true}
          onClose={handleCloseModal}
          date={selectedDay.date}
          dayNum={selectedDay.dayNum}
          initialTasks={selectedDayTasks} 
        />
      )}
    </div>
  );
}
