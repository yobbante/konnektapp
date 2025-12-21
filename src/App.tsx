import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import Index from "./pages/Index";
import Offres from "./pages/Offres";
import OfferDetail from "./pages/OfferDetail";
import DemandeEnvoi from "./pages/DemandeEnvoi";
import GPLanding from "./pages/GPLanding";
import GPRegistration from "./pages/GPRegistration";
import GPDashboard from "./pages/GPDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import Auth from "./pages/Auth";
import Tracking from "./pages/Tracking";
import PriceCalculator from "./pages/PriceCalculator";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGPProfile from "./pages/AdminGPProfile";
import PostBookingForm from "./pages/PostBookingForm";
import Profile from "./pages/Profile";
import GPProfile from "./pages/GPProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/demande" element={<DemandeEnvoi />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/offres/:id" element={<OfferDetail />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/calculateur" element={<PriceCalculator />} />
          <Route path="/gp" element={<GPLanding />} />
          <Route path="/gp/inscription" element={<GPRegistration />} />
          <Route path="/gp/dashboard" element={<GPDashboard />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/gp/:gpId" element={<AdminGPProfile />} />
          <Route path="/order/:orderId/complete" element={<PostBookingForm />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/gp/:gpId" element={<GPProfile />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
