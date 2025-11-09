import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, CircleCheck, Zap, CheckCircle, MessageSquare, Loader2 } from "lucide-react";
import { StatusCardData } from "@/hooks/use-bot-status";

interface StatusCardProps {
  data: StatusCardData;
}

export function StatusCard({ data }: StatusCardProps) {
  // Map the icon string to the actual Lucide icon component
  const getIcon = (): LucideIcon => {
    switch (data.icon) {
      case "circle-check":
        return CircleCheck;
      case "zap":
        return Zap;
      case "check-circle":
        return CheckCircle;
      case "loader-2":
        return Loader2;
      case "message-square":
        return MessageSquare;
      default:
        return CheckCircle;
    }
  };

  // Get the status color
  const getStatusColor = () => {
    switch (data.status) {
      case "online":
        return "text-discord-status-online";
      case "warning":
        return "text-discord-status-warning";
      case "error":
        return "text-discord-status-error";
      default:
        return "text-discord-text-muted";
    }
  };

  const Icon = getIcon();

  return (
    <Card className="bg-discord-bg-dark border-0">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-discord-text-muted text-sm font-medium">{data.title}</h3>
            <p className="text-xl font-bold text-discord-text-default mt-1">{data.value}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-discord-bg-darker flex items-center justify-center">
            {data.status === "online" && data.icon === "circle-check" ? (
              <span className="h-3 w-3 rounded-full bg-discord-status-online"></span>
            ) : (
              <Icon className={`h-5 w-5 ${getStatusColor()}`} />
            )}
          </div>
        </div>
        <div className="mt-4 text-xs text-discord-text-muted">
          {data.description}
        </div>
      </CardContent>
    </Card>
  );
}
