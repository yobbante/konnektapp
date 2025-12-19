import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DemandeEnvoi from "./pages/DemandeEnvoi";
import Offres from "./pages/Offres";
import Tracking from "./pages/Tracking";
import GPLanding from "./pages/GPLanding";
import GPRegistration from "./pages/GPRegistration";
import GPDashboard from "./pages/GPDashboard";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import PriceCalculator from "./pages/PriceCalculator";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/demande" element={<DemandeEnvoi />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/calculateur" element={<PriceCalculator />} />
          <Route path="/gp" element={<GPLanding />} />
          <Route path="/gp/inscription" element={<GPRegistration />} />
          <Route path="/gp/dashboard" element={<GPDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
