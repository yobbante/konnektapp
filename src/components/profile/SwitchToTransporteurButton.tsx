import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface SwitchToTransporteurButtonProps {
  className?: string;
}

export function SwitchToTransporteurButton({ className = "" }: SwitchToTransporteurButtonProps) {
  const navigate = useNavigate();
  const [hasGPProfile, setHasGPProfile] = useState<boolean | null>(null);
  const [gpBusinessName, setGPBusinessName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGPStatus();
  }, []);

  const checkGPStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setHasGPProfile(false);
        setLoading(false);
        return;
      }

      // Check if user has a GP profile
      const { data: gpProfile } = await supabase
        .from("gp_profiles")
        .select("id, business_name, status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (gpProfile) {
        setHasGPProfile(true);
        setGPBusinessName(gpProfile.business_name);
      } else {
        setHasGPProfile(false);
      }
    } catch (error) {
      console.error("Error checking GP status:", error);
      setHasGPProfile(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToTransporteur = () => {
    navigate("/gp/dashboard");
  };

  // Don't render if loading or user doesn't have GP profile
  if (loading || !hasGPProfile) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Button
        onClick={handleSwitchToTransporteur}
        className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-full py-6 text-base font-semibold shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center">
          <Truck className="w-4 h-4" />
        </div>
        <span>Passer en mode Transporteur</span>
        <ArrowRight className="w-5 h-5 ml-auto" />
      </Button>
      
      {gpBusinessName && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Gérer {gpBusinessName}
        </p>
      )}
    </motion.div>
  );
}
