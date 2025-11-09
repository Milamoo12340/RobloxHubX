import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import ViewLeak from "@/pages/view-leak";
// Fix the import path to match the actual file location
import AdminDashboard from "./pages/admin-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard}/>
      <Route path="/view/:leakId">
        {params => <ViewLeak params={params} />}
      </Route>
      <Route path="/files/:leakId">
        {params => <ViewLeak params={params} />}
      </Route>
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
