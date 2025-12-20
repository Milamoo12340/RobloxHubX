import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const newsItems = [
  {
    id: "1",
    title: "Roblox News & Updates",
    description: "Stay updated with the latest Roblox news, game releases, and platform updates",
    link: "https://blog.roblox.com",
    category: "Official",
  },
  {
    id: "2",
    title: "Developer Forum",
    description: "Join discussions about game development, updates, and community topics",
    link: "https://devforum.roblox.com",
    category: "Community",
  },
  {
    id: "3",
    title: "Roblox Status",
    description: "Check the current status of Roblox services and servers",
    link: "https://status.roblox.com",
    category: "Status",
  },
  {
    id: "4",
    title: "Top Roblox Games",
    description: "Discover trending and popular games on the Roblox platform",
    link: "https://www.roblox.com/discover",
    category: "Discover",
  },
];

export default function News() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">News & Updates</h1>
        <p className="text-muted-foreground">
          Latest news and updates from the Roblox community
        </p>
      </div>

      

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {newsItems.map((item) => (
          <Card key={item.id} className="hover-elevate" data-testid={`card-news-${item.id}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge variant="secondary">{item.category}</Badge>
                </div>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
                data-testid={`link-news-${item.id}`}
              >
                Visit {item.category} Page
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Useful Roblox Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Creator Hub</span>
            <a
              href="https://create.roblox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-creator-hub"
            >
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Documentation</span>
            <a
              href="https://create.roblox.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-docs"
            >
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Community</span>
            <a
              href="https://www.roblox.com/communities"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-community"
            >
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
