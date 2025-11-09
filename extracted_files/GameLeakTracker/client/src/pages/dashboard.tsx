import { useState } from "react";
import { StatusCard } from "@/components/ui/status-card";
import { ActivityLogList } from "@/components/ui/activity-log";
import { CommandList } from "@/components/ui/command-list";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useBotStatus } from "@/hooks/use-bot-status";
import { useLeaks } from "@/hooks/use-leaks";
import { 
  SearchIcon, 
  RefreshCw, 
  UploadCloud, 
  CheckCircle2, 
  Home, 
  MessageSquare, 
  FileSearch, 
  Clipboard, 
  Settings 
} from "lucide-react";

export default function Dashboard() {
  const { 
    status, 
    isLoading, 
    activities, 
    getUptimeDisplay, 
    statusCards 
  } = useBotStatus();

  const { 
    commands, 
    settings,
    isLoadingCommands,
    isLoadingSettings,
    forceScan,
    postLatestLeaks,
    restartBot,
    updateSetting,
    isScanRunning,
    isPosting,
    isRestarting
  } = useLeaks();

  const [selectedNav, setSelectedNav] = useState("dashboard");

  // Format for last scan time display
  const getLastScanTime = () => {
    if (!status?.lastScanTime) return "Never";
    
    try {
      // Get time difference in minutes
      const scanTime = new Date(status.lastScanTime);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - scanTime.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return "just now";
      if (diffMinutes === 1) return "1 minute ago";
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "1 day ago";
      return `${diffDays} days ago`;
    } catch (e) {
      return "Unknown";
    }
  };
  
  // Get scan frequency from settings
  const getScanFrequency = () => {
    if (!settings) return "30";
    const freqSetting = settings.find(s => s.settingKey === "scanFrequency");
    return freqSetting ? freqSetting.settingValue : "30";
  };
  
  // Get stats from settings and status
  const getStatsData = () => {
    return {
      filesScanned: "3,456", // This would be dynamic in a real implementation
      leaksDetected: "128",   // This would be dynamic in a real implementation
      commandsUsed: "83"      // This would be dynamic in a real implementation
    };
  };
  
  // Handle scan frequency change
  const handleScanFrequencyChange = (value: string) => {
    updateSetting({
      settingKey: "scanFrequency",
      settingValue: value
    });
  };
  
  const stats = getStatsData();

  return (
    <div className="min-h-screen bg-discord-bg-default">
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-discord-bg-darker flex-shrink-0">
          <div className="px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">Leaks Bot</h1>
              <div className="flex items-center">
                <span className={`h-3 w-3 rounded-full mr-2 ${status?.isOnline ? "bg-discord-status-online" : "bg-discord-status-error"}`}></span>
                <span className="text-sm text-discord-text-default">{status?.isOnline ? "Online" : "Offline"}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-discord-text-muted">
              ID: 1352881326461812736
            </div>
          </div>
          
          <nav className="mt-6 px-4">
            <div className="space-y-2">
              <a 
                href="#dashboard"
                onClick={() => setSelectedNav("dashboard")}
                className={`flex items-center px-4 py-3 rounded-md ${
                  selectedNav === "dashboard" 
                    ? "text-white bg-discord-blue" 
                    : "text-discord-text-muted hover:text-white hover:bg-discord-bg-dark"
                }`}
              >
                <Home className="h-5 w-5 mr-3" />
                Dashboard
              </a>
              
              <a 
                href="#commands"
                onClick={() => setSelectedNav("commands")}
                className={`flex items-center px-4 py-3 rounded-md ${
                  selectedNav === "commands" 
                    ? "text-white bg-discord-blue" 
                    : "text-discord-text-muted hover:text-white hover:bg-discord-bg-dark"
                }`}
              >
                <MessageSquare className="h-5 w-5 mr-3" />
                Commands
              </a>
              
              <a 
                href="#file-scan"
                onClick={() => setSelectedNav("file-scan")}
                className={`flex items-center px-4 py-3 rounded-md ${
                  selectedNav === "file-scan" 
                    ? "text-white bg-discord-blue" 
                    : "text-discord-text-muted hover:text-white hover:bg-discord-bg-dark"
                }`}
              >
                <FileSearch className="h-5 w-5 mr-3" />
                File Scanning
              </a>
              
              <a 
                href="#logs"
                onClick={() => setSelectedNav("logs")}
                className={`flex items-center px-4 py-3 rounded-md ${
                  selectedNav === "logs" 
                    ? "text-white bg-discord-blue" 
                    : "text-discord-text-muted hover:text-white hover:bg-discord-bg-dark"
                }`}
              >
                <Clipboard className="h-5 w-5 mr-3" />
                Activity Logs
              </a>
              
              <a 
                href="#settings"
                onClick={() => setSelectedNav("settings")}
                className={`flex items-center px-4 py-3 rounded-md ${
                  selectedNav === "settings" 
                    ? "text-white bg-discord-blue" 
                    : "text-discord-text-muted hover:text-white hover:bg-discord-bg-dark"
                }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </a>
            </div>
          </nav>
          
          <div className="px-6 mt-8">
            <div className="bg-discord-bg-dark rounded-lg p-4">
              <h3 className="text-sm font-medium text-discord-text-default mb-2">Bot Uptime</h3>
              <div className="text-2xl font-bold text-discord-text-default">{getUptimeDisplay()}</div>
              <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-discord-status-online rounded-full" style={{ width: "98%" }}></div>
              </div>
              <div className="mt-1 text-xs text-discord-text-muted">98% uptime this month</div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto">
          {/* Header */}
          <header className="bg-discord-bg-dark border-b border-gray-700 py-4 px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Discord Leaks Bot Dashboard</h2>
                <p className="text-discord-text-muted mt-1">Monitoring game file changes and managing leak alerts</p>
              </div>
              <div className="mt-4 md:mt-0 flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
                <div className="flex items-center px-3 py-1 bg-discord-bg-darker rounded-md">
                  <span className="text-sm text-discord-text-muted mr-2">Last scan:</span>
                  <span className="text-sm text-white">{getLastScanTime()}</span>
                </div>
                <div className="flex items-center">
                  <Button 
                    className="bg-discord-blue hover:bg-discord-darkBlue text-white" 
                    onClick={() => forceScan()}
                    disabled={isScanRunning}
                  >
                    {isScanRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Run Scan Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Dashboard content */}
          <main className="p-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statusCards.map((card, index) => (
                <StatusCard key={index} data={card} />
              ))}
            </div>
            
            {/* Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-discord-bg-dark rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="font-medium text-white">Recent Activity</h3>
                  <button className="text-discord-text-muted hover:text-white text-sm">View All</button>
                </div>
                <div className="p-6">
                  <ActivityLogList activities={activities} isLoading={isLoading} />
                </div>
              </div>
              
              {/* Quick Actions & Stats */}
              <div className="lg:col-span-1 space-y-6">
                {/* Quick Actions */}
                <div className="bg-discord-bg-dark rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="font-medium text-white">Quick Actions</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-discord-blue hover:bg-discord-darkBlue text-white"
                        onClick={() => forceScan()}
                        disabled={isScanRunning}
                      >
                        <SearchIcon className="h-4 w-4 mr-2" />
                        {isScanRunning ? "Scanning..." : "Force Game Scan"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full text-white border-gray-700 bg-discord-bg-default hover:bg-discord-bg-darker"
                        onClick={() => postLatestLeaks()}
                        disabled={isPosting}
                      >
                        <UploadCloud className="h-4 w-4 mr-2" />
                        {isPosting ? "Posting..." : "Post Latest Leaks"}
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full text-white border-gray-700 bg-discord-bg-default hover:bg-discord-bg-darker"
                        onClick={() => restartBot()}
                        disabled={isRestarting}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {isRestarting ? "Restarting..." : "Restart Bot"}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="bg-discord-bg-dark rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="font-medium text-white">Stats</h3>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-discord-text-muted">Files Scanned</span>
                          <span className="text-sm text-white font-medium">{stats.filesScanned}</span>
                        </div>
                        <div className="h-2 bg-discord-bg-darker rounded-full">
                          <div className="h-full bg-discord-blue rounded-full" style={{ width: "75%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-discord-text-muted">Leaks Detected</span>
                          <span className="text-sm text-white font-medium">{stats.leaksDetected}</span>
                        </div>
                        <div className="h-2 bg-discord-bg-darker rounded-full">
                          <div className="h-full bg-discord-status-warning rounded-full" style={{ width: "45%" }}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-discord-text-muted">Commands Used</span>
                          <span className="text-sm text-white font-medium">{stats.commandsUsed}</span>
                        </div>
                        <div className="h-2 bg-discord-bg-darker rounded-full">
                          <div className="h-full bg-discord-status-online rounded-full" style={{ width: "30%" }}></div>
                        </div>
                      </div>
                      
                      <div className="pt-4 border-t border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-discord-text-muted">Scan Frequency</span>
                          <span className="text-sm text-discord-text-default">Every {getScanFrequency()} minutes</span>
                        </div>
                        <div className="mt-4">
                          <Select 
                            defaultValue={getScanFrequency()} 
                            onValueChange={handleScanFrequencyChange}
                          >
                            <SelectTrigger className="w-full bg-discord-bg-darker border-gray-700 text-discord-text-default">
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent className="bg-discord-bg-darker border-gray-700">
                              <SelectItem value="2">Every 2 minutes</SelectItem>
                              <SelectItem value="5">Every 5 minutes</SelectItem>
                              <SelectItem value="15">Every 15 minutes</SelectItem>
                              <SelectItem value="30">Every 30 minutes</SelectItem>
                              <SelectItem value="60">Every hour</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Configuration & Commands */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Command List */}
              <Card className="bg-discord-bg-dark border-0">
                <CardHeader className="border-b border-gray-700 px-6 py-4">
                  <CardTitle className="font-medium text-white">Bot Commands</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <CommandList commands={commands || []} isLoading={isLoadingCommands} />
                </CardContent>
              </Card>
              
              {/* Configuration */}
              <Card className="bg-discord-bg-dark border-0">
                <CardHeader className="border-b border-gray-700 px-6 py-4">
                  <CardTitle className="font-medium text-white">Deployment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-discord-text-default mb-3">Keep-Alive Configuration</h4>
                      <div className="bg-discord-bg-darker rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-discord-text-default">24/7 Deployment</span>
                          <Switch id="toggle-deployment" defaultChecked />
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-discord-text-default">Ping Service</span>
                          <Switch id="toggle-ping" defaultChecked />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-discord-text-default">Auto-Restart</span>
                          <Switch id="toggle-restart" defaultChecked />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-discord-text-default mb-3">Replit Configuration</h4>
                      <div className="bg-discord-bg-darker rounded-lg p-4">
                        <div className="mb-4">
                          <label className="block text-sm text-discord-text-muted mb-2">Environment</label>
                          <Select defaultValue="nodejs-20">
                            <SelectTrigger className="w-full bg-discord-bg-default border-gray-700 text-discord-text-default">
                              <SelectValue placeholder="Select environment" />
                            </SelectTrigger>
                            <SelectContent className="bg-discord-bg-darker border-gray-700">
                              <SelectItem value="nodejs-20">nodejs-20</SelectItem>
                              <SelectItem value="nodejs-18">nodejs-18</SelectItem>
                              <SelectItem value="nodejs-16">nodejs-16</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm text-discord-text-muted mb-2">Run Command</label>
                          <div className="flex">
                            <Input 
                              type="text" 
                              defaultValue="npm run dev" 
                              className="flex-1 bg-discord-bg-default border-gray-700 rounded-r-none text-discord-text-default" 
                            />
                            <Button className="bg-discord-blue rounded-l-none">
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-discord-text-default mb-3">Game Files Configuration</h4>
                      <div className="bg-discord-bg-darker rounded-lg p-4">
                        <div className="mb-4">
                          <label className="block text-sm text-discord-text-muted mb-2">Game Path</label>
                          <Input 
                            type="text" 
                            defaultValue="/game/content/paks" 
                            className="w-full bg-discord-bg-default border-gray-700 text-discord-text-default" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-discord-text-muted mb-2">File Types to Scan</label>
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 text-xs bg-discord-blue rounded-md text-white">Textures</span>
                            <span className="px-2 py-1 text-xs bg-discord-blue rounded-md text-white">Models</span>
                            <span className="px-2 py-1 text-xs bg-discord-blue rounded-md text-white">Audio</span>
                            <span className="px-2 py-1 text-xs bg-discord-blue rounded-md text-white">JSON</span>
                            <span className="px-2 py-1 text-xs bg-discord-blue rounded-md text-white">Config</span>
                            <Button variant="outline" className="px-2 py-1 h-auto text-xs bg-discord-bg-default hover:bg-discord-bg-darker rounded-md text-discord-text-default border-gray-700">
                              + Add
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button className="bg-discord-status-online hover:bg-green-600 text-white">Save Configuration</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
