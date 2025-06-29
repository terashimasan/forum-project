export interface UserLevel {
  title: string;
  minPosts: number;
  minReputation: number;
  color: string;
  glowColor: string;
  badge?: string;
  specialEffect?: boolean;
}

export const USER_LEVELS: UserLevel[] = [
  {
    title: 'Newbie',
    minPosts: 0,
    minReputation: 0,
    color: 'text-gray-600',
    glowColor: 'shadow-gray-500/20',
  },
  {
    title: 'Member',
    minPosts: 10,
    minReputation: 50,
    color: 'text-green-600',
    glowColor: 'shadow-green-500/20',
  },
  {
    title: 'Regular',
    minPosts: 50,
    minReputation: 200,
    color: 'text-blue-600',
    glowColor: 'shadow-blue-500/20',
    badge: '⭐',
  },
  {
    title: 'Veteran',
    minPosts: 150,
    minReputation: 500,
    color: 'text-purple-600',
    glowColor: 'shadow-purple-500/30',
    badge: '🏆',
    specialEffect: true,
  },
  {
    title: 'Elite',
    minPosts: 300,
    minReputation: 1000,
    color: 'text-orange-600',
    glowColor: 'shadow-orange-500/40',
    badge: '💎',
    specialEffect: true,
  },
  {
    title: 'Legend',
    minPosts: 500,
    minReputation: 2000,
    color: 'text-red-600',
    glowColor: 'shadow-red-500/50',
    badge: '👑',
    specialEffect: true,
  },
  {
    title: 'Overlord',
    minPosts: 1000,
    minReputation: 5000,
    color: 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500',
    glowColor: 'shadow-yellow-500/60',
    badge: '🔥',
    specialEffect: true,
  },
];

export function getUserLevel(posts: number, reputation: number): UserLevel {
  return USER_LEVELS.slice()
    .reverse()
    .find(level => posts >= level.minPosts && reputation >= level.minReputation) || USER_LEVELS[0];
}

export function getNextLevel(posts: number, reputation: number): UserLevel | null {
  const currentLevelIndex = USER_LEVELS.findIndex(level => 
    posts >= level.minPosts && reputation >= level.minReputation
  );
  
  if (currentLevelIndex === -1 || currentLevelIndex === USER_LEVELS.length - 1) {
    return USER_LEVELS[1] || null;
  }
  
  return USER_LEVELS[currentLevelIndex + 1] || null;
}