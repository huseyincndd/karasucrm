'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Client, PACKAGE_LABELS, PACKAGE_QUOTAS, PackageType } from '@/types';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Image as ImageIcon, 
  Circle,
  Check,
  Users,
  Trash2,
  Loader2,
  AlertTriangle,
  Save,
  LogOut
} from 'lucide-react';
import { ContentType, CONTENT_TO_DEPARTMENT } from '@/constants/staff';
import { useAuth } from '@/contexts/AuthContext';

interface ClientPlannerProps {
  client: Client;
  onClose: () => void;
  onUpdate: (client: Client) => void;
  onDelete?: (clientId: string) => void;
}

interface ApiUser {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string | null;
}

// Full Task Details from API
interface ApiTask {
  id: string;
  title: string;
  contentType: ContentType;
  date: string;
  status: string;
  assignedTo: string; // ID
  clientId: string;
}

interface PendingTask {
  date: string;
  contentType: ContentType;
  staffId: string;
  tempId: string; // To differentiate pending items
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const ClientPlanner: React.FC<ClientPlannerProps> = ({ client, onClose, onUpdate, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  const [selectedMonth, setSelectedMonth] = useState(0); // Default to current month later
  const [activeType, setActiveType] = useState<ContentType | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<ApiUser | null>(null);
  
  // State for Tasks
  const [existingTasks, setExistingTasks] = useState<ApiTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Pending Changes State
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [deletedTaskIds, setDeletedTaskIds] = useState<string[]>([]);
  
  const [isVisible, setIsVisible] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  
  // Staff state
  const [staffList, setStaffList] = useState<ApiUser[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const quota = PACKAGE_QUOTAS[client.package];
  const year = 2026; // TODO: Make dynamic
  const month = selectedMonth;

  // Initialize selected month to current month
  useEffect(() => {
    setSelectedMonth(new Date().getMonth());
  }, []);

  // Fetch Staff
  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.users);
      }
    } catch (error) {
      console.error('Staff fetch error:', error);
    } finally {
      setStaffLoading(false);
    }
  }, []);

  // Fetch Existing Tasks for this Client
  const fetchTasks = useCallback(async () => {
    try {
      setLoadingTasks(true);
      // We need an endpoint to filter tasks by client. 
      // Assuming GET /api/tasks returns all tasks for admin, we can filter client-side or add query param
      // For performance, query param is better. Let's try sending a dummy param or filter client side if not supported.
      // Based on previous code, GET /api/tasks supports filtering. 
      // Actually /api/clients usually returns plannedDates but not full task objects with assignee.
      // We'll use /api/tasks and filter.
      
      const res = await fetch('/api/tasks'); // Fetches all tasks (admin) or user tasks
      if (res.ok) {
        const data = await res.json();
        // Filter for this client
        const clientTasks = data.tasks.filter((t: any) => t.clientId === client.id);
        
        // Map to expected structure if needed
        const mapped: ApiTask[] = clientTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          contentType: t.contentType || t.rawContentType || 'posts', // Fallback
          date: t.date,
          status: t.status,
          assignedTo: t.assignedTo,
          clientId: t.clientId
        }));
        
        setExistingTasks(mapped);
      }
    } catch (error) {
      console.error('Tasks fetch error:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchStaff();
    fetchTasks();
    setTimeout(() => setIsVisible(true), 10);
  }, [fetchStaff, fetchTasks]);

  // Reset staff selection when content type changes
  useEffect(() => {
    setSelectedStaff(null);
  }, [activeType]);

  const filteredStaff = useMemo(() => {
    if (!activeType) return [];
    const department = CONTENT_TO_DEPARTMENT[activeType];
    return staffList.filter(staff => staff.department === department);
  }, [activeType, staffList]);

  // Combined View of Tasks (Existing - Deleted + Pending)
  const effectiveTasks = useMemo(() => {
    // Start with existing tasks that are NOT deleted
    const current = existingTasks.filter(t => !deletedTaskIds.includes(t.id));
    
    // Map pending tasks to compatible structure (mock ID)
    const pending: ApiTask[] = pendingTasks.map(p => ({
      id: p.tempId, // Use tempId
      title: 'New Task',
      contentType: p.contentType,
      date: p.date,
      status: 'beklemede',
      assignedTo: p.staffId,
      clientId: client.id
    }));

    return [...current, ...pending];
  }, [existingTasks, deletedTaskIds, pendingTasks, client.id]);

  const hasChanges = pendingTasks.length > 0 || deletedTaskIds.length > 0;

  // Calculate remaining quota
  const getRemaining = (type: ContentType) => {
    const total = quota[type];
    const used = effectiveTasks.filter(t => {
      const taskDate = new Date(t.date);
      return taskDate.getMonth() === month && t.contentType === type;
    }).length;
    return total - used;
  };

  const generateDays = () => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayIndex = (firstDay.getDay() + 6) % 7;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };
  const days = generateDays();

  // Handle Date Click
  const handleDateClick = (day: number) => {
    if (!activeType || !selectedStaff) return;
    
    // Format date as YYYY-MM-DD
    // Using local time to ensure correct date string
    const d = new Date(year, month, day);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;

    // Check if there is already a task of this type on this date
    // Check pending first
    const pendingIndex = pendingTasks.findIndex(p => p.date === dateStr && p.contentType === activeType);
    if (pendingIndex >= 0) {
      // It's a pending task -> Remove it (Toggle off)
      setPendingTasks(prev => prev.filter((_, i) => i !== pendingIndex));
      return;
    }

    // Check existing
    const existing = existingTasks.find(t => 
      t.date === dateStr && 
      t.contentType === activeType && 
      !deletedTaskIds.includes(t.id)
    );

    if (existing) {
      // It's an existing task -> Mark for deletion
      setDeletedTaskIds(prev => [...prev, existing.id]);
      return;
    }

    // New assignment
    if (getRemaining(activeType) <= 0) return; // Quota check

    setPendingTasks(prev => [...prev, {
      date: dateStr,
      contentType: activeType,
      staffId: selectedStaff.id,
      tempId: `temp-${Date.now()}-${Math.random()}`
    }]);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 1. Process Deletions
      const deletePromises = deletedTaskIds.map(id => 
        fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      );
      
      // 2. Process Additions
      const addPromises = pendingTasks.map(task => 
        fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${client.name} - ${task.contentType.charAt(0).toUpperCase() + task.contentType.slice(1)}`,
            contentType: task.contentType,
            date: task.date,
            clientId: client.id,
            assignedTo: task.staffId,
            status: 'beklemede'
          })
        })
      );

      await Promise.all([...deletePromises, ...addPromises]);
      
      // Refresh state
      await fetchTasks();
      setPendingTasks([]);
      setDeletedTaskIds([]);
      
      // Notify Parent to update client card (dates might have changed)
      // Since we don't return the full client object, parent might need to refetch or we ignore until next load.
      // But parent expects updated client. Ideally we should refetch client too.
      // For now, we simulate update or just callback.
      const fakeNewDates = { ...client.plannedDates }; // Simple simulation not perfect but okay
      onUpdate({ ...client }); // Just trigger update

    } catch (err) {
      alert('Kaydedilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const attemptClose = () => {
    if (hasChanges) {
      setConfirmClose(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleContentTypeChange = (type: ContentType) => {
    if (activeType === type) {
      setActiveType(null);
    } else {
      setActiveType(type);
    }
  };

  const getTypeConfig = (type: ContentType) => {
    switch (type) {
      case 'reels': return { icon: Video, color: 'rose', label: 'Reels', bgActive: '#f43f5e' };
      case 'posts': return { icon: ImageIcon, color: 'blue', label: 'Post', bgActive: '#3b82f6' };
      case 'stories': return { icon: Circle, color: 'purple', label: 'Story', bgActive: '#a855f7' };
    }
  };

  const getDepartmentLabel = (type: ContentType) => {
    switch (type) {
      case 'reels': return 'Video Ekibi';
      case 'posts': return 'Tasarım Ekibi';
      case 'stories': return 'İçerik Ekibi';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={attemptClose} />
      
      <div 
        className={`relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden transition-transform duration-200 flex flex-col max-h-[90vh] ${isVisible ? 'scale-100' : 'scale-95'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            {client.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {client.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="font-semibold text-slate-900">{client.name}</h2>
              <span className="text-xs text-slate-500">{PACKAGE_LABELS[client.package]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && onDelete && (
              <button 
                onClick={() => onDelete(client.id)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Müşteriyi Sil"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button onClick={attemptClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Month Selector */}
          <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 border-b border-slate-100">
            <button 
              onClick={() => setSelectedMonth(Math.max(0, selectedMonth - 1))}
              disabled={selectedMonth === 0}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-lg font-semibold text-slate-900 min-w-[120px] text-center">
              {MONTH_NAMES[month]} {year}
            </span>
            <button 
              onClick={() => setSelectedMonth(Math.min(11, selectedMonth + 1))}
              disabled={selectedMonth === 11}
              className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Resource Bar */}
          <div className="flex items-center justify-center gap-3 p-4 border-b border-slate-100">
            {(['reels', 'posts', 'stories'] as ContentType[]).map(type => {
              const config = getTypeConfig(type);
              const Icon = config.icon;
              const remaining = getRemaining(type);
              const isActive = activeType === type;
              
              return (
                <button
                  key={type}
                  onClick={() => handleContentTypeChange(type)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? `bg-${config.color}-500 text-white shadow-lg` 
                      : `bg-${config.color}-50 text-${config.color}-600 hover:bg-${config.color}-100`
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? config.bgActive : undefined
                  }}
                >
                  <Icon size={16} />
                  {config.label}
                  <span className={`
                    px-1.5 py-0.5 rounded text-xs font-bold
                    ${isActive ? 'bg-white/20' : 'bg-white'}
                  `}>
                    {remaining} Kaldı
                  </span>
                </button>
              );
            })}
          </div>

          {/* Staff Selector */}
          {activeType && (
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 min-w-[100px]">
                  <Users size={14} />
                  {getDepartmentLabel(activeType)}:
                </div>
                
                {staffLoading ? (
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                ) : filteredStaff.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {filteredStaff.map(staff => {
                      const isSelected = selectedStaff?.id === staff.id;
                      const config = getTypeConfig(activeType);
                      
                      return (
                        <button
                          key={staff.id}
                          onClick={() => setSelectedStaff(isSelected ? null : staff)}
                          className={`
                            relative group transition-all duration-200
                            ${isSelected ? 'scale-110' : 'hover:scale-105'}
                          `}
                          title={`${staff.name} - ${staff.role}`}
                        >
                          <div 
                            className={`
                              w-10 h-10 rounded-full overflow-hidden border-3 transition-all
                              ${isSelected 
                                ? 'ring-offset-2 shadow-lg' 
                                : 'border-white shadow-sm hover:shadow-md'
                              }
                            `}
                            style={{
                              borderColor: isSelected ? config.bgActive : 'white',
                              boxShadow: isSelected 
                                ? `0 0 0 2px white, 0 0 0 4px ${config.bgActive}` 
                                : undefined,
                            }}
                          >
                            {staff.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={staff.avatar} 
                                alt={staff.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                {staff.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div 
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                              style={{ backgroundColor: config.bgActive }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                          
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {staff.name}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle size={14} />
                    Bu departmanda ekip üyesi yok
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          {activeType && (
            <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500">
              {selectedStaff ? (
                <>
                  📅 <strong>{selectedStaff.name}</strong> için tarihleri seç. Değişiklikler <strong>Kaydet</strong> butonuna basınca uygulanır.
                </>
              ) : (
                <>
                  👤 Önce yukarıdan bir ekip üyesi seç, sonra planlama yap.
                </>
              )}
            </div>
          )}

          {/* Mini Calendar */}
          <div className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={index} className="aspect-square" />;
                }

                // Get formats from YYYY-MM-DD
                const d = new Date(year, month, day);
                const yr = d.getFullYear();
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                const dateStr = `${yr}-${mo}-${da}`;

                // Check content for this day
                const dayTasks = effectiveTasks.filter(t => t.date === dateStr);
                const hasReels = dayTasks.some(t => t.contentType === 'reels');
                const hasPosts = dayTasks.some(t => t.contentType === 'posts');
                const hasStories = dayTasks.some(t => t.contentType === 'stories');
                
                const assignedTask = activeType ? dayTasks.find(t => t.contentType === activeType) : undefined;
                let assignedStaff: ApiUser | undefined;
                if (assignedTask) {
                  assignedStaff = staffList.find(s => s.id === assignedTask.assignedTo);
                }

                let bgColor = 'bg-white hover:bg-slate-50';
                let borderColor = 'border-slate-200';
                
                // Active Type specific styling
                if (activeType && assignedTask) {
                   if (activeType === 'reels') {
                     bgColor = 'bg-rose-500';
                     borderColor = 'border-rose-500';
                   } else if (activeType === 'posts') {
                     bgColor = 'bg-blue-500';
                     borderColor = 'border-blue-500';
                   } else {
                     bgColor = 'bg-purple-500';
                     borderColor = 'border-purple-500';
                   }
                }

                const isDisabled = !activeType || (activeType && !selectedStaff) || saving;

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day)}
                    disabled={isDisabled}
                    className={`
                      aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                      transition-all duration-150 relative
                      ${bgColor} ${borderColor}
                      ${!isDisabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                      ${activeType && assignedTask ? 'text-white' : 'text-slate-700'}
                      ${isDisabled && activeType ? 'opacity-50' : ''}
                    `}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    
                    {dayTasks.length > 0 && !activeType && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasReels && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                        {hasPosts && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        {hasStories && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                      </div>
                    )}
                    
                    {activeType && assignedTask && assignedStaff && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm">
                         {assignedStaff.avatar ? (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img 
                             src={assignedStaff.avatar} 
                             alt={assignedStaff.name}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-bold">
                             {assignedStaff.name.charAt(0)}
                           </div>
                         )}
                      </div>
                    )}
                    
                    {activeType && assignedTask && !assignedStaff && (
                      <Check size={14} className="absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-xs text-slate-400">
             {!hasChanges && (
               <>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Reels
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Post
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Story
                </span>
               </>
             )}
             {hasChanges && (
               <span className="text-indigo-600 font-medium animate-pulse">
                Değişiklikler var, kaydetmeyi unutmayın
               </span>
             )}
          </div>
          
          <div className="flex items-center gap-3">
             <button
               onClick={attemptClose}
               className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
               disabled={saving}
             >
               Vazgeç
             </button>
             <button
               onClick={handleSave}
               disabled={!hasChanges || saving}
               className={`
                 flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all
                 ${hasChanges 
                   ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transform scale-105' 
                   : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                 }
               `}
             >
               {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               Kaydet
             </button>
          </div>
        </div>
        
        {/* Confirm Close Overlay */}
        {confirmClose && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-8">
             <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
               <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={24} className="text-amber-600" />
               </div>
               <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Kaydedilmemiş Değişiklikler</h3>
               <p className="text-sm text-center text-slate-500 mb-6">
                 Kaydetmeden çıkarsanız yaptığınız planlamalar kaybolacak. Emin misiniz?
               </p>
               <div className="flex gap-3">
                 <button 
                   onClick={() => setConfirmClose(false)}
                   className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                 >
                   Geri Dön
                 </button>
                 <button 
                   onClick={handleClose}
                   className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
                 >
                   Kaydetmeden Çık
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPlanner;
