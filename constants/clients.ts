import { Client, PackageType, PACKAGE_QUOTAS } from '@/types';

const CLIENT_NAMES = [
  'Nike', 'Starbucks', 'Apple', 'Tesla', 'RedBull',
  'Sony', 'Lego', 'Pepsi', 'IKEA', 'Disney',
  'Zara', 'Bosch', 'Hilton', 'Sephora', 'BurgerKing'
];

const PACKAGES: PackageType[] = ['vitrin', 'plus', 'premium'];

// Seeded random for consistent generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export const generateMockClients = (): Client[] => {
  const clients: Client[] = [];
  const random = seededRandom(42);

  CLIENT_NAMES.forEach((name, index) => {
    const packageType = PACKAGES[index % 3];
    const quota = PACKAGE_QUOTAS[packageType];
    
    // Random days until renewal (1-30 days)
    const daysUntilRenewal = Math.floor(random() * 30) + 1;
    const renewalDate = new Date(2026, 0, 27 + daysUntilRenewal); // Starting from simulated today (Jan 27)
    
    // Random start date (1-12 months ago)
    const monthsAgo = Math.floor(random() * 12) + 1;
    const startDate = new Date(2026, 0 - monthsAgo, 1);

    // Random used quota (0 to max)
    const usedReels = Math.floor(random() * (quota.reels + 1));
    const usedPosts = Math.floor(random() * (quota.posts + 1));
    const usedStories = Math.floor(random() * (quota.stories + 1));

    // Generate some planned dates
    const plannedReels: string[] = [];
    const plannedPosts: string[] = [];
    const plannedStories: string[] = [];

    // Add some random planned dates in January 2026
    for (let i = 0; i < usedReels; i++) {
      const day = Math.floor(random() * 31) + 1;
      plannedReels.push(new Date(2026, 0, day).toISOString().split('T')[0]);
    }
    for (let i = 0; i < usedPosts; i++) {
      const day = Math.floor(random() * 31) + 1;
      plannedPosts.push(new Date(2026, 0, day).toISOString().split('T')[0]);
    }
    for (let i = 0; i < usedStories; i++) {
      const day = Math.floor(random() * 31) + 1;
      plannedStories.push(new Date(2026, 0, day).toISOString().split('T')[0]);
    }

    clients.push({
      id: `client-${index + 1}`,
      name,
      logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=64`,
      package: packageType,
      startDate: startDate.toISOString().split('T')[0],
      renewalDate: renewalDate.toISOString().split('T')[0],
      usedQuota: {
        reels: usedReels,
        posts: usedPosts,
        stories: usedStories
      },
      plannedDates: {
        reels: plannedReels,
        posts: plannedPosts,
        stories: plannedStories
      }
    });
  });

  return clients;
};

export const MOCK_CLIENTS: Client[] = generateMockClients();
