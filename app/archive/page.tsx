'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Archive, 
  Calendar, 
  Loader2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Video,
  Image as ImageIcon,
  Circle,
  Menu
} from 'lucide-react';

type TaskStatus = 'beklemede' | 'hazir' | 'tamamlandi';
type ContentType = 'reels' | 'posts' | 'stories';

interface ApiTask {
  id: string;
  title: string;
  contentType: ContentType;
  date: string;
  status: TaskStatus;
  clientId: string;
  clientName: string;
  clientLogo: string | null;
  staffId: string;
  staffName: string;
  staffAvatar: string | null;
  staffRole?: string;
  staffDepartment?: string;
  createdAt: string;
}

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const ArchivePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tasks for the selected month
  const fetchArchive = useCallback(async () => {
    if (selectedMonth === null) return;

    try {
      setLoading(true);
      setError(null);
      
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);
      
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      
      const res = await fetch(`/api/tasks?startDate=${startStr}&endDate=${endStr}`);
      
      if (!res.ok) {
        throw new Error('Arşiv yüklenirken hata oluştu');
      }
      
      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    if (selectedMonth !== null) {
      fetchArchive();
    } else {
      setTasks([]);
    }
  }, [fetchArchive, selectedMonth]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-slate-400" />
        </main>
      </div>
    );
  }

  const getContentIcon = (type: ContentType) => {
    switch (type) {
      case 'reels': return Video;
      case 'posts': return ImageIcon;
      case 'stories': return Circle;
      default: return Calendar;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'tamamlandi': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'hazir': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'beklemede': return 'bg-slate-50 text-slate-600 border-slate-100';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'tamamlandi': return 'Tamamlandı';
      case 'hazir': return 'Hazır';
      case 'beklemede': return 'Beklemede';
      default: return status;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 overflow-auto bg-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6 sticky top-0 z-10 w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-900 flex items-center gap-2">
                  <Archive size={28} className="text-indigo-600" />
                  Arşiv & Geçmiş
                </h1>
                <p className="text-sm text-slate-500 mt-1">Geçmiş dönemlere ait görev kayıtları</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               {/* Year Selector */}
               <div className="flex items-center bg-slate-100 rounded-lg p-1">
                 <button 
                   onClick={() => setSelectedYear(selectedYear - 1)}
                   className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
                 >
                   <ChevronLeft size={20} />
                 </button>
                 <span className="px-4 font-semibold text-slate-700 select-none min-w-[60px] text-center">
                   {selectedYear}
                 </span>
                 <button 
                   onClick={() => setSelectedYear(selectedYear + 1)}
                   className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
                 >
                   <ChevronRight size={20} />
                 </button>
               </div>
            </div>
          </div>
          
          {/* Month Selector Grid */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 mt-6">
            {MONTHS.map((month, index) => (
              <button
                key={month}
                onClick={() => setSelectedMonth(index)}
                className={`
                  py-2 px-1 text-sm font-medium rounded-lg transition-all
                  ${selectedMonth === index 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900'}
                `}
              >
                {month.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-5xl mx-auto">
            {selectedMonth === null ? (
              // Empty State (Initial)
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Bir Ay Seçin</h3>
                <p className="text-slate-500 mt-1">Görüntülemek istediğiniz dönemi yukarıdan seçiniz</p>
              </div>
            ) : loading ? (
              // Loading
              <div className="text-center py-20">
                <Loader2 size={32} className="animate-spin mx-auto text-indigo-500 mb-4" />
                <p className="text-slate-500">Veriler yükleniyor...</p>
              </div>
            ) : tasks.length === 0 ? (
              // No Data
              <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
                <Archive size={48} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-lg font-medium text-slate-900">Kayıt Bulunamadı</h3>
                <p className="text-slate-500 mt-1">
                  {MONTHS[selectedMonth]} {selectedYear} dönemine ait görev bulunmuyor.
                </p>
              </div>
            ) : (
              // Results List
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="font-medium text-slate-700">
                    {MONTHS[selectedMonth]} {selectedYear} Raporu
                  </div>
                  <div className="text-sm text-slate-500">
                    Toplam {tasks.length} Görev
                  </div>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => {
                    const ContentIcon = getContentIcon(task.contentType);
                    const isCompleted = task.status === 'tamamlandi';
                    
                    return (
                      <div key={task.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        {/* Status Indicator */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        
                        {/* Client Info */}
                         {task.clientLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={task.clientLogo} alt={task.clientName} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {task.clientName.charAt(0)}
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          {/* Title & Client */}
                          <div className="col-span-1">
                            <h4 className="font-medium text-slate-900 truncate">{task.clientName}</h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                              <ContentIcon size={12} />
                              <span className="capitalize">{task.contentType}</span>
                            </div>
                          </div>
                          
                          {/* Date */}
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar size={14} className="text-slate-400" />
                            {task.date}
                          </div>
                          
                          {/* Staff */}
                          <div className="flex items-center gap-2">
                             {task.staffAvatar ? (
                               // eslint-disable-next-line @next/next/no-img-element
                               <img src={task.staffAvatar} alt={task.staffName} className="w-6 h-6 rounded-full" />
                             ) : (
                               <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                 <User size={12} className="text-slate-500" />
                               </div>
                             )}
                             <span className="text-sm text-slate-600 truncate">{task.staffName}</span>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArchivePage;
