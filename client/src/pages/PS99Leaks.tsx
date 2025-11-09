import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  ExternalLink,
  Package,
  Zap,
  TrendingUp,
  Shield,
  Search,
  Loader2,
  Image,
  Trophy,
  DollarSign,
  FileCode
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { PS99Asset } from "@shared/schema";
import { ALL_PS99_DEVELOPERS } from "@shared/ps99-constants";

interface ScanResult {
  type: 'decal' | 'image' | 'gamepass' | 'badge' | 'developer_product' | 'place_update';
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  created?: string;
  updated?: string;
  metadata?: Record<string, any>;
}

interface ScanResponse {
  results: ScanResult[];
  stats: {
    total: number;
    decals: number;
    images: number;
    gamepasses: number;
    badges: number;
    developerProducts: number;
    placeUpdates: number;
  };
  duration: number;
}

export default function PS99Leaks() {
  const { toast } = useToast();
  const [scanResults, setScanResults] = useState<ScanResponse | null>(null);
  
  const { data: recentLeaks, isLoading: recentLoading } = useQuery<PS99Asset[]>({
    queryKey: ['/api/ps99/leaks/recent'],
    refetchInterval: 60000,
  });

  const { data: allLeaks, isLoading: allLoading } = useQuery<PS99Asset[]>({
    queryKey: ['/api/ps99/leaks'],
  });

  const { data: developers } = useQuery({
    queryKey: ['/api/ps99/developers'],
    initialData: ALL_PS99_DEVELOPERS,
  });
  
  const scanMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<ScanResponse>('/api/ps99/scan', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      setScanResults(data);
      toast({
        title: "Scan Complete!",
        description: `Found ${data.results.length} assets in ${(data.duration / 1000).toFixed(1)}s using advanced bypass`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan PS99 assets",
        variant: "destructive",
      });
    },
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  const AssetCard = ({ asset }: { asset: PS99Asset }) => {
    const developer = ALL_PS99_DEVELOPERS.find(d => d.id === asset.creatorId);
    const developerName = developer && 'displayName' in developer ? developer.displayName : (developer?.username || asset.creatorName);
    
    return (
      <Card className="hover-elevate active-elevate-2 cursor-pointer group" data-testid={`card-asset-${asset.assetId}`}>
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-bold leading-tight line-clamp-2" data-testid={`text-asset-name-${asset.assetId}`}>
                {asset.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(asset.discoveredDate)}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              {asset.isSignificant && (
                <Badge variant="default" className="text-xs gap-1 shrink-0" data-testid={`badge-significant-${asset.assetId}`}>
                  <Sparkles className="w-3 h-3" />
                  Hot
                </Badge>
              )}
              {asset.verified && (
                <Badge variant="outline" className="text-xs gap-1 shrink-0 border-primary/50" data-testid={`badge-verified-${asset.assetId}`}>
                  <Shield className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {asset.thumbnailUrl && (
            <div className="rounded-md overflow-hidden bg-muted">
              <img 
                src={asset.thumbnailUrl} 
                alt={asset.name}
                className="w-full h-auto object-cover"
                loading="lazy"
                data-testid={`img-asset-thumbnail-${asset.assetId}`}
              />
            </div>
          )}
          
          {asset.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {asset.description}
            </p>
          )}
          
          <div className="flex flex-wrap gap-1.5">
            {asset.matchedKeywords?.slice(0, 4).map((keyword, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="text-xs"
                data-testid={`badge-keyword-${asset.assetId}-${index}`}
              >
                {keyword}
              </Badge>
            ))}
            {(asset.matchedKeywords?.length ?? 0) > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{(asset.matchedKeywords?.length ?? 0) - 4}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span data-testid={`text-creator-${asset.assetId}`}>
                {developerName}
              </span>
              {developer?.priority === 1 && (
                <Badge variant="outline" className="text-xs border-primary/50">
                  Core Dev
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(`https://www.roblox.com/library/${asset.assetId}`, '_blank');
                }}
                data-testid={`button-view-asset-${asset.assetId}`}
              >
                <ExternalLink className="w-3 h-3" />
                View
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = ({ tab }: { tab: string }) => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">No Leaks Found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {tab === 'recent' 
            ? 'No new assets discovered in the past 72 hours. Check back later for the latest PS99 updates!'
            : 'No assets have been tracked yet. The scanner will automatically discover new leaks.'}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 space-y-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Zap className="w-6 h-6 text-primary" />
              Pet Simulator 99 Leaks
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time tracking of developer assets and game updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="gap-2"
              data-testid="button-scan-now"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scan Now
                </>
              )}
            </Button>
            <Badge variant="default" className="gap-1.5 h-7" data-testid="badge-live-tracking">
              <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              Live Tracking
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <Alert className="border-primary/50 bg-primary/5" data-testid="alert-network-info">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">Network Access Required</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              This feature requires access to Roblox APIs. Replit's environment may block external API requests. 
              For full functionality, deploy this app to a platform with unrestricted internet access.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-recent">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Recent (72h)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stat-recent-count">
                  {recentLoading ? '...' : recentLeaks?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-total">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Package className="w-3.5 h-3.5" />
                  Total Tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stat-total-count">
                  {allLoading ? '...' : allLeaks?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-developers">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5" />
                  Tracked Devs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stat-developers-count">
                  {developers?.length || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-significant">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  Significant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-stat-significant-count">
                  {allLoading ? '...' : allLeaks?.filter(a => a.isSignificant).length || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3" data-testid="section-verified-developers">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Verified Developers
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {developers?.slice(0, 8).map((dev) => (
                <Card 
                  key={dev.id} 
                  className="hover-elevate active-elevate-2 cursor-pointer group"
                  onClick={() => window.open(`https://www.roblox.com/users/${dev.id}/profile`, '_blank')}
                  data-testid={`card-developer-${dev.id}`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate" data-testid={`text-developer-name-${dev.id}`}>
                          {'displayName' in dev ? dev.displayName : dev.username}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          @{dev.username}
                        </div>
                      </div>
                      {dev.priority === 1 && (
                        <Shield className="w-4 h-4 text-primary shrink-0" data-testid={`icon-verified-${dev.id}`} />
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs w-full justify-center" data-testid={`badge-role-${dev.id}`}>
                      {dev.role}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full h-7 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.roblox.com/users/${dev.id}/profile`, '_blank');
                      }}
                      data-testid={`button-view-profile-${dev.id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Profile
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {scanResults && (
            <div className="space-y-4" data-testid="section-scan-results">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Search className="w-5 h-5 text-primary" />
                    Scan Results
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discovered {scanResults.results.length} assets in {(scanResults.duration / 1000).toFixed(1)} seconds
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScanResults(null)}
                  data-testid="button-clear-scan"
                >
                  Clear Results
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Image className="w-3.5 h-3.5" />
                      Decals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.decals}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Image className="w-3.5 h-3.5" />
                      Images
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.images}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Trophy className="w-3.5 h-3.5" />
                      Passes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.gamepasses}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Trophy className="w-3.5 h-3.5" />
                      Badges
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.badges}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <DollarSign className="w-3.5 h-3.5" />
                      Products
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.developerProducts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <FileCode className="w-3.5 h-3.5" />
                      Updates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{scanResults.stats.placeUpdates}</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4" data-testid="tabs-scan-filter">
                  <TabsTrigger value="all">All ({scanResults.results.length})</TabsTrigger>
                  <TabsTrigger value="gamepass">Game Passes ({scanResults.stats.gamepasses})</TabsTrigger>
                  <TabsTrigger value="badge">Badges ({scanResults.stats.badges})</TabsTrigger>
                  <TabsTrigger value="decal">Decals ({scanResults.stats.decals})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scanResults.results.map((result) => (
                      <Card key={result.id} className="hover-elevate active-elevate-2" data-testid={`card-scan-result-${result.id}`}>
                        <CardHeader className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                              {result.name}
                            </CardTitle>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {result.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          {result.description && (
                            <CardDescription className="text-xs line-clamp-2">
                              {result.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {result.thumbnailUrl && (
                            <img 
                              src={result.thumbnailUrl} 
                              alt={result.name}
                              className="w-full h-32 object-cover rounded-md"
                              loading="lazy"
                            />
                          )}
                          <div className="flex items-center justify-between text-xs">
                            {result.price !== undefined && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <DollarSign className="w-3 h-3" />
                                {result.price} Robux
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1 ml-auto"
                              onClick={() => window.open(`https://www.roblox.com/library/${result.id}`, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="gamepass" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scanResults.results.filter(r => r.type === 'gamepass').map((result) => (
                      <Card key={result.id} className="hover-elevate active-elevate-2">
                        <CardHeader>
                          <CardTitle className="text-sm">{result.name}</CardTitle>
                          {result.description && (
                            <CardDescription className="text-xs line-clamp-2">{result.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {result.price !== undefined && (
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                              <DollarSign className="w-4 h-4" />
                              {result.price} Robux
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="badge" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scanResults.results.filter(r => r.type === 'badge').map((result) => (
                      <Card key={result.id} className="hover-elevate active-elevate-2">
                        <CardHeader>
                          <CardTitle className="text-sm">{result.name}</CardTitle>
                          {result.description && (
                            <CardDescription className="text-xs line-clamp-2">{result.description}</CardDescription>
                          )}
                        </CardHeader>
                        {result.thumbnailUrl && (
                          <CardContent>
                            <img src={result.thumbnailUrl} alt={result.name} className="w-16 h-16 object-cover rounded-md mx-auto" />
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="decal" className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {scanResults.results.filter(r => r.type === 'decal' || r.type === 'image').map((result) => (
                      <Card key={result.id} className="hover-elevate active-elevate-2">
                        <CardContent className="p-3 space-y-2">
                          {result.thumbnailUrl && (
                            <img src={result.thumbnailUrl} alt={result.name} className="w-full h-24 object-cover rounded-md" />
                          )}
                          <div className="text-xs font-medium truncate">{result.name}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-leak-filter">
              <TabsTrigger value="recent" data-testid="tab-recent">
                Recent (72h)
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all">
                All Leaks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recent" className="mt-6 space-y-4">
              {recentLoading ? (
                <LoadingSkeleton />
              ) : !recentLeaks || recentLeaks.length === 0 ? (
                <EmptyState tab="recent" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentLeaks.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6 space-y-4">
              {allLoading ? (
                <LoadingSkeleton />
              ) : !allLeaks || allLeaks.length === 0 ? (
                <EmptyState tab="all" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allLeaks.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
