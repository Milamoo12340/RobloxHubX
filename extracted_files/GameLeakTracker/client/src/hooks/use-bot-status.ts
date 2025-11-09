import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export interface BotStatus {
  isOnline: boolean;
  connectionStatus: string;
  scanStatus: string;
  commandsRegistered: number;
  lastRestartTime: string;
  uptimeSeconds: number;
  lastScanTime: string | null;
  nextScanTime: string | null;
  lastCommandUsed: {
    name: string;
    user: string;
    timestamp: string;
  } | null;
  latency: number | null;
}

export interface StatusCardData {
  title: string;
  value: string;
  icon: string;
  status: "online" | "warning" | "error" | "neutral";
  description: string;
}

export interface ActivityLog {
  id: number;
  eventType: string;
  message: string;
  timestamp: string;
  metadata: any;
}

export interface Command {
  name: string;
  description: string;
  status: string;
}

export function useBotStatus() {
  // WebSocket connection for real-time updates
  const [wsStatus, setWsStatus] = useState<BotStatus | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Status queries
  const { 
    data: apiStatus, 
    isLoading: isLoadingStatus, 
    error,
    refetch: refetchStatus
  } = useQuery<BotStatus>({
    queryKey: ["/api/status"],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Logs query
  const { 
    data: logData,
    isLoading: isLoadingLogs,
    refetch: refetchLogs
  } = useQuery<ActivityLog[]>({
    queryKey: ["/api/logs"],
    refetchInterval: 15000 // Refresh every 15 seconds
  });

  // Commands query
  const {
    data: commandsData,
    isLoading: isLoadingCommands,
    refetch: refetchCommands
  } = useQuery<Command[]>({
    queryKey: ["/api/commands"],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let isUnmounting = false;

    // Function to create and setup WebSocket connection
    const setupWebSocket = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        // Connect to our specific WebSocket endpoint path to avoid conflicts with Vite
        // Use port 3333 explicitly instead of relying on window.location.host
        const host = window.location.hostname + (window.location.port ? ":3333" : "");
        ws = new WebSocket(`${protocol}//${host}/api/ws`);
        
        ws.onopen = () => {
          console.log("WebSocket connection established");
        };
        
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
          
          // Attempt to reconnect unless we're unmounting
          if (!isUnmounting) {
            console.log("Attempting to reconnect in 3 seconds...");
            reconnectTimer = window.setTimeout(() => {
              setupWebSocket();
            }, 3000);
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === "status") {
              setWsStatus(data.data);
            } else if (data.type === "leak_detected") {
              // Add new activity for leak detection
              const newActivity: ActivityLog = {
                id: Date.now(),
                eventType: "detection",
                message: data.data.message,
                timestamp: new Date().toISOString(),
                metadata: { leak: data.data.leak }
              };
              
              setActivities(prev => [newActivity, ...prev.slice(0, 19)]);
            } else if (data.type === "setting_updated") {
              // Refresh our queries when a setting is updated
              refetchStatus();
              refetchLogs();
            }
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };
      } catch (error) {
        console.error("Failed to establish WebSocket connection:", error);
        // Fall back to regular polling if WebSocket fails
        
        // Try to reconnect after a delay
        if (!isUnmounting) {
          reconnectTimer = window.setTimeout(() => {
            setupWebSocket();
          }, 3000);
        }
      }
    };

    // Initial WebSocket setup
    setupWebSocket();
    
    // Cleanup function to handle component unmounting
    return () => {
      isUnmounting = true;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      
      if (ws) {
        // Close code 1000 indicates normal closure
        ws.close(1000, "Component unmounting");
      }
    };
  }, [refetchStatus, refetchLogs]);

  // Merge WebSocket updates with API data for faster UI updates
  const status: BotStatus | undefined = wsStatus || apiStatus;
  
  // Initialize activities from logs if needed
  useEffect(() => {
    if (logData && activities.length === 0) {
      setActivities(logData);
    }
  }, [logData, activities.length]);

  // Calculate uptime display
  const getUptimeDisplay = () => {
    if (!status) return "Unknown";
    
    const seconds = status.uptimeSeconds;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Generate status card data
  const getStatusCards = (): StatusCardData[] => {
    if (!status) return [];
    
    return [
      {
        title: "Bot Status",
        value: status.isOnline ? "Online" : "Offline",
        icon: "power",
        status: status.isOnline ? "online" : "error",
        description: `Last restart: ${new Date(status.lastRestartTime).toLocaleString()}`
      },
      {
        title: "Discord Connection",
        value: status.connectionStatus,
        icon: "settings",
        status: status.connectionStatus === "Connected" ? "online" : "error",
        description: `API Latency: ${status.latency !== null ? `${status.latency}ms` : "Unknown"}`
      },
      {
        title: "File Scanning",
        value: status.scanStatus === "In Progress" ? "Scanning" : "Active",
        icon: "refresh",
        status: status.scanStatus === "In Progress" ? "warning" : "online",
        description: `Next scan: ${status.nextScanTime ? new Date(status.nextScanTime).toLocaleString() : "Unknown"}`
      },
      {
        title: "Uptime",
        value: getUptimeDisplay(),
        icon: "clock",
        status: "online",
        description: `Since: ${new Date(status.lastRestartTime).toLocaleString()}`
      }
    ];
  };

  return {
    status,
    isLoadingStatus,
    error,
    activities: logData || activities,
    activityLogs: logData || activities,
    commands: commandsData || [],
    isLoadingLogs,
    isLoadingCommands,
    getUptimeDisplay,
    statusCards: getStatusCards(),
    refetchStatus,
    refetchLogs,
    refetchCommands
  };
}
