'use client';

import React, { useState, useEffect } from 'react';
import { Task, Status, Platform } from '@/types';
import { 
  X, 
  Download,
  UploadCloud,
  Check,
  Video,
  Image as ImageIcon,
  Circle,
  FileText
} from 'lucide-react';

interface RightPanelProps {
  task: Task | null;
  onClose: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ task, onClose }) => {
  const [isPublished, setIsPublished] = useState(false);
  const [hasFile, setHasFile] = useState(false);

  useEffect(() => {
    if (task) {
      setIsPublished(task.status === Status.PUBLISHED);
      setHasFile(!!task.fileUrl);
    }
  }, [task]);

  if (!task) return null;

  const handlePublishToggle = () => {
    // In a real app, this would update the global state/backend
    setIsPublished(!isPublished);
  };

  const handleFileUpload = () => {
    setHasFile(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 1. Simplified Header */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
        <div>
            <h2 className="text-lg font-bold text-slate-900 leading-none mb-1">{task.clientName}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className={`flex items-center gap-1 font-medium ${
                     task.platform === Platform.REEL ? 'text-rose-600' :
                     task.platform === Platform.POST ? 'text-blue-600' : 'text-purple-600'
                }`}>
                    {task.platform === Platform.REEL && <Video size={12} />}
                    {task.platform === Platform.POST && <ImageIcon size={12} />}
                    {task.platform === Platform.STORY && <Circle size={12} />}
                    {task.platform}
                </span>
                <span>•</span>
                <span>{task.date}</span>
            </div>
        </div>
        <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
        >
            <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* 2. Massive Publish Switch */}
        <div>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 block">
                Action Required
            </label>
            <button
                onClick={handlePublishToggle}
                className={`
                    w-full py-6 px-4 rounded-xl border-2 transition-all duration-300 flex items-center justify-between group
                    ${isPublished 
                        ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }
                `}
            >
                <div className="flex flex-col items-start">
                    <span className={`text-xl font-bold ${isPublished ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {isPublished ? 'PUBLISHED' : 'Mark as PUBLISHED'}
                    </span>
                    <span className="text-xs text-slate-500">
                        {isPublished ? 'This task is complete.' : 'Click to complete task.'}
                    </span>
                </div>
                
                <div className={`
                    w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                    ${isPublished 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'bg-transparent border-slate-300 text-transparent group-hover:border-slate-400'
                    }
                `}>
                    <Check size={20} strokeWidth={4} />
                </div>
            </button>
        </div>

        {/* 3. File Section (Binary State) */}
        <div className={`transition-opacity duration-300 ${isPublished ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 block">
                Media Asset
            </label>
            
            {!hasFile ? (
                // State A: Upload Dropzone
                <div 
                    onClick={handleFileUpload}
                    className="h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 hover:border-indigo-400 cursor-pointer flex flex-col items-center justify-center transition-all group"
                >
                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={24} className="text-indigo-500" />
                    </div>
                    <p className="font-bold text-slate-700">Drag & Drop File Here</p>
                    <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                </div>
            ) : (
                // State B: Preview & Download
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="aspect-video bg-slate-100 relative group cursor-pointer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src={`https://picsum.photos/seed/${task.id}/800/450`} 
                            className="w-full h-full object-cover"
                            alt="Preview"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium">
                            View Fullscreen
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-between bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                                <FileText size={20} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700">Final_Render_v3.mp4</p>
                                <p className="text-xs text-slate-400">24.5 MB</p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors">
                            <Download size={16} />
                            Download
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* 4. Simple Caption */}
        <div className={`transition-opacity duration-300 ${isPublished ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 block">
                Caption
            </label>
            <textarea 
                className="w-full h-32 p-4 text-sm text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white resize-none transition-all placeholder:text-slate-400"
                placeholder="Write your caption here..."
                defaultValue={task.caption}
            />
        </div>

      </div>
    </div>
  );
};

export default RightPanel;
