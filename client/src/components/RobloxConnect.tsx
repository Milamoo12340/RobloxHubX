import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link2, UserCircle, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RobloxUser {
  id: number;
  username: string;
  displayName: string;
  description: string;
  avatar: string | null;
  hasVerifiedBadge: boolean;
  presence: {
    userPresenceType: number;
  };
}

interface RobloxConnectProps {
  onUserLinked: (user: RobloxUser) => void;
  linkedUser: RobloxUser | null;
  onDisconnect: () => void;
}

export function RobloxConnect({ onUserLinked, linkedUser, onDisconnect }: RobloxConnectProps) {
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const linkMutation = useMutation({
    mutationFn: async (usernameOrUrl: string) => {
      let username = usernameOrUrl.trim();
      
      const profileMatch = username.match(/roblox\.com\/users\/(\d+)/);
      if (profileMatch) {
        const userId = profileMatch[1];
        const userResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (!userResponse.ok) {
          throw new Error("Invalid profile URL or user ID");
        }
        const userData = await userResponse.json();
        if (!userData.name) {
          throw new Error("Could not extract username from profile");
        }
        username = userData.name;
      }

      const response = await fetch(`/api/roblox/user/${encodeURIComponent(username)}`);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "User not found" : "Failed to fetch user");
      }
      return response.json();
    },
    onSuccess: (data) => {
      onUserLinked(data);
      setInput("");
      toast({
        title: "Connected!",
        description: `Successfully linked ${data.displayName}'s Roblox account`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      linkMutation.mutate(input);
    }
  };

  if (linkedUser) {
    const presenceType = linkedUser.presence.userPresenceType;
    let presenceText = "Offline";
    let presenceColor = "bg-muted";
    
    switch (presenceType) {
      case 4:
        presenceText = "In App";
        presenceColor = "bg-chart-2";
        break;
      case 3:
        presenceText = "In Studio";
        presenceColor = "bg-chart-3";
        break;
      case 2:
        presenceText = "In Game";
        presenceColor = "bg-primary";
        break;
      case 1:
        presenceText = "Online";
        presenceColor = "bg-chart-2";
        break;
      default:
        presenceText = "Offline";
        presenceColor = "bg-muted";
    }

    return (
      <Card data-testid="card-linked-user">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={linkedUser.avatar || undefined} />
              <AvatarFallback>{linkedUser.username[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate" data-testid="text-linked-username">
                  {linkedUser.displayName}
                </p>
                {linkedUser.hasVerifiedBadge && (
                  <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{linkedUser.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className={presenceColor} data-testid="badge-presence">
              {presenceText}
            </Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={onDisconnect}
              data-testid="button-disconnect"
              title="Disconnect"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card data-testid="card-roblox-connect">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Link Roblox Account
        </CardTitle>
        <CardDescription>
          Enter your Roblox username or paste your profile URL to view your friends list
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Username or https://roblox.com/users/12345/profile"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={linkMutation.isPending}
              className="pl-9"
              data-testid="input-roblox-username"
            />
          </div>
          <Button
            type="submit"
            disabled={!input.trim() || linkMutation.isPending}
            data-testid="button-link-account"
          >
            {linkMutation.isPending ? "Connecting..." : "Connect"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
