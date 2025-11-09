import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LucideIcon } from "lucide-react";

interface PerformanceWidgetProps {
  title: string;
  value: string | number;
  max?: number;
  unit?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "stable";
  color?: "primary" | "accent" | "destructive" | "chart-2";
}

export function PerformanceWidget({
  title,
  value,
  max,
  unit = "",
  icon: Icon,
  trend,
  color = "primary",
}: PerformanceWidgetProps) {
  const numericValue = typeof value === "string" ? parseFloat(value) : value;
  const percentage = max ? (numericValue / max) * 100 : undefined;
  
  const colorClasses = {
    primary: "text-primary",
    accent: "text-accent",
    destructive: "text-destructive",
    "chart-2": "text-chart-2",
  };

  const progressClasses = {
    primary: "[&>div]:bg-primary",
    accent: "[&>div]:bg-accent",
    destructive: "[&>div]:bg-destructive",
    "chart-2": "[&>div]:bg-chart-2",
  };

  return (
    <Card data-testid={`card-${title.toLowerCase().replace(' ', '-')}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-3xl font-bold font-mono ${colorClasses[color]}`} data-testid={`text-value-${title.toLowerCase().replace(' ', '-')}`}>
                {value}
              </span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
          </div>
          <div className={`p-2 rounded-md bg-muted ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        
        {percentage !== undefined && (
          <Progress 
            value={percentage} 
            className={`h-1.5 ${progressClasses[color]}`}
            data-testid={`progress-${title.toLowerCase().replace(' ', '-')}`}
          />
        )}
        
        {trend && (
          <p className="text-xs text-muted-foreground mt-2">
            {trend === "up" && "↑ Increasing"}
            {trend === "down" && "↓ Decreasing"}
            {trend === "stable" && "→ Stable"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
