import { Play, Star, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GameCardProps {
  id: string;
  title: string;
  thumbnail: string;
  plays: number;
  rating: number;
  lastPlayed?: string;
  isNew?: boolean;
  isFavorite?: boolean;
}

export function GameCard({
  id,
  title,
  thumbnail,
  plays,
  rating,
  lastPlayed,
  isNew,
  isFavorite,
}: GameCardProps) {
  return (
    <Card 
      className="group relative overflow-hidden hover-elevate active-elevate-2 cursor-pointer"
      data-testid={`card-game-${id}`}
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          data-testid={`img-game-${id}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 flex items-center justify-center">
            <Button size="icon" variant="default" data-testid={`button-play-${id}`}>
              <Play className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {isNew && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground" data-testid={`badge-new-${id}`}>
            NEW
          </Badge>
        )}
        {isFavorite && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-7 w-7"
            data-testid={`button-favorite-${id}`}
          >
            <Star className="h-3.5 w-3.5 fill-current" />
          </Button>
        )}
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-1" data-testid={`text-game-title-${id}`}>{title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            <span data-testid={`text-rating-${id}`}>{rating}</span>
          </div>
          <span data-testid={`text-plays-${id}`}>{plays.toLocaleString()} plays</span>
        </div>
        {lastPlayed && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span data-testid={`text-last-played-${id}`}>{lastPlayed}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
