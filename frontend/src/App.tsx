import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
<<<<<<< HEAD:frontend/src/App.tsx
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import Welcome from "./pages/Welcome";
=======
import { ClerkProvider } from "@clerk/clerk-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
>>>>>>> 58cd5d0fbf77c192200299f08ea0f25b435a77a7:src/App.tsx
import Index from "./pages/Index";
import KnowledgeBase from "./pages/KnowledgeBase";
import AISimulator from "./pages/AISimulator";
import Orders from "./pages/Orders";
import Conversations from "./pages/Conversations";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

const App = () => (
<<<<<<< HEAD:frontend/src/App.tsx
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
=======
  <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="*"
              element={
                <ProtectedRoute>
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
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
>>>>>>> 58cd5d0fbf77c192200299f08ea0f25b435a77a7:src/App.tsx
);

export default App;
