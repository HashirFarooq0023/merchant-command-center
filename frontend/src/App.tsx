import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import Welcome from "./pages/Welcome";
import Index from "./pages/Index";
import KnowledgeBase from "./pages/KnowledgeBase";
import AISimulator from "./pages/AISimulator";
import Orders from "./pages/Orders";
import Conversations from "./pages/Conversations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SignedOut>
          <Welcome />
        </SignedOut>

        <SignedIn>
          <DashboardLayout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/simulator" element={<AISimulator />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/conversations" element={<Conversations />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DashboardLayout>
        </SignedIn>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
