import { AppleToaster } from "@/components/ui/AppleToaster";
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
import { AppleNotificationContainer } from "@/components/ui/AppleNotification";
import { SmartScrollTop } from "@/hooks/useSmartScrollTop";
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
import GPScanPage from "./pages/gp/GPScanPage";
import GPCustomRequests from "./pages/GPCustomRequests";
import GPOrderDetail from "./pages/GPOrderDetail";
// ClientDashboard removed - redirect to /profil
// ClientProfile removed - using UnifiedProfile at /profil
import ClientTransporterProfile from "./pages/ClientTransporterProfile";
import Auth from "./pages/Auth";
import Tracking from "./pages/Tracking";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSearchResults from "./pages/AdminSearchResults";
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
import Recipients from "./pages/Recipients";
import ClientScanPage from "./pages/ClientScanPage";
// Routier pages
import RoutierDemandesPage from "./pages/routier/RoutierDemandesPage";
import RoutierEnCoursPage from "./pages/routier/RoutierEnCoursPage";
import RoutierHistoriquePage from "./pages/routier/RoutierHistoriquePage";
import RoutierVehiculesPage from "./pages/routier/RoutierVehiculesPage";
import RoutierTarificationPage from "./pages/routier/RoutierTarificationPage";
import RoutierProfilPublicPage from "./pages/routier/RoutierProfilPublicPage";
import RoutierDemandePage from "./pages/routier/RoutierDemandePage";
// Universal shipment entry
import ShipmentTypeSelector from "./pages/ShipmentTypeSelector";
// Tutorials and History pages
import Tutorials from "./pages/Tutorials";
import OrderHistory from "./pages/OrderHistory";
// Additional pages
import TransporteurRegistration from "./pages/TransporteurRegistration";
import LegalDocuments from "./pages/LegalDocuments";
import UnifiedProfile from "./pages/UnifiedProfile";
import ClientProfileComplete from "./pages/ClientProfileComplete";
import ClientWallet from "./pages/ClientWallet";
import MovingRequest from "./pages/MovingRequest";
import MovingConfirmation from "./pages/MovingConfirmation";
import OrderQRCode from "./pages/OrderQRCode";
import PublicTracking from "./pages/PublicTracking";
import DeliveryConfirmation from "./pages/DeliveryConfirmation";
import PublicUserProfile from "./pages/PublicUserProfile";
import AgentDashboard from "./pages/AgentDashboard";
import GPApercuPage from "./pages/gp/GPApercuPage";
import GPKTPGeoTrackPage from "./pages/gp/GPKTPGeoTrackPage";
import GPColisPage from "./pages/gp/GPColisPage";
import GPDistributionPage from "./pages/gp/GPDistributionPage";
import GPMessagesPage from "./pages/gp/GPMessagesPage";
import GPParametresPage from "./pages/gp/GPParametresPage";
import GPWalletPage from "./pages/gp/GPWalletPage";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalNotificationProvider>
        <OfflineIndicator />
        <AppleToaster />
        <Sonner />
        <BrowserRouter>
          <ThemeInitializer />
          <ScrollToTop />
          <SmartScrollTop />
          <ScrollToTopButton />
          <AppleNotificationContainer />
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
            <Route path="/track/:orderId" element={<PublicTracking />} />
            <Route path="/track/user/:userId" element={<PublicUserProfile />} />
            <Route path="/deliver/:orderId" element={<DeliveryConfirmation />} />
            
            {/* ============================================
                CLIENT ROUTES - Dashboard client unifié
            ============================================ */}
            {/* Point d'entrée universel "Envoyer un colis" */}
            <Route path="/envoyer" element={<ShipmentTypeSelector />} />
            <Route path="/demande" element={<DemandeEnvoi />} />
            <Route path="/demande-personnalisee" element={<CustomRequest />} />
            <Route path="/demenagement" element={<MovingRequest />} />
            <Route path="/demenagement/confirmation" element={<MovingConfirmation />} />
            <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
            <Route path="/reservation/gp/:gpId" element={<SmartBookingPage />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/client/dashboard" element={<Navigate to="/profil" replace />} />
            <Route path="/favorites" element={<Navigate to="/favoris" replace />} />
            <Route path="/favoris" element={<Favorites />} />
            <Route path="/favorites/transporters" element={<FavoriteTransporters />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/loyalty" element={<LoyaltyTiersPage />} />
            <Route path="/tutoriels" element={<Tutorials />} />
            <Route path="/historique" element={<OrderHistory />} />
            <Route path="/documents-legaux" element={<LegalDocuments />} />
            <Route path="/profil" element={<UnifiedProfile />} />
            <Route path="/destinataires" element={<Recipients />} />
            <Route path="/scan" element={<ClientScanPage />} />
            <Route path="/profil/complet" element={<ClientProfileComplete />} />
            <Route path="/client/wallet" element={<ClientWallet />} />
            <Route path="/transporteur/inscription" element={<TransporteurRegistration />} />
            <Route path="/order/:orderId/complete" element={<PostBookingForm />} />
            <Route path="/order/:orderId/qrcode" element={<OrderQRCode />} />
            <Route path="/booking/confirmation/:orderId" element={<BookingConfirmation />} />
            
            {/* ============================================
                GP/TRANSPORTER ROUTES - Dashboard transporteur épuré
                /gp/dashboard redirige vers /gp/demandes (page principale)
            ============================================ */}
            <Route path="/gp" element={<GPLanding />} />
            {/* /gp/inscription supprimé - utiliser /transporteur/inscription */}
            <Route path="/gp/bagages/inscription" element={<GPBagagesRegistration />} />
            {/* Redirection: /gp/dashboard → /gp/apercu */}
            <Route path="/gp/dashboard" element={<Navigate to="/gp/apercu" replace />} />
            <Route path="/gp/apercu" element={<GPApercuPage />} />
            <Route path="/gp/colis" element={<GPColisPage />} />
            <Route path="/gp/distribution" element={<GPDistributionPage />} />
            <Route path="/gp/demandes" element={<GPDemandesPage />} />
            <Route path="/gp/en-cours" element={<GPEnCoursPage />} />
            <Route path="/gp/historique" element={<GPHistoriquePage />} />
            <Route path="/gp/calendrier" element={<GPCalendrierPage />} />
            <Route path="/gp/tarification" element={<GPTarificationPage />} />
            <Route path="/gp/scan" element={<GPScanPage />} />
            <Route path="/gp/messages" element={<GPMessagesPage />} />
            <Route path="/gp/parametres" element={<GPParametresPage />} />
            <Route path="/gp/wallet" element={<GPWalletPage />} />
            <Route path="/gp/profil-public" element={<GPProfilPublicPage />} />
            <Route path="/gp/requests" element={<GPCustomRequests />} />
            <Route path="/gp/order/:orderId" element={<GPOrderDetail />} />
            <Route path="/gp/ktp-geotrack" element={<GPKTPGeoTrackPage />} />
            <Route path="/transporter/profile" element={<TransporterProfile />} />
            
            {/* ============================================
                ROUTIER ROUTES - Dashboard transport routier
                Note: Tarification exclue (prix calculé par système)
            ============================================ */}
            <Route path="/routier/inscription" element={<RoutierRegistration />} />
            <Route path="/routier/dashboard" element={<Navigate to="/routier/demandes" replace />} />
            <Route path="/routier/demandes" element={<RoutierDemandesPage />} />
            <Route path="/routier/en-cours" element={<RoutierEnCoursPage />} />
            <Route path="/routier/historique" element={<RoutierHistoriquePage />} />
            <Route path="/routier/vehicules" element={<RoutierVehiculesPage />} />
            <Route path="/routier/profil-public" element={<RoutierProfilPublicPage />} />
            {/* Client-facing routier booking form */}
            <Route path="/routier/demande" element={<RoutierDemandePage />} />
            {/* Legacy redirect - tarification removed for routier */}
            <Route path="/routier/tarification" element={<Navigate to="/routier/demandes" replace />} />
            
            {/* ============================================
                ADMIN ROUTES - Dashboard admin
            ============================================ */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/bureau" element={<Navigate to="/admin" replace />} />
            <Route path="/admin/departures" element={<AdminDepartures />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/gp/:gpId" element={<AdminGPProfile />} />
            <Route path="/admin/order/:orderId" element={<AdminOrderDetail />} />
            <Route path="/admin/messages" element={<AdminMessages />} />
            
            {/* ============================================
                AGENT LOGISTIQUE - Dashboard livreur Konnekt
            ============================================ */}
            <Route path="/agent" element={<AgentDashboard />} />
            
            {/* ============================================
                LEGACY REDIRECTS - Routes obsolètes vers nouvelles
            ============================================ */}
            <Route path="/profile" element={<Navigate to="/profil" replace />} />
            <Route path="/client/profile" element={<Navigate to="/profil" replace />} />
            <Route path="/client/profil" element={<Navigate to="/profil" replace />} />
            <Route path="/demande/personnalisee" element={<Navigate to="/demande-personnalisee" replace />} />
            {/* Legacy redirects for old GP inscription route */}
            
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
