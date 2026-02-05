import { motion } from "framer-motion";
import { CreditCard, Shield, CheckCircle } from "lucide-react";

interface PaymentLoaderProps {
  message?: string;
  subMessage?: string;
}

/**
 * PaymentLoader - Mini loader sophistiqué pour le traitement de paiement
 * Affiche une animation engageante entre le paiement et la confirmation
 */
export function PaymentLoader({ 
  message = "Traitement en cours...",
  subMessage = "Veuillez patienter"
}: PaymentLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center p-8">
        {/* Animated card with shield */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
            style={{ borderTopColor: "hsl(var(--primary))" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          
          {/* Inner pulsing circle */}
          <motion.div
            className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center"
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Credit card icon */}
            <motion.div
              animate={{ 
                y: [0, -4, 0],
              }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <CreditCard className="w-10 h-10 text-primary" />
            </motion.div>
          </motion.div>
          
          {/* Shield overlay */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <Shield className="w-4 h-4 text-white" />
          </motion.div>
        </div>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 1, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        
        {/* Text */}
        <motion.h3
          className="text-lg font-semibold text-foreground mb-1"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {message}
        </motion.h3>
        <p className="text-sm text-muted-foreground">{subMessage}</p>
        
        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3 text-green-500" />
          <span>Transaction sécurisée</span>
        </div>
      </div>
    </div>
  );
}
