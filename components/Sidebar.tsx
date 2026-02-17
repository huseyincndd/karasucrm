'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Settings, 
  LogOut,
  Shield,
  Archive,
  X,
  CalendarDays,
  Building2,
  Wallet,
  Briefcase
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isClient = user?.isClient;

  // Müşteri nav items (sadece Takvim ve Planlarım)
  const clientNavItems = [
    { label: 'Takvim', icon: LayoutDashboard, href: '/', adminOnly: false },
    { label: 'Planlarım', icon: CalendarDays, href: '/plans', adminOnly: false },
  ];

  // Ekip üyeleri nav items
  const staffNavItems = [
    { label: 'Takvim', icon: LayoutDashboard, href: '/', adminOnly: false },
    { label: 'Projelerim', icon: Briefcase, href: '/projects', adminOnly: false },
    { label: 'Müşteriler', icon: Users, href: '/clients', adminOnly: true },
    { label: 'Görevlerim', icon: CheckSquare, href: '/tasks', adminOnly: false },
    { label: 'Cüzdan', icon: Wallet, href: '/wallet', adminOnly: false },
    { label: 'Arşiv', icon: Archive, href: '/archive', adminOnly: false },
    { label: 'Ayarlar', icon: Settings, href: '/settings', adminOnly: true },
  ];

  // Müşteri mi yoksa ekip üyesi mi?
  const allNavItems = isClient ? clientNavItems : staffNavItems;

  // Admin değilse Ayarlar'ı gizle
  const navItems = allNavItems.filter(item => !item.adminOnly || user?.isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 text-white font-semibold text-lg hover:opacity-90 transition-opacity">
          <img 
            src="https://villaqrmenu.b-cdn.net/IMG_5221.JPG" 
            alt="Karasu Reklam" 
            className="w-8 h-8 rounded-lg object-cover shadow-sm" 
          />
          <span className="truncate">Karasu Reklam</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Client Badge */}
      {isClient && (
        <div className="px-5 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Building2 size={14} className="text-indigo-400" />
            <span className="text-xs font-medium text-indigo-300">Müşteri Portalı</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-white text-slate-900' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${isClient ? 'bg-gradient-to-br from-teal-500 to-cyan-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
              {user?.name?.charAt(0) || '?'}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Yükleniyor...'}</p>
              {user?.isAdmin && (
                <Shield size={12} className="text-amber-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{isClient ? 'Müşteri' : (user?.roleTitle || '')}</p>
          </div>
          
          <button 
            onClick={logout}
            className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
            title="Çıkış Yap"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-[240px] min-w-[240px] max-w-[240px] h-full flex-shrink-0 overflow-hidden">
        <SidebarContent />
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-64 bg-slate-900 shadow-xl transform transition-transform duration-300">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
