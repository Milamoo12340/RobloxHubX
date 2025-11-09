import type { Express } from "express";
import { createServer, type Server } from "http";
import si from "systeminformation";
import Parser from "rss-parser";
import { storage } from "./storage";
import { insertPS99AssetSchema } from "@shared/schema";
import { ALL_PS99_DEVELOPERS, ROBLOX_API, LEAK_KEYWORDS } from "@shared/ps99-constants";
import { robloxProxy } from "./roblox-proxy-service";
import { PS99Scanner } from "./ps99-scanner";

const rssParser = new Parser();

const ROBLOX_FEATURED_GAMES = [
  8737899170, // Pet Simulator 99
  920587237,  // Adopt Me!
  2753915549, // Blox Fruits
  2440500124, // DOORS
  606849621,  // Jailbreak
  3101667897, // Arsenal
  1537690962, // Bee Swarm Simulator
  6284583030, // Pet Simulator X
];

const ROBLOX_POPULAR_GAMES = [
  2753915549, // Blox Fruits
  920587237,  // Adopt Me!
  606849621,  // Jailbreak
  3101667897, // Arsenal
  2440500124, // DOORS
  14732153821, // Fisch
  4924922222, // Brookhaven
  1537690962, // Bee Swarm Simulator
];

interface RobloxGameDetails {
  id: string;
  rootPlaceId: number;
  name: string;
  description: string;
  creator: {
    id: number;
    name: string;
    type: string;
  };
  playing: number;
  visits: number;
  maxPlayers: number;
  favoritedCount: number;
}

async function getUniverseIdFromPlaceId(placeId: number): Promise<number | null> {
  try {
    const data = await robloxProxy.get(
      `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`
    );
    return data[0]?.universeId || null;
  } catch (error) {
    console.error(`Error fetching universe ID for place ${placeId}:`, error);
    return null;
  }
}

async function getGameDetails(universeId: number): Promise<RobloxGameDetails | null> {
  try {
    const data = await robloxProxy.get(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`
    );
    return data.data[0] || null;
  } catch (error) {
    console.error(`Error fetching game details for universe ${universeId}:`, error);
    return null;
  }
}

async function getGameThumbnail(universeId: number): Promise<string | null> {
  try {
    const data = await robloxProxy.get(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&size=768x432&format=Png&isCircular=false`
    );
    return data.data[0]?.thumbnails[0]?.imageUrl || null;
  } catch (error) {
    console.error(`Error fetching thumbnail for universe ${universeId}:`, error);
    return null;
  }
}

async function fetchRobloxGame(placeId: number) {
  const universeId = await getUniverseIdFromPlaceId(placeId);
  if (!universeId) return null;

  const [details, thumbnail] = await Promise.all([
    getGameDetails(universeId),
    getGameThumbnail(universeId),
  ]);

  if (!details) return null;

  const rating = Math.min(
    4.9,
    Math.max(4.0, 4.5 + (details.favoritedCount / details.visits) * 10)
  );

  return {
    id: details.id.toString(),
    placeId: details.rootPlaceId,
    universeId: universeId,
    name: details.name,
    description: details.description,
    thumbnail: thumbnail || `https://via.placeholder.com/768x432?text=${encodeURIComponent(details.name)}`,
    visits: details.visits,
    playing: details.playing,
    favorites: details.favoritedCount,
    maxPlayers: details.maxPlayers,
    creator: details.creator,
    rating: Math.round(rating * 10) / 10,
    launchUrl: `roblox://experiences/start?placeId=${details.rootPlaceId}`,
    webUrl: `https://www.roblox.com/games/${details.rootPlaceId}`,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/games/featured", async (req, res) => {
    try {
      const games = await Promise.all(
        ROBLOX_FEATURED_GAMES.map(placeId => fetchRobloxGame(placeId))
      );
      
      const validGames = games.filter(game => game !== null);
      res.json(validGames);
    } catch (error) {
      console.error("Error fetching featured games:", error);
      res.status(500).json({ error: "Failed to fetch featured games" });
    }
  });

  app.get("/api/games/popular", async (req, res) => {
    try {
      const games = await Promise.all(
        ROBLOX_POPULAR_GAMES.map(placeId => fetchRobloxGame(placeId))
      );
      
      const validGames = games.filter(game => game !== null);
      res.json(validGames);
    } catch (error) {
      console.error("Error fetching popular games:", error);
      res.status(500).json({ error: "Failed to fetch popular games" });
    }
  });

  app.get("/api/performance/system", async (req, res) => {
    try {
      const [cpuLoad, mem, cpuTemp] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature().catch(() => ({ main: null })),
      ]);

      res.json({
        cpu: Math.round(cpuLoad.currentLoad * 10) / 10,
        ram: Math.round((mem.used / 1024 / 1024 / 1024) * 100) / 100,
        ramTotal: Math.round((mem.total / 1024 / 1024 / 1024) * 100) / 100,
        ramPercent: Math.round((mem.used / mem.total) * 100 * 10) / 10,
        temp: cpuTemp.main || null,
      });
    } catch (error) {
      console.error("Error fetching system performance:", error);
      res.status(500).json({ error: "Failed to fetch system performance" });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const feed = await rssParser.parseURL("https://corp.roblox.com/newsroom?feed=rss");
      
      const newsItems = feed.items.slice(0, 6).map((item, index) => ({
        id: item.guid || index.toString(),
        title: item.title || "Untitled",
        excerpt: item.contentSnippet?.substring(0, 150) || item.summary?.substring(0, 150) || "",
        url: item.link || "",
        category: item.categories?.[0] || "News",
        timestamp: item.pubDate ? new Date(item.pubDate).toLocaleDateString() : "Recently",
        image: extractImageFromContent(item.content) || "https://images.unsplash.com/photo-1551918120-9739cb430c6d?w=400&h=225&fit=crop",
      }));

      res.json(newsItems);
    } catch (error) {
      console.error("Error fetching Roblox news:", error);
      res.json([]);
    }
  });

  app.get("/api/roblox/user/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      const userData = await robloxProxy.get(
        `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(username)}`
      );
      
      if (!userData.Id) {
        return res.status(404).json({ error: "User not found" });
      }

      const [details, presenceResponse, avatar] = await Promise.all([
        robloxProxy.get(`https://users.roblox.com/v1/users/${userData.Id}`),
        fetch(`https://presence.roblox.com/v1/presence/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: [userData.Id] })
        }),
        robloxProxy.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userData.Id}&size=150x150&format=Png`)
      ]);

      if (!presenceResponse.ok) {
        throw new Error("Presence API request failed");
      }

      const presence = await presenceResponse.json();

      if (details.errors || presence.errors || avatar.errors) {
        throw new Error("Roblox API returned error payload");
      }

      res.json({
        id: userData.Id,
        username: details.name || userData.Username,
        displayName: details.displayName || details.name || userData.Username,
        description: details.description || "",
        created: details.created || null,
        isBanned: details.isBanned || false,
        hasVerifiedBadge: details.hasVerifiedBadge || false,
        presence: presence.userPresences?.[0] || { userPresenceType: 0 },
        avatar: avatar.data?.[0]?.imageUrl || null,
      });
    } catch (error) {
      console.error("Error fetching Roblox user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  app.get("/api/roblox/user/:userId/friends", async (req, res) => {
    try {
      const { userId } = req.params;
      
      const friendsData = await robloxProxy.get(
        `https://friends.roblox.com/v1/users/${userId}/friends`
      );
      
      if (friendsData.errors || !friendsData.data) {
        return res.json([]);
      }

      const friendIds = friendsData.data.slice(0, 50).map((f: any) => f.id);
      
      if (friendIds.length === 0) {
        return res.json([]);
      }

      const [presenceResponse, avatarData] = await Promise.all([
        fetch(`https://presence.roblox.com/v1/presence/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: friendIds })
        }),
        robloxProxy.get(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${friendIds.join(',')}&size=150x150&format=Png`)
      ]);

      if (!presenceResponse.ok) {
        console.error("Failed to fetch presence, continuing with partial data");
      }

      const presenceData = presenceResponse.ok ? await presenceResponse.json() : { userPresences: [] };

      const presenceMap = new Map(
        presenceData.userPresences?.map((p: any) => [p.userId, p]) || []
      );
      const avatarMap = new Map(
        avatarData.data?.map((a: any) => [a.targetId, a.imageUrl]) || []
      );

      const enrichedFriends = friendsData.data.slice(0, 50).map((friend: any) => {
        const presence: any = presenceMap.get(friend.id) || { userPresenceType: 0 };
        
        return {
          id: friend.id,
          username: friend.name,
          displayName: friend.displayName || friend.name,
          isOnline: friend.isOnline || false,
          presenceType: presence.userPresenceType || 0,
          lastLocation: presence.lastLocation || null,
          placeId: presence.placeId || null,
          rootPlaceId: presence.rootPlaceId || null,
          gameId: presence.gameId || null,
          universeId: presence.universeId || null,
          avatar: avatarMap.get(friend.id) || null,
          hasVerifiedBadge: friend.hasVerifiedBadge || false,
        };
      });

      res.json(enrichedFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ error: "Failed to fetch friends list" });
    }
  });

  app.get("/api/ps99/leaks", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const assets = await storage.getPS99Assets(limit, offset);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching PS99 leaks:", error);
      res.status(500).json({ error: "Failed to fetch leaks" });
    }
  });

  app.get("/api/ps99/leaks/recent", async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 72;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const assets = await storage.getRecentPS99Assets(hours, limit);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching recent PS99 leaks:", error);
      res.status(500).json({ error: "Failed to fetch recent leaks" });
    }
  });

  app.get("/api/ps99/leaks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const asset = await storage.getPS99AssetById(id);
      
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      
      res.json(asset);
    } catch (error) {
      console.error("Error fetching PS99 leak:", error);
      res.status(500).json({ error: "Failed to fetch leak" });
    }
  });

  app.post("/api/ps99/leaks", async (req, res) => {
    try {
      const validatedData = insertPS99AssetSchema.parse(req.body);
      const asset = await storage.createPS99Asset(validatedData);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating PS99 leak:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.get("/api/ps99/developers", async (req, res) => {
    try {
      res.json(ALL_PS99_DEVELOPERS);
    } catch (error) {
      console.error("Error fetching PS99 developers:", error);
      res.status(500).json({ error: "Failed to fetch developers" });
    }
  });

  app.get("/api/ps99/scan/developer/:developerId", async (req, res) => {
    try {
      const { developerId } = req.params;
      const devId = parseInt(developerId);
      
      const developer = ALL_PS99_DEVELOPERS.find(d => d.id === devId);
      if (!developer) {
        return res.status(404).json({ error: "Developer not found" });
      }

      const userData = await robloxProxy.get(
        `${ROBLOX_API.USERS}/users/${devId}`
      );
      
      res.json({
        ...developer,
        description: userData.description,
        created: userData.created,
        isBanned: userData.isBanned,
        hasVerifiedBadge: userData.hasVerifiedBadge,
      });
    } catch (error) {
      console.error("Error scanning developer:", error);
      res.status(500).json({ error: "Failed to scan developer" });
    }
  });

  app.post("/api/ps99/scan", async (req, res) => {
    try {
      console.log('🚀 Starting full PS99 asset scan...');
      const scanner = new PS99Scanner();
      const scanResults = await scanner.scanAll();
      
      res.json(scanResults);
    } catch (error: any) {
      console.error("Error during PS99 scan:", error);
      res.status(500).json({ error: error.message || "Failed to scan PS99 assets" });
    }
  });

  app.get("/api/ps99/scan/stats", async (req, res) => {
    try {
      const stats = robloxProxy.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching scan stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function extractImageFromContent(content: string | undefined): string | null {
  if (!content) return null;
  
  const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }
  
  return null;
}
