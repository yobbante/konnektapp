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
// OfflineIndicator removed — app-like experience, no PWA indicators
import { RoleSwitchPopup } from "@/components/profile/RoleSwitchPopup";
import { DeliveryCodePopup } from "@/components/notifications/DeliveryCodePopup";
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
import GPDepartDetailPage from "./pages/gp/GPDepartDetailPage";
import GPTarificationPage from "./pages/gp/GPTarificationPage";
import GPRestrictionsPage from "./pages/gp/GPRestrictionsPage";
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
import ReservationsPage from "./pages/ReservationsPage";
// Routier pages
import RoutierApercuPage from "./pages/routier/RoutierApercuPage";
import RoutierDemandesPage from "./pages/routier/RoutierDemandesPage";
import RoutierEnCoursPage from "./pages/routier/RoutierEnCoursPage";
import RoutierHistoriquePage from "./pages/routier/RoutierHistoriquePage";
import RoutierVehiculesPage from "./pages/routier/RoutierVehiculesPage";
import RoutierTarificationPage from "./pages/routier/RoutierTarificationPage";
import RoutierProfilPublicPage from "./pages/routier/RoutierProfilPublicPage";
import RoutierDemandePage from "./pages/routier/RoutierDemandePage";
import RoutierMissionRequestPage from "./pages/routier/RoutierMissionRequestPage";
import RoutierMissionDetailPage from "./pages/routier/RoutierMissionDetailPage";
import RoutierWalletPage from "./pages/routier/RoutierWalletPage";
import RoutierParametresPage from "./pages/routier/RoutierParametresPage";
import RoutierPremiumPage from "./pages/routier/RoutierPremiumPage";
import RoutierPerformancesPage from "./pages/routier/RoutierPerformancesPage";
import RoutierAutoAcceptPage from "./pages/routier/RoutierAutoAcceptPage";
import RoutierPublierPage from "./pages/routier/RoutierPublierPage";
import RoutierMessagesPage from "./pages/routier/RoutierMessagesPage";
// RoutierCartePage removed — merged into RoutierApercuPage
import RoutierMissionDetailTransporteurPage from "./pages/routier/RoutierMissionDetailTransporteurPage";
import RoutierNegotiationsPage from "./pages/routier/RoutierNegotiationsPage";
import RoutierBookingPage from "./pages/routier/RoutierBookingPage";
import RoutierOrderQRPage from "./pages/routier/RoutierOrderQRPage";
// Maritime pages
import MaritimeApercuPage from "./pages/maritime/MaritimeApercuPage";
import MaritimePublierPage from "./pages/maritime/MaritimePublierPage";
import MaritimeParametresPage from "./pages/maritime/MaritimeParametresPage";
import MaritimeRegistration from "./pages/maritime/MaritimeRegistration";
import MaritimeWalletPage from "./pages/maritime/MaritimeWalletPage";
import MaritimePremiumPage from "./pages/maritime/MaritimePremiumPage";
import MaritimeDemandesPage from "./pages/maritime/MaritimeDemandesPage";
import MaritimeBookingPage from "./pages/maritime/MaritimeBookingPage";
import MaritimeMissionRequestPage from "./pages/maritime/MaritimeMissionRequestPage";
// Aérien pages
import AerienApercuPage from "./pages/aerien/AerienApercuPage";
import AerienPublierPage from "./pages/aerien/AerienPublierPage";
import AerienDemandeFretPage from "./pages/aerien/AerienDemandeFretPage";
import AerienRegistration from "./pages/aerien/AerienRegistration";
import AerienWalletPage from "./pages/aerien/AerienWalletPage";
import AerienPremiumPage from "./pages/aerien/AerienPremiumPage";
import AerienParametresPage from "./pages/aerien/AerienParametresPage";
// Mobility pages
import MobilityRegistration from "./pages/mobility/MobilityRegistration";
import MobilityApercuPage from "./pages/mobility/MobilityApercuPage";
import MobilityPublierPage from "./pages/mobility/MobilityPublierPage";
import MobilityBookingPage from "./pages/mobility/MobilityBookingPage";
import MobilitySearchResults from "./pages/mobility/MobilitySearchResults";
import MobilityTicketPage from "./pages/mobility/MobilityTicketPage";
import MobilityScanTicketPage from "./pages/mobility/MobilityScanTicketPage";
import MobilityParametresPage from "./pages/mobility/MobilityParametresPage";
import MobilityWalletPage from "./pages/mobility/MobilityWalletPage";
// Coursier pages
import CoursierRegistration from "./pages/coursier/CoursierRegistration";
// Agence pages
import AgenceRegistration from "./pages/agence/AgenceRegistration";
// Universal shipment entry
import ShipmentTypeSelector from "./pages/ShipmentTypeSelector";
// Tutorials and History pages
import TutorialEngine from "./pages/TutorialEngine";
import OrderHistory from "./pages/OrderHistory";
// Additional pages
import TransporteurRegistration from "./pages/TransporteurRegistration";
import LegalDocuments from "./pages/LegalDocuments";
import FreightMarketplace from "./pages/FreightMarketplace";
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
import PaySupplement from "./pages/PaySupplement";
import ConfirmReception from "./pages/ConfirmReception";
import InsurancePage from "./pages/InsurancePage";
import GPApercuPage from "./pages/gp/GPApercuPage";
import GPKTPGeoTrackPage from "./pages/gp/GPKTPGeoTrackPage";
import GPColisPage from "./pages/gp/GPColisPage";
import GPDistributionPage from "./pages/gp/GPDistributionPage";
import GPMessagesPage from "./pages/gp/GPMessagesPage";
import GPParametresPage from "./pages/gp/GPParametresPage";
import GPWalletPage from "./pages/gp/GPWalletPage";
import GPPerformancesPage from "./pages/gp/GPPerformancesPage";
import GPPremiumPage from "./pages/gp/GPPremiumPage";
import GPAutoAcceptPage from "./pages/gp/GPAutoAcceptPage";
import GPFacturationPage from "./pages/gp/GPFacturationPage";
import GPNavettesPage from "./pages/gp/GPNavettesPage";
import AideFAQPage from "./pages/AideFAQPage";
import CGUPage from "./pages/CGUPage";
import AProposPage from "./pages/AProposPage";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalNotificationProvider>
        {/* OfflineIndicator removed for app-like feel */}
        <AppleToaster />
        <Sonner />
        <BrowserRouter>
          <ThemeInitializer />
          <ScrollToTop />
          <SmartScrollTop />
          <ScrollToTopButton />
          <AppleNotificationContainer />
          <RoleSwitchPopup />
          <DeliveryCodePopup />
          <AuthGuard>
          <Routes>
            {/* ============================================
                PUBLIC ROUTES - Accessibles sans authentification
            ============================================ */}
            <Route path="/" element={<Index />} />
            <Route path="/offres" element={<Offres />} />
            <Route path="/offres/:id" element={<OfferDetail />} />
            <Route path="/freight-board" element={<FreightMarketplace />} />
            <Route path="/tracking" element={<Tracking />} />
            <Route path="/gp/:gpId" element={<GPProfile />} />
            <Route path="/client/transporteurs/:gpId" element={<ClientTransporterProfile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/install" element={<Navigate to="/" replace />} />
            <Route path="/track/:orderId" element={<PublicTracking />} />
            <Route path="/track/user/:userId" element={<PublicUserProfile />} />
            <Route path="/deliver/:orderId" element={<DeliveryConfirmation />} />
            {/* Legacy redirect for old public-tracking URLs */}
            <Route path="/public-tracking/:orderId" element={<PublicTracking />} />
            
            {/* ============================================
                CLIENT ROUTES - Dashboard client unifié
            ============================================ */}
            {/* Point d'entrée universel "Envoyer un colis" */}
            <Route path="/envoyer" element={<ShipmentTypeSelector />} />
            <Route path="/demande" element={<DemandeEnvoi />} />
            <Route path="/demande-personnalisee" element={<Navigate to="/" replace />} />
            <Route path="/demenagement" element={<Navigate to="/" replace />} />
            <Route path="/demenagement/confirmation" element={<Navigate to="/" replace />} />
            <Route path="/quote-confirmation" element={<QuoteConfirmation />} />
            <Route path="/reservation/gp/:gpId" element={<SmartBookingPage />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/reservations" element={<ReservationsPage />} />
            <Route path="/client/dashboard" element={<Navigate to="/profil" replace />} />
            <Route path="/favorites" element={<Navigate to="/favoris" replace />} />
            <Route path="/favoris" element={<Favorites />} />
            <Route path="/favorites/transporters" element={<FavoriteTransporters />} />
            <Route path="/saved-searches" element={<SavedSearches />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/loyalty" element={<LoyaltyTiersPage />} />
            <Route path="/tutoriels" element={<TutorialEngine />} />
            <Route path="/historique" element={<OrderHistory />} />
            <Route path="/documents-legaux" element={<LegalDocuments />} />
            <Route path="/profil" element={<UnifiedProfile />} />
            <Route path="/destinataires" element={<Recipients />} />
            <Route path="/scan" element={<ClientScanPage />} />
            <Route path="/profil/complet" element={<ClientProfileComplete />} />
            <Route path="/client/wallet" element={<ClientWallet />} />
            <Route path="/transporteur/inscription" element={<TransporteurRegistration />} />
            <Route path="/payer-supplement" element={<PaySupplement />} />
            <Route path="/confirmer-reception" element={<ConfirmReception />} />
            <Route path="/assurance" element={<InsurancePage />} />
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
            <Route path="/gp/depart/:id" element={<GPDepartDetailPage />} />
            <Route path="/gp/tarification" element={<GPTarificationPage />} />
            <Route path="/gp/restrictions" element={<GPRestrictionsPage />} />
            <Route path="/gp/scan" element={<GPScanPage />} />
            <Route path="/gp/messages" element={<GPMessagesPage />} />
            <Route path="/gp/parametres" element={<GPParametresPage />} />
            <Route path="/gp/wallet" element={<GPWalletPage />} />
            <Route path="/gp/profil-public" element={<GPProfilPublicPage />} />
            <Route path="/gp/requests" element={<GPCustomRequests />} />
            <Route path="/gp/order/:orderId" element={<GPOrderDetail />} />
            <Route path="/gp/ktp-geotrack" element={<GPKTPGeoTrackPage />} />
            <Route path="/gp/performances" element={<GPPerformancesPage />} />
            <Route path="/gp/premium" element={<GPPremiumPage />} />
            <Route path="/gp/auto-accept" element={<GPAutoAcceptPage />} />
            <Route path="/gp/facturation" element={<GPFacturationPage />} />
            <Route path="/gp/navettes" element={<GPNavettesPage />} />
            <Route path="/aide" element={<AideFAQPage />} />
            <Route path="/cgu" element={<CGUPage />} />
            <Route path="/a-propos" element={<AProposPage />} />
            <Route path="/transporter/profile" element={<TransporterProfile />} />
            
            {/* ============================================
                ROUTIER ROUTES - Dashboard transport routier
                Note: Tarification exclue (prix calculé par système)
            ============================================ */}
            <Route path="/routier/inscription" element={<RoutierRegistration />} />
            <Route path="/routier/dashboard" element={<Navigate to="/routier/apercu" replace />} />
            <Route path="/routier/apercu" element={<RoutierApercuPage />} />
            <Route path="/routier/demandes" element={<RoutierDemandesPage />} />
            <Route path="/routier/en-cours" element={<RoutierEnCoursPage />} />
            <Route path="/routier/historique" element={<RoutierHistoriquePage />} />
            <Route path="/routier/vehicules" element={<RoutierVehiculesPage />} />
            <Route path="/routier/profil-public" element={<RoutierProfilPublicPage />} />
            <Route path="/routier/wallet" element={<RoutierWalletPage />} />
            <Route path="/routier/parametres" element={<RoutierParametresPage />} />
            <Route path="/routier/premium" element={<RoutierPremiumPage />} />
            <Route path="/routier/performances" element={<RoutierPerformancesPage />} />
            <Route path="/routier/auto-accept" element={<RoutierAutoAcceptPage />} />
            <Route path="/routier/publier" element={<RoutierPublierPage />} />
            <Route path="/routier/messages" element={<RoutierMessagesPage />} />
            <Route path="/routier/carte" element={<Navigate to="/routier/apercu" replace />} />
            <Route path="/routier/detail-mission/:id" element={<RoutierMissionDetailTransporteurPage />} />
            <Route path="/routier/negotiations" element={<RoutierNegotiationsPage />} />
            {/* Client-facing routier */}
            <Route path="/routier/recherche" element={<Navigate to="/offres?type=routier" replace />} />
            <Route path="/routier/resultats" element={<Navigate to="/offres?type=routier" replace />} />
            <Route path="/routier/mission/:id" element={<RoutierMissionDetailPage />} />
            <Route path="/routier/mission" element={<RoutierMissionRequestPage />} />
            <Route path="/routier/demande" element={<Navigate to="/offres?type=routier" replace />} />
            <Route path="/routier/reserver" element={<RoutierBookingPage />} />
            <Route path="/routier/order-qr" element={<RoutierOrderQRPage />} />
            <Route path="/routier/tarification" element={<Navigate to="/routier/apercu" replace />} />
            
            {/* ============================================
                MARITIME ROUTES - Dashboard fret maritime
            ============================================ */}
            <Route path="/maritime/inscription" element={<MaritimeRegistration />} />
            <Route path="/maritime/dashboard" element={<Navigate to="/maritime/apercu" replace />} />
            <Route path="/maritime/apercu" element={<MaritimeApercuPage />} />
            <Route path="/maritime/publier" element={<MaritimePublierPage />} />
            <Route path="/maritime/parametres" element={<MaritimeParametresPage />} />
            <Route path="/maritime/demandes" element={<MaritimeApercuPage />} />
            <Route path="/maritime/en-cours" element={<MaritimeApercuPage />} />
            <Route path="/maritime/historique" element={<MaritimeApercuPage />} />
            <Route path="/maritime/wallet" element={<MaritimeWalletPage />} />
            <Route path="/maritime/premium" element={<MaritimePremiumPage />} />
            <Route path="/maritime/profil-public" element={<MaritimeApercuPage />} />
            <Route path="/maritime/messages" element={<Navigate to="/messages" replace />} />
            <Route path="/maritime/demande" element={<MaritimeApercuPage />} />
            
            {/* ============================================
                AÉRIEN ROUTES - Dashboard fret aérien
            ============================================ */}
            <Route path="/aerien/inscription" element={<AerienRegistration />} />
            <Route path="/aerien/dashboard" element={<Navigate to="/aerien/apercu" replace />} />
            <Route path="/aerien/apercu" element={<AerienApercuPage />} />
            <Route path="/aerien/publier" element={<AerienPublierPage />} />
            <Route path="/aerien/demande-fret" element={<AerienDemandeFretPage />} />
            <Route path="/aerien/demande" element={<AerienApercuPage />} />
            <Route path="/aerien/demandes" element={<AerienApercuPage />} />
            <Route path="/aerien/en-cours" element={<AerienApercuPage />} />
            <Route path="/aerien/historique" element={<AerienApercuPage />} />
            <Route path="/aerien/wallet" element={<AerienWalletPage />} />
            <Route path="/aerien/profil-public" element={<AerienApercuPage />} />
            <Route path="/aerien/marketplace" element={<AerienApercuPage />} />
            <Route path="/aerien/parametres" element={<AerienParametresPage />} />
            <Route path="/aerien/premium" element={<AerienPremiumPage />} />
            <Route path="/aerien/messages" element={<Navigate to="/messages" replace />} />
            
            {/* ============================================
                COURSIER ROUTES - Livraison express locale
            ============================================ */}
            <Route path="/coursier/inscription" element={<CoursierRegistration />} />
            
            {/* ============================================
                AGENCE ROUTES - Transitaire & logistique
            ============================================ */}
            <Route path="/agence/inscription" element={<AgenceRegistration />} />
            
            {/* ============================================
                MOBILITY ROUTES - Transport de personnes
            ============================================ */}
            <Route path="/mobility/inscription" element={<MobilityRegistration />} />
            <Route path="/mobility/dashboard" element={<Navigate to="/mobility/apercu" replace />} />
            <Route path="/mobility/apercu" element={<MobilityApercuPage />} />
            <Route path="/mobility/publier" element={<MobilityPublierPage />} />
            <Route path="/mobility/reserver" element={<MobilityBookingPage />} />
            <Route path="/mobility/recherche" element={<MobilitySearchResults />} />
            <Route path="/mobility/ticket" element={<MobilityTicketPage />} />
            <Route path="/mobility/scan-ticket" element={<MobilityScanTicketPage />} />
            <Route path="/mobility/parametres" element={<MobilityParametresPage />} />
            <Route path="/mobility/wallet" element={<MobilityWalletPage />} />
            <Route path="/mobility/vehicules" element={<MobilityApercuPage />} />
            
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
            <Route path="/gp/inscription" element={<Navigate to="/transporteur/inscription" replace />} />
            
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
