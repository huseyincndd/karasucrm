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
  tasks: Task[];
  onDayClick: (date: string, dayNum: number) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const SIMULATED_TODAY_DATE = 27;

// Status hesaplama
const getTaskStatus = (task: Task, dayNum: number) => {
  if (task.status === Status.PUBLISHED) return 'done';
  if (task.fileUrl) return 'ready';
  const daysUntil = dayNum - SIMULATED_TODAY_DATE;
  if (daysUntil <= 2) return 'urgent';
  return 'waiting';
};

const Calendar: React.FC<CalendarProps> = ({ tasks, onDayClick }) => {
  const year = 2026;
  const month = 0;

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  const days: { dayNum: number | null; dateStr: string | null }[] = [];
  for (let i = 0; i < startingDayIndex; i++) days.push({ dayNum: null, dateStr: null });
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = new Date(year, month, i).toISOString().split('T')[0];
    days.push({ dayNum: i, dateStr: dateStr });
  }
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
            const isToday = dayNum === SIMULATED_TODAY_DATE && !isPadding;
            const isPast = dayNum < SIMULATED_TODAY_DATE && !isPadding;

            // Platform counts
            const reels = dayTasks.filter(t => t.platform === Platform.REEL).length;
            const posts = dayTasks.filter(t => t.platform === Platform.POST).length;
            const stories = dayTasks.filter(t => t.platform === Platform.STORY).length;

            // Status counts
            const waiting = dayTasks.filter(t => getTaskStatus(t, dayNum) === 'waiting').length;
            const urgent = dayTasks.filter(t => getTaskStatus(t, dayNum) === 'urgent').length;
            const ready = dayTasks.filter(t => getTaskStatus(t, dayNum) === 'ready').length;
            const done = dayTasks.filter(t => getTaskStatus(t, dayNum) === 'done').length;

            if (isPadding) {
              return <div key={index} className="h-36 bg-slate-100/50 border-b border-r border-slate-100" />;
            }

            return (
              <div 
                key={index} 
                onClick={() => dayObj.dateStr && onDayClick(dayObj.dateStr, dayNum)}
                className={`
                  h-36 border-b border-r border-slate-200 p-3 flex flex-col cursor-pointer
                  transition-all duration-200 group
                  ${isPast ? 'bg-slate-50 opacity-50 hover:opacity-100' : 'bg-white hover:bg-slate-50'}
                  ${isToday ? 'ring-2 ring-inset ring-slate-900' : ''}
                `}
              >
                {/* Date */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`
                    text-sm font-semibold
                    ${isToday ? 'bg-slate-900 text-white w-7 h-7 rounded-full flex items-center justify-center' : 'text-slate-700'}
                  `}>
                    {dayObj.dayNum}
                  </span>
                  {isToday && (
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Bugün</span>
                  )}
                </div>

                {/* Platform Counts */}
                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mb-2">
                    {reels > 0 && (
                      <span className="flex items-center gap-1">
                        <Video size={11} className="text-slate-400" />
                        {reels} Reels
                      </span>
                    )}
                    {posts > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon size={11} className="text-slate-400" />
                        {posts} Post
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

                {/* Status Indicators */}
                {dayTasks.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] mt-auto">
                    {waiting > 0 && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        {waiting} Bekliyor
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

                {/* Today Button */}
                {isToday && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      dayObj.dateStr && onDayClick(dayObj.dateStr, dayNum);
                    }}
                    className="mt-auto flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-md hover:bg-slate-800 transition-colors"
                  >
                    <CalendarDays size={12} />
                    Ajandayı Aç
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
