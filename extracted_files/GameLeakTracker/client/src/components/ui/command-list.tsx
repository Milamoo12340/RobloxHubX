import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Terminal, AlertTriangle, CheckCircle } from "lucide-react";

export interface Command {
  name: string;
  description: string;
  status: string;
}

interface CommandItemProps {
  command: Command;
}

function CommandItem({ command }: CommandItemProps) {
  const getStatusBadge = () => {
    switch (command.status.toLowerCase()) {
      case 'active':
      case 'registered':
      case 'online':
      case 'available':
        return <Badge variant="default" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {command.status}</Badge>;
      case 'error':
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {command.status}</Badge>;
      default:
        return <Badge variant="secondary">{command.status}</Badge>;
    }
  };

  return (
    <div className="p-3 border rounded-lg mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span className="font-medium text-sm">
            {command.name}
          </span>
        </div>
        {getStatusBadge()}
      </div>
      <p className="text-sm text-muted-foreground ml-6">
        {command.description}
      </p>
    </div>
  );
}

interface CommandListProps {
  commands: Command[];
  isLoading?: boolean;
}

export function CommandList({ commands, isLoading }: CommandListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!commands || commands.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No commands available
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div>
        {commands.map((command, index) => (
          <CommandItem key={index} command={command} />
        ))}
      </div>
    </ScrollArea>
  );
}