'use client';

import React from 'react';
import { ChevronDown, Filter, Calendar as CalendarIcon, Search } from 'lucide-react';
import { ViewMode, FilterState, Platform, Status } from '@/types';

interface TopBarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clients: string[];
}

const TopBar: React.FC<TopBarProps> = ({ viewMode, setViewMode, filters, setFilters, clients }) => {
  
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
      {/* Left: Filters */}
      <div className="flex items-center gap-4">
        <div className="text-xl font-bold text-slate-800 tracking-tight">Calendar</div>
        
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

        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-200 transition-all active:scale-95">
          <CalendarIcon size={16} />
          Create
        </button>
      </div>
    </div>
  );
};

export default TopBar;
