import { useQuery } from "@tanstack/react-query";
import { GameCard } from "@/components/GameCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RobloxGame {
  id: string;
  name: string;
  description: string;
  placeId: string;
  thumbnail: string;
  playerCount: number;
  visits: number;
  rating: number;
}

export default function GameLibrary() {
  const { data: featuredGames, isLoading: loadingFeatured } = useQuery<RobloxGame[]>({
    queryKey: ["/api/games/featured"],
  });

  const { data: popularGames, isLoading: loadingPopular } = useQuery<RobloxGame[]>({
    queryKey: ["/api/games/popular"],
  });

  const allGamesLoading = loadingFeatured && loadingPopular;
  const hasAnyGames = (featuredGames && featuredGames.length > 0) || (popularGames && popularGames.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Game Library</h1>
        <p className="text-muted-foreground">
          Browse and launch your favorite Roblox games
        </p>
      </div>

      

      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Featured Games</h2>
          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredGames && featuredGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredGames.map((game) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.name}
                  thumbnail={game.thumbnail}
                  plays={game.visits}
                  rating={game.rating}
                  launchUrl={`roblox://experiences/start?placeId=${game.placeId}`}
                  webUrl={`https://www.roblox.com/games/${game.placeId}`}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No featured games available
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Popular Now</h2>
          {loadingPopular ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="p-0">
                    <Skeleton className="h-48 w-full rounded-t-lg" />
                  </CardHeader>
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : popularGames && popularGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {popularGames.map((game) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.name}
                  thumbnail={game.thumbnail}
                  plays={game.visits}
                  rating={game.rating}
                  launchUrl={`roblox://experiences/start?placeId=${game.placeId}`}
                  webUrl={`https://www.roblox.com/games/${game.placeId}`}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No popular games available
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
