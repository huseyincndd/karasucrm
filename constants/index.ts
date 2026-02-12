import { Platform, Status, Task, User } from '@/types';

export const USERS: User[] = [
  { id: 'u1', name: 'Alex Rivera', roleTitle: 'Creative Director', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' },
  { id: 'u2', name: 'Sarah Chen', roleTitle: 'Social Manager', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' },
];

// 15 Major Agency Clients
const CLIENTS = [
  'Nike', 'BurgerKing', 'Sephora', 'Bosch', 'Hilton', 
  'Starbucks', 'Zara', 'Apple', 'Tesla', 'RedBull', 
  'Sony', 'Lego', 'Pepsi', 'IKEA', 'Disney'
];

const TITLES = [
  'Viral Challenge', 'Product Teaser', 'Testimonial', 
  'BTS Footage', 'Weekly Recap', 'Meme', 'Flash Sale',
  'Collab', 'Edu Carousel', 'Spotlight', 'Q&A Session',
  'Giveaway', 'Employee Takeover', 'Trend Hop', 'Launch Event'
];

// Seeded random function for deterministic generation
function seededRandom(seed: number): () => number {
  return function() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

const generateMockTasks = (): Task[] => {
  const tasks: Task[] = [];
  // Use a fixed date for SSR consistency
  const year = 2026;
  const month = 0; // January (0-indexed)
  const daysInMonth = 31;
  
  const platformValues = [Platform.REEL, Platform.STORY, Platform.POST];

  // HEAVY TRAFFIC: Generate ~10-15 tasks PER DAY
  for (let day = 1; day <= daysInMonth; day++) {
    // Create a seeded random for this day
    const random = seededRandom(day * 1000);
    
    // Deterministic number of tasks for this day (between 8 and 14)
    const tasksForDay = 8 + Math.floor(random() * 7);
    
    for (let t = 0; t < tasksForDay; t++) {
      const dateObj = new Date(year, month, day);
      const dateStr = dateObj.toISOString().split('T')[0];
      
      // Use 27th as "Today" for simulation purposes
      const isSimulatedToday = day === 27;
      const isSimulatedTomorrow = day === 28;
      
      const clientIndex = Math.floor(random() * CLIENTS.length);
      const client = CLIENTS[clientIndex];
      const platformIndex = Math.floor(random() * 3);
      const platform = platformValues[platformIndex];
      
      // Logic for Status/File
      let status = Status.TODO;
      let fileUrl: string | null = null;
      const rand = random();

      if (rand > 0.75) {
        status = Status.PUBLISHED;
        fileUrl = 'https://example.com/image.png';
      } else if (rand > 0.5) {
        status = Status.TODO;
        fileUrl = 'https://example.com/image.png'; // Ready
      } else {
        status = Status.TODO;
        fileUrl = null;
      }

      // Force urgent on Today/Tomorrow
      if ((isSimulatedToday || isSimulatedTomorrow) && random() > 0.6) {
        status = Status.TODO;
        fileUrl = null;
      }

      const titleIndex = Math.floor(random() * TITLES.length);

      tasks.push({
        id: `task-${day}-${t}`,
        clientName: client,
        platform: platform,
        status: status,
        date: dateStr,
        title: TITLES[titleIndex],
        assignees: [USERS[0]],
        caption: `Draft caption for ${client}... #marketing`,
        fileUrl: fileUrl,
        comments: []
      });
    }
  }
  return tasks;
};

export const MOCK_TASKS: Task[] = generateMockTasks();
