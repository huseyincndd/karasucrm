// ===== Enums =====
export enum Platform {
  REEL = 'Reel',
  STORY = 'Story',
  POST = 'Post'
}

export enum Status {
  TODO = 'Todo',
  PUBLISHED = 'Published'
}

// ===== View Types =====
export type ViewMode = 'Month' | 'Week' | 'Day';

export interface FilterState {
  client: string;
  platform: string;
  status: string;
  search: string;
}

// ===== User & Comment =====
export interface User {
  id: string;
  name: string;
  roleTitle: string; // Renamed from role
  avatar: string | null;
  isAdmin?: boolean;
  isClient?: boolean;
  username?: string;
  reelsQuota?: number;
  postsQuota?: number;
  storiesQuota?: number;
  services?: ClientService[];
  // Extra fields for auth context user
  clientId?: string;
  packageType?: PackageType;
  capabilities?: { type: string; price: number }[];
  
  // Responsible Staff
  // Responsible Staff
  socialUsers?: ClientAssignee[];
  designerUsers?: ClientAssignee[];
  reelsUsers?: ClientAssignee[];
  adsUsers?: ClientAssignee[];
}

export interface ClientService {
  id: string;
  serviceType: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

// ===== Task =====
export interface Task {
  id: string;
  clientName: string;
  platform: Platform;
  status: Status;
  date: string;
  title: string;
  assignees: User[];
  caption: string;
  fileUrl: string | null;
  comments: Comment[];
}

// ===== Package types =====
export type PackageType = 'vitrin' | 'plus' | 'premium' | 'custom';

export interface PackageQuota {
  reels: number;
  posts: number;
  stories: number;
}

export const PACKAGE_QUOTAS: Record<PackageType, PackageQuota> = {
  vitrin: { reels: 4, posts: 8, stories: 8 },
  plus: { reels: 6, posts: 12, stories: 12 },
  premium: { reels: 10, posts: 20, stories: 20 },
  custom: { reels: 0, posts: 0, stories: 0 } // Default for custom
};

export const PACKAGE_LABELS: Record<PackageType, string> = {
  vitrin: 'Vitrin Paket',
  plus: 'Plus Paket',
  premium: 'Premium Paket',
  custom: 'Özel Paket'
};

export interface ClientAssignee {
  id: string;
  name: string;
  avatar: string | null;
  roleTitle: string;
}

// ===== Client =====
export interface Client {
  id: string;
  name: string;
  logo?: string;
  package: PackageType;
  startDate: string; // ISO date
  renewalDate: string; // ISO date
  
  // Custom Quota
  reelsQuota?: number;
  postsQuota?: number;
  storiesQuota?: number;

  usedQuota: {
    reels: number;
    reelsCompleted?: number;
    posts: number;
    postsCompleted?: number;
    stories: number;
    storiesCompleted?: number;
  };
  plannedDates: {
    reels: string[]; // Array of ISO dates
    posts: string[];
    stories: string[];
  };
  // Müşteri portalı
  hasPortalAccess?: boolean;
  portalUsername?: string | null;

  // Sorumlu Kişiler
  socialUsers?: ClientAssignee[];
  designerUsers?: ClientAssignee[];
  reelsUsers?: ClientAssignee[];
  adsUsers?: ClientAssignee[];
  adsPeriod?: string | null;
}
