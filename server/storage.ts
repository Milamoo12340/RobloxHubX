import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getRecentGames(): RecentGame[];
  trackGameLaunch(placeId: number): void;
  getPerformanceData(): PerformanceData;
  getFriends(): Friend[];
  getNews(): NewsItem[];
}

interface RecentGame {
  id: string;
  placeId: number;
  lastPlayed: string;
  playtime: string;
  sessions: number;
}

interface PerformanceData {
  fps: number;
  cpu: number;
  ram: number;
  ping: number;
  fpsHistory: Array<{ time: string; value: number }>;
  pingHistory: Array<{ time: string; value: number }>;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "in-game" | "offline";
  currentGame?: string;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  timestamp: string;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private recentGames: Map<number, RecentGame>;
  private performanceHistory: Array<{ fps: number; ping: number; timestamp: number }>;

  constructor() {
    this.users = new Map();
    this.recentGames = new Map();
    this.performanceHistory = [];
    
    this.initializeRecentGames();
    this.startPerformanceSimulation();
  }

  private initializeRecentGames() {
    const games = [
      { placeId: 8737899170, playtime: "24h 15m", sessions: 12 },
      { placeId: 2753915549, playtime: "18h 30m", sessions: 8 },
      { placeId: 920587237, playtime: "12h 45m", sessions: 15 },
      { placeId: 606849621, playtime: "8h 22m", sessions: 5 },
    ];

    const now = Date.now();
    games.forEach((game, index) => {
      const hoursAgo = index * 2 + 1;
      this.recentGames.set(game.placeId, {
        id: game.placeId.toString(),
        placeId: game.placeId,
        lastPlayed: this.formatTimeAgo(hoursAgo * 60 * 60 * 1000),
        playtime: game.playtime,
        sessions: game.sessions,
      });
    });
  }

  private formatTimeAgo(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  }

  private startPerformanceSimulation() {
    const generateData = () => {
      const fps = 138 + Math.floor(Math.random() * 7);
      const ping = 25 + Math.floor(Math.random() * 10);
      
      this.performanceHistory.push({
        fps,
        ping,
        timestamp: Date.now(),
      });

      if (this.performanceHistory.length > 30) {
        this.performanceHistory.shift();
      }
    };

    generateData();
    setInterval(generateData, 2000);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  getRecentGames(): RecentGame[] {
    return Array.from(this.recentGames.values()).sort((a, b) => {
      const aTime = this.parseTimeAgo(a.lastPlayed);
      const bTime = this.parseTimeAgo(b.lastPlayed);
      return aTime - bTime;
    });
  }

  private parseTimeAgo(timeStr: string): number {
    const match = timeStr.match(/(\d+)([hdm])/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === 'd') return value * 24 * 60;
    if (unit === 'h') return value * 60;
    return value;
  }

  trackGameLaunch(placeId: number): void {
    const existing = this.recentGames.get(placeId);
    if (existing) {
      existing.lastPlayed = "Just now";
      existing.sessions += 1;
    } else {
      this.recentGames.set(placeId, {
        id: placeId.toString(),
        placeId,
        lastPlayed: "Just now",
        playtime: "0h 0m",
        sessions: 1,
      });
    }
  }

  getPerformanceData(): PerformanceData {
    const latest = this.performanceHistory[this.performanceHistory.length - 1] || {
      fps: 144,
      ping: 28,
      timestamp: Date.now(),
    };

    const fpsHistory = this.performanceHistory.map((data, index) => ({
      time: `${index * 2}s`,
      value: data.fps,
    }));

    const pingHistory = this.performanceHistory.map((data, index) => ({
      time: `${index * 2}s`,
      value: data.ping,
    }));

    return {
      fps: latest.fps,
      cpu: 38 + Math.floor(Math.random() * 10),
      ram: 7.5 + Math.random() * 1.5,
      ping: latest.ping,
      fpsHistory,
      pingHistory,
    };
  }

  getFriends(): Friend[] {
    return [
      {
        id: "1",
        name: "GamerKing_99",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GamerKing",
        status: "in-game",
        currentGame: "Pet Simulator 99",
      },
      {
        id: "2",
        name: "ProPlayer_TTV",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ProPlayer",
        status: "online",
      },
      {
        id: "3",
        name: "NinjaSpeed",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NinjaSpeed",
        status: "in-game",
        currentGame: "Blox Fruits",
      },
      {
        id: "4",
        name: "EliteGamer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=EliteGamer",
        status: "offline",
      },
      {
        id: "5",
        name: "SkillzMaster",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SkillzMaster",
        status: "in-game",
        currentGame: "Arsenal",
      },
    ];
  }

  getNews(): NewsItem[] {
    return [
      {
        id: "1",
        title: "Pet Simulator 99 Winter Event Live Now!",
        excerpt: "Explore snowy worlds, collect exclusive winter pets, and compete in limited-time challenges. Don't miss the biggest event of the season!",
        image: "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=400&h=225&fit=crop",
        category: "Events",
        timestamp: "2 hours ago",
      },
      {
        id: "2",
        title: "New Performance Optimizations Released",
        excerpt: "Experience 60% faster loading times and reduced lag with our latest engine improvements. Read about the technical details and what's changed.",
        image: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=400&h=225&fit=crop",
        category: "Updates",
        timestamp: "1 day ago",
      },
      {
        id: "3",
        title: "Community Spotlight: Top Builders",
        excerpt: "Meet the amazing creators building incredible experiences on Roblox. This week we feature the team behind the viral Tower Defense game.",
        image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop",
        category: "Community",
        timestamp: "2 days ago",
      },
      {
        id: "4",
        title: "Trading Update: New Features Coming Soon",
        excerpt: "Get ready for enhanced trading mechanics, improved item verification, and a brand new marketplace interface launching next week.",
        image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=225&fit=crop",
        category: "Updates",
        timestamp: "3 days ago",
      },
    ];
  }
}

export const storage = new MemStorage();
