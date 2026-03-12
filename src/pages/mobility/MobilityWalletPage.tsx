/**
 * MobilityWalletPage — Wallet for mobility partners
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bus, Wallet, TrendingUp, ArrowDownRight, ArrowUpRight,
  ChevronLeft, Clock, CheckCircle, CreditCard, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { MiniLoader } from "@/components/ui/MiniLoader";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function MobilityWalletPage() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: mp } = await supabase.from("mobility_profiles")
      .select("*").eq("user_id", user.id).maybeSingle();
    if (!mp) { navigate("/mobility/inscription"); return; }
    setProfile(mp);

    const [walletRes, txRes, bookingsRes] = await Promise.all([
      supabase.from("mobility_wallets").select("*").eq("mobility_profile_id", mp.id).maybeSingle(),
      supabase.from("mobility_transactions").select("*")
        .eq("wallet_id", (await supabase.from("mobility_wallets").select("id").eq("mobility_profile_id", mp.id).maybeSingle()).data?.id || "00000000-0000-0000-0000-000000000000")
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("mobility_bookings").select("booking_number, total_price, commission_amount, currency, status, created_at, origin_city, destination_city, passenger_count")
        .eq("mobility_profile_id", mp.id)
        .order("created_at", { ascending: false }).limit(20),
    ]);

    setWallet(walletRes.data);
    setTransactions(txRes.data || []);
    setBookings(bookingsRes.data || []);
    setLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><MiniLoader /></div>;

  const currency = wallet?.currency || profile?.default_currency || "XOF";
  const fmt = (n: number) => (n || 0).toLocaleString() + " " + currency;

  // Calculate from bookings if wallet empty
  const totalFromBookings = bookings.reduce((s, b) => s + (b.total_price || 0), 0);
  const totalCommission = bookings.reduce((s, b) => s + (b.commission_amount || 0), 0);
  const netRevenue = totalFromBookings - totalCommission;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-transport-mobility text-white">
        <div className="px-4 pt-safe">
          <div className="flex items-center gap-3 py-3">
            <button onClick={() => navigate("/mobility/apercu")} className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[15px] font-bold">Portefeuille</h1>
              <p className="text-[11px] opacity-80">{profile?.business_name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Balance Card */}
        <Card className="border-transport-mobility/20 overflow-hidden">
          <div className="bg-gradient-to-br from-transport-mobility/5 to-transport-mobility/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-transport-mobility" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solde disponible</span>
            </div>
            <p className="text-3xl font-bold">{fmt(wallet?.balance || netRevenue)}</p>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">En attente</p>
                <p className="text-sm font-semibold">{fmt(wallet?.pending_balance || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total gagné</p>
                <p className="text-sm font-semibold text-emerald-600">{fmt(wallet?.total_earned || totalFromBookings)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Retiré</p>
                <p className="text-sm font-semibold">{fmt(wallet?.total_withdrawn || 0)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Commission Info */}
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-transport-mobility" />
              <div>
                <p className="text-xs font-medium">Commission Konnekt</p>
                <p className="text-[10px] text-muted-foreground">{wallet?.commission_rate || 8}% par réservation</p>
              </div>
            </div>
            <Badge className="bg-transport-mobility/10 text-transport-mobility border-0 text-[10px]">
              {fmt(totalCommission)} déduit
            </Badge>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
              <p className="text-lg font-bold">{bookings.length}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Réservations</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Bus className="w-4 h-4 mx-auto text-transport-mobility mb-1" />
              <p className="text-lg font-bold">{fmt(netRevenue)}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Net perçu</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Bookings as Transactions */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Dernières réservations
          </h2>
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground text-sm">
                Aucune transaction
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings.map(b => (
                <Card key={b.booking_number}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        b.status === "confirmed" || b.status === "completed" ? "bg-emerald-500/10" : "bg-amber-500/10"
                      }`}>
                        {b.status === "confirmed" || b.status === "completed" ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{b.origin_city} → {b.destination_city}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.passenger_count} passager(s) · {format(new Date(b.created_at), "dd MMM", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+{(b.total_price - (b.commission_amount || 0)).toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">{currency}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Withdrawal button */}
        <Button
          variant="outline"
          className="w-full border-transport-mobility/30 text-transport-mobility hover:bg-transport-mobility/10"
          onClick={() => {
            import("@/components/ui/use-toast").then(({ toast }) => {
              toast({ title: "Retrait", description: "Fonctionnalité bientôt disponible" });
            });
          }}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" /> Demander un retrait
        </Button>
      </div>
    </div>
  );
}
