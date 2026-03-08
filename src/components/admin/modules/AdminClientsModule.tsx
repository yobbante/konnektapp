/**
 * Admin Clients Module — Client management & loyalty
 */
import { useState, useEffect, useMemo } from "react";
import { Users, Search, Star, Wallet, Crown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function AdminClientsModule() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [profilesRes, walletsRes, loyaltyRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("client_wallets").select("*").order("available_balance", { ascending: false }),
      supabase.from("client_loyalty").select("*, tier:loyalty_tiers(name, color)").order("total_orders", { ascending: false }),
    ]);
    setProfiles(profilesRes.data || []);
    setWallets(walletsRes.data || []);
    setLoyalty(loyaltyRes.data || []);
    setLoading(false);
  };

  const totalClients = profiles.filter(p => !p.is_gp).length;
  const totalWalletBalance = wallets.reduce((s, w) => s + (w.available_balance || 0), 0);
  const totalEscrow = wallets.reduce((s, w) => s + (w.escrow_balance || 0), 0);
  const loyaltyMembers = loyalty.length;

  const filtered = useMemo(() => {
    if (!search) return profiles.slice(0, 50);
    const q = search.toLowerCase();
    return profiles.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [profiles, search]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <Users className="w-5 h-5 text-pink-500" />
        Clients
        <Badge variant="secondary" className="text-xs">{totalClients}</Badge>
      </h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border bg-card">
          <p className="text-xs text-muted-foreground">Clients inscrits</p>
          <p className="text-xl font-bold">{totalClients}</p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Wallet className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Solde wallets</span>
          </div>
          <p className="text-xl font-bold">{(totalWalletBalance / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Crown className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">Membres fidélité</span>
          </div>
          <p className="text-xl font-bold">{loyaltyMembers}</p>
        </div>
        <div className="p-3 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-0.5">
            <TrendingUp className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-muted-foreground">Escrow clients</span>
          </div>
          <p className="text-xl font-bold">{(totalEscrow / 1000).toFixed(0)}k <span className="text-xs font-normal text-muted-foreground">FCFA</span></p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          filtered.map(client => {
            const wallet = wallets.find(w => w.user_id === client.user_id);
            const loy = loyalty.find(l => l.user_id === client.user_id);
            return (
              <div key={client.id} className="p-3 rounded-xl border bg-card hover:shadow-sm transition-all">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{client.full_name || "Sans nom"}</span>
                    {client.is_gp && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300">GP</span>
                    )}
                    {loy?.tier?.name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                        {loy.tier.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">KYC {client.kyc_level}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                  <span>{client.email || "—"}</span>
                  <span>{client.phone || "—"}</span>
                  <span>{client.city || "—"}, {client.country_code || "—"}</span>
                  {wallet && <span className="font-medium text-foreground">{wallet.available_balance?.toLocaleString()} FCFA</span>}
                </div>
                {loy && (
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span>{loy.total_orders} commandes</span>
                    <span>{loy.total_points} pts</span>
                    <span>Dépensé: {loy.total_spent?.toLocaleString()} FCFA</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
