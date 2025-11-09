import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PerformanceWidget } from "@/components/PerformanceWidget";
import { GameCard } from "@/components/GameCard";
import { RobloxConnect } from "@/components/RobloxConnect";
import { FriendsList } from "@/components/FriendsList";
import { Cpu, Gauge, HardDrive, Thermometer, Zap, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "wouter";

interface RobloxUser {
  id: number;
  username: string;
  displayName: string;
  description: string;
  avatar: string | null;
  hasVerifiedBadge: boolean;
  presence: {
    userPresenceType: number;
  };
}

export default function Dashboard() {
  const [browserFps, setBrowserFps] = useState(60);
  const [ping, setPing] = useState(0);
  const [linkedUser, setLinkedUser] = useState<RobloxUser | null>(null);
  
  const { data: featuredGames = [], isLoading: loadingFeatured } = useQuery<any[]>({
    queryKey: ["/api/games/featured"],
  });

  const { data: popularGames = [], isLoading: loadingPopular } = useQuery<any[]>({
    queryKey: ["/api/games/popular"],
  });

  const { data: systemPerf } = useQuery<any>({
    queryKey: ["/api/performance/system"],
    refetchInterval: 2000,
  });


  useEffect(() => {
    const stored = localStorage.getItem('linkedRobloxUser');
    if (stored) {
      try {
        setLinkedUser(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }
  }, []);

  useEffect(() => {
    const times: number[] = [];
    let lastTime = performance.now();
    
    function measureFPS() {
      window.requestAnimationFrame(() => {
        const now = performance.now();
        
        while (times.length > 0 && times[0] <= now - 1000) {
          times.shift();
        }
        
        times.push(now);
        setBrowserFps(times.length);
        
        measureFPS();
      });
    }
    
    measureFPS();

    const measurePing = async () => {
      const start = performance.now();
      try {
        await fetch("/api/performance/system");
        const latency = Math.round(performance.now() - start);
        setPing(latency);
      } catch (error) {
        console.error("Ping measurement failed:", error);
      }
    };

    measurePing();
    const pingInterval = setInterval(measurePing, 5000);

    return () => clearInterval(pingInterval);
  }, []);


  const handleUserLinked = (user: RobloxUser) => {
    setLinkedUser(user);
    localStorage.setItem('linkedRobloxUser', JSON.stringify(user));
  };

  const handleDisconnect = () => {
    setLinkedUser(null);
    localStorage.removeItem('linkedRobloxUser');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-[Rajdhani]" data-testid="text-page-title">
          Gaming Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor performance, optimize your system, and launch your favorite Roblox games
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceWidget
          title="BROWSER FPS"
          value={browserFps}
          max={60}
          icon={Gauge}
          color="primary"
          trend={browserFps >= 58 ? "stable" : browserFps >= 45 ? "down" : "down"}
        />
        <PerformanceWidget
          title="CPU USAGE"
          value={systemPerf?.cpu || 0}
          max={100}
          unit="%"
          icon={Cpu}
          color="accent"
        />
        <PerformanceWidget
          title="RAM"
          value={systemPerf?.ram || 0}
          max={systemPerf?.ramTotal || 16}
          unit="GB"
          icon={HardDrive}
          color="chart-2"
        />
        <PerformanceWidget
          title="PING"
          value={ping}
          unit="ms"
          icon={Thermometer}
          color="primary"
        />
      </div>

      <Card data-testid="card-optimization">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            System Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="font-medium text-sm mb-1">Optimize Your Gaming Experience</p>
            <p className="text-xs text-muted-foreground">Access Game Mode, quick optimization, and performance tools</p>
          </div>
          <Link href="/optimization">
            <Button variant="default" data-testid="button-optimize">
              <Zap className="h-4 w-4 mr-2" />
              Go to Optimization
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Tabs defaultValue="featured" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList data-testid="tabs-game-categories">
            <TabsTrigger value="featured" data-testid="tab-featured">Featured Games</TabsTrigger>
            <TabsTrigger value="popular" data-testid="tab-popular">Popular Now</TabsTrigger>
          </TabsList>
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
                  launchUrl={game.launchUrl}
                  webUrl={game.webUrl}
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
                  launchUrl={game.launchUrl}
                  webUrl={game.webUrl}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Roblox Friends</h2>
        
        <Alert data-testid="alert-roblox-api-restriction">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Network Restriction Notice:</strong> Roblox friend linking may not work in the Replit environment due to DNS restrictions blocking access to Roblox APIs. This feature will work with normal internet access.
          </AlertDescription>
        </Alert>

        <RobloxConnect
          onUserLinked={handleUserLinked}
          linkedUser={linkedUser}
          onDisconnect={handleDisconnect}
        />
        {linkedUser && (
          <div>
            <h3 className="text-lg font-medium mb-4">Friends List</h3>
            <FriendsList userId={linkedUser.id} />
          </div>
        )}
      </div>

    </div>
  );
}
