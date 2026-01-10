import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwitchToClientButtonProps {
  className?: string;
  variant?: "dark" | "light";
}

export function SwitchToClientButton({ className = "", variant = "dark" }: SwitchToClientButtonProps) {
  const navigate = useNavigate();

  const handleSwitchToClient = () => {
    navigate("/profile");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Button
        onClick={handleSwitchToClient}
        className={`w-full rounded-full py-6 text-base font-semibold shadow-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] ${
          variant === "dark" 
            ? "bg-foreground text-background hover:bg-foreground/90" 
            : "bg-white text-foreground hover:bg-white/90 border border-border"
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          variant === "dark" ? "bg-background/20" : "bg-foreground/10"
        }`}>
          <User className="w-4 h-4" />
        </div>
        <span>Passer en mode Client</span>
        <ArrowRight className="w-5 h-5 ml-auto" />
      </Button>
      
      <p className="text-xs text-muted-foreground text-center mt-2">
        Accéder à votre espace personnel
      </p>
    </motion.div>
  );
}
