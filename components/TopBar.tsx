'use client';

import React from 'react';
import { ChevronDown, Filter, Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewMode, FilterState, Platform, Status } from '@/types';

interface TopBarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clients: string[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const TopBar: React.FC<TopBarProps> = ({ viewMode, setViewMode, filters, setFilters, clients, currentDate, onDateChange }) => {
  
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

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
      {/* Left: Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-slate-800 tracking-tight">Calendar</div>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button 
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-sm font-semibold text-slate-700 min-w-[100px] text-center select-none">
              {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
             <button 
              onClick={handleNextMonth}
              className="p-1 hover:bg-white hover:shadow-sm rounded transition-all text-slate-500 hover:text-slate-900"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="h-6 w-px bg-slate-200 mx-2"></div>

        <div className="hidden md:flex items-center gap-3">
           {/* Client Filter */}
           <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select 
                value={filters.client}
                onChange={(e) => handleFilterChange('client', e.target.value)}
                className="appearance-none pl-9 pr-8 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
                <option value="All">All Clients</option>
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
                <option value="All">All Platforms</option>
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
                <option value="All">All Status</option>
                {Object.values(Status).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-4">
        <div className="relative hidden xl:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
                type="text" 
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search campaigns..." 
                className="pl-9 pr-4 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-56 transition-all shadow-sm"
            />
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['Month', 'Week', 'Day'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === mode
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>


      </div>
    </div>
  );
};

export default TopBar;
