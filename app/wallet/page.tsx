'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  TrendingUp,
  Calendar,
  Video,
  Image as ImageIcon,
  Circle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Menu,
  Users,
  CheckCircle2,
  ArrowLeft,
  Crown,
  Eye,
  History,
  ChevronDown,
  Briefcase
} from 'lucide-react';
import { TASK_PRICES, formatCurrency } from '@/constants/wallet';

// ===== CÜZDAN SAYFASI =====
// Maaş dönemi: Ayın 5'inden bir sonraki ayın 4'üne kadar

interface WalletTransaction {
  id: string;
  amount: number;
  contentType: string;
  description: string;
  createdAt: string;
  task: {
    id: string;
    title: string | null;
    contentType: string;
    date: string;
    status: string;
    clientName: string;
    clientLogo: string | null;
  } | null;
}

interface ContentBreakdown {
  contentType: string;
  total: number;
  count: number;
}

interface WalletUser {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  department: string;
  capabilities?: { type: string; price: number }[];
}

interface StaffWallet {
  user: WalletUser;
  totalBalance: number;
  periodEarnings: number;
  periodTaskCount: number;
  prevPeriodEarnings: number;
  prevPeriodTaskCount: number;
  byContentType: ContentBreakdown[];
  recentTransactions: WalletTransaction[];
}

interface OverviewSummary {
  grandTotal: number;
  periodTotal: number;
  periodTasks: number;
  prevPeriodTotal: number;
  staffCount: number;
}

const getContentIcon = (type: string) => {
  switch (type) {
    case 'reels': return Video;
    case 'posts': return ImageIcon;
    case 'stories': return Circle;
    case 'service_fee': return Briefcase;
    default: return Circle;
  }
};

const getContentLabel = (type: string) => {
  switch (type) {
    case 'reels': return 'Reels';
    case 'posts': return 'Post';
    case 'stories': return 'Story';
    case 'service_fee': return 'Hizmet Bedeli';
    default: return type;
  }
};

const getContentColor = (type: string) => {
  switch (type) {
    case 'reels': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', gradient: 'from-rose-500 to-pink-500', light: 'bg-rose-100' };
    case 'posts': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-indigo-500', light: 'bg-blue-100' };
    case 'stories': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-500 to-violet-500', light: 'bg-purple-100' };
    case 'service_fee': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', gradient: 'from-amber-500 to-orange-500', light: 'bg-amber-100' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', gradient: 'from-slate-500 to-gray-500', light: 'bg-slate-100' };
  }
};

const DEPARTMENT_LABELS: Record<string, string> = {
  video: 'Video Ekibi',
  design: 'Tasarım Ekibi',
  content: 'İçerik Ekibi',
};

const formatShortDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${day} ${months[date.getMonth()]}`;
};

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  // View mode
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('detail');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Detail view state
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [periodEarnings, setPeriodEarnings] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  const [byContentType, setByContentType] = useState<ContentBreakdown[]>([]);
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null);
  
  // Geçmiş Ödemeler state
  const [prevPeriodEarnings, setPrevPeriodEarnings] = useState(0);
  const [prevPeriodLabel, setPrevPeriodLabel] = useState('');
  const [prevPeriodTransactions, setPrevPeriodTransactions] = useState<WalletTransaction[]>([]);
  const [prevPeriodTaskCount, setPrevPeriodTaskCount] = useState(0);
  const [showPrevPeriod, setShowPrevPeriod] = useState(false);

  // Overview state (admin)
  const [staffWallets, setStaffWallets] = useState<StaffWallet[]>([]);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary | null>(null);
  const [overviewPeriodLabel, setOverviewPeriodLabel] = useState('');
  const [overviewPrevLabel, setOverviewPrevLabel] = useState('');
  const [overviewPrevTotal, setOverviewPrevTotal] = useState(0);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);

  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Set initial view mode
  useEffect(() => {
    if (!authLoading && user) {
      setViewMode(isAdmin ? 'overview' : 'detail');
    }
  }, [authLoading, user, isAdmin]);

  // Fetch detail wallet data
  const fetchDetailWallet = useCallback(async (staffId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);

      const res = await fetch(`/api/wallet?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Cüzdan bilgisi yüklenemedi');
      }

      const data = await res.json();
      setTransactions(data.transactions);
      setTotalBalance(data.totalBalance);
      setPeriodEarnings(data.periodEarnings);
      setPeriodLabel(data.periodLabel);
      setByContentType(data.byContentType);
      setWalletUser(data.user);
      
      // Geçmiş dönem
      setPrevPeriodEarnings(data.previousPeriod.earnings);
      setPrevPeriodLabel(data.previousPeriod.label);
      setPrevPeriodTransactions(data.previousPeriod.transactions);
      setPrevPeriodTaskCount(data.previousPeriod.taskCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/wallet/overview');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Cüzdan özeti yüklenemedi');
      }

      const data = await res.json();
      setStaffWallets(data.staffWallets);
      setOverviewSummary(data.summary);
      setOverviewPeriodLabel(data.currentPeriod.label);
      setOverviewPrevLabel(data.previousPeriod.label);
      setOverviewPrevTotal(data.previousPeriod.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch based on view mode
  useEffect(() => {
    if (!authLoading && user) {
      if (viewMode === 'overview') {
        fetchOverview();
      } else {
        fetchDetailWallet(selectedStaffId || undefined);
      }
    }
  }, [authLoading, user, viewMode, selectedStaffId, fetchOverview, fetchDetailWallet]);

  const goToStaffDetail = (staffId: string) => { setSelectedStaffId(staffId); setViewMode('detail'); };
  const goBackToOverview = () => { setSelectedStaffId(null); setViewMode('overview'); };

  const maxContentAmount = useMemo(() => Math.max(...byContentType.map(ct => ct.total), 1), [byContentType]);

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

  // ============================
  // TRANSACTION LIST COMPONENT
  // ============================
  const TransactionList = ({ items, emptyText }: { items: WalletTransaction[]; emptyText?: string }) => (
    items.length === 0 ? (
      <div className="p-8 text-center text-slate-400 text-sm">{emptyText || 'İşlem yok'}</div>
    ) : (
      <div className="divide-y divide-slate-100">
        {items.map((tx) => {
          const colors = getContentColor(tx.contentType);
          const Icon = getContentIcon(tx.contentType);
          return (
            <div key={tx.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-900 truncate">{tx.description}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} font-medium`}>
                    {getContentLabel(tx.contentType)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {tx.task ? (
                    <>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatShortDate(tx.task.date)}
                      </span>
                      <span className="text-slate-300">•</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar size={11} />
                        {formatShortDate(tx.createdAt)}
                      </span>
                      <span className="text-slate-300">•</span>
                    </>
                  )}
                  <span className="text-xs text-slate-400">{getContentLabel(tx.contentType)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <ArrowUpRight size={14} className="text-emerald-500" />
                <span className="font-semibold text-emerald-600">{formatCurrency(tx.amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    )
  );

  // ============================
  // ADMIN OVERVIEW RENDER
  // ============================
  const renderOverview = () => {
    const maxEarning = Math.max(...staffWallets.map(sw => sw.periodEarnings), 1);

    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Period Label */}
        <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <Calendar size={16} className="text-indigo-500" />
          <span className="text-sm font-medium text-slate-700">Maaş Dönemi:</span>
          <span className="text-sm font-bold text-indigo-600">{overviewPeriodLabel}</span>
        </div>

        {/* Summary Cards */}
        {overviewSummary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet size={16} className="text-emerald-200" />
                  <span className="text-emerald-100 text-xs font-medium">Bu Dönem Toplam</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(overviewSummary.periodTotal)}</p>
                <p className="text-emerald-200 text-xs mt-1">Ödenecek tutar</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <History size={16} className="text-indigo-200" />
                  <span className="text-indigo-100 text-xs font-medium">Geçen Dönem</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(overviewSummary.prevPeriodTotal)}</p>
                <p className="text-indigo-200 text-xs mt-1">{overviewPrevLabel}</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-amber-200" />
                  <span className="text-amber-100 text-xs font-medium">Tamamlanan Görev</span>
                </div>
                <p className="text-2xl font-bold">{overviewSummary.periodTasks}</p>
                <p className="text-amber-200 text-xs mt-1">Bu dönemde</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl p-5 text-white shadow-lg shadow-slate-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-slate-300" />
                  <span className="text-slate-300 text-xs font-medium">Personel</span>
                </div>
                <p className="text-2xl font-bold">{overviewSummary.staffCount}</p>
                <p className="text-slate-400 text-xs mt-1">Aktif çalışan</p>
              </div>
            </div>
          </div>
        )}

        {/* Staff Wallet Cards */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Crown size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">Personel Cüzdanları</h2>
          </div>

          {staffWallets.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz personel yok</h3>
            </div>
          ) : (
            staffWallets
              .sort((a, b) => b.periodEarnings - a.periodEarnings)
              .map((sw, rank) => {
                const isExpanded = expandedStaffId === sw.user.id;
                const earningPercentage = maxEarning > 0 ? (sw.periodEarnings / maxEarning) * 100 : 0;

                return (
                  <div key={sw.user.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                    {/* Staff Header */}
                    <div className="flex items-center gap-4 p-4">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        rank === 0 ? 'bg-amber-100 text-amber-700' :
                        rank === 1 ? 'bg-slate-100 text-slate-600' :
                        rank === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {rank + 1}
                      </div>

                      {/* Avatar */}
                      {sw.user.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sw.user.avatar} alt={sw.user.name} className="w-11 h-11 rounded-full border-2 border-white shadow-sm object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
                          {sw.user.name.charAt(0)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">{sw.user.name}</h3>
                          {rank === 0 && sw.periodEarnings > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">🏆</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {sw.user.role} {sw.user.department ? `• ${DEPARTMENT_LABELS[sw.user.department] || sw.user.department}` : ''}
                        </p>
                      </div>

                      {/* This Period Earnings */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-emerald-600 text-lg">{formatCurrency(sw.periodEarnings)}</p>
                        <p className="text-xs text-slate-400">{sw.periodTaskCount} görev</p>
                      </div>

                      {/* Previous Period (small) */}
                      <div className="hidden sm:block text-right flex-shrink-0 border-l border-slate-100 pl-3">
                        <p className="text-sm font-medium text-slate-500">{formatCurrency(sw.prevPeriodEarnings)}</p>
                        <p className="text-xs text-slate-400">Geçen dönem</p>
                      </div>

                      {/* Content type badges */}
                      <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
                        {sw.byContentType.map(ct => {
                          const colors = getContentColor(ct.contentType);
                          const Icon = getContentIcon(ct.contentType);
                          return (
                            <div key={ct.contentType} className={`flex items-center gap-1 px-2 py-1 rounded-lg ${colors.bg} ${colors.text}`} title={`${getContentLabel(ct.contentType)}: ${ct.count} görev`}>
                              <Icon size={12} />
                              <span className="text-xs font-medium">{ct.count}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setExpandedStaffId(isExpanded ? null : sw.user.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="İşlemleri Gör">
                          <Eye size={16} />
                        </button>
                        <button onClick={() => goToStaffDetail(sw.user.id)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Detay">
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Earning Progress Bar */}
                    <div className="px-4 pb-3">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-700" style={{ width: `${earningPercentage}%` }} />
                      </div>
                    </div>

                    {/* Expanded Transactions */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50">
                        <TransactionList items={sw.recentTransactions} emptyText="Bu dönemde işlem yok" />
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>

        {/* Staff Unit Prices Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="font-semibold text-slate-900">Personel Birim Fiyatları</h2>
            </div>
            <a href="/settings" className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Düzenlemek için Ayarlar <ArrowUpRight size={12} />
            </a>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 w-[200px]">Personel</th>
                  <th className="px-5 py-3">Reels</th>
                  <th className="px-5 py-3">Post / Story</th>
                  <th className="px-5 py-3">Sosyal Medya Y.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffWallets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">Personel bulunamadı</td>
                  </tr>
                ) : (
                  staffWallets.map((sw) => {
                    const capabilities = sw.user.capabilities || [];
                    const reelsPrice = capabilities.find(c => c.type === 'reels')?.price;
                    const postPrice = capabilities.find(c => c.type === 'post')?.price;
                    const socialPrice = capabilities.find(c => c.type === 'social_management')?.price;
                    
                    return (
                      <tr key={sw.user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3 font-medium text-slate-900 border-r border-slate-50">
                          <div className="flex items-center gap-2">
                            {sw.user.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={sw.user.avatar} alt={sw.user.name} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                                {sw.user.name.charAt(0)}
                              </div>
                            )}
                            {sw.user.name}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {reelsPrice ? (
                            <span className="font-semibold text-slate-700">{formatCurrency(reelsPrice)}</span>
                          ) : <span className="text-slate-300">-</span>}
                          <span className="text-xs text-slate-400 ml-1">/ad</span>
                        </td>
                        <td className="px-5 py-3">
                          {postPrice ? (
                            <span className="font-semibold text-slate-700">{formatCurrency(postPrice)}</span>
                          ) : <span className="text-slate-300">-</span>}
                          <span className="text-xs text-slate-400 ml-1">/ad</span>
                        </td>
                        <td className="px-5 py-3">
                          {socialPrice ? (
                            <span className="font-semibold text-slate-700">{formatCurrency(socialPrice)}</span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
            * Fiyatları güncellemek için <a href="/settings" className="text-indigo-600 underline hover:text-indigo-800">Personel Ayarları</a> sayfasına gidiniz.
          </div>
        </div>
      </div>
    );
  };

  // ============================
  // DETAIL VIEW RENDER
  // ============================
  const renderDetail = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      {isAdmin && selectedStaffId && (
        <button onClick={goBackToOverview} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span>Genel Bakışa Dön</span>
        </button>
      )}

      {/* User Info Banner */}
      {walletUser && selectedStaffId && (
        <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4">
          {walletUser.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={walletUser.avatar} alt={walletUser.name} className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
              {walletUser.name.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-900">{walletUser.name}</h2>
            <p className="text-sm text-slate-500">{walletUser.role} • {DEPARTMENT_LABELS[walletUser.department] || walletUser.department}</p>
          </div>
        </div>
      )}

      {/* Period Label */}
      <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 px-4 py-3">
        <Calendar size={16} className="text-indigo-500" />
        <span className="text-sm font-medium text-slate-700">Maaş Dönemi:</span>
        <span className="text-sm font-bold text-indigo-600">{periodLabel}</span>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"><Wallet size={20} /></div>
              <span className="text-emerald-100 text-sm font-medium">Bu Dönem</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(periodEarnings)}</p>
            <p className="text-emerald-200 text-xs mt-2">Alacağı tutar</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"><TrendingUp size={20} /></div>
              <span className="text-indigo-100 text-sm font-medium">Toplam Kazanç</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
            <p className="text-indigo-200 text-xs mt-2">Tüm zamanlar</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"><CheckCircle2 size={20} /></div>
              <span className="text-amber-100 text-sm font-medium">Tamamlanan</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">
              {transactions.length}
              <span className="text-lg font-normal text-amber-200 ml-1">görev</span>
            </p>
            <p className="text-amber-200 text-xs mt-2">Bu dönemde</p>
          </div>
        </div>
      </div>

      {/* Content Type Breakdown */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={18} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">Kazanç Dağılımı</h2>
          </div>
          {byContentType.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Bu dönemde kazanç yok</p>
            </div>
          ) : (
            <div className="space-y-4">
              {byContentType.map(ct => {
                const colors = getContentColor(ct.contentType);
                const Icon = getContentIcon(ct.contentType);
                const percentage = Math.round((ct.total / maxContentAmount) * 100);
                return (
                  <div key={ct.contentType}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg ${colors.light} flex items-center justify-center`}><Icon size={16} className={colors.text} /></div>
                        <div>
                          <span className="text-sm font-medium text-slate-900">{getContentLabel(ct.contentType)}</span>
                          <span className="text-xs text-slate-400 ml-2">{ct.count} görev</span>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(ct.total)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-700`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Current Period Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-slate-900">Bu Dönem İşlemleri</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{transactions.length}</span>
          </div>
          <span className="text-xs text-slate-500">{periodLabel}</span>
        </div>
        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><Wallet size={28} className="text-slate-300" /></div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Henüz işlem yok</h3>
            <p className="text-sm text-slate-500">Görevler tamamlandıkça burada görünecek</p>
          </div>
        ) : (
          <TransactionList items={transactions} />
        )}
      </div>

      {/* ===== GEÇMİŞ ÖDEMELER ===== */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowPrevPeriod(!showPrevPeriod)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-500" />
            <h2 className="font-semibold text-slate-900">Geçmiş Ödemeler</h2>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{prevPeriodTaskCount} görev</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold text-indigo-600">{formatCurrency(prevPeriodEarnings)}</p>
              <p className="text-xs text-slate-400">{prevPeriodLabel}</p>
            </div>
            <ChevronDown size={18} className={`text-slate-400 transition-transform ${showPrevPeriod ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {showPrevPeriod && (
          <div className="border-t border-slate-100">
            {/* Previous Period Summary */}
            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">{prevPeriodLabel}</p>
                  <p className="text-xs text-slate-500">{prevPeriodTaskCount} görev tamamlandı</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-indigo-600">{formatCurrency(prevPeriodEarnings)}</p>
                  <p className="text-xs text-slate-500">Toplam ödeme</p>
                </div>
              </div>
            </div>
            <TransactionList items={prevPeriodTransactions} emptyText="Geçen dönemde işlem yok" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-auto md:h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 py-4 md:py-0 gap-4 md:gap-0 flex-shrink-0 z-10">
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-1 -ml-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                <Menu size={24} />
              </button>
              <div className="flex items-center gap-2">
                <Wallet size={20} className="text-slate-400" />
                <h1 className="text-xl font-semibold text-slate-900">
                  {viewMode === 'overview' ? 'Cüzdan Yönetimi' : 'Cüzdan'}
                </h1>
              </div>
            </div>

            {/* View mode toggle (admin) */}
            {isAdmin && (
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => { setViewMode('overview'); setSelectedStaffId(null); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Users size={13} className="inline mr-1 -mt-0.5" />
                  Genel Bakış
                </button>
                <button
                  onClick={() => { setViewMode('detail'); setSelectedStaffId(null); }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'detail' && !selectedStaffId ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Wallet size={13} className="inline mr-1 -mt-0.5" />
                  Cüzdanım
                </button>
              </div>
            )}

            <button
              onClick={() => viewMode === 'overview' ? fetchOverview() : fetchDetailWallet(selectedStaffId || undefined)}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Yenile"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {error && (
            <div className="flex items-center gap-3 p-4 mb-6 bg-rose-50 text-rose-700 rounded-lg max-w-6xl mx-auto">
              <AlertTriangle size={20} />
              <span>{error}</span>
              <button onClick={() => viewMode === 'overview' ? fetchOverview() : fetchDetailWallet(selectedStaffId || undefined)} className="ml-auto text-sm underline">Tekrar Dene</button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">{viewMode === 'overview' ? 'Cüzdan özeti yükleniyor...' : 'Cüzdan yükleniyor...'}</p>
              </div>
            </div>
          ) : (
            viewMode === 'overview' ? renderOverview() : renderDetail()
          )}
        </div>
      </div>
    </div>
  );
}
