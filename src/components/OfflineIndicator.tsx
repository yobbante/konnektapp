import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, Cloud, CloudOff } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { Button } from "@/components/ui/button";
import { MiniLoader } from "@/components/ui/MiniLoader";

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingChanges, syncPendingChanges } = useOfflineSync();

  return (
    <AnimatePresence>
      {/* Offline Banner */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium"
          style={{ paddingTop: "calc(8px + var(--safe-top, 0px))" }}
        >
          <WifiOff className="w-4 h-4" />
          Mode hors-ligne - Les modifications seront synchronisées automatiquement
        </motion.div>
      )}

      {/* Syncing indicator */}
      {isSyncing && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-primary text-primary-foreground py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium"
          style={{ paddingTop: "calc(8px + var(--safe-top, 0px))" }}
        >
          <MiniLoader size="xs" className="text-primary-foreground" />
          Synchronisation en cours...
        </motion.div>
      )}

      {/* Pending changes indicator (when online but has pending) */}
      {isOnline && !isSyncing && pendingChanges > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="fixed bottom-24 left-4 z-50"
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={syncPendingChanges}
            className="shadow-lg rounded-full"
          >
            <Cloud className="w-4 h-4 mr-2" />
            {pendingChanges} en attente
            <RefreshCw className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Small status indicator for headers/nav
export function OnlineStatusBadge() {
  const { isOnline, pendingChanges } = useOfflineSync();

  if (isOnline && pendingChanges === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`w-2 h-2 rounded-full ${
        isOnline ? "bg-warning" : "bg-destructive"
      }`}
      title={isOnline ? `${pendingChanges} modifications en attente` : "Hors ligne"}
    />
  );
}
