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
  role: string;
  avatar: string;
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
export type PackageType = 'vitrin' | 'plus' | 'premium';

export interface PackageQuota {
  reels: number;
  posts: number;
  stories: number;
}

export const PACKAGE_QUOTAS: Record<PackageType, PackageQuota> = {
  vitrin: { reels: 4, posts: 8, stories: 8 },
  plus: { reels: 6, posts: 12, stories: 12 },
  premium: { reels: 10, posts: 20, stories: 20 }
};

export const PACKAGE_LABELS: Record<PackageType, string> = {
  vitrin: 'Vitrin Paket',
  plus: 'Plus Paket',
  premium: 'Premium Paket'
};

// ===== Client =====
export interface Client {
  id: string;
  name: string;
  logo?: string;
  package: PackageType;
  startDate: string; // ISO date
  renewalDate: string; // ISO date
  usedQuota: {
    reels: number;
    posts: number;
    stories: number;
  };
  plannedDates: {
    reels: string[]; // Array of ISO dates
    posts: string[];
    stories: string[];
  };
}
