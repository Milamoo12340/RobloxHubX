import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Zap, Check, Settings2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Optimization() {
  const [gameMode, setGameMode] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const handleOptimize = () => {
    setIsOptimizing(true);
    console.log("Running system optimization...");

    setTimeout(() => {
      setIsOptimizing(false);
      toast({
        title: "Optimization Complete",
        description: "System resources have been optimized for gaming performance.",
      });
    }, 2000);
  };

  const handleGameModeToggle = (enabled: boolean) => {
    setGameMode(enabled);
    if (enabled) {
      console.log("Game Mode enabled");
      toast({
        title: "Game Mode Enabled",
        description: "System prioritized for gaming performance.",
      });
    } else {
      toast({
        title: "Game Mode Disabled",
        description: "System returned to balanced mode.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">System Optimization</h1>
        <p className="text-muted-foreground">
          Optimize your system for the best gaming performance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Game Mode
              </CardTitle>
              <CardDescription>Prioritize gaming performance</CardDescription>
            </div>
            <Switch
              checked={gameMode}
              onCheckedChange={handleGameModeToggle}
              data-testid="switch-game-mode"
            />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When enabled, the system allocates more resources to gaming applications and reduces background processes.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Quick Optimization
            </CardTitle>
            <CardDescription>One-click system optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="w-full"
              size="lg"
              data-testid="button-optimize-now"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isOptimizing ? "Optimizing..." : "Optimize Now"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Clears temporary files, optimizes memory usage, and closes unnecessary background processes.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Optimization Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Memory Optimization</p>
              <p className="text-sm text-muted-foreground">Frees up RAM by clearing cached data</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Background Process Management</p>
              <p className="text-sm text-muted-foreground">Reduces CPU usage from unnecessary applications</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Network Optimization</p>
              <p className="text-sm text-muted-foreground">Prioritizes gaming traffic for lower latency</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Disk Cleanup</p>
              <p className="text-sm text-muted-foreground">Removes temporary files to free up storage</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
