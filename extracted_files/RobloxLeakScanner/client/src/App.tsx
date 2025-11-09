import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DiscordInterface from "@/pages/DiscordInterface";
import LeaksGallery from "@/pages/LeaksGallery";
import Navbar from "@/components/Navbar";
import { BotProvider } from "./context/BotContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discord" component={DiscordInterface} />
      <Route path="/leaks" component={LeaksGallery} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BotProvider>
        <div className="min-h-screen bg-[#36393F] text-white">
          <Navbar />
          <main className="pt-2">
            <Router />
          </main>
        </div>
        <Toaster />
      </BotProvider>
    </QueryClientProvider>
  );
}

export default App;
