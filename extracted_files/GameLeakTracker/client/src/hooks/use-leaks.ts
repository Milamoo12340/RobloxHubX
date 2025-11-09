import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface Leak {
  id: number;
  fileName: string;
  filePath: string;
  fileType: string;
  changeType: string;
  fileSize: number | null;
  timestamp: string;
  isDeveloperChange: boolean;
  messageId: string | null;
  metadata: any;
}

export interface Command {
  name: string;
  description: string;
  status: string;
}

export function useLeaks() {
  const { toast } = useToast();
  
  // Get recent leaks (last 48 hours)
  const { data: recentLeaks, isLoading: isLoadingLeaks } = useQuery({
    queryKey: ["/api/leaks/recent"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Get developer changes
  const { data: developerChanges, isLoading: isLoadingDeveloperChanges } = useQuery({
    queryKey: ["/api/leaks/developer"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });
  
  // Get commands
  const { data: commands, isLoading: isLoadingCommands } = useQuery({
    queryKey: ["/api/commands"],
  });
  
  // Get settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"],
  });
  
  // Force a scan
  const { mutate: forceScan, isPending: isScanRunning } = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/scan", {});
    },
    onSuccess: () => {
      toast({
        title: "Scan initiated",
        description: "The game file scan has been started",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/leaks/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
    },
    onError: (error) => {
      toast({
        title: "Scan failed",
        description: `Failed to start scan: ${error instanceof Error ? error.message : "unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Post latest leaks
  const { mutate: postLatestLeaks, isPending: isPosting } = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/post-leaks", {});
    },
    onSuccess: () => {
      toast({
        title: "Leaks posted",
        description: "Latest leaks have been posted to Discord",
      });
    },
    onError: (error) => {
      toast({
        title: "Posting failed",
        description: `Failed to post leaks: ${error instanceof Error ? error.message : "unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Restart bot
  const { mutate: restartBot, isPending: isRestarting } = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/restart", {});
    },
    onSuccess: () => {
      toast({
        title: "Bot restarted",
        description: "The Discord bot has been restarted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
    },
    onError: (error) => {
      toast({
        title: "Restart failed",
        description: `Failed to restart bot: ${error instanceof Error ? error.message : "unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  // Update settings
  const { mutate: updateSetting } = useMutation({
    mutationFn: async (data: { settingKey: string; settingValue: string }) => {
      return await apiRequest("POST", "/api/settings", data);
    },
    onSuccess: () => {
      toast({
        title: "Setting updated",
        description: "The setting has been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update setting: ${error instanceof Error ? error.message : "unknown error"}`,
        variant: "destructive",
      });
    }
  });
  
  return {
    recentLeaks,
    developerChanges,
    commands,
    settings,
    isLoadingLeaks,
    isLoadingDeveloperChanges,
    isLoadingCommands,
    isLoadingSettings,
    forceScan,
    postLatestLeaks,
    restartBot,
    updateSetting,
    isScanRunning,
    isPosting,
    isRestarting
  };
}
