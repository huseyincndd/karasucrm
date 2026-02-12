'use client';

import React, { useState } from 'react';
import { ChevronDown, Filter, Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { ViewMode, FilterState, Platform, Status } from '@/types';

interface TopBarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clients: string[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onMenuClick?: () => void;
  isClient?: boolean;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const TopBar: React.FC<TopBarProps> = ({ viewMode, setViewMode, filters, setFilters, clients, currentDate, onDateChange, onMenuClick, isClient }) => {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const hasActiveFilters = filters.client !== 'All' || filters.platform !== 'All' || filters.status !== 'All' || filters.search !== '';

  return (
    <>
      <div className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 flex-shrink-0 z-10 shadow-sm">
        {/* Left: Menu, Date Navigation */}
        <div className="flex items-center gap-2 md:gap-4">
          {onMenuClick && (
            <button 
              onClick={onMenuClick}
              className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu size={22} />
            </button>
          )}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="text-lg md:text-xl font-bold text-slate-800 tracking-tight hidden sm:block">Takvim</div>
            <div className="flex items-center gap-0.5 md:gap-1 bg-slate-50 p-0.5 md:p-1 rounded-lg border border-slate-200">
              <button 
                onClick={handlePrevMonth}
                className="p-1.5 md:p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
              >
                <ChevronLeft size={18} className="md:w-4 md:h-4" />
              </button>
              <span className="px-1.5 md:px-2 text-xs md:text-sm font-semibold text-slate-700 min-w-[80px] md:min-w-[100px] text-center select-none">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
               <button 
                onClick={handleNextMonth}
                className="p-1.5 md:p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
              >
                <ChevronRight size={18} className="md:w-4 md:h-4" />
              </button>
            </div>
          </div>
          
          <div className="h-6 w-px bg-slate-200 mx-1 md:mx-2 hidden sm:block"></div>

          {/* Desktop Filters - Müşteriler için gizli */}
          {!isClient && (
          <div className="hidden md:flex items-center gap-3">
             {/* Client Filter */}
             <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select 
                  value={filters.client}
                  onChange={(e) => handleFilterChange('client', e.target.value)}
                  className="appearance-none pl-9 pr-8 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                  <option value="All">Tüm Müşteriler</option>
                  {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Platform Filter */}
            <div className="relative">
              <select 
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className="appearance-none pl-4 pr-8 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                  <option value="All">Tüm Platformlar</option>
                  {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select 
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="appearance-none pl-4 pr-8 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                  <option value="All">Tüm Durumlar</option>
                  {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          )}
        </div>

        {/* Right: Mobile Filter Button, View Mode, Search */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Filter Button - Müşteriler için gizli */}
          {!isClient && (
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`md:hidden p-2 rounded-lg transition-colors relative ${
              showMobileFilters || hasActiveFilters 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Filter size={20} />
            {hasActiveFilters && !showMobileFilters && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>
          )}

          {/* Search - Desktop only, müşteriler için gizli */}
          {!isClient && (
          <div className="relative hidden xl:block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                  type="text" 
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Arama..." 
                  className="pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56 transition-all shadow-sm"
              />
          </div>
          )}

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* View Mode */}
          <div className="flex bg-slate-100 p-0.5 md:p-1 rounded-lg border border-slate-200">
            {(['Month', 'Week', 'Day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 md:px-3 py-1 text-[10px] md:text-xs font-semibold rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {mode === 'Month' ? 'Ay' : mode === 'Week' ? 'Hafta' : 'Gün'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filters Dropdown - Müşteriler için gizli */}
      {!isClient && showMobileFilters && (
        <div className="md:hidden bg-white border-b border-slate-200 px-3 py-3 space-y-3 shadow-sm animate-in slide-in-from-top duration-200">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Arama..." 
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Client Filter */}
            <div className="relative">
              <select 
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                className="w-full appearance-none px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">Tüm Müşteriler</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Platform Filter */}
            <div className="relative">
              <select 
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="w-full appearance-none px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="All">Tüm Platformlar</option>
                {Object.values(Platform).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Status Filter - Full Width */}
          <div className="relative">
            <select 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full appearance-none px-3 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="All">Tüm Durumlar</option>
              {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilters({ client: 'All', platform: 'All', status: 'All', search: '' });
                setShowMobileFilters(false);
              }}
              className="w-full py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <X size={16} />
              Filtreleri Temizle
            </button>
          )}
        </div>
      )}
    </>
  );
};

export default TopBar;
