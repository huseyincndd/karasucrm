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
  LogOut,
  Globe,
  Briefcase,
  Edit
} from 'lucide-react';
import { ContentType, CONTENT_TO_DEPARTMENT } from '@/constants/staff';
import { useAuth } from '@/contexts/AuthContext';
import PortalSettingsModal from './PortalSettingsModal';
import AddServiceModal from './AddServiceModal';

interface ClientPlannerProps {
  client: Client;
  onClose: () => void;
  onUpdate: (client: Client) => void;
  onDelete?: (clientId: string) => void;
  onEditRequest?: (client: Client) => void;
}

interface ApiUser {
  id: string;
  name: string;
  roleTitle: string;
  avatar: string | null;
  capabilities: { type: string; price: number }[];
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

interface ClientServiceItem {
  id: string;
  serviceType: string;
  startDate: string;
  endDate: string;
  days: number;
  price: number;
  isPaid: boolean;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
}

interface PendingTask {
  date: string;
  contentType: ContentType;
  staffId: string;
  tempId: string; // To differentiate pending items
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const ClientPlanner: React.FC<ClientPlannerProps> = ({ client, onClose, onUpdate, onDelete, onEditRequest }) => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin ?? false;
  
  const [currentPeriodStart, setCurrentPeriodStart] = useState<Date>(new Date());
  const [activeType, setActiveType] = useState<ContentType | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<ApiUser | null>(null); // Bu ekranda seçili olan personel
  
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
  const [showPortalSettings, setShowPortalSettings] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [clientServices, setClientServices] = useState<ClientServiceItem[]>([]);

  const defaultQuota = PACKAGE_QUOTAS[client.package] || PACKAGE_QUOTAS.vitrin;
  const quota = {
    reels: client.reelsQuota ?? defaultQuota.reels,
    posts: client.postsQuota ?? defaultQuota.posts,
    stories: client.storiesQuota ?? defaultQuota.stories
  };

  // Initialize period based on client start date and today
  useEffect(() => {
    if (client.startDate) {
      const startDay = new Date(client.startDate).getDate();
      const today = new Date();
      let initDate = new Date(today.getFullYear(), today.getMonth(), startDay);
      
      // If today is before the start day in this month, go back one month
      if (initDate > today) {
        initDate.setMonth(initDate.getMonth() - 1);
      }
      setCurrentPeriodStart(initDate);
    }
  }, [client.startDate]);

  // Calculate Period End
  const periodEnd = useMemo(() => {
    const end = new Date(currentPeriodStart);
    end.setMonth(end.getMonth() + 1);
    return end;
  }, [currentPeriodStart]);

  // Fetch Staff
  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true);
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        // API'den gelen veriyi ApiUser formatına uygun hale getir
        // (capabilities zaten geliyor)
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
      const res = await fetch('/api/tasks'); 
      if (res.ok) {
        const data = await res.json();
        const clientTasks = data.tasks.filter((t: any) => t.clientId === client.id);
        const mapped: ApiTask[] = clientTasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          contentType: t.contentType || t.rawContentType || 'posts',
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

  // Fetch Client Services
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${client.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.client?.services) {
          setClientServices(data.client.services);
        }
      }
    } catch (error) {
      console.error('Services fetch error:', error);
    }
  }, [client.id]);

  useEffect(() => {
    fetchStaff();
    fetchTasks();
    fetchServices();
    setTimeout(() => setIsVisible(true), 10);
  }, [fetchStaff, fetchTasks, fetchServices]);

  // 1. Departman yerine Yetenek Bazlı Filtreleme
  const filteredStaff = useMemo(() => {
    if (!activeType) return [];
    
    // Yetenek Eşleşmesi
    // reels -> reels
    // posts -> post
    // stories -> social_management (veya post)
    
    let requiredCapability = '';
    if (activeType === 'reels') requiredCapability = 'reels';
    else if (activeType === 'posts') requiredCapability = 'post';
    else if (activeType === 'stories') requiredCapability = 'post'; // Story için de grafik tasarım (post) yeteneği aranıyor

    return staffList.filter(staff => 
      staff.capabilities?.some(c => c.type === requiredCapability)
    );
  }, [activeType, staffList]);

  // 2. Kategori Değişince Seçimi Sıfırla (Manuel Seçim İsteniyor)
  useEffect(() => {
    setSelectedStaff(null);
  }, [activeType]);

  // Combined View of Tasks (Existing - Deleted + Pending)
  const effectiveTasks = useMemo(() => {
    const current = existingTasks.filter(t => !deletedTaskIds.includes(t.id));
    const pending: ApiTask[] = pendingTasks.map(p => ({
      id: p.tempId,
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

  // Quota for Period
  const getRemaining = (type: ContentType) => {
    const total = quota[type];
    const used = effectiveTasks.filter(t => {
      const taskDate = new Date(t.date);
      taskDate.setHours(0,0,0,0);
      const pStart = new Date(currentPeriodStart); pStart.setHours(0,0,0,0);
      const pEnd = new Date(periodEnd); pEnd.setHours(0,0,0,0);
      return taskDate >= pStart && taskDate < pEnd && t.contentType === type;
    }).length;
    return total - used;
  };

  const generateDays = () => {
    const days: (Date | null)[] = [];
    const startDayIndex = (currentPeriodStart.getDay() + 6) % 7;
    for (let i = 0; i < startDayIndex; i++) days.push(null);
    const curr = new Date(currentPeriodStart);
    const end = new Date(periodEnd);
    while (curr < end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  };
  const days = generateDays();

  // Handle Date Click
  const handleDateClick = (dateObj: Date) => {
    if (!activeType || !selectedStaff) return;
    const yr = dateObj.getFullYear();
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0');
    const da = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;

    const pendingIndex = pendingTasks.findIndex(p => p.date === dateStr && p.contentType === activeType);
    if (pendingIndex >= 0) {
      setPendingTasks(prev => prev.filter((_, i) => i !== pendingIndex));
      return;
    }

    const existing = existingTasks.find(t => 
      t.date === dateStr && 
      t.contentType === activeType && 
      !deletedTaskIds.includes(t.id)
    );

    if (existing) {
      setDeletedTaskIds(prev => [...prev, existing.id]);
      return;
    }

    if (getRemaining(activeType) <= 0) return;

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
      const deletePromises = deletedTaskIds.map(id => 
        fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      );
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
      await fetchTasks();
      setPendingTasks([]);
      setDeletedTaskIds([]);
      onUpdate({ ...client });
    } catch (err) {
      alert('Kaydedilirken bir hata oluştu.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const attemptClose = () => {
    if (hasChanges) {
      setConfirmClose(true);
    } else {
      handleClose();
    }
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
      case 'stories': return 'Tasarım Ekibi';
    }
  };

  const prevPeriod = () => {
    const next = new Date(currentPeriodStart);
    next.setMonth(next.getMonth() - 1);
    setCurrentPeriodStart(next);
  };

  const nextPeriod = () => {
    const next = new Date(currentPeriodStart);
    next.setMonth(next.getMonth() + 1);
    setCurrentPeriodStart(next);
  };
  
  // ...

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={attemptClose} />
      
      <div 
        className={`relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden transition-transform duration-200 flex flex-col max-h-[95vh] md:max-h-[90vh] mx-2 ${isVisible ? 'scale-100' : 'scale-95'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
             {/* ... Logo/Name ... */}
             {client.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo} alt={client.name} className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {client.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900 text-sm md:text-base truncate">{client.name}</h2>
              <span className="text-[10px] md:text-xs text-slate-500">{PACKAGE_LABELS[client.package]}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
            {/* Düzenle */}
            {isAdmin && onEditRequest && (
              <button 
                onClick={() => onEditRequest(client)}
                className="p-1.5 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Müşteriyi Düzenle"
              >
                <Edit size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            )}
            {/* Hizmet Ekle */}
            {isAdmin && (
              <button 
                onClick={() => setShowServiceModal(true)}
                className="p-1.5 md:p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                title="Hizmet / Ödeme Ekle"
              >
                <Briefcase size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            )}
            {/* Portal Erişimi */}
            {isAdmin && (
              <button 
                onClick={() => setShowPortalSettings(true)}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${client.hasPortalAccess ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                title="Portal Erişimi"
              >
                <Globe size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            )}
            {isAdmin && onDelete && (
              <button 
                onClick={() => onDelete(client.id)}
                className="p-1.5 md:p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Müşteriyi Sil"
              >
                <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            )}
            <button onClick={attemptClose} className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {/* Period Selector */}
          <div className="flex items-center justify-center gap-2 md:gap-4 py-3 md:py-4 bg-slate-50 border-b border-slate-100">
            <button 
              onClick={prevPeriod}
              className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft size={18} className="md:w-5 md:h-5" />
            </button>
            <div className="text-center min-w-0">
              <span className="block text-sm md:text-lg font-semibold text-slate-900">
                {currentPeriodStart.getDate()} {MONTH_NAMES[currentPeriodStart.getMonth()]} - {periodEnd.getDate()} {MONTH_NAMES[periodEnd.getMonth()]}
              </span>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium">
                {currentPeriodStart.getFullYear()} Dönemi
              </span>
            </div>
            <button 
              onClick={nextPeriod}
              className="p-1.5 md:p-2 text-slate-400 hover:text-slate-600"
            >
              <ChevronRight size={18} className="md:w-5 md:h-5" />
            </button>
          </div>

          {/* Devam Eden Hizmetler */}
          {isAdmin && clientServices.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/30">
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={14} className="text-amber-600" />
                <span className="text-xs font-semibold text-amber-800">Aktif Hizmetler</span>
              </div>
              <div className="space-y-2">
                {clientServices.map((svc) => {
                  const now = new Date();
                  const end = new Date(svc.endDate);
                  const start = new Date(svc.startDate);
                  const totalMs = end.getTime() - start.getTime();
                  const elapsedMs = now.getTime() - start.getTime();
                  const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  const progress = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));
                  const isExpired = remainingDays === 0;
                  const serviceLabel = svc.serviceType === 'meta_ads' ? 'Meta Reklam' : svc.serviceType === 'social_media_management' ? 'Sosyal Medya Y.' : svc.serviceType === 'consultancy' ? 'Danışmanlık' : 'Diğer';

                  return (
                    <div key={svc.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isExpired ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-amber-200/50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isExpired ? 'bg-slate-100 text-slate-400' : 'bg-amber-100 text-amber-600'}`}>
                        <Briefcase size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800 truncate">{serviceLabel}</span>
                          <span className="text-[10px] text-slate-400">• {svc.user.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${isExpired ? 'bg-slate-300' : progress > 80 ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-[10px] font-bold whitespace-nowrap ${isExpired ? 'text-slate-400' : remainingDays <= 3 ? 'text-rose-500' : 'text-amber-600'}`}>
                            {isExpired ? 'Süresi Doldu' : `${remainingDays} gün kaldı`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 flex-shrink-0">{svc.price.toLocaleString('tr-TR')} ₺</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ... Resource Bar ... */}
           <div className="flex items-center justify-center gap-2 md:gap-3 p-3 md:p-4 border-b border-slate-100 overflow-x-auto">
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
                    flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all flex-shrink-0
                    ${isActive 
                      ? `bg-${config.color}-500 text-white shadow-lg` 
                      : `bg-${config.color}-50 text-${config.color}-600 hover:bg-${config.color}-100`
                    }
                  `}
                  style={{
                    backgroundColor: isActive ? config.bgActive : undefined
                  }}
                >
                  <Icon size={14} className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className={`
                    px-1 md:px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold
                    ${isActive ? 'bg-white/20' : 'bg-white'}
                  `}>
                    {remaining}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ... Staff Selector ... */}
          {activeType && (
            <div className="bg-slate-50 border-b border-slate-200">
               {/* Başlık ve Departman Bilgisi */}
               <div className="px-4 py-3 pb-0 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                     <Users size={14} />
                     {getDepartmentLabel(activeType)}
                  </span>
                  {selectedStaff && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check size={12} />
                      Seçilen: {selectedStaff.name}
                    </span>
                  )}
               </div>

               {/* Personel Listesi Grid */}
               <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                 {staffLoading ? (
                    <div className="col-span-full py-4 text-center text-slate-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                      <span className="text-sm">Personel listesi yükleniyor...</span>
                    </div>
                 ) : filteredStaff.length === 0 ? (
                    <div className="col-span-full py-4 text-center text-slate-400 bg-slate-100/50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-sm font-medium">Bu kategoride uygun personel bulunamadı.</p>
                      <p className="text-xs mt-1">Lütfen personel yeteneklerini kontrol ediniz.</p>
                    </div>
                 ) : (
                    filteredStaff.map(staff => {
                      const isSelected = selectedStaff?.id === staff.id;
                      const config = getTypeConfig(activeType);

                      return (
                        <button
                          key={staff.id}
                          onClick={() => setSelectedStaff(isSelected ? null : staff)}
                          className={`
                            relative group flex items-center gap-3 p-2 rounded-xl border transition-all duration-200 text-left
                            ${isSelected 
                              ? `bg-white border-${config.color}-500 shadow-md ring-1 ring-${config.color}-500` 
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }
                          `}
                        >
                          <div className="relative">
                            {staff.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={staff.avatar} alt={staff.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isSelected ? `bg-${config.color}-100 text-${config.color}-600` : 'bg-slate-100 text-slate-500'}`}>
                                {staff.name.charAt(0)}
                              </div>
                            )}
                            {isSelected && (
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-${config.color}-500 text-white flex items-center justify-center ring-2 ring-white`}>
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold truncate ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                              {staff.name}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {staff.roleTitle}
                            </p>
                          </div>
                        </button>
                      );
                    })
                 )}
               </div>
            </div>
          )}

          {/* Instructions */}
           {activeType && (
            <div className="px-3 md:px-4 py-2 bg-slate-50 text-center text-[10px] md:text-xs text-slate-500">
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

          {/* Calendar Grid */}
          <div className="p-2 md:p-4">
            <div className="grid grid-cols-7 mb-1 md:mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-[10px] md:text-xs font-medium text-slate-400 py-1 md:py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((dayObj, index) => {
                if (dayObj === null) {
                  return <div key={index} className="aspect-square bg-slate-50/50 rounded-lg" />;
                }

                // Get date strings
                const yr = dayObj.getFullYear();
                const mo = String(dayObj.getMonth() + 1).padStart(2, '0');
                const da = String(dayObj.getDate()).padStart(2, '0');
                const dateStr = `${yr}-${mo}-${da}`;

                // Check content
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
                    onClick={() => handleDateClick(dayObj)}
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
                    <span className="text-sm font-medium">{dayObj.getDate()}</span>
                    
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
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0 gap-2">
          <div className="hidden sm:flex items-center gap-3 md:gap-4 text-[10px] md:text-xs text-slate-400">
             {!hasChanges && (
               <>
                <span className="flex items-center gap-1 md:gap-1.5">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-rose-500" />
                  Reels
                </span>
                <span className="flex items-center gap-1 md:gap-1.5">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-blue-500" />
                  Post
                </span>
                <span className="flex items-center gap-1 md:gap-1.5">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-purple-500" />
                  Story
                </span>
               </>
             )}
             {hasChanges && (
               <span className="text-indigo-600 font-medium animate-pulse text-xs">
                Değişiklikler var
               </span>
             )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
             <button
               onClick={attemptClose}
               className="flex-1 sm:flex-none px-3 md:px-4 py-2 text-xs md:text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors text-center"
               disabled={saving}
             >
               Vazgeç
             </button>
             <button
               onClick={handleSave}
               disabled={!hasChanges || saving}
               className={`
                 flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 rounded-lg text-xs md:text-sm font-medium transition-all
                 ${hasChanges 
                   ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transform scale-105' 
                   : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                 }
               `}
             >
               {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} className="md:w-4 md:h-4" />}
               Kaydet
             </button>
          </div>
        </div>
        
        {/* Confirm Close Overlay */}
        {confirmClose && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-8">
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

      {/* Portal Settings Modal */}
      {showPortalSettings && (
        <PortalSettingsModal 
          client={client}
          isOpen={showPortalSettings}
          onClose={() => setShowPortalSettings(false)}
          onUpdate={() => {
            // Client'ı yeniden yüklemek yerine, sadece portal erişim flag'ini güncellemek yeterli olabilir,
            // ama en temizi parent'ı tetiklemek.
            // onUpdate fonksiyonunu tetiklemek için client objesini güncellememiz gerekebilir
            // fakat onUpdate parametre bekliyor. Biz burada API'den güncel client'ı çekebiliriz
            // ya da basitçe manual güncelleme yapabiliriz.
            
            // Basit güncelleme: 
            // PortalSettingsModal zaten başarılı olduğunda çalışıyor.
            // Client state'ini güncellemek için fetch yapalım.
            fetch(`/api/clients/${client.id}`)
              .then(res => res.json())
              .then(data => {
                if (data.client) {
                  // API response formatına uygun map fonksiyonunu kullanmamız lazım ama burada yok.
                  // ClientPlanner'a map fonksiyonu geçmek yerine, 
                  // onUpdate'i tetikleyelim, parent (ClientsPage) veriyi yönetiyor.
                  // Ancak mapApiClientToClient fonksiyonuna erişimimiz yok (o parent dosyada).
                  
                  // Çözüm: Parent component (ClientsPage) zaten onUpdate ile state'i güncelliyor.
                  // Bizim burada güncel veriyi parent'a göndermemiz lazım.
                  
                  // Hızlı çözüm: manuel mapping (ClientsPage'dekiyle aynı mantık)
                  const apiC = data.client;
                  const updatedClient: Client = {
                    id: apiC.id,
                    name: apiC.name,
                    logo: apiC.logo || undefined,
                    package: apiC.packageType as PackageType,
                    startDate: apiC.startDate,
                    renewalDate: apiC.renewalDate,
                    usedQuota: apiC.usedQuota,
                    plannedDates: apiC.plannedDates,
                    hasPortalAccess: apiC.hasPortalAccess,
                    portalUsername: apiC.portalUsername
                  };
                  onUpdate(updatedClient);
                }
              });
          }}
        />
      )}

      {/* Hizmet Ekle Modalı */}
      {showServiceModal && (
        <AddServiceModal
          client={client}
          staffList={staffList}
          onClose={() => setShowServiceModal(false)}
          onSuccess={() => {
            setShowServiceModal(false);
            fetchServices();
          }}
        />
      )}
    </div>
  );
};

export default ClientPlanner;
