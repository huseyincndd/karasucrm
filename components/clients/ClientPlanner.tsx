'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Client, PACKAGE_LABELS, PACKAGE_QUOTAS, PackageType } from '@/types';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  Image as ImageIcon, 
  Circle,
  Check,
  Users
} from 'lucide-react';
import { 
  STAFF_MEMBERS, 
  StaffMember, 
  ContentType, 
  CONTENT_TO_DEPARTMENT 
} from '@/constants/staff';

interface ClientPlannerProps {
  client: Client;
  onClose: () => void;
  onUpdate: (client: Client) => void;
}

// ===== TASK ASSIGNMENT STORAGE =====
// This stores which staff member is assigned to which date/content combination
// In production, this would be stored in the database
interface TaskAssignment {
  date: string;
  contentType: ContentType;
  staffId: string;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const ClientPlanner: React.FC<ClientPlannerProps> = ({ client, onClose, onUpdate }) => {
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = January 2026, 1 = February 2026
  const [activeType, setActiveType] = useState<ContentType | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [plannedDates, setPlannedDates] = useState(client.plannedDates);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  const quota = PACKAGE_QUOTAS[client.package];
  const year = 2026;
  const month = selectedMonth; // 0 = January, 1 = February

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  // Reset staff selection when content type changes
  useEffect(() => {
    setSelectedStaff(null);
  }, [activeType]);

  // Get filtered staff based on active content type
  const filteredStaff = useMemo(() => {
    if (!activeType) return [];
    const department = CONTENT_TO_DEPARTMENT[activeType];
    return STAFF_MEMBERS.filter(staff => staff.department === department);
  }, [activeType]);

  // Calculate remaining quota
  const getRemaining = (type: ContentType) => {
    const total = quota[type];
    const used = plannedDates[type].filter(d => {
      const date = new Date(d);
      return date.getMonth() === month;
    }).length;
    return total - used;
  };

  // Generate calendar days
  const generateDays = () => {
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startingDayIndex = (firstDay.getDay() + 6) % 7;

    const days: (number | null)[] = [];
    for (let i = 0; i < startingDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    
    return days;
  };

  const days = generateDays();

  // Check if date has content planned
  const getDateContent = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const content: ContentType[] = [];
    
    if (plannedDates.reels.includes(dateStr)) content.push('reels');
    if (plannedDates.posts.includes(dateStr)) content.push('posts');
    if (plannedDates.stories.includes(dateStr)) content.push('stories');
    
    return content;
  };

  // Get assigned staff for a specific date and content type
  const getAssignedStaff = (day: number, contentType: ContentType): StaffMember | undefined => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const assignment = taskAssignments.find(
      a => a.date === dateStr && a.contentType === contentType
    );
    if (assignment) {
      return STAFF_MEMBERS.find(s => s.id === assignment.staffId);
    }
    return undefined;
  };

  // Handle date click
  // NOTE: When a task is created here, it will be assigned to the selected staff member
  // and will appear in their "My Tasks" page
  const handleDateClick = (day: number) => {
    if (!activeType) return;
    
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    const currentDates = plannedDates[activeType];
    
    let newDates: string[];
    let newAssignments = [...taskAssignments];
    
    if (currentDates.includes(dateStr)) {
      // Remove the date
      newDates = currentDates.filter(d => d !== dateStr);
      // Also remove any assignment for this date
      newAssignments = newAssignments.filter(
        a => !(a.date === dateStr && a.contentType === activeType)
      );
    } else {
      // Add (if quota allows)
      if (getRemaining(activeType) <= 0) return;
      newDates = [...currentDates, dateStr];
      
      // Add staff assignment if a staff member is selected
      if (selectedStaff) {
        newAssignments.push({
          date: dateStr,
          contentType: activeType,
          staffId: selectedStaff.id,
        });
      }
    }
    
    const newPlannedDates = { ...plannedDates, [activeType]: newDates };
    setPlannedDates(newPlannedDates);
    setTaskAssignments(newAssignments);
    
    // Auto-save
    // NOTE: In production, taskAssignments should also be saved to the database
    // This would enable the "My Tasks" page to show tasks for each staff member
    onUpdate({ ...client, plannedDates: newPlannedDates });
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleContentTypeChange = (type: ContentType) => {
    if (activeType === type) {
      setActiveType(null);
    } else {
      setActiveType(type);
    }
  };

  const getTypeConfig = (type: ContentType) => {
    switch (type) {
      case 'reels': return { icon: Video, color: 'rose', label: 'Reels', bgActive: '#f43f5e' };
      case 'posts': return { icon: ImageIcon, color: 'blue', label: 'Post', bgActive: '#3b82f6' };
      case 'stories': return { icon: Circle, color: 'purple', label: 'Story', bgActive: '#a855f7' };
    }
  };

  const getDepartmentLabel = (type: ContentType) => {
    switch (type) {
      case 'reels': return 'Video Ekibi';
      case 'posts': return 'Tasarım Ekibi';
      case 'stories': return 'İçerik Ekibi';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className={`relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden transition-transform duration-200 ${isVisible ? 'scale-100' : 'scale-95'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={client.logo} alt={client.name} className="w-10 h-10 rounded-lg" />
            <div>
              <h2 className="font-semibold text-slate-900">{client.name}</h2>
              <span className="text-xs text-slate-500">{PACKAGE_LABELS[client.package]}</span>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 border-b border-slate-100">
          <button 
            onClick={() => setSelectedMonth(Math.max(0, selectedMonth - 1))}
            disabled={selectedMonth === 0}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-semibold text-slate-900 min-w-[120px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button 
            onClick={() => setSelectedMonth(Math.min(1, selectedMonth + 1))}
            disabled={selectedMonth === 1}
            className="p-2 text-slate-400 hover:text-slate-600 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Resource Bar - Content Type Selection */}
        <div className="flex items-center justify-center gap-3 p-4 border-b border-slate-100">
          {(['reels', 'posts', 'stories'] as ContentType[]).map(type => {
            const config = getTypeConfig(type);
            const Icon = config.icon;
            const remaining = getRemaining(type);
            const isActive = activeType === type;
            
            return (
              <button
                key={type}
                onClick={() => handleContentTypeChange(type)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${isActive 
                    ? `bg-${config.color}-500 text-white shadow-lg` 
                    : `bg-${config.color}-50 text-${config.color}-600 hover:bg-${config.color}-100`
                  }
                `}
                style={{
                  backgroundColor: isActive ? config.bgActive : undefined
                }}
              >
                <Icon size={16} />
                {config.label}
                <span className={`
                  px-1.5 py-0.5 rounded text-xs font-bold
                  ${isActive ? 'bg-white/20' : 'bg-white'}
                `}>
                  {remaining} Kaldı
                </span>
              </button>
            );
          })}
        </div>

        {/* ===== STAFF SELECTOR ROW ===== */}
        {/* This row appears when a content type is selected */}
        {/* Staff are filtered based on content type: Reels → Video Team, Posts → Design Team, Stories → Content Team */}
        {activeType && (
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              {/* Department Label */}
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 min-w-[100px]">
                <Users size={14} />
                {getDepartmentLabel(activeType)}:
              </div>
              
              {/* Staff Avatars */}
              <div className="flex items-center gap-2">
                {filteredStaff.map(staff => {
                  const isSelected = selectedStaff?.id === staff.id;
                  const config = getTypeConfig(activeType);
                  
                  return (
                    <button
                      key={staff.id}
                      onClick={() => setSelectedStaff(isSelected ? null : staff)}
                      className={`
                        relative group transition-all duration-200
                        ${isSelected ? 'scale-110' : 'hover:scale-105'}
                      `}
                      title={`${staff.name} - ${staff.role}`}
                    >
                      {/* Avatar with selection ring */}
                      <div 
                        className={`
                          w-10 h-10 rounded-full overflow-hidden border-3 transition-all
                          ${isSelected 
                            ? 'ring-offset-2 shadow-lg' 
                            : 'border-white shadow-sm hover:shadow-md'
                          }
                        `}
                        style={{
                          borderColor: isSelected ? config.bgActive : 'white',
                          boxShadow: isSelected 
                            ? `0 0 0 2px white, 0 0 0 4px ${config.bgActive}` 
                            : undefined,
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={staff.avatar} 
                          alt={staff.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Selection checkmark */}
                      {isSelected && (
                        <div 
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-sm"
                          style={{ backgroundColor: config.bgActive }}
                        >
                          <Check size={12} />
                        </div>
                      )}
                      
                      {/* Hover tooltip */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {staff.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Staff Info */}
              {selectedStaff && (
                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Atanan:</span>
                  <span className="text-sm font-medium text-slate-700">{selectedStaff.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        {activeType && (
          <div className="px-4 py-2 bg-slate-50 text-center text-xs text-slate-500">
            {selectedStaff ? (
              <>
                📅 <strong>{selectedStaff.name}</strong> için tarihlere tıklayarak <strong>{getTypeConfig(activeType).label}</strong> planla. 
                <span className="text-slate-400 ml-1">Tekrar tıkla kaldır.</span>
              </>
            ) : (
              <>
                👤 Önce yukarıdan bir ekip üyesi seç, sonra tarihlere tıkla.
              </>
            )}
          </div>
        )}

        {/* Mini Calendar */}
        <div className="p-4">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={index} className="aspect-square" />;
              }

              const dateContent = getDateContent(day);
              const hasReels = dateContent.includes('reels');
              const hasPosts = dateContent.includes('posts');
              const hasStories = dateContent.includes('stories');
              const hasContent = dateContent.length > 0;
              
              // Get assigned staff for current content type
              const assignedStaff = activeType ? getAssignedStaff(day, activeType) : undefined;
              
              // Determine cell color based on active type and content
              let bgColor = 'bg-white hover:bg-slate-50';
              let borderColor = 'border-slate-200';
              
              if (activeType && dateContent.includes(activeType)) {
                if (activeType === 'reels') {
                  bgColor = 'bg-rose-500';
                  borderColor = 'border-rose-500';
                } else if (activeType === 'posts') {
                  bgColor = 'bg-blue-500';
                  borderColor = 'border-blue-500';
                } else {
                  bgColor = 'bg-purple-500';
                  borderColor = 'border-purple-500';
                }
              }

              // Disable if no staff selected and type is active
              const isDisabled = !activeType || (activeType && !selectedStaff);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  disabled={isDisabled}
                  className={`
                    aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                    transition-all duration-150 relative
                    ${bgColor} ${borderColor}
                    ${!isDisabled ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                    ${activeType && dateContent.includes(activeType) ? 'text-white' : 'text-slate-700'}
                    ${isDisabled && activeType ? 'opacity-50' : ''}
                  `}
                >
                  <span className="text-sm font-medium">{day}</span>
                  
                  {/* Content indicators (when no type is active) */}
                  {hasContent && !activeType && (
                    <div className="flex gap-0.5 mt-0.5">
                      {hasReels && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                      {hasPosts && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {hasStories && <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                    </div>
                  )}
                  
                  {/* Assigned Staff Avatar (when task is selected) */}
                  {activeType && dateContent.includes(activeType) && assignedStaff && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white overflow-hidden shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={assignedStaff.avatar} 
                        alt={assignedStaff.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Check mark when selected (without staff avatar) */}
                  {activeType && dateContent.includes(activeType) && !assignedStaff && (
                    <Check size={14} className="absolute bottom-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Reels
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Post
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Story
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-600">
            <Check size={14} />
            Otomatik kaydedildi
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPlanner;
