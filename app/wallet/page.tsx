'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wallet,
  TrendingUp,
  History,
  Video,
  Image as ImageIcon,
  Circle,
  Loader2,
  DollarSign,
  ArrowUpRight,
  Menu,
  ArrowLeft,
  ChevronDown,
  Briefcase,
  ChevronRight,
  PieChart,
  CreditCard,
  Users,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/constants/wallet';

// ===== TİPLER & LOGIC (Backend ile Uyumlu - Değişmedi) =====

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
    case 'reels': return { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', gradient: 'from-rose-500 to-pink-500', iconBg: 'bg-rose-100' };
    case 'posts': return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', gradient: 'from-blue-500 to-indigo-500', iconBg: 'bg-blue-100' };
    case 'stories': return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', gradient: 'from-purple-500 to-violet-500', iconBg: 'bg-purple-100' };
    case 'service_fee': return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', gradient: 'from-amber-500 to-orange-500', iconBg: 'bg-amber-100' };
    default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', gradient: 'from-slate-500 to-gray-500', iconBg: 'bg-slate-100' };
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

// ===== MODERN CARD COMPONENTS =====

const NeumorphicCard = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100/50 ${className}`}>
    {children}
  </div>
);

const GlassBalanceCard = ({ title, amount, subtext, icon: Icon, colorClass, active }: { title: string, amount: string, subtext: string, icon: any, colorClass: string, active?: boolean }) => (
  <div className={`relative overflow-hidden rounded-[2rem] p-6 min-w-[260px] flex-1 transition-all duration-300 ${active ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 ring-4 ring-slate-100' : 'bg-white text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100'}`}>
     {/* Decorative Blob */}
     <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${colorClass}`} />
     
     <div className="relative z-10 flex flex-col h-full justify-between gap-6">
       <div className="flex items-center justify-between">
          <div className={`p-3 rounded-2xl ${active ? 'bg-white/10 backdrop-blur-md' : 'bg-slate-50'}`}>
            <Icon size={24} className={active ? 'text-white' : 'text-slate-900'} />
          </div>
          {active && <div className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur text-[10px] font-bold tracking-wider uppercase">Aktif Dönem</div>}
       </div>
       
       <div>
         <span className={`text-xs font-bold tracking-widest uppercase mb-1 block ${active ? 'text-white/60' : 'text-slate-400'}`}>{title}</span>
         <div className="text-3xl sm:text-4xl font-black tracking-tight mb-2 font-display">{amount}</div>
         <div className={`text-xs font-medium ${active ? 'text-white/60' : 'text-slate-400'}`}>{subtext}</div>
       </div>
     </div>
  </div>
);

const TransactionRow = ({ tx }: { tx: WalletTransaction }) => {
  const colors = getContentColor(tx.contentType);
  const Icon = getContentIcon(tx.contentType);

  return (
    <div className="group flex items-center gap-4 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors rounded-xl px-2 -mx-2">
      <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center text-white shadow-sm flex-shrink-0 relative overflow-hidden`}>
         <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-10`} />
         <Icon size={20} className={colors.text} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
           <h4 className="font-bold text-slate-900 text-sm truncate">{tx.task?.clientName || 'Sistem'}</h4>
           <span className="font-bold text-slate-900 text-sm tracking-tight">{formatCurrency(tx.amount)}</span>
        </div>
        
        <div className="flex justify-between items-center">
           <p className="text-xs text-slate-500 truncate font-medium max-w-[70%]">{tx.description}</p>
           <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
             {formatShortDate(tx.task?.date || tx.createdAt)}
           </span>
        </div>
      </div>
    </div>
  );
};

const StaffLeaderboardItem = ({ staff, rank, maxEarning, onClick }: { staff: StaffWallet, rank: number, maxEarning: number, onClick: () => void }) => {
  const earningPercentage = maxEarning > 0 ? (staff.periodEarnings / maxEarning) * 100 : 0;
  
  return (
    <button onClick={onClick} className="w-full relative group">
       <div className="absolute inset-x-4 top-2 bottom-0 bg-slate-50 rounded-2xl scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300" />
       
       <div className="relative flex items-center gap-4 p-4">
          <div className="relative">
             {staff.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={staff.user.avatar} className="w-14 h-14 rounded-2xl object-cover shadow-sm bg-white ring-2 ring-white" alt="" />
             ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl ring-2 ring-white">
                   {staff.user.name.charAt(0)}
                </div>
             )}
             <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ring-2 ring-white ${
                rank === 0 ? 'bg-amber-400 text-white' :
                rank === 1 ? 'bg-slate-400 text-white' :
                rank === 2 ? 'bg-orange-400 text-white' :
                'bg-slate-100 text-slate-500'
             }`}>
                {rank + 1}
             </div>
          </div>

          <div className="flex-1 min-w-0 text-left">
             <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-slate-900 truncate">{staff.user.name}</h4>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg">
                   <CreditCard size={12} className="text-slate-400" />
                   <span className="font-bold text-slate-900 text-xs">{formatCurrency(staff.periodEarnings)}</span>
                </div>
             </div>
             
             <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md">{staff.user.role}</span>
                <span className="text-[10px] text-slate-400">• {staff.periodTaskCount} görev</span>
             </div>

             <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out" style={{ width: `${earningPercentage}%` }} />
             </div>
          </div>
          
          <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
       </div>
    </button>
  );
};


// ===== MAIN COMPONENT =====

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.isAdmin ?? false;

  // View State
  const [viewMode, setViewMode] = useState<'overview' | 'detail'>('detail');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  
  // Data State
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [periodEarnings, setPeriodEarnings] = useState(0);
  const [periodLabel, setPeriodLabel] = useState('');
  const [byContentType, setByContentType] = useState<ContentBreakdown[]>([]);
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null);
  
  const [prevPeriodEarnings, setPrevPeriodEarnings] = useState(0);
  const [prevPeriodLabel, setPrevPeriodLabel] = useState('');
  const [prevPeriodTransactions, setPrevPeriodTransactions] = useState<WalletTransaction[]>([]);
  const [showPrevPeriod, setShowPrevPeriod] = useState(false);

  // Admin Data State
  const [staffWallets, setStaffWallets] = useState<StaffWallet[]>([]);
  const [overviewSummary, setOverviewSummary] = useState<OverviewSummary | null>(null);
  const [overviewPeriodLabel, setOverviewPeriodLabel] = useState('');
  const [overviewPrevLabel, setOverviewPrevLabel] = useState('');

  // UI State
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initial Setting
  useEffect(() => {
    if (!authLoading && user) {
      setViewMode(isAdmin ? 'overview' : 'detail');
    }
  }, [authLoading, user, isAdmin]);

  // Fetch Logic
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (viewMode === 'overview') {
        const res = await fetch('/api/wallet/overview');
        if (!res.ok) throw new Error('Yüklenemedi');
        const data = await res.json();
        setStaffWallets(data.staffWallets);
        setOverviewSummary(data.summary);
        setOverviewPeriodLabel(data.currentPeriod.label);
        setOverviewPrevLabel(data.previousPeriod.label);
      } else {
        const params = new URLSearchParams();
        if (selectedStaffId) params.append('staffId', selectedStaffId);
        
        const res = await fetch(`/api/wallet?${params.toString()}`);
        if (!res.ok) throw new Error('Yüklenemedi');
        const data = await res.json();
        
        setTransactions(data.transactions);
        setTotalBalance(data.totalBalance);
        setPeriodEarnings(data.periodEarnings);
        setPeriodLabel(data.periodLabel);
        setByContentType(data.byContentType);
        setWalletUser(data.user);
        setPrevPeriodEarnings(data.previousPeriod.earnings);
        setPrevPeriodLabel(data.previousPeriod.label);
        setPrevPeriodTransactions(data.previousPeriod.transactions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [viewMode, selectedStaffId]);

  useEffect(() => {
    if (!authLoading && user) fetchData();
  }, [authLoading, user, fetchData]);

  if (authLoading) return <div className="flex h-screen items-center justify-center bg-[#FAFAFA]"><Loader2 className="animate-spin text-slate-300" /></div>;

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        
        {/* === HEADER === */}
        <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b border-slate-100 z-20 sticky top-0">
          <div className="max-w-4xl mx-auto w-full px-5 py-4">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  {/* Left Action Button (Back or Menu) */}
                  {viewMode === 'detail' && isAdmin && selectedStaffId ? (
                     <button onClick={() => { setViewMode('overview'); setSelectedStaffId(null); }} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                        <ArrowLeft size={20} />
                     </button>
                  ) : (
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                       <Menu size={20} />
                    </button>
                  )}
                  
                  <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">
                       {viewMode === 'overview' ? 'Finans Genel Bakış' : 'Cüzdanım'}
                    </h1>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        {viewMode === 'detail' ? periodLabel : overviewPeriodLabel}
                      </span>
                    </div>
                  </div>
               </div>

               {/* Admin Switcher */}
               {isAdmin && !selectedStaffId && (
                 <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                    <button 
                      onClick={() => setViewMode('overview')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'overview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Genel
                    </button>
                    <button 
                      onClick={() => setViewMode('detail')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'detail' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Benim
                    </button>
                 </div>
               )}
             </div>
          </div>
        </header>

        {/* === CONTENT === */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-[#FAFAFA]">
          <div className="max-w-4xl mx-auto w-full px-5 py-8 space-y-8 pb-32">
             
             {loading ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <Loader2 size={32} className="animate-spin text-slate-900 mb-3" />
                  <p className="text-[10px] font-black tracking-widest uppercase">Veriler işleniyor...</p>
                </div>
             ) : viewMode === 'overview' && overviewSummary ? (
                // === OVERVIEW DASHBOARD ===
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                   {/* Top Summary Cards */}
                   <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x">
                      <div className="snap-center">
                         <GlassBalanceCard 
                           title="DÖNEM TOPLAMI" 
                           amount={formatCurrency(overviewSummary.periodTotal)} 
                           subtext={`${overviewSummary.periodTasks} Görev Tamamlandı`}
                           icon={Wallet} 
                           colorClass="bg-emerald-500"
                           active
                         />
                      </div>
                      <div className="snap-center">
                         <GlassBalanceCard 
                           title="GEÇEN DÖNEM" 
                           amount={formatCurrency(overviewSummary.prevPeriodTotal)} 
                           subtext={overviewPrevLabel}
                           icon={History} 
                           colorClass="bg-indigo-500"
                         />
                      </div>
                   </div>

                   {/* Staff Leaderboard */}
                   <div>
                      <div className="flex items-center justify-between mb-5 px-2">
                         <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Users size={16} className="text-slate-400" />
                            Ekip Performansı
                         </h2>
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{staffWallets.length} Kişi</span>
                      </div>
                      
                      <NeumorphicCard className="divide-y divide-slate-50 px-2 py-2">
                         {staffWallets
                            .sort((a, b) => b.periodEarnings - a.periodEarnings)
                            .map((sw, idx) => (
                               <StaffLeaderboardItem 
                                 key={sw.user.id} 
                                 staff={sw} 
                                 rank={idx} 
                                 maxEarning={Math.max(...staffWallets.map(s => s.periodEarnings))}
                                 onClick={() => { setSelectedStaffId(sw.user.id); setViewMode('detail'); }}
                               />
                            ))
                         }
                      </NeumorphicCard>
                   </div>
                   
                   {/* Quick Link */}
                   <div className="text-center">
                      <a href="/settings" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-600 hover:scale-105 transition-transform">
                         <Sparkles size={14} className="text-amber-500" />
                         Birim Fiyatları Düzenle
                      </a>
                   </div>
                </div>

             ) : (
                // === DETAIL DASHBOARD ===
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   
                   {/* User Profile Header (Admin View) */}
                   {isAdmin && selectedStaffId && walletUser && (
                      <div className="flex items-center gap-5 bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-slate-900">
                         {walletUser.avatar ? (
                            <img src={walletUser.avatar} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt="" />
                         ) : (
                            <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-bold text-2xl">
                               {walletUser.name.charAt(0)}
                            </div>
                         )}
                         <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{walletUser.name}</h2>
                            <p className="text-sm font-medium text-slate-500">{walletUser.role} • {DEPARTMENT_LABELS[walletUser.department] || walletUser.department}</p>
                         </div>
                      </div>
                   )}

                   {/* Main Cards Scroll */}
                   <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x">
                      <div className="snap-center">
                         <GlassBalanceCard 
                           title="HAKEDİŞ" 
                           amount={formatCurrency(periodEarnings)} 
                           subtext="Bu dönem ödemesi"
                           icon={Wallet} 
                           colorClass="bg-slate-900"
                           active
                         />
                      </div>
                      <div className="snap-center">
                         <GlassBalanceCard 
                           title="TOPLAM KAZANÇ" 
                           amount={formatCurrency(totalBalance)} 
                           subtext="Kayıtlı tüm zamanlar"
                           icon={TrendingUp} 
                           colorClass="bg-indigo-500"
                         />
                      </div>
                   </div>

                   {/* Content Breakdown Modern */}
                   <NeumorphicCard className="p-6">
                      <div className="flex items-center gap-2 mb-6">
                         <div className="p-2 bg-slate-100 rounded-lg"><PieChart size={18} /></div>
                         <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Kazanç Dağılımı</h3>
                      </div>
                      
                      {byContentType.length === 0 ? (
                         <div className="text-center py-8 opacity-40">
                            <PieChart size={40} className="mx-auto mb-2" />
                            <p className="text-xs font-bold uppercase">Veri Yok</p>
                         </div>
                      ) : (
                         <div className="space-y-5">
                           {byContentType.map(ct => {
                              const colors = getContentColor(ct.contentType);
                              const Icon = getContentIcon(ct.contentType);
                              const maxVal = Math.max(...byContentType.map(c => c.total));
                              const pct = (ct.total / maxVal) * 100;
                              
                              return (
                                 <div key={ct.contentType} className="group">
                                    <div className="flex items-center justify-between mb-2">
                                       <div className="flex items-center gap-3">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.iconBg}`}>
                                             <Icon size={14} className={colors.text} />
                                          </div>
                                          <div>
                                             <span className="block text-sm font-bold text-slate-900">{getContentLabel(ct.contentType)}</span>
                                             <span className="text-[10px] font-semibold text-slate-400">{ct.count} Adet</span>
                                          </div>
                                       </div>
                                       <span className="text-sm font-black text-slate-900">{formatCurrency(ct.total)}</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                       <div className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-1000 group-hover:bg-slate-900`} style={{ width: `${pct}%` }} />
                                    </div>
                                 </div>
                              )
                           })}
                         </div>
                      )}
                   </NeumorphicCard>

                   {/* Recent Activity Feed */}
                   <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 px-2">Son Hareketler</h3>
                      <NeumorphicCard className="divide-y divide-slate-50 px-4">
                         {transactions.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                               <DollarSign size={32} className="mx-auto mb-2 opacity-50" />
                               <p className="text-xs font-bold">Henüz işlem bulunamadı.</p>
                            </div>
                         ) : (
                            transactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
                         )}
                      </NeumorphicCard>
                   </div>

                   {/* History Accordion Modern */}
                   {(prevPeriodEarnings > 0 || prevPeriodTransactions.length > 0) && (
                      <NeumorphicCard className="overflow-hidden">
                         <button 
                           onClick={() => setShowPrevPeriod(!showPrevPeriod)}
                           className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                         >
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                                  <History size={18} />
                               </div>
                               <div className="text-left">
                                  <p className="text-sm font-bold text-slate-900">Geçmiş Dönem</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prevPeriodLabel}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg text-xs">{formatCurrency(prevPeriodEarnings)}</span>
                               <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${showPrevPeriod ? 'rotate-180' : ''}`} />
                            </div>
                         </button>
                         
                         {showPrevPeriod && (
                            <div className="border-t border-slate-100 bg-slate-50/30 px-4 py-2 animate-in slide-in-from-top-2">
                               {prevPeriodTransactions.length === 0 ? (
                                  <p className="text-center text-xs text-slate-400 py-4 font-medium">Bu dönem için detay bulunamadı.</p>
                               ) : (
                                  prevPeriodTransactions.map(tx => <TransactionRow key={tx.id} tx={tx} />)
                               )}
                            </div>
                         )}
                      </NeumorphicCard>
                   )}

                </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
