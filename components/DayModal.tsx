'use client';

import React, { useEffect, useState } from 'react';
import { Task, Platform, Status } from '@/types';
import { 
  X, 
  Video, 
  Image as ImageIcon, 
  Circle,
  ChevronDown,
  User,
  Calendar,
  Save,
  Check
} from 'lucide-react';
import { STAFF_MEMBERS, StaffMember } from '@/constants/staff';

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SIMULATED_TODAY_DATE = 27;

type TaskStatusType = 'beklemede' | 'acil' | 'hazir' | 'bitti';
type DropdownType = 'status' | 'assignee' | 'date';

interface TaskChange {
  taskId: string;
  assigneeId?: string;
  newDate?: string;
  status?: TaskStatusType;
}

interface DayModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  dayNum: number;
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: { assigneeId?: string; newDate?: string }) => void;
  onSaveChanges?: (changes: TaskChange[]) => void;
}

const STATUS_CONFIG = {
  beklemede: { label: 'Beklemede', dot: 'bg-slate-300', text: 'text-slate-600', bg: 'bg-slate-50' },
  acil: { label: 'Acil', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' },
  hazir: { label: 'Hazır', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  bitti: { label: 'Bitti', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
};

// Generate available dates for the next 14 days
const generateAvailableDates = () => {
  const dates: { value: string; label: string; dayNum: number }[] = [];
  const today = new Date(2026, 0, SIMULATED_TODAY_DATE); // Using simulated today
  
  for (let i = 0; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayNum = date.getDate();
    const monthName = MONTH_NAMES[date.getMonth()];
    
    dates.push({
      value: date.toISOString().split('T')[0],
      label: `${dayNum} ${monthName}`,
      dayNum
    });
  }
  
  return dates;
};

const AVAILABLE_DATES = generateAvailableDates();

const DayModal: React.FC<DayModalProps> = ({ isOpen, onClose, date, dayNum, tasks, onTaskUpdate, onSaveChanges }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatusType>>({});
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({});
  const [taskDates, setTaskDates] = useState<Record<string, string>>({});
  const [openDropdown, setOpenDropdown] = useState<{ taskId: string; type: DropdownType } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Store initial values for change detection
  const [initialStatuses, setInitialStatuses] = useState<Record<string, TaskStatusType>>({});
  const [initialAssignees, setInitialAssignees] = useState<Record<string, string>>({});
  const [initialDates, setInitialDates] = useState<Record<string, string>>({});

  // Initialize states
  useEffect(() => {
    if (isOpen) {
      const initStatuses: Record<string, TaskStatusType> = {};
      const initAssignees: Record<string, string> = {};
      const initDates: Record<string, string> = {};
      
      tasks.forEach(task => {
        initAssignees[task.id] = (task as any).assigneeId || STAFF_MEMBERS[0]?.id || '';
        initDates[task.id] = date;
        
        if (task.status === Status.PUBLISHED) {
          initStatuses[task.id] = 'bitti';
        } else if (task.fileUrl) {
          initStatuses[task.id] = 'hazir';
        } else {
          const daysUntil = dayNum - SIMULATED_TODAY_DATE;
          initStatuses[task.id] = daysUntil <= 2 ? 'acil' : 'beklemede';
        }
      });
      
      // Set current states
      setTaskStatuses(initStatuses);
      setTaskAssignees(initAssignees);
      setTaskDates(initDates);
      
      // Store initial values for change detection
      setInitialStatuses(initStatuses);
      setInitialAssignees(initAssignees);
      setInitialDates(initDates);
      
      // Reset save state
      setSaveSuccess(false);
      setIsSaving(false);
      
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
      setOpenDropdown(null);
    }
  }, [isOpen, tasks, dayNum, date]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openDropdown]);

  // ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const dateObj = new Date(date);
  const monthName = MONTH_NAMES[dateObj.getMonth()];

  const handleStatusChange = (taskId: string, newStatus: TaskStatusType) => {
    setTaskStatuses(prev => ({ ...prev, [taskId]: newStatus }));
    setOpenDropdown(null);
    setSaveSuccess(false);
  };

  const handleAssigneeChange = (taskId: string, newAssigneeId: string) => {
    setTaskAssignees(prev => ({ ...prev, [taskId]: newAssigneeId }));
    setOpenDropdown(null);
    setSaveSuccess(false);
  };

  const handleDateChange = (taskId: string, newDate: string) => {
    setTaskDates(prev => ({ ...prev, [taskId]: newDate }));
    setOpenDropdown(null);
    setSaveSuccess(false);
  };



  // Check if there are any changes
  const hasChanges = tasks.some(task => {
    const statusChanged = taskStatuses[task.id] !== initialStatuses[task.id];
    const assigneeChanged = taskAssignees[task.id] !== initialAssignees[task.id];
    const dateChanged = taskDates[task.id] !== initialDates[task.id];
    return statusChanged || assigneeChanged || dateChanged;
  });

  // Get all changed tasks
  const getChangedTasks = (): TaskChange[] => {
    const changes: TaskChange[] = [];
    
    tasks.forEach(task => {
      const statusChanged = taskStatuses[task.id] !== initialStatuses[task.id];
      const assigneeChanged = taskAssignees[task.id] !== initialAssignees[task.id];
      const dateChanged = taskDates[task.id] !== initialDates[task.id];
      
      if (statusChanged || assigneeChanged || dateChanged) {
        changes.push({
          taskId: task.id,
          ...(assigneeChanged && { assigneeId: taskAssignees[task.id] }),
          ...(dateChanged && { newDate: taskDates[task.id] }),
          ...(statusChanged && { status: taskStatuses[task.id] }),
        });
      }
    });
    
    return changes;
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    const changes = getChangedTasks();
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Call the callback if provided
    onSaveChanges?.(changes);
    
    // Update initial values to current values (so hasChanges becomes false)
    setInitialStatuses({ ...taskStatuses });
    setInitialAssignees({ ...taskAssignees });
    setInitialDates({ ...taskDates });
    
    setIsSaving(false);
    setSaveSuccess(true);
    
    // Reset success message after 2 seconds
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const getPlatformIcon = (platform: Platform) => {
    switch (platform) {
      case Platform.REEL: return <Video size={14} />;
      case Platform.POST: return <ImageIcon size={14} />;
      case Platform.STORY: return <Circle size={14} />;
    }
  };

  const getAssigneeName = (assigneeId: string): StaffMember | undefined => {
    return STAFF_MEMBERS.find(s => s.id === assigneeId);
  };

  const getDateLabel = (dateValue: string): string => {
    const found = AVAILABLE_DATES.find(d => d.value === dateValue);
    if (found) return found.label;
    const d = new Date(dateValue);
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  };

  // Stats
  const doneCount = Object.values(taskStatuses).filter(s => s === 'bitti').length;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-4xl h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{dayNum} {monthName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{doneCount}/{tasks.length} görev tamamlandı</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const status = taskStatuses[task.id] || 'beklemede';
              const config = STATUS_CONFIG[status];
              const isUrgent = status === 'acil';
              const isDone = status === 'bitti';
              const currentAssignee = getAssigneeName(taskAssignees[task.id]);
              const currentDateLabel = getDateLabel(taskDates[task.id] || date);
              
              return (
                <div 
                  key={task.id}
                  className={`
                    flex items-center gap-3 px-6 py-4 transition-colors relative
                    ${isDone ? 'bg-slate-50/50' : 'hover:bg-slate-50'}
                    ${isUrgent ? 'bg-rose-50/30' : ''}
                  `}
                >
                  {/* Urgent indicator - subtle left border */}
                  {isUrgent && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400" />
                  )}

                  {/* Status Dot */}
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`} />

                  {/* Client */}
                  <div className="min-w-[120px]">
                    <p className={`font-medium text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                      {task.clientName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{task.title}</p>
                  </div>

                  {/* Platform */}
                  <div className="flex items-center gap-1.5 text-slate-400 min-w-[60px]">
                    {getPlatformIcon(task.platform)}
                    <span className="text-xs">{task.platform}</span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(
                          openDropdown?.taskId === task.id && openDropdown?.type === 'status' 
                            ? null 
                            : { taskId: task.id, type: 'status' }
                        );
                      }}
                      className={`
                        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                        transition-colors cursor-pointer min-w-[90px] justify-between
                        ${config.bg} ${config.text} hover:opacity-80
                      `}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </span>
                      <ChevronDown size={12} />
                    </button>
                    
                    {/* Status Dropdown Menu */}
                    {openDropdown?.taskId === task.id && openDropdown?.type === 'status' && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[120px]">
                        {(Object.keys(STATUS_CONFIG) as TaskStatusType[]).map((statusKey) => {
                          const statusConf = STATUS_CONFIG[statusKey];
                          return (
                            <button
                              key={statusKey}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(task.id, statusKey);
                              }}
                              className={`
                                w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                                hover:bg-slate-50 transition-colors
                                ${status === statusKey ? 'bg-slate-50' : ''}
                              `}
                            >
                              <span className={`w-2 h-2 rounded-full ${statusConf.dot}`} />
                              <span className={statusConf.text}>{statusConf.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Assignee Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(
                          openDropdown?.taskId === task.id && openDropdown?.type === 'assignee' 
                            ? null 
                            : { taskId: task.id, type: 'assignee' }
                        );
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer min-w-[100px] justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <User size={12} />
                        <span className="truncate max-w-[60px]">{currentAssignee?.name || 'Seç'}</span>
                      </span>
                      <ChevronDown size={12} />
                    </button>
                    
                    {/* Assignee Dropdown Menu */}
                    {openDropdown?.taskId === task.id && openDropdown?.type === 'assignee' && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[160px] max-h-[200px] overflow-y-auto">
                        {STAFF_MEMBERS.map((staff) => (
                          <button
                            key={staff.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssigneeChange(task.id, staff.id);
                            }}
                            className={`
                              w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                              hover:bg-slate-50 transition-colors
                              ${taskAssignees[task.id] === staff.id ? 'bg-indigo-50' : ''}
                            `}
                          >
                            <img 
                              src={staff.avatar} 
                              alt={staff.name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-700 truncate">{staff.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{staff.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Date Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown(
                          openDropdown?.taskId === task.id && openDropdown?.type === 'date' 
                            ? null 
                            : { taskId: task.id, type: 'date' }
                        );
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors cursor-pointer min-w-[90px] justify-between"
                    >
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span className="truncate">{currentDateLabel}</span>
                      </span>
                      <ChevronDown size={12} />
                    </button>
                    
                    {/* Date Dropdown Menu */}
                    {openDropdown?.taskId === task.id && openDropdown?.type === 'date' && (
                      <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 min-w-[130px] max-h-[250px] overflow-y-auto">
                        {AVAILABLE_DATES.map((dateOption) => {
                          const isToday = dateOption.dayNum === SIMULATED_TODAY_DATE;
                          const isCurrentDate = taskDates[task.id] === dateOption.value;
                          
                          return (
                            <button
                              key={dateOption.value}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDateChange(task.id, dateOption.value);
                              }}
                              className={`
                                w-full flex items-center gap-2 px-3 py-2 text-xs text-left
                                hover:bg-slate-50 transition-colors
                                ${isCurrentDate ? 'bg-sky-50' : ''}
                              `}
                            >
                              <Calendar size={12} className={isCurrentDate ? 'text-sky-600' : 'text-slate-400'} />
                              <span className={`${isCurrentDate ? 'text-sky-600 font-medium' : 'text-slate-600'}`}>
                                {dateOption.label}
                              </span>
                              {isToday && (
                                <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">
                                  Bugün
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Spacer */}
                  <div className="flex-1" />
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                Bu gün için görev yok
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300" />
              Beklemede
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Acil
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Hazır
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Bitti
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Success message */}
            {saveSuccess && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium animate-pulse">
                <Check size={16} />
                Kaydedildi!
              </span>
            )}
            
            {/* Save Changes Button */}
            {hasChanges && !saveSuccess && (
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving}
                className={`
                  flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${isSaving 
                    ? 'bg-emerald-400 text-white cursor-not-allowed' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                  }
                `}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Değişiklikleri Kaydet
                  </>
                )}
              </button>
            )}
            
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayModal;
