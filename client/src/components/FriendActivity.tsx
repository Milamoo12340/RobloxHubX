import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gamepad2 } from "lucide-react";

interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "in-game" | "offline";
  currentGame?: string;
}

interface FriendActivityProps {
  friends: Friend[];
}

export function FriendActivity({ friends }: FriendActivityProps) {
  const statusColors = {
    online: "bg-status-online",
    "in-game": "bg-primary",
    offline: "bg-status-offline",
  };

  const statusLabels = {
    online: "Online",
    "in-game": "In Game",
    offline: "Offline",
  };

  return (
    <Card data-testid="card-friend-activity">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Friend Activity</CardTitle>
        <Gamepad2 className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center gap-3 p-2 rounded-md hover-elevate"
            data-testid={`friend-${friend.id}`}
          >
            <div className="relative">
              <Avatar className="h-10 w-10" data-testid={`avatar-${friend.id}`}>
                <AvatarImage src={friend.avatar} />
                <AvatarFallback>{friend.name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div
                className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${statusColors[friend.status]}`}
                data-testid={`status-${friend.id}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" data-testid={`text-friend-name-${friend.id}`}>
                {friend.name}
              </p>
              {friend.currentGame ? (
                <p className="text-xs text-muted-foreground truncate" data-testid={`text-game-${friend.id}`}>
                  Playing {friend.currentGame}
                </p>
              ) : (
                <Badge variant="secondary" className="text-xs h-5">
                  {statusLabels[friend.status]}
                </Badge>
              )}
            </div>
            {friend.status === "in-game" && (
              <Button size="sm" variant="outline" className="h-7" data-testid={`button-join-${friend.id}`}>
                Join
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
