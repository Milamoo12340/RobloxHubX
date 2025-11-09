import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Power, Clock, Search, Settings } from "lucide-react";
import { useBotStatus } from "@/hooks/use-bot-status";
import { ActivityLogList } from "@/components/ui/activity-log";
import { CommandList } from "@/components/ui/command-list";
import { useIsMobile } from "@/hooks/use-mobile";

export default function AdminDashboard() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [scanFrequency, setScanFrequency] = useState("2");
  const [isEditingFrequency, setIsEditingFrequency] = useState(false);
  
  // Get bot status
  const { 
    status, 
    statusCards, 
    activityLogs, 
    commands, 
    isLoadingStatus, 
    isLoadingLogs, 
    isLoadingCommands,
    refetchStatus,
    refetchLogs,
    refetchCommands
  } = useBotStatus();

  // Get bot settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation for starting a scan
  const scanMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/scan", { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Scan started",
        description: "Manual scan has been initiated",
      });
      setTimeout(() => {
        refetchStatus();
        refetchLogs();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for restarting the bot
  const restartMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/restart", { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Bot restarted",
        description: "The Discord bot is restarting...",
      });
      setTimeout(() => {
        refetchStatus();
        refetchLogs();
        refetchCommands();
      }, 5000);
    },
    onError: (error) => {
      toast({
        title: "Restart failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for posting latest leaks
  const postLeaksMutation = useMutation({
    mutationFn: () => {
      return apiRequest("/api/post-leaks", { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Posting leaks",
        description: "Recent leaks are being posted to Discord",
      });
      setTimeout(() => {
        refetchStatus();
        refetchLogs();
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Posting failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating scan frequency
  const updateFrequencyMutation = useMutation({
    mutationFn: (newFrequency: string) => {
      return apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          key: "scanFrequency",
          value: newFrequency,
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: `Scan frequency updated to ${scanFrequency} minutes`,
      });
      setIsEditingFrequency(false);
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setTimeout(() => {
        refetchStatus();
      }, 1000);
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsEditingFrequency(false);
    },
  });

  const handleScanFrequencyUpdate = () => {
    const frequency = parseInt(scanFrequency);
    if (isNaN(frequency) || frequency < 1) {
      toast({
        title: "Invalid frequency",
        description: "Please enter a valid number (1 or greater)",
        variant: "destructive",
      });
      return;
    }
    
    updateFrequencyMutation.mutate(scanFrequency);
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bot Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage and monitor the Discord leak bot</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statusCards.map((card, index) => (
          <Card key={index} className={
            card.status === "online" ? "border-green-500 border-2" :
            card.status === "warning" ? "border-yellow-500 border-2" :
            card.status === "error" ? "border-red-500 border-2" : ""
          }>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                {card.icon === "power" && <Power className="w-5 h-5" />}
                {card.icon === "clock" && <Clock className="w-5 h-5" />}
                {card.icon === "refresh" && <RefreshCw className="w-5 h-5" />}
                {card.icon === "settings" && <Settings className="w-5 h-5" />}
                {card.title}
              </CardTitle>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Tabs defaultValue="activity">
            <TabsList className="mb-4">
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="commands">Bot Commands</TabsTrigger>
              <TabsTrigger value="settings">Bot Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="activity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Recent Bot Activity</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchLogs()} 
                      disabled={isLoadingLogs}
                    >
                      {isLoadingLogs ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Refresh
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Recent events from the bot's activity log
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityLogList activities={activityLogs} isLoading={isLoadingLogs} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="commands" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Bot Commands</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchCommands()} 
                      disabled={isLoadingCommands}
                    >
                      {isLoadingCommands ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-1" />
                      )}
                      Refresh
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Available commands and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommandList commands={commands} isLoading={isLoadingCommands} />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Bot Configuration</CardTitle>
                  <CardDescription>
                    Adjust settings for the Discord leak bot
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingSettings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="grid w-full items-center gap-2">
                        <div className="flex flex-row justify-between items-center">
                          <Label htmlFor="scanFrequency">Scan Frequency (minutes)</Label>
                          {isEditingFrequency ? (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                onClick={handleScanFrequencyUpdate}
                                disabled={updateFrequencyMutation.isPending}
                              >
                                {updateFrequencyMutation.isPending && (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                )}
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setIsEditingFrequency(false)}
                                disabled={updateFrequencyMutation.isPending}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setIsEditingFrequency(true)}
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                        {isEditingFrequency ? (
                          <Input
                            id="scanFrequency"
                            type="number"
                            min="1"
                            value={scanFrequency}
                            onChange={(e) => setScanFrequency(e.target.value)}
                            className="w-full"
                          />
                        ) : (
                          <p>{scanFrequency} minutes</p>
                        )}
                      </div>
                      
                      <Separator />
                      
                      <div className="grid w-full items-center gap-2">
                        <div className="flex flex-row justify-between items-center">
                          <Label>Auto Post Lower-Tier Leaks</Label>
                          <Switch />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When enabled, lower-tier leaks will be automatically posted after the batch interval
                        </p>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid w-full items-center gap-2">
                        <div className="flex flex-row justify-between items-center">
                          <Label>Post Developer Changes Only</Label>
                          <Switch />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          When enabled, only developer changes will be posted to Discord
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Actions</CardTitle>
              <CardDescription>
                Perform actions on the Discord bot
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button
                  className="w-full"
                  onClick={() => scanMutation.mutate()}
                  disabled={scanMutation.isPending || !status?.isOnline}
                >
                  {scanMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Run Scan Now
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Force an immediate scan of game files
                </p>
              </div>
              
              <div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => postLeaksMutation.mutate()}
                  disabled={postLeaksMutation.isPending || !status?.isOnline}
                >
                  {postLeaksMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Post Recent Leaks
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Post any pending leaks to Discord
                </p>
              </div>
              
              <div>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => restartMutation.mutate()}
                  disabled={restartMutation.isPending}
                >
                  {restartMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Restart Bot
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Restart the Discord bot connection
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Bot Status</CardTitle>
              <CardDescription>
                Current connection state
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Connection:</span>
                <Badge variant={status?.isOnline ? "default" : "destructive"}>
                  {status?.isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <span>{status?.connectionStatus || "Unknown"}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Scan Status:</span>
                <span>{status?.scanStatus || "Unknown"}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Commands:</span>
                <span>{status?.commandsRegistered || 0} registered</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Next Scan:</span>
                <span>{status?.nextScanTime ? new Date(status.nextScanTime).toLocaleTimeString() : "Unknown"}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">API Latency:</span>
                <span>{status?.latency ? `${status.latency}ms` : "Unknown"}</span>
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => refetchStatus()}
                  disabled={isLoadingStatus}
                >
                  {isLoadingStatus ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}