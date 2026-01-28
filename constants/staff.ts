// ===== STAFF DATA =====
// Team members organized by department
// NOTE: These tasks will populate the "My Tasks" page for the selected user

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: 'video' | 'design' | 'content';
}

export const STAFF_MEMBERS: StaffMember[] = [
  // Video Team (for Reels)
  { id: 'eren', name: 'Eren', avatar: 'https://i.pravatar.cc/150?u=eren', role: 'Video Editor', department: 'video' },
  { id: 'berhan', name: 'Berhan', avatar: 'https://i.pravatar.cc/150?u=berhan', role: 'Motion Designer', department: 'video' },
  
  // Design Team (for Posts)
  { id: 'ilayda', name: 'İlayda', avatar: 'https://i.pravatar.cc/150?u=ilayda', role: 'Graphic Designer', department: 'design' },
  { id: 'zeliha', name: 'Zeliha', avatar: 'https://i.pravatar.cc/150?u=zeliha', role: 'Senior Designer', department: 'design' },
  
  // Content Team (for Stories)
  { id: 'ayse', name: 'Ayşe', avatar: 'https://i.pravatar.cc/150?u=ayse', role: 'Content Creator', department: 'content' },
  { id: 'mehmet', name: 'Mehmet', avatar: 'https://i.pravatar.cc/150?u=mehmet', role: 'Social Media Manager', department: 'content' },
];

// Maps content type to department
export type ContentType = 'reels' | 'posts' | 'stories';

export const CONTENT_TO_DEPARTMENT: Record<ContentType, 'video' | 'design' | 'content'> = {
  reels: 'video',
  posts: 'design',
  stories: 'content',
};

export const DEPARTMENT_LABELS: Record<'video' | 'design' | 'content', string> = {
  video: 'Video Ekibi',
  design: 'Tasarım Ekibi',
  content: 'İçerik Ekibi',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  reels: 'Reels',
  posts: 'Post',
  stories: 'Story',
};

export const CONTENT_TYPE_COLORS: Record<ContentType, { bg: string; text: string; dot: string }> = {
  reels: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
  posts: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
  stories: { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
};

// ===== TASK ASSIGNMENT =====
// Status types matching the calendar page:
// - 'beklemede' = Beklemede (Waiting) - White/Slate
// - 'hazir' = Hazır, Gününü Bekliyor (Ready, waiting for its day) - Yellow/Amber  
// - 'tamamlandi' = Tamamlandı (Completed) - Green/Emerald
export type TaskStatus = 'beklemede' | 'hazir' | 'tamamlandi';

export interface TaskAssignment {
  id: string;
  date: string;
  contentType: ContentType;
  staffId: string;
  clientId: string;
  clientName: string;
  clientLogo: string;
  status: TaskStatus;
  title?: string;
}

// Generate mock task assignments for demo
export const generateMockAssignments = (): TaskAssignment[] => {
  const assignments: TaskAssignment[] = [];
  const clients = [
    { id: 'nike', name: 'Nike', logo: 'https://ui-avatars.com/api/?name=Nike&background=random&size=64' },
    { id: 'starbucks', name: 'Starbucks', logo: 'https://ui-avatars.com/api/?name=Starbucks&background=random&size=64' },
    { id: 'apple', name: 'Apple', logo: 'https://ui-avatars.com/api/?name=Apple&background=random&size=64' },
    { id: 'tesla', name: 'Tesla', logo: 'https://ui-avatars.com/api/?name=Tesla&background=random&size=64' },
    { id: 'redbull', name: 'RedBull', logo: 'https://ui-avatars.com/api/?name=RedBull&background=random&size=64' },
  ];

  const contentTypes: ContentType[] = ['reels', 'posts', 'stories'];
  const statuses: TaskStatus[] = ['beklemede', 'hazir', 'tamamlandi'];
  const titles = ['Viral Challenge', 'Product Teaser', 'Flash Sale', 'Weekly Recap', 'Collab Video'];

  let id = 1;
  
  // Generate tasks for each staff member
  STAFF_MEMBERS.forEach(staff => {
    // Each staff member gets 4-8 tasks
    const taskCount = 4 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < taskCount; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const contentType = contentTypes.find(ct => CONTENT_TO_DEPARTMENT[ct] === staff.department) || 'reels';
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const day = 27 + Math.floor(Math.random() * 5); // Jan 27-31
      
      assignments.push({
        id: `task-${id++}`,
        date: new Date(2026, 0, day).toISOString().split('T')[0],
        contentType,
        staffId: staff.id,
        clientId: client.id,
        clientName: client.name,
        clientLogo: client.logo,
        status,
        title: titles[Math.floor(Math.random() * titles.length)],
      });
    }
  });

  return assignments;
};

export const MOCK_ASSIGNMENTS: TaskAssignment[] = generateMockAssignments();
