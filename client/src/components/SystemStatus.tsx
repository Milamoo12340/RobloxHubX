import { Cpu, HardDrive, Thermometer } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function SystemStatus() {
  return (
    <div className="flex items-center gap-6" data-testid="system-status">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-chart-1" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">CPU</span>
            <span className="text-xs font-mono font-semibold" data-testid="text-cpu-usage">42%</span>
          </div>
          <Progress value={42} className="h-1 w-16 [&>div]:bg-chart-1" data-testid="progress-cpu" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <HardDrive className="h-4 w-4 text-chart-2" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">RAM</span>
            <span className="text-xs font-mono font-semibold" data-testid="text-ram-usage">51%</span>
          </div>
          <Progress value={51} className="h-1 w-16 [&>div]:bg-chart-2" data-testid="progress-ram" />
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Thermometer className="h-4 w-4 text-chart-4" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Temp</span>
            <span className="text-xs font-mono font-semibold" data-testid="text-temp">65°C</span>
          </div>
          <Progress value={65} className="h-1 w-16 [&>div]:bg-chart-4" data-testid="progress-temp" />
        </div>
      </div>
    </div>
  );
}
