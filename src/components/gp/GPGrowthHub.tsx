/**
 * GPGrowthHub — Referral system, sharing CTA, ambassador program
 * Shown on GP dashboard to drive organic client acquisition
 */
import { useState, useEffect } from "react";
import { Copy, Check, Share2, Users, Trophy, Gift, ExternalLink, MessageCircle, Send, TrendingUp, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SuperGPBadge } from "./SuperGPBadge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface GPGrowthHubProps {
  gpId: string;
  gpName: string;
}

export function GPGrowthHub({ gpId, gpName }: GPGrowthHubProps) {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, totalBonus: 0 });
  const [levelData, setLevelData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadGrowthData();
  }, [gpId]);

  const loadGrowthData = async () => {
    const [refRes, levelRes] = await Promise.all([
      supabase.from("gp_referrals").select("*").eq("gp_id", gpId).maybeSingle(),
      supabase.from("gp_levels").select("*").eq("gp_id", gpId).maybeSingle(),
    ]);

    if (refRes.data) {
      setReferralCode(refRes.data.referral_code);
      setReferralStats({
        totalReferrals: refRes.data.total_referrals || 0,
        totalBonus: refRes.data.total_bonus_earned || 0,
      });
    } else {
      // Auto-create if missing
      const code = "KKT-" + gpId.substring(0, 8).toUpperCase();
      await supabase.from("gp_referrals").insert({ gp_id: gpId, referral_code: code });
      setReferralCode(code);
    }

    if (levelRes.data) {
      setLevelData(levelRes.data);
    } else {
      await supabase.from("gp_levels").insert({ gp_id: gpId });
      setLevelData({ current_level: 0, level_name: "Débutant", total_missions: 0, next_level_threshold: 10, badges: [] });
    }
  };

  const referralUrl = `${window.location.origin}/inscription?ref=${referralCode}`;
  const profileUrl = `${window.location.origin}/client/transporteurs/${gpId}`;

  const handleCopyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast({ title: "Lien copié !", description: "Partagez-le pour gagner des bonus" });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const handleShareReferral = async () => {
    const text = `Envoyez vos colis avec moi sur Konnekt ! Inscrivez-vous avec mon lien et bénéficiez d'avantages exclusifs.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${gpName} sur Konnekt`, text, url: referralUrl });
      } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + referralUrl)}`, "_blank");
    }
  };

  const handleShareProfile = () => {
    const text = `Découvrez mon profil sur Konnekt — Transport sécurisé de colis`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + profileUrl)}`, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Level Card */}
      {levelData && (
        <SuperGPBadge
          level={levelData.current_level}
          levelName={levelData.level_name}
          totalMissions={levelData.total_missions}
          nextThreshold={levelData.next_level_threshold}
          badges={levelData.badges || []}
        />
      )}

      {/* Referral Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Gift className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Parrainage</p>
              <p className="text-[10px] text-muted-foreground">Gagnez 5% de bonus par client référé</p>
            </div>
          </div>

          {/* Referral Code */}
          {referralCode && (
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-muted font-mono text-sm font-bold text-center tracking-wider">
                {referralCode}
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleCopyReferral}>
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-primary">{referralStats.totalReferrals}</p>
              <p className="text-[10px] text-muted-foreground">Clients référés</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-accent">{referralStats.totalBonus.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Bonus gagnés (FCFA)</p>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-9 text-xs gap-1.5" onClick={handleShareReferral}>
              <Share2 className="w-3.5 h-3.5" />
              Partager mon lien
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleShareProfile}>
              <ExternalLink className="w-3.5 h-3.5" />
              Mon profil
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Share Actions */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <p className="text-xs font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            Devenez micro-agent Konnekt
          </p>
          <p className="text-[10px] text-muted-foreground">
            Partagez vos trajets sur vos groupes Facebook, WhatsApp, Instagram pour attirer plus de clients.
          </p>
          <div className="grid grid-cols-3 gap-2">
            <ShareChannelButton icon={MessageCircle} label="WhatsApp" color="bg-green-500" onClick={() => {
              window.open(`https://wa.me/?text=${encodeURIComponent(`Je transporte vos colis avec Konnekt ! Voir mon profil : ${profileUrl}`)}`, "_blank");
            }} />
            <ShareChannelButton icon={Share2} label="Facebook" color="bg-blue-600" onClick={() => {
              window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank");
            }} />
            <ShareChannelButton icon={Send} label="Telegram" color="bg-sky-500" onClick={() => {
              window.open(`https://t.me/share/url?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent("Transport de colis avec Konnekt")}`, "_blank");
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Ambassador Teaser */}
      {levelData && levelData.current_level >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  <Star className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">Programme Ambassadeur</p>
                  <p className="text-[10px] text-muted-foreground">
                    En tant que Super GP, vous êtes éligible au programme ambassadeur. Commission réduite + bonus par client.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function ShareChannelButton({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex flex-col items-center gap-1 p-2 rounded-xl text-white transition-all active:scale-95", color)}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
