'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Select from 'react-select';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  CalendarDays,
  Video, 
  Image as ImageIcon, 
  Circle,
  Clock,
  CheckCircle2,
  Hourglass,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  RefreshCw,
  Menu,
  AlertTriangle,
  ArrowRight,
  Package,
  Briefcase,
  Megaphone,
  Share2,
  Globe,
  Calendar,
  Users,
  Crown,
  Sparkles
} from 'lucide-react';

// İçerik tipi konfigürasyonu
const CONTENT_CONFIG: Record<string, { label: string; icon: typeof Video; color: string; bg: string; dot: string }> = {
  reels: { label: 'Reels', icon: Video, color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' },
  posts: { label: 'Post', icon: ImageIcon, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  stories: { label: 'Story', icon: Circle, color: 'text-purple-600', bg: 'bg-purple-50', dot: 'bg-purple-500' },
};

// Durum konfigürasyonu
const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string; bg: string; border: string; description: string }> = {
  beklemede: { 
    label: 'Hazırlanıyor', 
    icon: Clock, 
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    description: 'İçerik hazırlanma aşamasında'
  },
  hazir: { 
    label: 'Hazır', 
    icon: Hourglass, 
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    description: 'İçerik hazır, paylaşılmayı bekliyor'
  },
  tamamlandi: { 
    label: 'Yayınlandı', 
    icon: CheckCircle2, 
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    description: 'İçerik başarıyla yayınlandı'
  },
};

const PACKAGE_LABELS: Record<string, string> = {
  star: 'Star Paketi',
  gold: 'Gold Paketi',
  premium: 'Premium Paketi',
  custom: 'Özel Paket'
};

const PACKAGE_QUOTAS: Record<string, { reels: number; posts: number; stories: number }> = {
  star: { reels: 1, posts: 3, stories: 2 },
  gold: { reels: 4, posts: 5, stories: 5 },
  premium: { reels: 6, posts: 7, stories: 8 },
  custom: { reels: 0, posts: 0, stories: 0 }
};

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
  isExtra?: boolean;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return {
    full: `${day} ${months[date.getMonth()]} ${date.getFullYear()}`,
    short: `${day} ${months[date.getMonth()]}`,
    dayName: dayNames[date.getDay()],
  };
};

const getDaysUntil = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const formatShortTr = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export default function PlansPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const isClient = user?.isClient ?? false;

  // State
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Müşteri değilse yönlendir
  useEffect(() => {
    if (!authLoading && user && !isClient) {
      router.push('/tasks');
    }
  }, [user, authLoading, isClient, router]);

  // Task'ları getir
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Geçmiş 30 gün + gelecek 90 gün
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString().split('T')[0]);
      params.append('endDate', endDate.toISOString().split('T')[0]);

      const res = await fetch(`/api/tasks?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Planlar yüklenemedi');
      }

      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
      fetchTasks();
    }
  }, [authLoading, user, fetchTasks]);

  // Filtreleme
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (selectedStatus !== 'all' && task.status !== selectedStatus) return false;
      if (selectedType !== 'all' && task.contentType !== selectedType) return false;
      return true;
    });
  }, [tasks, selectedStatus, selectedType]);

  // Aylara göre grupla
  const tasksByMonth = useMemo(() => {
    const grouped: Record<string, ApiTask[]> = {};
    
    // Sort by date
    const sorted = [...filteredTasks].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sorted.forEach(task => {
      const date = new Date(task.date);
      const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const key = `${months[date.getMonth()]} ${date.getFullYear()}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(task);
    });
    
    return grouped;
  }, [filteredTasks]);

  // İstatistikler
  const stats = useMemo(() => {
    const total = tasks.length;
    const beklemede = tasks.filter(t => t.status === 'beklemede').length;
    const hazir = tasks.filter(t => t.status === 'hazir').length;
    const tamamlandi = tasks.filter(t => t.status === 'tamamlandi').length;
    const upcoming = tasks.filter(t => getDaysUntil(t.date) >= 0 && t.status !== 'tamamlandi').length;
    
    // İçerik tipine göre toplam (planlanan + tamamlanan)
    const reels = tasks.filter(t => t.contentType === 'reels').length;
    const posts = tasks.filter(t => t.contentType === 'posts').length;
    const stories = tasks.filter(t => t.contentType === 'stories').length;

    // İçerik tipine göre tamamlanan
    const reelsCompleted = tasks.filter(t => t.contentType === 'reels' && t.status === 'tamamlandi').length;
    const postsCompleted = tasks.filter(t => t.contentType === 'posts' && t.status === 'tamamlandi').length;
    const storiesCompleted = tasks.filter(t => t.contentType === 'stories' && t.status === 'tamamlandi').length;
    
    const extraCount = tasks.filter(t => t.isExtra).length;

    return { 
      total, beklemede, hazir, tamamlandi, upcoming, 
      reels, posts, stories,
      reelsCompleted, postsCompleted, storiesCompleted,
      extraCount
    };
  }, [tasks]);

  // Paket kotası
  const packageType = user?.packageType || 'star';
  const defaultQuota = PACKAGE_QUOTAS[packageType] || PACKAGE_QUOTAS.star;
  const quota = {
    reels: user?.reelsQuota ?? defaultQuota.reels,
    posts: user?.postsQuota ?? defaultQuota.posts,
    stories: user?.storiesQuota ?? defaultQuota.stories
  };

  const packageStart = user?.startDate;
  const packageEnd = user?.renewalDate;
  
  const packageCard = useMemo(() => {
    if (!isClient || !packageStart || !packageEnd) return null;

    const start = new Date(packageStart);
    const end = new Date(packageEnd);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const progress = clamp((elapsedDays / totalDays) * 100, 0, 100);

    const remainingDays = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isExpired = remainingDays === 0;

    return { progress, remainingDays, isExpired };
  }, [isClient, packageStart, packageEnd]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  // Default expanded for current and future months
  useEffect(() => {
    const currentMonth = new Date();
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const currentKey = `${months[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
    setExpandedMonths(prev => ({ ...prev, [currentKey]: true }));
  }, []);

  // Premium Paket Tasarım Konfigürasyonu
  const getPackageConfig = (pkg: string) => {
    switch(pkg) {
      case 'star':
        return {
          gradient: 'from-blue-600 via-blue-700 to-indigo-900',
          borderLight: 'border-blue-400/30',
          textColor: 'text-blue-50',
          bulletColor: 'bg-blue-400',
          title: 'STAR',
          subtitle: 'REKLAM YÖNETİMİ\nİNSTAGRAM+FACEBOOK',
          features: [
            'Reklam Yönetimi',
            '1 Adet Yapay Zeka Video',
            '5 Adet Grafik Tasarım',
            'İçerik Danışmanlığı',
            'Sosyal Medya Ekibi',
            'Takipçi + Beğeni + İzlenme'
          ]
        };
      case 'gold':
        return {
          gradient: 'from-amber-400 via-orange-500 to-rose-600',
          borderLight: 'border-amber-300/30',
          textColor: 'text-amber-50',
          bulletColor: 'bg-amber-200',
          title: 'GOLD',
          subtitle: 'SOSYAL MEDYA YÖNETİMİ\nİNSTAGRAM+FACEBOOK',
          features: [
            'Sosyal Medya Yönetimi',
            'Reklam Yönetimi',
            '4 Adet Yapay Zeka Video',
            '10 Adet Grafik Tasarım',
            'İçerik Danışmanlığı',
            'Sosyal Medya Ekibi',
            'Takipçi + Beğeni + İzlenme'
          ]
        };
      case 'premium':
        return {
          gradient: 'from-fuchsia-500 via-purple-600 to-violet-900',
          borderLight: 'border-fuchsia-300/30',
          textColor: 'text-fuchsia-50',
          bulletColor: 'bg-fuchsia-300',
          title: 'PREMİUM',
          subtitle: 'KAMERA ÇEKİMİ+GOOGLE\nİNSTAGRAM+FACEBOOK',
          features: [
            'Kamera Çekimi',
            'Sosyal Medya Yönetimi',
            'Google Yönetimi',
            'Reklam Yönetimi',
            '3 Adet Kadın Sunuculu Reklam Video',
            '3 Adet Tanıtım Video',
            '15 Adet Grafik Tasarım',
            'İçerik Danışmanlığı',
            'Sosyal Medya Ekibi'
          ]
        };
      default:
        return {
          gradient: 'from-slate-700 via-slate-800 to-slate-900',
          borderLight: 'border-slate-500/30',
          textColor: 'text-slate-100',
          bulletColor: 'bg-slate-400',
          title: 'ÖZEL',
          subtitle: 'MÜŞTERİYE ÖZEL TASARIM\nSOSYAL MEDYA',
          features: [
            `${quota.reels} Adet Video İçerik`,
            `${quota.posts + quota.stories} Adet Grafik Tasarım`,
            'Özel İçerik Planlaması',
            'Sosyal Medya Ekibi'
          ]
        };
    }
  };

  const pkgConfig = getPackageConfig(packageType);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full bg-slate-50 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 relative bg-slate-50/50">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 flex-shrink-0 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <CalendarDays size={22} className="text-indigo-500" />
                  <h1 className="text-xl font-bold text-slate-900">Planlarım</h1>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 ml-8">İçerik planınızı ve yayın takviminizi görüntüleyin</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Paket Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                <Package size={14} className="text-indigo-500" />
                <span className="text-xs font-semibold text-indigo-700">{PACKAGE_LABELS[packageType] || packageType}</span>
              </div>

              {/* Refresh */}
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Yenile"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <Select 
                options={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'beklemede', label: 'Hazırlanıyor' },
                  { value: 'hazir', label: 'Hazır' },
                  { value: 'tamamlandi', label: 'Yayınlandı' }
                ]}
                value={[
                  { value: 'all', label: 'Tüm Durumlar' },
                  { value: 'beklemede', label: 'Hazırlanıyor' },
                  { value: 'hazir', label: 'Hazır' },
                  { value: 'tamamlandi', label: 'Yayınlandı' }
                ].find(opt => opt.value === selectedStatus)}
                onChange={(opt: any) => setSelectedStatus(opt?.value || 'all')}
                className="w-48 text-sm"
                classNamePrefix="react-select"
                isSearchable={false}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                    borderRadius: '0.75rem',
                    minHeight: '40px',
                    boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': { 
                      borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
                      backgroundColor: '#ffffff'
                    }
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: '1rem',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden',
                    marginTop: '8px',
                    padding: '4px'
                  }),
                  menuList: (base) => ({
                    ...base,
                    padding: 0
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected 
                      ? '#eef2ff' 
                      : state.isFocused 
                        ? '#f8fafc' 
                        : 'transparent',
                    color: state.isSelected ? '#4f46e5' : '#334155',
                    cursor: 'pointer',
                    borderRadius: '0.5rem',
                    margin: '2px 0',
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    fontWeight: state.isSelected ? 600 : 500,
                    transition: 'all 0.15s ease',
                    '&:active': { backgroundColor: '#e0e7ff' }
                  }),
                  singleValue: (base) => ({
                    ...base,
                    fontWeight: 600,
                    color: '#1e293b'
                  })
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Select 
                options={[
                  { value: 'all', label: 'Tüm İçerikler' },
                  { value: 'reels', label: 'Reels' },
                  { value: 'posts', label: 'Post' },
                  { value: 'stories', label: 'Story' }
                ]}
                value={[
                  { value: 'all', label: 'Tüm İçerikler' },
                  { value: 'reels', label: 'Reels' },
                  { value: 'posts', label: 'Post' },
                  { value: 'stories', label: 'Story' }
                ].find(opt => opt.value === selectedType)}
                onChange={(opt: any) => setSelectedType(opt?.value || 'all')}
                className="w-48 text-sm"
                classNamePrefix="react-select"
                isSearchable={false}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                styles={{
                  control: (base, state) => ({
                    ...base,
                    backgroundColor: state.isFocused ? '#ffffff' : '#f8fafc',
                    borderColor: state.isFocused ? '#6366f1' : '#e2e8f0',
                    borderRadius: '0.75rem',
                    minHeight: '40px',
                    boxShadow: state.isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.1)' : 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    '&:hover': { 
                      borderColor: state.isFocused ? '#6366f1' : '#cbd5e1',
                      backgroundColor: '#ffffff'
                    }
                  }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: '1rem',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                    border: '1px solid #f1f5f9',
                    overflow: 'hidden',
                    marginTop: '8px',
                    padding: '4px'
                  }),
                  menuList: (base) => ({
                    ...base,
                    padding: 0
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected 
                      ? '#eef2ff' 
                      : state.isFocused 
                        ? '#f8fafc' 
                        : 'transparent',
                    color: state.isSelected ? '#4f46e5' : '#334155',
                    cursor: 'pointer',
                    borderRadius: '0.5rem',
                    margin: '2px 0',
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    fontWeight: state.isSelected ? 600 : 500,
                    transition: 'all 0.15s ease',
                    '&:active': { backgroundColor: '#e0e7ff' }
                  }),
                  singleValue: (base) => ({
                    ...base,
                    fontWeight: 600,
                    color: '#1e293b'
                  })
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 flex flex-col xl:flex-row gap-6 lg:gap-8">
            
            {/* Main Content Column */}
            <div className="flex-1 min-w-0 space-y-6 max-w-4xl mx-auto xl:mx-0 xl:max-w-none w-full order-2 xl:order-1">

            {/* Paket Dönemi (Merkezi) */}
            {isClient && packageStart && packageEnd && (
              <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 rounded-2xl p-[1px] shadow-lg shadow-indigo-500/10">
                <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-5 md:px-7 md:py-6 text-white">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20">
                      <Calendar size={14} className="text-white/90" />
                      <span className="text-xs font-semibold tracking-wide">PAKET DÖNEMİ</span>
                    </div>

                    <div className="text-xl md:text-3xl font-extrabold leading-tight">
                      {formatShortTr(packageStart)} <span className="text-white/70 font-semibold">—</span> {formatShortTr(packageEnd)}
                    </div>

                    {packageCard && (
                      <div className="w-full max-w-xl mt-2">
                        <div className="flex items-center justify-between text-xs text-white/85">
                          <span className="font-medium">
                            {packageCard.isExpired ? 'Süre doldu' : `${packageCard.remainingDays} gün kaldı`}
                          </span>
                          <span className="font-semibold">{Math.round(packageCard.progress)}%</span>
                        </div>
                        <div className="mt-2 h-2.5 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white/90 rounded-full transition-all duration-500"
                            style={{ width: `${packageCard.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Toplam İçerik</span>
                  <CalendarDays size={16} className="text-indigo-400" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Hazırlanıyor</span>
                  <Clock size={16} className="text-slate-400" />
                </div>
                <p className="text-2xl font-bold text-slate-600">{stats.beklemede}</p>
              </div>
              
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Hazır</span>
                  <Hourglass size={16} className="text-amber-400" />
                </div>
                <p className="text-2xl font-bold text-amber-600">{stats.hazir}</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500">Yayınlandı</span>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                </div>
                <p className="text-2xl font-bold text-emerald-600">{stats.tamamlandi}</p>
              </div>
            </div>

            {/* Kota Kullanımı */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Aylık İçerik Kotası</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { 
                    type: 'reels', 
                    label: 'Reels', 
                    planned: stats.reels, 
                    completed: stats.reelsCompleted, 
                    total: quota.reels, 
                    color: 'bg-rose-500', 
                    lightColor: 'bg-rose-200',
                    textColor: 'text-rose-600'
                  },
                  { 
                    type: 'posts', 
                    label: 'Post', 
                    planned: stats.posts, 
                    completed: stats.postsCompleted, 
                    total: quota.posts, 
                    color: 'bg-blue-500', 
                    lightColor: 'bg-blue-200',
                    textColor: 'text-blue-600'
                  },
                  { 
                    type: 'stories', 
                    label: 'Story', 
                    planned: stats.stories, 
                    completed: stats.storiesCompleted, 
                    total: quota.stories, 
                    color: 'bg-purple-500', 
                    lightColor: 'bg-purple-200',
                    textColor: 'text-purple-600'
                  },
                ].map(item => {
                  const completedPercent = Math.min((item.completed / item.total) * 100, 100);
                  // Planlanan, tamamlananı da içeriyor mu? Evet içeriyor (stats.reels tüm tasklar).
                  // O zaman Planlanan - Tamamlanan = Sadece Planlanan (Bekleyen/Hazır)
                  const onlyPlannedCount = item.planned - item.completed;
                  const onlyPlannedPercent = Math.min((onlyPlannedCount / item.total) * 100, 100);
                  
                  // Toplam yüzde (bar genişliği için değil, taşma kontrolü için)
                  const totalPercent = Math.min(completedPercent + onlyPlannedPercent, 100);

                  return (
                    <div key={item.type} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${item.textColor}`}>{item.label}</span>
                        <span className="text-xs font-medium text-slate-400">
                           <span className="text-slate-900 font-bold">{item.planned}</span>/{item.total}
                        </span>
                      </div>
                      
                      {/* Stacked Progress Bar */}
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex w-full">
                        {/* Tamamlanan Kısım */}
                        <div 
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${completedPercent}%` }}
                          title={`${item.completed} Tamamlandı`}
                        />
                        {/* Sadece Planlanan Kısım */}
                        <div 
                          className={`h-full ${item.lightColor} transition-all duration-500`}
                          style={{ width: `${onlyPlannedPercent}%` }}
                          title={`${onlyPlannedCount} Planlandı (Beklemede/Hazır)`}
                        />
                      </div>

                      {/* Detay Metni */}
                      <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-500 mt-0.5">
                        <div className="flex items-center gap-2">
                           <span className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.lightColor}`}></div>
                              {onlyPlannedCount} Planlandı
                           </span>
                           <span className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                              {item.completed} Tamamlandı
                           </span>
                        </div>
                        <span>Hak: {item.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aktif Ek Hizmetler */}
            {user?.services && user.services.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm mt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Briefcase size={16} className="text-indigo-500" />
                  Aktif Ek Hizmetler
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.services.map(service => {
                    const getServiceLabel = (type: string) => {
                      switch (type) {
                        case 'meta_ads': return 'Meta Reklam Yönetimi';
                        case 'social_media_management': return 'Sosyal Medya Yönetimi';
                        case 'graphic_design': return 'Grafik Tasarım Hizmeti';
                        case 'video_production': return 'Video Prodüksiyon';
                        case 'seo': return 'SEO Hizmeti';
                        case 'web_design': return 'Web Tasarım';
                        default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      }
                    };

                    const formatDate = (dateStr: string) => {
                      const d = new Date(dateStr);
                      return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                    };

                    return (
                      <div key={service.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 text-indigo-600">
                          {service.serviceType.includes('ads') ? <Megaphone size={16} /> : 
                           service.serviceType.includes('social') ? <Share2 size={16} /> :
                           service.serviceType.includes('video') ? <Video size={16} /> :
                           service.serviceType.includes('web') ? <Globe size={16} /> :
                           <Briefcase size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-slate-900 truncate" title={getServiceLabel(service.serviceType)}>
                            {getServiceLabel(service.serviceType)}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(service.startDate)} - {formatDate(service.endDate)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                             <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Aktif</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sorumlu Kişiler */}
            {((user?.socialUsers?.length || 0) > 0 || (user?.designerUsers?.length || 0) > 0 || (user?.reelsUsers?.length || 0) > 0 || (user?.adsUsers?.length || 0) > 0) && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-sm mt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-indigo-500" />
                  Proje Ekibi
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Sosyal Medya Yöneticileri */}
                  {user?.socialUsers?.map(staff => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center text-amber-700 font-bold text-sm overflow-hidden border border-amber-200">
                        {staff.avatar ? (
                          <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          staff.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate" title={staff.name}>{staff.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate" title="Sosyal Medya Yöneticisi">Sosyal Medya Yöneticisi</p>
                      </div>
                    </div>
                  ))}

                  {/* Grafik Tasarımcılar */}
                  {user?.designerUsers?.map(staff => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex-shrink-0 flex items-center justify-center text-purple-700 font-bold text-sm overflow-hidden border border-purple-200">
                        {staff.avatar ? (
                          <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          staff.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate" title={staff.name}>{staff.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate" title="Grafik Tasarımcı">Grafik Tasarımcı</p>
                      </div>
                    </div>
                  ))}

                  {/* Reels Uzmanları */}
                  {user?.reelsUsers?.map(staff => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-rose-100 flex-shrink-0 flex items-center justify-center text-rose-700 font-bold text-sm overflow-hidden border border-rose-200">
                        {staff.avatar ? (
                          <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          staff.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate" title={staff.name}>{staff.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate" title="Reels Video Uzmanı">Reels Video Uzmanı</p>
                      </div>
                    </div>
                  ))}

                  {/* Meta Reklam Uzmanları */}
                  {user?.adsUsers?.map(staff => (
                    <div key={staff.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-blue-700 font-bold text-sm overflow-hidden border border-blue-200">
                        {staff.avatar ? (
                          <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                        ) : (
                          staff.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-medium text-slate-900 truncate" title={staff.name}>{staff.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate" title="Meta Reklam Uzmanı">Meta Reklam Uzmanı</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-700 rounded-lg">
                <AlertTriangle size={20} />
                <span>{error}</span>
                <button onClick={fetchTasks} className="ml-auto text-sm underline">Tekrar Dene</button>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">Planlar yükleniyor...</p>
                </div>
              </div>
            ) : Object.keys(tasksByMonth).length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <CalendarDays size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz plan yok</h3>
                <p className="text-sm text-slate-500">İçerik planınız burada görüntülenecek</p>
              </div>
            ) : (
              /* Monthly Groups */
              Object.entries(tasksByMonth).map(([monthKey, monthTasks]) => {
                const isExpanded = expandedMonths[monthKey] !== false; // default true
                const completedCount = monthTasks.filter(t => t.status === 'tamamlandi').length;
                const totalCount = monthTasks.length;

                return (
                  <div key={monthKey} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Month Header */}
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {monthKey.split(' ')[0].slice(0, 3)}
                        </div>
                        <div className="text-left">
                          <h3 className="font-semibold text-slate-900">{monthKey}</h3>
                          <p className="text-xs text-slate-500">{totalCount} içerik planlandı</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-emerald-600">{completedCount}/{totalCount}</span>
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Tasks List */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {monthTasks.map(task => {
                          const dateInfo = formatDate(task.date);
                          const daysUntil = getDaysUntil(task.date);
                          const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.beklemede;
                          const contentConfig = CONTENT_CONFIG[task.contentType] || CONTENT_CONFIG.posts;
                          const StatusIcon = statusConfig.icon;
                          const ContentIcon = contentConfig.icon;
                          const isPast = daysUntil < 0;
                          const isToday = daysUntil === 0;

                          return (
                            <div 
                              key={task.id}
                              className={`flex items-center gap-4 px-4 md:px-5 py-3.5 transition-colors ${isPast && task.status !== 'tamamlandi' ? 'bg-rose-50/30' : ''} ${isToday ? 'bg-indigo-50/30' : ''}`}
                            >
                              {/* Date Column */}
                              <div className="flex-shrink-0 w-14 text-center">
                                <p className={`text-lg font-bold ${isToday ? 'text-indigo-600' : isPast ? 'text-slate-400' : 'text-slate-700'}`}>
                                  {new Date(task.date).getDate()}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase">{dateInfo.dayName.slice(0, 3)}</p>
                              </div>

                              {/* Divider */}
                              <div className={`w-0.5 h-10 rounded-full ${contentConfig.dot}`} />

                              {/* Content Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${contentConfig.bg} ${contentConfig.color}`}>
                                    <ContentIcon size={12} />
                                    {contentConfig.label}
                                  </span>
                                  {task.isExtra && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border border-indigo-200" title="Müşteri Memnuniyeti Hediyesi">
                                      🎁 Ekstra
                                    </span>
                                  )}
                                  {task.title && (
                                    <span className="text-sm text-slate-700 truncate">{task.title}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">{dateInfo.short}</span>
                                  {!isPast && task.status !== 'tamamlandi' && (
                                    <>
                                      <ArrowRight size={10} className="text-slate-300" />
                                      <span className={`text-xs ${isToday ? 'text-indigo-600 font-medium' : daysUntil <= 2 ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
                                        {isToday ? 'Bugün' : `${daysUntil} gün sonra`}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
                                <StatusIcon size={14} />
                                <span className="hidden sm:inline">{statusConfig.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </div>
            
            {/* Right Column / Mobile Top Banner - Client Brand Identity */}
            {isClient && user?.avatar && (
              <div className="w-full xl:w-[320px] flex-shrink-0 order-1 xl:order-2">
                <div className="sticky top-6">
                  {/* Premium Logo Card */}
                  <div className={`rounded-3xl border ${pkgConfig.borderLight} shadow-2xl shadow-indigo-500/10 overflow-hidden bg-gradient-to-br ${pkgConfig.gradient} relative group`}>
                     {/* Abstract patterns */}
                     <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent mix-blend-overlay" />
                     <div className="absolute -top-24 -right-24 w-48 h-48 bg-white/20 blur-3xl rounded-full pointer-events-none" />
                     <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-black/20 blur-3xl rounded-full pointer-events-none" />
                     
                    <div className="px-6 pt-10 pb-8 text-center relative z-10 flex flex-col items-center">
                      <div className="w-28 h-28 mx-auto bg-white/10 backdrop-blur-md rounded-2xl p-1.5 shadow-xl ring-1 ring-white/30 mb-5 transform transition-transform group-hover:scale-105">
                        <div className="w-full h-full bg-white rounded-xl overflow-hidden p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={user.avatar} 
                            alt="Brand Logo" 
                            className="w-full h-full rounded-lg object-contain"
                          />
                        </div>
                      </div>
                      <h2 className="text-xl font-bold text-white mb-2 tracking-wide drop-shadow-md">{user.name}</h2>
                      
                      {/* Badge */}
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold mb-8 backdrop-blur-sm shadow-inner">
                        <Crown size={14} className="text-amber-300" /> {pkgConfig.title} MARKA
                      </div>
                      
                      {/* Paket İçeriği (Wow Factor) */}
                      <div className="w-full text-left bg-black/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-5 shadow-inner">
                        <div className="text-center mb-4">
                          <h3 className="text-2xl font-black text-white tracking-wider drop-shadow-lg mb-1">{pkgConfig.title}</h3>
                          <p className={`text-[10px] font-bold ${pkgConfig.textColor} uppercase tracking-widest whitespace-pre-line leading-relaxed opacity-90`}>
                            {pkgConfig.subtitle}
                          </p>
                        </div>
                        
                        <div className="space-y-2.5 mt-5">
                          {pkgConfig.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${pkgConfig.bulletColor} mt-1.5 flex-shrink-0 shadow-sm`} />
                              <span className="text-sm font-medium text-white/90 leading-snug drop-shadow-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Hızlı Özet Koyu Tema */}
                      <div className="w-full space-y-3 text-left bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Aylık İstatistik</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Aylık Plan</span>
                          <span className="text-sm font-bold text-white">{stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Yayınlanan</span>
                          <span className="text-sm font-bold text-emerald-400">{stats.tamamlandi}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/70">Bekleyen</span>
                          <span className="text-sm font-bold text-amber-400">{stats.total - stats.tamamlandi}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative Elements (Extras) */}
                  {stats.extraCount > 0 ? (
                    <div className="mt-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 shadow-lg shadow-indigo-500/20 relative overflow-hidden group hover:shadow-indigo-500/30 transition-shadow">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 transition-transform duration-700 group-hover:scale-150" />
                      <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner">
                          <span className="text-xl">🎁</span>
                        </div>
                        <h3 className="text-base font-bold text-white">Sürpriz!</h3>
                      </div>
                      <p className="text-sm text-indigo-50 leading-relaxed relative z-10 font-medium">
                        Müşteri memnuniyeti kapsamında bu ay sizin için <span className="font-bold text-white bg-white/20 px-1.5 py-0.5 rounded">{stats.extraCount} adet</span> ekstra içerik ürettik.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-6 border border-indigo-100/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2" />
                      <Sparkles className="text-indigo-500 mb-3 relative z-10" size={24} />
                      <h3 className="text-sm font-bold text-indigo-900 mb-2 relative z-10">Size Özel Portal</h3>
                      <p className="text-xs text-indigo-700/80 leading-relaxed relative z-10">
                        İçerik planlamalarınızı, onay süreçlerinizi ve tüm dijital varlıklarınızı bu ekrandan takip edebilirsiniz.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
