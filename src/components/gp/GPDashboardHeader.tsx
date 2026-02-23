import { Link } from "react-router-dom";
import { Bell, Settings, LogOut, Package, Send, ShieldCheck, Star, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GPSendParcelDialog } from "@/components/gp/GPSendParcelDialog";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { GPKYCBadge, getGPDisplayStatus } from "@/components/gp/GPKYCBadge";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GPDashboardHeaderProps {
  gpProfile: {
    id: string;
    user_id: string;
    business_name: string;
    gp_type: string;
    subscription: string;
    base_origin_city?: string | null;
    base_origin_country?: string | null;
    status?: string;
    kyc_level?: number;
    kyc_status?: string;
    rating?: number | null;
    total_deliveries?: number | null;
    id_document_url?: string | null;
    business_registration_url?: string | null;
    transport_license_url?: string | null;
    selfie_url?: string | null;
  };
  onSignOut: () => void;
}

/** Returns true only if ALL required documents are uploaded */
function isFullyVerified(profile: GPDashboardHeaderProps["gpProfile"]): boolean {
  return !!(
    profile.status === "verified" &&
    profile.id_document_url &&
    profile.selfie_url
  );
}

export function GPDashboardHeader({ gpProfile, onSignOut }: GPDashboardHeaderProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const navigate = useNavigate();

  const verified = isFullyVerified(gpProfile);
  const displayStatus = getGPDisplayStatus(
    verified ? "verified" : (gpProfile.status || "pending"),
    gpProfile.kyc_level || 0
  );
  const gpTypeLabel = gpProfile.gp_type === "bagages_international" 
    ? "GP Bagages" 
    : gpProfile.gp_type === "routier" 
      ? "Routier" 
      : gpProfile.gp_type;

  return (
    <>
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/60">
        <div className="container">
          <div className="flex items-center justify-between h-14">
            {/* Logo + Name + Badge */}
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <Package className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-foreground leading-tight truncate">
                    {gpProfile.business_name}
                  </span>
                  {verified && (
                    <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{gpTypeLabel}</span>
                  {gpProfile.rating && gpProfile.rating > 0 && (
                    <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-amber-500" />
                      {gpProfile.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5">
              {/* Self-Ship CTA */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowSendDialog(true)}
                className="hidden md:flex gap-1.5 text-xs h-8 text-primary hover:bg-primary/10"
              >
                <Send className="w-3.5 h-3.5" />
                Envoyer
              </Button>

              {/* Scan shortcut */}
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9"
                onClick={() => navigate("/gp/scan")}
              >
                <ScanLine className="w-4.5 h-4.5 text-primary" />
              </Button>

              {/* Notifications */}
              <NotificationBell />

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm",
                      verified 
                        ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30" 
                        : "bg-secondary text-secondary-foreground"
                    )}>
                      {gpProfile.business_name.charAt(0)}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <div className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{gpProfile.business_name}</p>
                      <GPKYCBadge status={displayStatus} kycLevel={gpProfile.kyc_level || 0} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{gpTypeLabel}</p>
                    {gpProfile.total_deliveries && gpProfile.total_deliveries > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {gpProfile.total_deliveries} livraison{gpProfile.total_deliveries > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSendDialog(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer un colis
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/gp/parametres" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onSignOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <GPSendParcelDialog 
        open={showSendDialog} 
        onOpenChange={setShowSendDialog} 
        gpProfile={gpProfile} 
      />
    </>
  );
}
