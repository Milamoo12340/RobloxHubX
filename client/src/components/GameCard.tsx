import { Play, Star, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GameCardProps {
  id: string;
  title: string;
  thumbnail: string;
  plays: number;
  rating: number;
  launchUrl: string;
  webUrl: string;
}

export function GameCard({
  id,
  title,
  thumbnail,
  plays,
  rating,
  launchUrl,
  webUrl,
}: GameCardProps) {
  
  const handleLaunch = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = launchUrl;
  };

  const handleVisitWeb = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(webUrl, '_blank');
  };

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
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <Button 
              size="icon" 
              variant="default" 
              onClick={handleLaunch}
              data-testid={`button-play-${id}`}
              title="Launch in Roblox Client"
            >
              <Play className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              variant="secondary" 
              onClick={handleVisitWeb}
              data-testid={`button-web-${id}`}
              title="Visit on Roblox.com"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
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
      </div>
    </Card>
  );
}
