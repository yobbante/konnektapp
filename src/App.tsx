import { Toaster } from "@/components/ui/toaster";
import GPBagagesRegistration from "./pages/GPBagagesRegistration";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { GlobalNotificationProvider } from "@/components/notifications/GlobalNotificationProvider";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { RoleSwitchPopup } from "@/components/profile/RoleSwitchPopup";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import Index from "./pages/Index";
import Offres from "./pages/Offres";
import OfferDetail from "./pages/OfferDetail";
import SmartBookingPage from "./pages/SmartBookingPage";
import DemandeEnvoi from "./pages/DemandeEnvoi";
import CustomRequest from "./pages/CustomRequest";
import GPLanding from "./pages/GPLanding";
import GPRegistration from "./pages/GPRegistration";
import GPDashboard from "./pages/GPDashboard";
import GPBagagesInternationalDashboard from "./pages/GPBagagesInternationalDashboard";
import GPCustomRequests from "./pages/GPCustomRequests";
import GPOrderDetail from "./pages/GPOrderDetail";
import ClientDashboard from "./pages/ClientDashboard";
import ClientProfile from "./pages/ClientProfile";
import ClientTransporterProfile from "./pages/ClientTransporterProfile";
import Auth from "./pages/Auth";
import Tracking from "./pages/Tracking";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDepartures from "./pages/AdminDepartures";
import AdminOrders from "./pages/AdminOrders";
import AdminGPProfile from "./pages/AdminGPProfile";
import AdminOrderDetail from "./pages/AdminOrderDetail";
import PostBookingForm from "./pages/PostBookingForm";
import BookingConfirmation from "./pages/BookingConfirmation";
import Profile from "./pages/Profile";
import GPProfile from "./pages/GPProfile";
import TransporterProfile from "./pages/TransporterProfile";
import Favorites from "./pages/Favorites";
import FavoriteTransporters from "./pages/FavoriteTransporters";
import SavedSearches from "./pages/SavedSearches";
import QuoteConfirmation from "./pages/QuoteConfirmation";
import Settings from "./pages/Settings";
import Alerts from "./pages/Alerts";
import Install from "./pages/Install";
import LoyaltyTiersPage from "./pages/LoyaltyTiersPage";
import AdminMessages from "./pages/AdminMessages";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalNotificationProvider>
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThemeInitializer />
          <ScrollToTop />
          <ScrollToTopButton />
          <RoleSwitchPopup />
          <AuthGuard>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/demande" element={<DemandeEnvoi />} />
            <Route path="/demande/personnalisee" element={<CustomRequest />} />
            <Route path="/demande-personnalisee" element={<CustomRequest />} />
            <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
            <Route path="/offres" element={<Offres />} />
            <Route path="/offres/:id" element={<OfferDetail />} />
            <Route path="/reservation/gp/:gpId" element={<SmartBookingPage />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/gp" element={<GPLanding />} />
            <Route path="/gp/inscription" element={<GPRegistration />} />
            <Route path="/gp/dashboard" element={<GPDashboard />} />
            <Route path="/gp/bagages/inscription" element={<GPBagagesRegistration />} />
            <Route path="/gp/requests" element={<GPCustomRequests />} />
            <Route path="/gp/demandes" element={<GPCustomRequests />} />
            <Route path="/gp/order/:orderId" element={<GPOrderDetail />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/profile" element={<ClientProfile />} />
            <Route path="/client/transporteurs/:gpId" element={<ClientTransporterProfile />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/departures" element={<AdminDepartures />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/gp/:gpId" element={<AdminGPProfile />} />
            <Route path="/admin/order/:orderId" element={<AdminOrderDetail />} />
            <Route path="/order/:orderId/complete" element={<PostBookingForm />} />
            <Route path="/booking/confirmation/:orderId" element={<BookingConfirmation />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/gp/:gpId" element={<GPProfile />} />
            <Route path="/transporter/profile" element={<TransporterProfile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/favorites/transporters" element={<FavoriteTransporters />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/install" element={<Install />} />
            <Route path="/loyalty" element={<LoyaltyTiersPage />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
        </BrowserRouter>
      </GlobalNotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
