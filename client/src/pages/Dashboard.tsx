import { useQuery } from "@tanstack/react-query";
import { PerformanceWidget } from "@/components/PerformanceWidget";
import { GameCard } from "@/components/GameCard";
import { RecentlyPlayed } from "@/components/RecentlyPlayed";
import { FriendActivity } from "@/components/FriendActivity";
import { NewsCard } from "@/components/NewsCard";
import { OptimizationPanel } from "@/components/OptimizationPanel";
import { PerformanceChart } from "@/components/PerformanceChart";
import { Cpu, Gauge, HardDrive, Wifi, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Dashboard() {
  const { data: featuredGames = [], isLoading: loadingFeatured } = useQuery<any[]>({
    queryKey: ["/api/games/featured"],
  });

  const { data: popularGames = [], isLoading: loadingPopular } = useQuery<any[]>({
    queryKey: ["/api/games/popular"],
  });

  const { data: recentGames = [], isLoading: loadingRecent } = useQuery<any[]>({
    queryKey: ["/api/games/recent"],
  });

  const { data: performance } = useQuery<any>({
    queryKey: ["/api/performance"],
    refetchInterval: 2000,
  });

  const { data: friends = [] } = useQuery<any[]>({
    queryKey: ["/api/friends"],
  });

  const { data: news = [] } = useQuery<any[]>({
    queryKey: ["/api/news"],
  });

  const fpsData = performance?.fpsHistory || [];
  const pingData = performance?.pingHistory || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[Rajdhani]" data-testid="text-page-title">
          Gaming Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor performance, optimize your system, and launch your favorite games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceWidget
          title="FPS"
          value={performance?.fps || 144}
          max={144}
          icon={Gauge}
          color="primary"
          trend="stable"
        />
        <PerformanceWidget
          title="CPU"
          value={performance?.cpu || 42}
          max={100}
          unit="%"
          icon={Cpu}
          color="accent"
          trend="down"
        />
        <PerformanceWidget
          title="RAM"
          value={performance?.ram || 8.2}
          max={16}
          unit="GB"
          icon={HardDrive}
          color="chart-2"
          trend="up"
        />
        <PerformanceWidget
          title="PING"
          value={performance?.ping || 28}
          unit="ms"
          icon={Wifi}
          color="primary"
          trend="stable"
        />
      </div>

      {recentGames && recentGames.length > 0 && (
        <RecentlyPlayed games={recentGames} />
      )}

      <Tabs defaultValue="featured" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList data-testid="tabs-game-categories">
            <TabsTrigger value="featured" data-testid="tab-featured">Featured</TabsTrigger>
            <TabsTrigger value="popular" data-testid="tab-popular">Popular</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" data-testid="button-view-all">
            View All Games
          </Button>
        </div>

        <TabsContent value="featured" className="mt-0">
          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="aspect-video animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {featuredGames?.map((game: any) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.name}
                  thumbnail={game.thumbnail}
                  plays={game.visits}
                  rating={game.rating}
                  lastPlayed={game.lastPlayed}
                  isNew={game.isNew}
                  isFavorite={game.isFavorite}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="popular" className="mt-0">
          {loadingPopular ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="aspect-video animate-pulse bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {popularGames?.map((game: any) => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.name}
                  thumbnail={game.thumbnail}
                  plays={game.visits}
                  rating={game.rating}
                  isFavorite={game.isFavorite}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card data-testid="card-performance-monitor">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-lg font-semibold">Performance Monitor</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fpsData.length > 0 && (
                  <PerformanceChart
                    title="FPS Over Time"
                    data={fpsData}
                    color="hsl(var(--primary))"
                  />
                )}
                {pingData.length > 0 && (
                  <PerformanceChart
                    title="Ping Over Time"
                    data={pingData}
                    color="hsl(var(--accent))"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {news && news.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Latest News</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {news.slice(0, 4).map((item: any) => (
                  <NewsCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    excerpt={item.excerpt}
                    image={item.image}
                    category={item.category}
                    timestamp={item.timestamp}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <OptimizationPanel />
          {friends && friends.length > 0 && <FriendActivity friends={friends} />}
        </div>
      </div>
    </div>
  );
}
