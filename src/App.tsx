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
import CustomRequest from "./pages/CustomRequest";
import GPLanding from "./pages/GPLanding";
import GPRegistration from "./pages/GPRegistration";
import GPDashboard from "./pages/GPDashboard";
import GPCustomRequests from "./pages/GPCustomRequests";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfile from "./pages/ClientProfile";
import Auth from "./pages/Auth";
import Tracking from "./pages/Tracking";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import AdminGPProfile from "./pages/AdminGPProfile";
import PostBookingForm from "./pages/PostBookingForm";
import Profile from "./pages/Profile";
import GPProfile from "./pages/GPProfile";
import TransporterProfile from "./pages/TransporterProfile";
import Favorites from "./pages/Favorites";
import SavedSearches from "./pages/SavedSearches";
import QuoteConfirmation from "./pages/QuoteConfirmation";
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
          <Route path="/demande/personnalisee" element={<CustomRequest />} />
          <Route path="/demande-personnalisee" element={<CustomRequest />} />
          <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
          <Route path="/offres" element={<Offres />} />
          <Route path="/offres/:id" element={<OfferDetail />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/gp" element={<GPLanding />} />
          <Route path="/gp/inscription" element={<GPRegistration />} />
          <Route path="/gp/dashboard" element={<GPDashboard />} />
          <Route path="/gp/requests" element={<GPCustomRequests />} />
          <Route path="/client/dashboard" element={<ClientDashboard />} />
          <Route path="/client/profile" element={<ClientProfile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/gp/:gpId" element={<AdminGPProfile />} />
          <Route path="/order/:orderId/complete" element={<PostBookingForm />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/gp/:gpId" element={<GPProfile />} />
          <Route path="/transporter/profile" element={<TransporterProfile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/saved-searches" element={<SavedSearches />} />
          <Route path="/auth" element={<Auth />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
