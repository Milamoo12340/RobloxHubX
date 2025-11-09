import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Play, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Friend {
  id: number;
  username: string;
  displayName: string;
  isOnline: boolean;
  presenceType: number;
  lastLocation: string | null;
  placeId: number | null;
  rootPlaceId: number | null;
  avatar: string | null;
  hasVerifiedBadge: boolean;
}

interface FriendsListProps {
  userId: number;
}

export function FriendsList({ userId }: FriendsListProps) {
  const { data: friends = [], isLoading } = useQuery<Friend[]>({
    queryKey: ["/api/roblox/user", userId, "friends"],
    queryFn: async () => {
      const response = await fetch(`/api/roblox/user/${userId}/friends`);
      if (!response.ok) throw new Error("Failed to fetch friends");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const getPresenceStatus = (friend: Friend) => {
    switch (friend.presenceType) {
      case 4:
        return { text: "In App", color: "bg-chart-2", icon: null };
      case 3:
        return { text: "In Studio", color: "bg-chart-3", icon: null };
      case 2:
        return { text: "In Game", color: "bg-primary", icon: Play };
      case 1:
        return { text: "Online", color: "bg-chart-2", icon: null };
      default:
        return { text: "Offline", color: "bg-muted", icon: null };
    }
  };

  const handleJoinFriend = (friend: Friend) => {
    if (friend.rootPlaceId) {
      window.location.href = `roblox://experiences/start?placeId=${friend.rootPlaceId}`;
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <Card data-testid="card-no-friends">
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            This user has no public friends or their friends list is private
          </p>
        </CardContent>
      </Card>
    );
  }

  const onlineFriends = friends.filter(f => f.presenceType > 0);
  const offlineFriends = friends.filter(f => f.presenceType === 0);

  return (
    <div className="space-y-4">
      {onlineFriends.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Online ({onlineFriends.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlineFriends.map((friend) => {
              const status = getPresenceStatus(friend);
              return (
                <Card
                  key={friend.id}
                  className="hover-elevate active-elevate-2"
                  data-testid={`card-friend-${friend.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={friend.avatar || undefined} />
                          <AvatarFallback>{friend.username[0]}</AvatarFallback>
                        </Avatar>
                        {status.icon && (
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <status.icon className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="font-medium text-sm truncate" data-testid={`text-friend-name-${friend.id}`}>
                            {friend.displayName}
                          </p>
                          {friend.hasVerifiedBadge && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant="secondary"
                            className={`${status.color} text-xs`}
                            data-testid={`badge-status-${friend.id}`}
                          >
                            {status.text}
                          </Badge>
                          {friend.rootPlaceId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleJoinFriend(friend)}
                              className="h-6 px-2 text-xs"
                              data-testid={`button-join-${friend.id}`}
                            >
                              Join
                            </Button>
                          )}
                        </div>
                        {friend.lastLocation && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {friend.lastLocation}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {offlineFriends.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Offline ({offlineFriends.length})
          </h3>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-4">
              {offlineFriends.map((friend) => {
                const status = getPresenceStatus(friend);
                return (
                  <Card
                    key={friend.id}
                    className="hover-elevate"
                    data-testid={`card-friend-${friend.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 opacity-60">
                          <AvatarImage src={friend.avatar || undefined} />
                          <AvatarFallback>{friend.username[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="font-medium text-sm truncate opacity-75" data-testid={`text-friend-name-${friend.id}`}>
                              {friend.displayName}
                            </p>
                            {friend.hasVerifiedBadge && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 opacity-75" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
                          <Badge
                            variant="secondary"
                            className={`${status.color} text-xs mt-2`}
                            data-testid={`badge-status-${friend.id}`}
                          >
                            {status.text}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
