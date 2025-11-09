import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SearchBar } from "@/components/SearchBar";
import { SystemStatus } from "@/components/SystemStatus";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/Dashboard";
import GameLibrary from "@/pages/GameLibrary";
import Performance from "@/pages/Performance";
import Optimization from "@/pages/Optimization";
import News from "@/pages/News";
import PS99Leaks from "@/pages/PS99Leaks";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/library" component={GameLibrary} />
      <Route path="/performance" component={Performance} />
      <Route path="/optimization" component={Optimization} />
      <Route path="/news" component={News} />
      <Route path="/ps99-leaks" component={PS99Leaks} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <header className="flex items-center justify-between gap-4 p-4 border-b bg-card">
                <div className="flex items-center gap-3">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <SearchBar />
                </div>
                <div className="flex items-center gap-3">
                  <SystemStatus />
                  <Button variant="ghost" size="icon" data-testid="button-notifications">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <ThemeToggle />
                </div>
              </header>
              <main className="flex-1 overflow-auto p-6">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
