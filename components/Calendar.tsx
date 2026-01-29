'use client';

import React from 'react';
import { Task, Platform, Status } from '@/types';
import { 
  Video, 
  Image as ImageIcon, 
  Circle,
  CalendarDays
} from 'lucide-react';

interface CalendarProps {
  tasks: any[]; // Using any to accommodate the mapped type
  onDayClick: (date: string, dayNum: number) => void;
  currentDate: Date;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// Status calculation
const getTaskStatus = (task: any, todayNum: number) => {
  // Use rawStatus from API if available
  if (task.rawStatus) {
    if (task.rawStatus === 'tamamlandi') return 'done';
    if (task.rawStatus === 'hazir') return 'ready';
    
    // Parse task date properly to calculate urgency
    const taskDate = new Date(task.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntil <= 2 && daysUntil >= 0) return 'urgent';
    return 'waiting';
  }

  // Fallback
  return 'waiting';
};

const Calendar: React.FC<CalendarProps> = ({ tasks, onDayClick, currentDate }) => {
  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (0 = January)
  
  // Real today for highlighting
  const realCurrentDayNum = today.getDate();
  const isRealCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // getDay returns 0 for Sunday. We want Monday to be 0 for our grid (Pzt, Sal...)
  // Sunday (0) -> 6
  // Monday (1) -> 0
  // ...
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  const days: { dayNum: number | null; dateStr: string | null }[] = [];
  
  // Previous month padding
  for (let i = 0; i < startingDayIndex; i++) days.push({ dayNum: null, dateStr: null });
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    // Construct ISO date string properly using local time components to avoid TZ issues
    // Or simply:
    const d = new Date(year, month, i);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yr}-${mo}-${da}`;
    
    days.push({ dayNum: i, dateStr: dateStr });
  }
  
  // Next month padding to fill grid (42 cells usually covers all months)
  const remainingCells = 42 - days.length;
  for (let i = 0; i < remainingCells; i++) days.push({ dayNum: null, dateStr: null });

  return (
    <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 bg-white border-b border-slate-200">
        {WEEKDAYS.map((day) => (
          <div key={day} className="py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 auto-rows-fr min-h-full">
          {days.map((dayObj, index) => {
            const isPadding = dayObj.dayNum === null;
            const dayTasks = dayObj.dateStr ? tasks.filter(t => t.date === dayObj.dateStr) : [];
            
            const dayNum = dayObj.dayNum || 0;
            const isToday = dayNum === realCurrentDayNum && !isPadding && isRealCurrentMonth;
            
            // Basic past check: strictly less than today (if current month) OR past month
            const isPast = !isPadding && (
              (isRealCurrentMonth && dayNum < realCurrentDayNum) || 
              (new Date(year, month, 1) < new Date(today.getFullYear(), today.getMonth(), 1))
            );

            // Platform counts
            const reels = dayTasks.filter(t => (t.platform === Platform.REEL) || (t.rawContentType === 'reels')).length;
            const posts = dayTasks.filter(t => (t.platform === Platform.POST) || (t.rawContentType === 'posts')).length;
            const stories = dayTasks.filter(t => (t.platform === Platform.STORY) || (t.rawContentType === 'stories')).length;

            // Status counts
            const waiting = dayTasks.filter(t => getTaskStatus(t, realCurrentDayNum) === 'waiting').length;
            const urgent = dayTasks.filter(t => getTaskStatus(t, realCurrentDayNum) === 'urgent').length;
            const ready = dayTasks.filter(t => getTaskStatus(t, realCurrentDayNum) === 'ready').length;
            const done = dayTasks.filter(t => getTaskStatus(t, realCurrentDayNum) === 'done').length;

            if (isPadding) {
              return <div key={index} className="h-24 sm:h-36 bg-slate-100/50 border-b border-r border-slate-100" />;
            }

            return (
              <div 
                key={index} 
                onClick={() => dayObj.dateStr && onDayClick(dayObj.dateStr, dayNum)}
                className={`
                  h-24 sm:h-36 border-b border-r border-slate-200 p-1.5 sm:p-3 flex flex-col cursor-pointer
                  transition-all duration-200 group
                  ${isPast ? 'bg-slate-50 opacity-50 hover:opacity-100' : 'bg-white hover:bg-slate-50'}
                  ${isToday ? 'ring-2 ring-inset ring-slate-900' : ''}
                `}
              >
                {/* Date */}
                <div className="flex items-center justify-between mb-1 sm:mb-3">
                  <span className={`
                    text-xs sm:text-sm font-semibold
                    ${isToday ? 'bg-slate-900 text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center' : 'text-slate-700'}
                  `}>
                    {dayObj.dayNum}
                  </span>
                  {isToday && (
                    <span className="hidden sm:inline text-[10px] font-medium text-slate-500 uppercase tracking-wide">Bugün</span>
                  )}
                </div>

                {/* Platform Counts - Desktop */}
                {dayTasks.length > 0 && (
                  <div className="hidden sm:flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-2">
                    {reels > 0 && (
                      <span className="flex items-center gap-1">
                        <Video size={11} className="text-slate-400" />
                        {reels} Reels
                      </span>
                    )}
                    {posts > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon size={11} className="text-slate-400" />
                        {posts} Gönderi
                      </span>
                    )}
                    {stories > 0 && (
                      <span className="flex items-center gap-1">
                        <Circle size={11} className="text-slate-400" />
                        {stories} Story
                      </span>
                    )}
                  </div>
                )}
                
                {/* Platform - Mobile Dot/Icon Only */}
                {dayTasks.length > 0 && (
                   <div className="flex sm:hidden items-center gap-1 mb-1">
                      {reels > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                      {posts > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                      {stories > 0 && <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                   </div>
                )}

                {/* Status Indicators - Desktop */}
                {dayTasks.length > 0 && (
                  <div className="hidden sm:flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] mt-auto">
                    {waiting > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        {waiting} Beklemede
                      </span>
                    )}
                    {urgent > 0 && (
                      <span className="flex items-center gap-1 text-rose-500 font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {urgent} Acil
                      </span>
                    )}
                    {ready > 0 && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        {ready} Hazır
                      </span>
                    )}
                    {done > 0 && (
                      <span className="flex items-center gap-1 text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {done} Bitti
                      </span>
                    )}
                  </div>
                )}
                
                {/* Status Indicators - Mobile */}
                {dayTasks.length > 0 && (
                  <div className="flex sm:hidden flex-wrap gap-1 mt-auto">
                     {waiting > 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                     {urgent > 0 && <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                     {ready > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                     {done > 0 && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                )}

                {/* Today Button */}
                {isToday && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      dayObj.dateStr && onDayClick(dayObj.dateStr, dayNum);
                    }}
                    className="mt-auto hidden sm:flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <CalendarDays size={12} />
                    Aç
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
