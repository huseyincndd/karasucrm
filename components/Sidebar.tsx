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
  Command,
  Shield,
  Archive,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Tüm nav items
  const allNavItems = [
    { label: 'Takvim', icon: LayoutDashboard, href: '/', adminOnly: false },
    { label: 'Müşteriler', icon: Users, href: '/clients', adminOnly: false },
    { label: 'Görevlerim', icon: CheckSquare, href: '/tasks', adminOnly: false },
    { label: 'Arşiv', icon: Archive, href: '/archive', adminOnly: false },
    { label: 'Ayarlar', icon: Settings, href: '/settings', adminOnly: true }, // Sadece admin
  ];

  // Admin değilse Ayarlar'ı gizle
  const navItems = allNavItems.filter(item => !item.adminOnly || user?.isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 text-white font-semibold text-lg hover:opacity-90 transition-opacity">
          <img 
            src="https://villaqrmenu.b-cdn.net/447297083_1488295202123950_879512158476665056_n.jpg" 
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
            <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
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
            <p className="text-xs text-slate-500 truncate">{user?.role || ''}</p>
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
      <div className="hidden md:flex w-[240px] h-full flex-shrink-0">
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
