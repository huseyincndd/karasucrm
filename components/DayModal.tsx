'use client';

import React, { useEffect, useState } from 'react';
import { Task, Platform } from '@/types';
import { 
  X, 
  Video, 
  Image as ImageIcon, 
  Circle,
  ChevronDown,
  User,
  Calendar,
  Save,
  Check,
  Lock,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { STAFF_MEMBERS, StaffMember } from '@/constants/staff';
import { useAuth } from '@/contexts/AuthContext';

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

type TaskStatusType = 'beklemede' | 'hazir' | 'tamamlandi';
type DropdownType = 'status' | 'assignee' | 'date';

interface ApiUpdate {
  taskId: string;
  status?: TaskStatusType;
  assignedTo?: string;
  date?: string;
}

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayNum: number;
  initialTasks: any[]; // Using any to accommodate the Calendar mapped type
}

const STATUS_CONFIG: Record<TaskStatusType, { label: string; dot: string; text: string; bg: string }> = {
  beklemede: { label: 'Beklemede', dot: 'bg-slate-300', text: 'text-slate-600', bg: 'bg-slate-50' },
  hazir: { label: 'Hazır', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  tamamlandi: { label: 'Tamamlandı', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
};

// Generate available dates for the next 14 days
const generateAvailableDates = () => {
  const dates: { value: string; label: string; dayNum: number }[] = [];
  const today = new Date(); // Use real today
  
  for (let i = 0; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayNum = date.getDate();
    const monthName = MONTH_NAMES[date.getMonth()];
    
    // Format YYYY-MM-DD (adjusted for local time zone if needed, but simple ISO split is okay for now or use local date string)
    // To ensure local date string in YYYY-MM-DD:
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    dates.push({
      value: isoDate,
      label: `${dayNum} ${monthName}`,
      dayNum: dayNum
    });
  }
  return dates;
};

const AVAILABLE_DATES = generateAvailableDates();

const DayModal: React.FC<DayModalProps> = ({ isOpen, onClose, date, dayNum, initialTasks }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

  const [isVisible, setIsVisible] = useState(false);
  
  // Local state for edits
  // We keep track of modified tasks here
  const [localTasks, setLocalTasks] = useState(initialTasks);
  const [modifiedTaskIds, setModifiedTaskIds] = useState<Set<string>>(new Set());
  
  const [activeDropdown, setActiveDropdown] = useState<{ id: string; type: DropdownType } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // API'den Staff listesi
  const [staffList, setStaffList] = useState<any[]>([]);
  
  useEffect(() => {
    // Fetch staff for dropdowns
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setStaffList(data.users);
        }
      } catch (e) {
        console.error('Failed to fetch staff:', e);
        // Fallback to constants if API fails
        setStaffList(STAFF_MEMBERS);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      setLocalTasks(initialTasks);
      setModifiedTaskIds(new Set());
    } else {
      setIsVisible(false);
    }
  }, [isOpen, initialTasks]);

  const attemptClose = () => {
    if (modifiedTaskIds.size > 0) {
      setConfirmClose(true);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setConfirmClose(false);
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatusType) => {
    setLocalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // Map back to display format if needed, but we store rawStatus for API
        return { 
          ...t, 
          rawStatus: newStatus,
          status: newStatus === 'hazir' ? 'Ready' : newStatus === 'tamamlandi' ? 'Published' : 'Todo'
        };
      }
      return t;
    }));
    setModifiedTaskIds(prev => new Set(prev).add(taskId));
    setActiveDropdown(null);
  };

  const handleAssigneeChange = (taskId: string, staffId: string) => {
    if (!isAdmin) return; // Guard for non-admins
    
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;

    setLocalTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          assignees: [{ 
            id: staff.id, 
            name: staff.name, 
            role: staff.role, 
            avatar: staff.avatar 
          }]
        };
      }
      return t;
    }));
    setModifiedTaskIds(prev => new Set(prev).add(taskId));
    setActiveDropdown(null);
  };

  const handleDateChange = (taskId: string, newDate: string) => {
    if (!isAdmin) return; // Guard for non-admins

    setLocalTasks(prev => prev.map(t => {
      if (t.id === taskId) return { ...t, date: newDate };
      return t;
    }));
    setModifiedTaskIds(prev => new Set(prev).add(taskId));
    setActiveDropdown(null);
  };

  const handleSaveChanges = async () => {
    if (modifiedTaskIds.size === 0) return;

    setIsSaving(true);
    
    try {
      // Process all modified tasks
      const promises = Array.from(modifiedTaskIds).map(async (taskId) => {
        const task = localTasks.find(t => t.id === taskId);
        if (!task) return;

        const updateData: ApiUpdate = {
          taskId: task.id,
          // Only send what changed? Or just send current state of allowed fields
          status: task.rawStatus as TaskStatusType,
        };

        if (isAdmin) {
          updateData.assignedTo = task.assignees[0]?.id;
          updateData.date = task.date;
        }

        const res = await fetch(`/api/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (!res.ok) {
          throw new Error(`Failed to update task ${taskId}`);
        }
      });

      await Promise.all(promises);

      setShowSuccess(true);
      setModifiedTaskIds(new Set());
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1000);
    } catch (error) {
      console.error('Save error:', error);
      alert('Değişiklikler kaydedilirken bir hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlatformIcon = (platform: Platform | string) => {
    const p = typeof platform === 'string' ? platform.toLowerCase() : '';
    if (p.includes('reel')) return Video;
    if (p.includes('post')) return ImageIcon;
    if (p.includes('story')) return Circle;
    return Circle;
  };

  const getPlatformColor = (platform: Platform | string) => {
    const p = typeof platform === 'string' ? platform.toLowerCase() : '';
    if (p.includes('reel')) return 'text-rose-500 bg-rose-50';
    if (p.includes('post')) return 'text-blue-500 bg-blue-50';
    if (p.includes('story')) return 'text-purple-500 bg-purple-50';
    return 'text-slate-500 bg-slate-50';
  };

  if (!isOpen) return null;

  const currentMonthName = MONTH_NAMES[new Date(date).getMonth()];
  const hasChanges = modifiedTaskIds.size > 0;

  return (
    <div 
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={attemptClose}
    >
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <div 
          className={`relative w-full max-w-6xl transform overflow-visible rounded-xl sm:rounded-2xl bg-white shadow-2xl transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
          onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 rounded-t-xl sm:rounded-t-2xl gap-4 sm:gap-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              {dayNum} {currentMonthName}
              <span className="text-base sm:text-lg font-normal text-slate-400">Programı</span>
            </h2>
            <p className="text-slate-500 mt-1 text-sm sm:text-base">Bu tarih için planlanan içerikler</p>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {hasChanges && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-sm font-medium animate-pulse">
                <AlertTriangle size={14} />
                Kaydedilmemiş değişiklikler
              </div>
            )}
            <button 
              onClick={attemptClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-8 min-h-[300px] sm:min-h-[400px]">
          {localTasks.length > 0 ? (
            <div className="space-y-4">
              {localTasks.map((task) => {
                const PlatformIcon = getPlatformIcon(task.platform);
                const platformColorClass = getPlatformColor(task.platform);
                const status = (task.rawStatus || 'beklemede') as TaskStatusType;
                const config = STATUS_CONFIG[status] || STATUS_CONFIG.beklemede;
                const assignee = task.assignees[0]; // Assuming single assignee from API mapping

                return (
                  <div 
                    key={task.id} 
                    className={`group bg-white rounded-xl border-2 p-4 hover:shadow-lg transition-all duration-200 ${modifiedTaskIds.has(task.id) ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100'}`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                      {/* Left: Platform & Client */}
                      <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[200px]">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${platformColorClass}`}>
                          <PlatformIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                             {/* Client Logo */}
                            {task.clientLogo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={task.clientLogo} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : null}
                            <h3 className="font-semibold text-slate-900">{task.clientName}</h3>
                          </div>
                          <span className="text-sm text-slate-500">{task.platform}</span>
                        </div>
                      </div>

                      {/* Middle: Controls */}
                      <div className="flex-1 w-full flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        {/* 1. Status Dropdown */}
                        <div className="relative w-full sm:w-auto">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown?.id === task.id && activeDropdown?.type === 'status' ? null : { id: task.id, type: 'status' })}
                            className={`w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors min-w-0 sm:min-w-[140px]
                              ${config.bg} ${config.text} border-transparent hover:border-current`}
                          >
                            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                            {config.label}
                            <ChevronDown size={14} className="ml-auto opacity-50" />
                          </button>

                          {activeDropdown?.id === task.id && activeDropdown?.type === 'status' && (
                            <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20">
                              {(Object.keys(STATUS_CONFIG) as TaskStatusType[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(task.id, s)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-slate-600"
                                >
                                  <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. Assignee Dropdown */}
                        <div className="relative w-full sm:w-auto">
                          {!isAdmin ? (
                            // Non-admin view (read-only)
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed min-w-[160px]">
                              {assignee?.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={assignee.avatar} alt={assignee.name} className="w-5 h-5 rounded-full" />
                              ) : (
                                <User size={14} />
                              )}
                              <span className="text-sm truncate max-w-[100px]">{assignee?.name || 'Atanmadı'}</span>
                              <Lock size={12} className="ml-auto opacity-50" />
                            </div>
                          ) : (
                            // Admin view (editable)
                            <>
                              <button
                                onClick={() => setActiveDropdown(activeDropdown?.id === task.id && activeDropdown?.type === 'assignee' ? null : { id: task.id, type: 'assignee' })}
                                className="w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors min-w-0 sm:min-w-[160px]"
                              >
                                {assignee?.avatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={assignee.avatar} alt={assignee.name} className="w-5 h-5 rounded-full" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                                     <User size={12} className="text-slate-500" />
                                  </div>
                                )}
                                <span className="text-sm text-slate-700 truncate max-w-[100px]">{assignee?.name}</span>
                                <ChevronDown size={14} className="ml-auto text-slate-400" />
                              </button>

                              {activeDropdown?.id === task.id && activeDropdown?.type === 'assignee' && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 max-h-60 overflow-y-auto">
                                  {staffList.map((staff) => (
                                    <button
                                      key={staff.id}
                                      onClick={() => handleAssigneeChange(task.id, staff.id)}
                                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                                    >
                                      {staff.avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={staff.avatar} alt={staff.name} className="w-8 h-8 rounded-full border border-slate-100" />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                          <span className="text-xs font-semibold">{staff.name.charAt(0)}</span>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-sm font-medium text-slate-900">{staff.name}</div>
                                        <div className="text-xs text-slate-500">{staff.role}</div>
                                      </div>
                                      {assignee?.id === staff.id && <Check size={16} className="ml-auto text-indigo-600" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        {/* 3. Date Dropdown (Admin only) */}
                        <div className="relative w-full sm:w-auto">
                          {!isAdmin ? (
                             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed">
                               <Calendar size={14} />
                               <span className="text-sm">{task.date === date ? 'Bugün' : task.date}</span>
                               <Lock size={12} className="ml-1 opacity-50" />
                             </div>
                          ) : (
                            <>
                              <button
                                onClick={() => setActiveDropdown(activeDropdown?.id === task.id && activeDropdown?.type === 'date' ? null : { id: task.id, type: 'date' })}
                                className="w-full sm:w-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors"
                              >
                                <Calendar size={14} className="text-slate-500" />
                                <span className="text-sm text-slate-700">
                                  {task.date === date ? 'Bugün' : task.date.split('-').slice(1).reverse().join('.')}
                                </span>
                                <ChevronDown size={14} className="text-slate-400" />
                              </button>

                              {activeDropdown?.id === task.id && activeDropdown?.type === 'date' && (
                                <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-1 w-full sm:w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 max-h-60 overflow-y-auto">
                                  {AVAILABLE_DATES.map((d) => (
                                    <button
                                      key={d.value}
                                      onClick={() => handleDateChange(task.id, d.value)}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 text-slate-600"
                                    >
                                      <span className={`flex-1 text-left ${d.value === task.date ? 'font-medium text-indigo-600' : ''}`}>
                                        {d.label}
                                      </span>
                                      {d.value === task.date && <Check size={14} className="text-indigo-600" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Calendar size={32} />
              </div>
              <p className="text-lg font-medium text-slate-900">Planlanmış içerik yok</p>
              <p className="text-sm mt-1">Bu tarih için henüz bir görev oluşturulmamış.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 rounded-b-xl sm:rounded-b-2xl">
          <div className="text-sm text-slate-500">
            {localTasks.length} içerik planlandı
          </div>
          
          <button
            onClick={handleSaveChanges}
            disabled={!hasChanges || isSaving}
            className={`
              w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all
              ${hasChanges 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
              ${showSuccess ? 'bg-emerald-500' : ''}
            `}
          >
            {isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : showSuccess ? (
              <Check size={18} />
            ) : (
              <Save size={18} />
            )}
            {showSuccess ? 'Kaydedildi!' : 'Değişiklikleri Kaydet'}
          </button>
        </div>

        {/* Confirm Close Overlay */}
        {confirmClose && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-2xl transition-all animate-in fade-in duration-200">
             <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 text-center border border-slate-200">
               <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={24} className="text-amber-600" />
               </div>
               <h3 className="text-lg font-bold text-slate-900 mb-2">Kaydedilmemiş Değişiklikler</h3>
               <p className="text-sm text-slate-500 mb-6">
                 Kaydetmeden çıkarsanız yaptığınız değişiklikler kaybolacak.
               </p>
               <div className="flex gap-3">
                 <button 
                   onClick={() => setConfirmClose(false)}
                   className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors border border-slate-200"
                 >
                   Geri Dön
                 </button>
                 <button 
                   onClick={handleClose}
                   className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium transition-colors shadow-lg shadow-rose-200"
                 >
                   Çıkış Yap
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default DayModal;