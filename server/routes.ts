import type { Express } from "express";
import { createServer, type Server } from "http";
import si from "systeminformation";
import Parser from "rss-parser";

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
    const response = await fetch(
      `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeId}`
    );
    const data = await response.json();
    return data[0]?.universeId || null;
  } catch (error) {
    console.error(`Error fetching universe ID for place ${placeId}:`, error);
    return null;
  }
}

async function getGameDetails(universeId: number): Promise<RobloxGameDetails | null> {
  try {
    const response = await fetch(
      `https://games.roblox.com/v1/games?universeIds=${universeId}`
    );
    const data = await response.json();
    return data.data[0] || null;
  } catch (error) {
    console.error(`Error fetching game details for universe ${universeId}:`, error);
    return null;
  }
}

async function getGameThumbnail(universeId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&size=768x432&format=Png&isCircular=false`
    );
    const data = await response.json();
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
