
'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { 
  Briefcase, 
  Search, 
  Loader2, 
  Users, 
  User as UserIcon, 
  PenTool, 
  Video, 
  Megaphone,
  Menu
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  logo: string | null;
  packageType: string;
  createdAt: string;
  socialUser: { id: string; name: string; avatar: string | null; roleTitle: string } | null;
  designerUser: { id: string; name: string; avatar: string | null; roleTitle: string } | null;
  reelsUser: { id: string; name: string; avatar: string | null; roleTitle: string } | null;
  adsUser: { id: string; name: string; avatar: string | null; roleTitle: string } | null;
  _count: {
    tasks: number;
  };
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Projeler yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'social': return <Users size={14} />;
      case 'design': return <PenTool size={14} />;
      case 'reels': return <Video size={14} />;
      case 'ads': return <Megaphone size={14} />;
      default: return <UserIcon size={14} />;
    }
  };

  const TeamMemberRow = ({ roleKey, member, label }: { roleKey: string, member: any, label: string }) => {
    const isMe = user?.id === member?.id;
    
    return (
      <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isMe ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}>
        {/* Icon Container */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
          {getRoleIcon(roleKey)}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
          {member ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold truncate ${isMe ? 'text-indigo-700' : 'text-slate-900'}`}>{member.name}</span>
              {isMe && <span className="bg-indigo-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">SEN</span>}
            </div>
          ) : (
            <span className="text-xs text-slate-300 italic font-medium">Atanmadı</span>
          )}
        </div>

        {/* Avatar */}
        {member && (
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
             {member.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {member.name.charAt(0)}
                </div>
             )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-50">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Briefcase className="text-indigo-600" size={24} />
            <h1 className="text-lg font-black text-slate-900">Projelerim</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
            <Menu size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
          {/* Desktop Header */}
          <div className="max-w-7xl mx-auto mb-8 hidden md:block">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                 <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                   <Briefcase className="text-indigo-600" size={28} />
                   Projelerim
                 </h1>
                 <p className="text-slate-500 font-medium mt-1">
                   {user?.isAdmin ? 'Tüm müşteri ve ekip atamalarını yönetin.' : 'Sorumlu olduğunuz müşteriler ve proje arkadaşlarınız.'}
                 </p>
              </div>

              <div className="relative">
                <input 
                   type="text" 
                   placeholder="Müşteri veya proje ara..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-sm font-medium"
                />
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              </div>
            </div>
          </div>

          {/* Search bar for Mobile (Shown below header) */}
          <div className="md:hidden mb-6">
             <div className="relative">
                <input 
                   type="text" 
                   placeholder="Projelerde ara..." 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-sm font-medium"
                />
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
             </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                 <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="text-slate-400" />
                 </div>
                 <p className="text-lg font-bold text-slate-900">Proje veya Müşteri Bulunamadı</p>
                 <p className="text-sm text-slate-500">Arama kriterlerinizi değiştirin veya yönetici ile iletişime geçin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredProjects.map((project) => (
                   <div key={project.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group">
                      {/* Card Header */}
                      <div className="p-6 pb-4 border-b border-slate-50 bg-gradient-to-b from-white to-slate-50/50">
                         <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                               {/* Logo */}
                               <div className="w-14 h-14 rounded-2xl bg-white shadow-lg shadow-slate-200/50 p-1 flex items-center justify-center border border-slate-100">
                                  {project.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={project.logo} alt={project.name} className="w-full h-full object-contain rounded-xl" />
                                  ) : (
                                    <Briefcase className="text-slate-300" />
                                  )}
                               </div>
                               <div>
                                  <h3 className="text-lg font-black text-slate-900 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">{project.name}</h3>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-wide border border-slate-200">
                                     {project.packageType} Paket
                                  </span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Team Section */}
                      <div className="p-4 space-y-2">
                         <div className="flex items-center gap-2 mb-3">
                            <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Proje Ekibi</h4>
                         </div>
                         
                         <div className="space-y-1.5">
                            <TeamMemberRow 
                               roleKey="social" 
                               label="Sosyal Medya Yöneticisi" 
                               member={project.socialUser} 
                            />
                            <TeamMemberRow 
                               roleKey="design" 
                               label="Grafik Tasarımcı" 
                               member={project.designerUser} 
                            />
                            <TeamMemberRow 
                               roleKey="reels" 
                               label="Reels Uzmanı" 
                               member={project.reelsUser} 
                            />
                            <TeamMemberRow 
                               roleKey="ads" 
                               label="Meta Reklam Uzmanı" 
                               member={project.adsUser} 
                            />
                         </div>
                      </div>
                      
                      {/* Footer - Task Count */}
                      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-500">
                         <span>Toplam Görev:</span>
                         <span className="font-bold text-slate-900">{project._count.tasks} Görev</span>
                      </div>
                   </div>
                 ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
