/**
 * useScanEngine — Hook to integrate KonnektScanEngine with React components
 * 
 * Provides:
 * - resolve(): Send scanned data to backend engine
 * - action: Computed frontend action from last resolution
 * - loading state
 * - Error handling with toasts
 * 
 * This hook replaces direct frontend scan logic.
 * The backend decides everything — the frontend only renders.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  KonnektScanEngine,
  type ScanEngineResponse,
  type ScanEngineAction,
} from "@/lib/scanEngine";

interface UseScanEngineOptions {
  onResult?: (response: ScanEngineResponse) => void;
  onAction?: (action: ScanEngineAction) => void;
  autoNavigate?: boolean;
}

export function useScanEngine(options: UseScanEngineOptions = {}) {
  const { autoNavigate = true, onResult, onAction } = options;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<ScanEngineResponse | null>(null);
  const [lastAction, setLastAction] = useState<ScanEngineAction | null>(null);

  const resolve = useCallback(
    async (scannedData: string, role?: string) => {
      setLoading(true);
      try {
        const response = await KonnektScanEngine.resolve(scannedData, role);
        setLastResponse(response);
        onResult?.(response);

        const action = KonnektScanEngine.getAction(response);
        setLastAction(action);
        onAction?.(action);

        // Auto-execute certain actions
        if (autoNavigate) {
          switch (action.type) {
            case "navigate":
              if (action.target) navigate(action.target);
              break;
            case "external":
              if (action.target) window.open(action.target, "_blank");
              break;
            case "toast":
              toast({
                title: action.data?.title || "Scan",
                description: action.data?.description,
                variant: action.data?.variant,
              });
              break;
          }
        }

        return { response, action };
      } catch (err) {
        console.error("Scan engine hook error:", err);
        toast({
          title: "Erreur de scan",
          description: "Impossible de traiter ce scan. Réessayez.",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [navigate, toast, autoNavigate, onResult, onAction]
  );

  const reset = useCallback(() => {
    setLastResponse(null);
    setLastAction(null);
  }, []);

  return {
    resolve,
    reset,
    loading,
    lastResponse,
    lastAction,
    isActionable: lastResponse ? KonnektScanEngine.isActionable(lastResponse) : false,
  };
}
