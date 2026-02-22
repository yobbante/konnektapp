/**
 * ClientScanPage V2 — Uses UnifiedScanInterface
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedScanInterface } from "@/components/scan/UnifiedScanInterface";

const BG_GRADIENT = "linear-gradient(180deg, #0F1923 0%, #15232F 50%, #1A2B3A 100%)";

export default function ClientScanPage() {
  const navigate = useNavigate();
  const [clientContext, setClientContext] = useState<{
    userId: string;
    fullName: string | null;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      setClientContext({
        userId: user.id,
        fullName: profile?.full_name || null,
      });
    };
    load();
  }, []);

  if (!clientContext) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG_GRADIENT }}>
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG_GRADIENT }}>
      <UnifiedScanInterface
        role="client"
        clientContext={clientContext}
      />
    </div>
  );
}
