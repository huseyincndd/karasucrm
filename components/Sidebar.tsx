'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Layers, 
  Settings, 
  LogOut,
  Command
} from 'lucide-react';
import { USERS } from '@/constants';

const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const currentUser = USERS[0];

  const navItems = [
    { label: 'Takvim', icon: LayoutDashboard, href: '/' },
    { label: 'Müşteriler', icon: Users, href: '/clients' },
    { label: 'Görevlerim', icon: CheckSquare, href: '/tasks' },
    { label: 'İçerik Havuzu', icon: Layers, href: '/content' },
    { label: 'Ayarlar', icon: Settings, href: '/settings' },
  ];

  return (
    <div className="w-[240px] h-full bg-slate-900 text-slate-300 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2.5 text-white font-semibold text-lg">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Command size={16} className="text-slate-900" />
          </div>
          AgencyOS
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                ${isActive 
                  ? 'bg-white text-slate-900' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }
              `}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUser.avatar} alt={currentUser.name} className="w-9 h-9 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-500 truncate">{currentUser.role}</p>
          </div>
          <button className="text-slate-500 hover:text-white transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
