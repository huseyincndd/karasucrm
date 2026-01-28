'use client';

import React, { useState, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import Calendar from '@/components/Calendar';
import DayModal from '@/components/DayModal';
import { MOCK_TASKS } from '@/constants';
import { ViewMode, FilterState } from '@/types';

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>('Month');
  const [filters, setFilters] = useState<FilterState>({
    client: 'All',
    platform: 'All',
    status: 'All',
    search: ''
  });
  
  // Modal State
  const [selectedDay, setSelectedDay] = useState<{ date: string; dayNum: number } | null>(null);

  const handleDayClick = (date: string, dayNum: number) => {
    setSelectedDay({ date, dayNum });
  };

  const handleCloseModal = () => {
    setSelectedDay(null);
  };

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return MOCK_TASKS.filter(task => {
      if (filters.client !== 'All' && task.clientName !== filters.client) return false;
      if (filters.platform !== 'All' && task.platform !== filters.platform) return false;
      if (filters.status !== 'All' && task.status !== filters.status) return false;
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [filters]);

  // Tasks for selected day
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    return MOCK_TASKS.filter(task => task.date === selectedDay.date);
  }, [selectedDay]);

  // Extract unique clients for the filter dropdown
  const clients = useMemo(() => Array.from(new Set(MOCK_TASKS.map(t => t.clientName))), []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* 1. Left Sidebar */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* 2. Top Bar (Filters) */}
        <TopBar 
          viewMode={viewMode} 
          setViewMode={setViewMode} 
          filters={filters}
          setFilters={setFilters}
          clients={clients}
        />

        {/* 3. Calendar Grid */}
        <Calendar 
          tasks={filteredTasks} 
          onDayClick={handleDayClick}
        />
      </div>

      {/* 4. Day Modal Overlay */}
      <DayModal 
        isOpen={selectedDay !== null}
        onClose={handleCloseModal}
        date={selectedDay?.date || ''}
        dayNum={selectedDay?.dayNum || 0}
        tasks={selectedDayTasks}
      />
    </div>
  );
}
