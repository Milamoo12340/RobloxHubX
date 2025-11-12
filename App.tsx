import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import DiscordInterface from "@/pages/DiscordInterface";
import { BotProvider } from "./context/BotContext";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discord" component={DiscordInterface} />
      <Route component={NotFound} />
    </Switch>
  );
}
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BotProvider>
        <Router />
        <Toaster />
      </BotProvider>
    </QueryClientProvider>
  );
}
export default App;
