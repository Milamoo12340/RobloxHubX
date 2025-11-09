import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  RefreshCw, 
  Server, 
  Zap 
} from "lucide-react";

interface ActivityLog {
  id: number;
  eventType: string;
  message: string;
  timestamp: string;
  metadata: any;
}

interface ActivityLogItemProps {
  activity: ActivityLog;
}

export function ActivityLogItem({ activity }: ActivityLogItemProps) {
  const date = new Date(activity.timestamp);
  const formattedDate = date.toLocaleString();
  
  const getEventIcon = () => {
    switch (activity.eventType) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'scan':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      case 'connection':
        return <Zap className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Server className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getEventBadge = () => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "default";
    
    switch (activity.eventType) {
      case 'error':
        variant = "destructive";
        break;
      case 'warning':
        variant = "outline";
        break;
      case 'success':
        variant = "default";
        break;
      default:
        variant = "secondary";
    }
    
    return (
      <Badge variant={variant} className="ml-2">
        {activity.eventType.toUpperCase()}
      </Badge>
    );
  };
  
  return (
    <div className="pb-4 border-b last:border-0 mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          {getEventIcon()}
          <span className="font-medium ml-2">{activity.message}</span>
          {getEventBadge()}
        </div>
        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>
      {activity.metadata && (
        <div className="pl-6 mt-1 text-sm text-muted-foreground">
          {typeof activity.metadata === 'object'
            ? JSON.stringify(activity.metadata)
            : activity.metadata}
        </div>
      )}
    </div>
  );
}

interface ActivityLogListProps {
  activities: ActivityLog[];
  isLoading?: boolean;
}

export function ActivityLogList({ activities, isLoading }: ActivityLogListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  
  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No activity logs available
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {activities.map((activity) => (
          <ActivityLogItem key={activity.id} activity={activity} />
        ))}
      </div>
    </ScrollArea>
  );
}