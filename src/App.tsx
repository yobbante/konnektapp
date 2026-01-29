import { Toaster } from "@/components/ui/toaster";
import GPBagagesRegistration from "./pages/GPBagagesRegistration";
import RoutierRegistration from "./pages/RoutierRegistration";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import GPDemandesPage from "./pages/gp/GPDemandesPage";
import GPEnCoursPage from "./pages/gp/GPEnCoursPage";
import GPHistoriquePage from "./pages/gp/GPHistoriquePage";
import GPCalendrierPage from "./pages/gp/GPCalendrierPage";
import GPTarificationPage from "./pages/gp/GPTarificationPage";
import GPProfilPublicPage from "./pages/gp/GPProfilPublicPage";
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
// Routier pages
import RoutierDemandesPage from "./pages/routier/RoutierDemandesPage";
import RoutierEnCoursPage from "./pages/routier/RoutierEnCoursPage";
import RoutierHistoriquePage from "./pages/routier/RoutierHistoriquePage";
import RoutierVehiculesPage from "./pages/routier/RoutierVehiculesPage";
import RoutierTarificationPage from "./pages/routier/RoutierTarificationPage";
import RoutierProfilPublicPage from "./pages/routier/RoutierProfilPublicPage";

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
            {/* ============================================
                PUBLIC ROUTES - Accessibles sans authentification
            ============================================ */}
            <Route path="/" element={<Index />} />
            <Route path="/offres" element={<Offres />} />
            <Route path="/offres/:id" element={<OfferDetail />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/gp/:gpId" element={<GPProfile />} />
            <Route path="/client/transporteurs/:gpId" element={<ClientTransporterProfile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Install />} />
            
            {/* ============================================
                CLIENT ROUTES - Dashboard client unifié
            ============================================ */}
            <Route path="/demande" element={<DemandeEnvoi />} />
            <Route path="/demande-personnalisee" element={<CustomRequest />} />
            <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
            <Route path="/reservation/gp/:gpId" element={<SmartBookingPage />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/client/profile" element={<ClientProfile />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/favorites/transporters" element={<FavoriteTransporters />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/loyalty" element={<LoyaltyTiersPage />} />
            <Route path="/order/:orderId/complete" element={<PostBookingForm />} />
            <Route path="/booking/confirmation/:orderId" element={<BookingConfirmation />} />
            
            {/* ============================================
                GP/TRANSPORTER ROUTES - Dashboard transporteur épuré
                /gp/dashboard redirige vers /gp/demandes (page principale)
            ============================================ */}
            <Route path="/gp" element={<GPLanding />} />
            <Route path="/gp/inscription" element={<GPRegistration />} />
            <Route path="/gp/bagages/inscription" element={<GPBagagesRegistration />} />
            {/* Redirection: /gp/dashboard → /gp/demandes */}
            <Route path="/gp/dashboard" element={<Navigate to="/gp/demandes" replace />} />
            <Route path="/gp/demandes" element={<GPDemandesPage />} />
            <Route path="/gp/en-cours" element={<GPEnCoursPage />} />
            <Route path="/gp/historique" element={<GPHistoriquePage />} />
            <Route path="/gp/calendrier" element={<GPCalendrierPage />} />
            <Route path="/gp/tarification" element={<GPTarificationPage />} />
            <Route path="/gp/profil-public" element={<GPProfilPublicPage />} />
            <Route path="/gp/requests" element={<GPCustomRequests />} />
            <Route path="/gp/order/:orderId" element={<GPOrderDetail />} />
            <Route path="/transporter/profile" element={<TransporterProfile />} />
            
            {/* ============================================
                ROUTIER ROUTES - Dashboard transport routier
            ============================================ */}
            <Route path="/routier/inscription" element={<RoutierRegistration />} />
            <Route path="/routier/dashboard" element={<Navigate to="/routier/demandes" replace />} />
            <Route path="/routier/demandes" element={<RoutierDemandesPage />} />
            <Route path="/routier/en-cours" element={<RoutierEnCoursPage />} />
            <Route path="/routier/historique" element={<RoutierHistoriquePage />} />
            <Route path="/routier/vehicules" element={<RoutierVehiculesPage />} />
            <Route path="/routier/tarification" element={<RoutierTarificationPage />} />
            <Route path="/routier/profil-public" element={<RoutierProfilPublicPage />} />
            
            {/* ============================================
                ADMIN ROUTES - Dashboard admin
            ============================================ */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/departures" element={<AdminDepartures />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/gp/:gpId" element={<AdminGPProfile />} />
            <Route path="/admin/order/:orderId" element={<AdminOrderDetail />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            
            {/* ============================================
                LEGACY REDIRECTS - Routes obsolètes vers nouvelles
            ============================================ */}
            <Route path="/profil" element={<Navigate to="/client/dashboard" replace />} />
            <Route path="/profile" element={<Navigate to="/client/dashboard" replace />} />
            <Route path="/demande/personnalisee" element={<Navigate to="/demande-personnalisee" replace />} />
            
            {/* 404 - Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthGuard>
        </BrowserRouter>
      </GlobalNotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
