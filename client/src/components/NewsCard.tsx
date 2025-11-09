import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface NewsCardProps {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  timestamp: string;
}

export function NewsCard({ id, title, excerpt, image, category, timestamp }: NewsCardProps) {
  return (
    <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer" data-testid={`card-news-${id}`}>
      <div className="aspect-video relative overflow-hidden bg-muted">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
          data-testid={`img-news-${id}`}
        />
        <Badge className="absolute top-2 left-2" data-testid={`badge-category-${id}`}>
          {category}
        </Badge>
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold line-clamp-2" data-testid={`text-news-title-${id}`}>{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-news-excerpt-${id}`}>
          {excerpt}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span data-testid={`text-timestamp-${id}`}>{timestamp}</span>
        </div>
      </CardContent>
    </Card>
  );
}
