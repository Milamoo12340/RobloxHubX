import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Zap, Shield, Maximize2 } from "lucide-react";
import { useState } from "react";

export function OptimizationPanel() {
  const [gameMode, setGameMode] = useState(false);
  const [boostEnabled, setBoostEnabled] = useState(false);

  return (
    <Card data-testid="card-optimization">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          System Optimization
        </CardTitle>
        <CardDescription>
          Maximize performance with one-click optimization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Maximize2 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Game Mode</p>
              <p className="text-xs text-muted-foreground">Optimize for gaming performance</p>
            </div>
          </div>
          <Switch
            checked={gameMode}
            onCheckedChange={setGameMode}
            data-testid="switch-game-mode"
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-md border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-accent/10">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-medium text-sm">Performance Boost</p>
              <p className="text-xs text-muted-foreground">Free up system resources</p>
            </div>
          </div>
          <Switch
            checked={boostEnabled}
            onCheckedChange={setBoostEnabled}
            data-testid="switch-boost"
          />
        </div>

        <Button 
          className="w-full" 
          variant="default"
          data-testid="button-optimize-now"
        >
          <Zap className="h-4 w-4 mr-2" />
          Optimize Now
        </Button>
      </CardContent>
    </Card>
  );
}
