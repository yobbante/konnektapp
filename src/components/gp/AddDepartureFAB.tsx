import { motion } from "framer-motion";
import { Plus, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddDepartureFABProps {
  onClick: () => void;
}

export function AddDepartureFAB({ onClick }: AddDepartureFABProps) {
  return (
    <motion.div
      className="fixed bottom-24 right-4 z-40"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
    >
      <Button
        onClick={onClick}
        size="lg"
        className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 hover:scale-110 transition-transform"
      >
        <motion.div
          animate={{ rotate: [0, 90, 0] }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </Button>
      
      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        className="absolute right-16 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg"
      >
        <div className="flex items-center gap-1.5">
          <Plane className="w-3 h-3" />
          Nouveau voyage
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-foreground" />
      </motion.div>
    </motion.div>
  );
}
