import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface RecentGame {
  id: string;
  title: string;
  thumbnail: string;
  lastPlayed: string;
  playtime: string;
}

interface RecentlyPlayedProps {
  games: RecentGame[];
}

export function RecentlyPlayed({ games }: RecentlyPlayedProps) {
  return (
    <Card data-testid="card-recently-played">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Recently Played</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="group relative w-[200px] flex-shrink-0"
                data-testid={`recent-game-${game.id}`}
              >
                <Card className="overflow-hidden hover-elevate active-elevate-2">
                  <div className="aspect-video relative overflow-hidden bg-muted">
                    <img
                      src={game.thumbnail}
                      alt={game.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      data-testid={`img-recent-${game.id}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Button size="icon" variant="default" data-testid={`button-play-recent-${game.id}`}>
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1">
                    <h4 className="font-medium text-sm truncate" data-testid={`text-recent-title-${game.id}`}>
                      {game.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span data-testid={`text-last-played-recent-${game.id}`}>{game.lastPlayed}</span>
                      <span className="font-mono" data-testid={`text-playtime-recent-${game.id}`}>{game.playtime}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
