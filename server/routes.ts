import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const ROBLOX_FEATURED_GAMES = [
  8737899170, // Pet Simulator 99 (featured top)
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
    url: `https://www.roblox.com/games/${details.rootPlaceId}`,
    isNew: false,
    isFavorite: false,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/games/featured", async (req, res) => {
    try {
      const games = await Promise.all(
        ROBLOX_FEATURED_GAMES.map(placeId => fetchRobloxGame(placeId))
      );
      
      const validGames = games.filter(game => game !== null);
      
      if (validGames.length > 0) {
        validGames[0].isNew = true;
        validGames[0].isFavorite = true;
      }
      
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

  app.get("/api/games/recent", async (req, res) => {
    const recentGames = storage.getRecentGames();
    
    const gamesWithDetails = await Promise.all(
      recentGames.map(async (game) => {
        const details = await fetchRobloxGame(game.placeId);
        return {
          ...details,
          lastPlayed: game.lastPlayed,
          playtime: game.playtime,
        };
      })
    );

    res.json(gamesWithDetails.filter(game => game !== null));
  });

  app.get("/api/performance", (req, res) => {
    res.json(storage.getPerformanceData());
  });

  app.get("/api/friends", (req, res) => {
    res.json(storage.getFriends());
  });

  app.get("/api/news", (req, res) => {
    res.json(storage.getNews());
  });

  app.post("/api/games/:placeId/launch", (req, res) => {
    const placeId = parseInt(req.params.placeId);
    storage.trackGameLaunch(placeId);
    res.json({ success: true, url: `roblox://placeId=${placeId}` });
  });

  const httpServer = createServer(app);

  return httpServer;
}
