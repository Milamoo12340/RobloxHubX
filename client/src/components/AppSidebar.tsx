import { Home, Library, Gauge, Zap, Users, Newspaper, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Game Library", url: "/library", icon: Library },
  { title: "Performance", url: "/performance", icon: Gauge },
  { title: "Optimization", url: "/optimization", icon: Zap },
  { title: "Social", url: "/social", icon: Users },
  { title: "News", url: "/news", icon: Newspaper },
];

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10" data-testid="avatar-user">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Player1" />
            <AvatarFallback>PL</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" data-testid="text-username">Player_Pro</p>
            <p className="text-xs text-muted-foreground">Level 42</p>
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-level">PRO</Badge>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Total Playtime</span>
            <span className="font-mono font-semibold" data-testid="text-playtime">247h 32m</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Games Owned</span>
            <span className="font-mono font-semibold" data-testid="text-games-count">156</span>
          </div>
        </div>
        <SidebarMenuButton asChild className="mt-3" data-testid="button-settings">
          <a href="/settings">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </a>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
