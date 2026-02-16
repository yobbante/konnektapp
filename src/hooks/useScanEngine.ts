/**
 * useScanEngine — Hook to integrate KonnektScanEngine with React components
 * 
 * Provides:
 * - resolve(): Send scanned data to backend engine
 * - executeAction(): Execute operational action through engine
 * - action: Computed frontend action from last resolution
 * - loading state
 * 
 * ALL scan logic goes through this hook. No direct DB calls.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  KonnektScanEngine,
  type ScanEngineResponse,
  type ScanEngineAction,
  type ExecuteAction,
} from "@/lib/scanEngine";

interface UseScanEngineOptions {
  onResult?: (response: ScanEngineResponse) => void;
  onAction?: (action: ScanEngineAction) => void;
  onExecuted?: (response: ScanEngineResponse) => void;
  autoNavigate?: boolean;
}

export function useScanEngine(options: UseScanEngineOptions = {}) {
  const { autoNavigate = true, onResult, onAction, onExecuted } = options;
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [lastResponse, setLastResponse] = useState<ScanEngineResponse | null>(null);
  const [lastAction, setLastAction] = useState<ScanEngineAction | null>(null);

  const handleAction = useCallback((action: ScanEngineAction) => {
    if (!autoNavigate) return;
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
  }, [navigate, toast, autoNavigate]);

  /**
   * RESOLVE: Scan a QR code and determine next action
   */
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

        handleAction(action);
        return { response, action };
      } catch (err) {
        console.error("Scan engine hook error:", err);
        toast({ title: "Erreur de scan", description: "Impossible de traiter ce scan.", variant: "destructive" });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [handleAction, onResult, onAction, toast]
  );

  /**
   * EXECUTE: Perform an operational action through the engine
   * This replaces ALL direct DB calls in ScanResult components
   */
  const executeAction = useCallback(
    async (action: ExecuteAction, orderId: string, actionData?: Record<string, any>) => {
      setExecuting(true);
      try {
        const response = await KonnektScanEngine.executeAction(action, orderId, actionData);
        setLastResponse(response);

        if (response.status === "executed") {
          toast({ title: response.message });
          onExecuted?.(response);
        } else if (response.status === "failed") {
          toast({ title: "❌ Action échouée", description: response.message, variant: "destructive" });
        }

        return response;
      } catch (err) {
        console.error("Execute action error:", err);
        toast({ title: "Erreur", description: "Impossible d'exécuter l'action.", variant: "destructive" });
        return null;
      } finally {
        setExecuting(false);
      }
    },
    [toast, onExecuted]
  );

  const reset = useCallback(() => {
    setLastResponse(null);
    setLastAction(null);
  }, []);

  return {
    resolve,
    executeAction,
    reset,
    loading,
    executing,
    lastResponse,
    lastAction,
    isActionable: lastResponse ? KonnektScanEngine.isActionable(lastResponse) : false,
  };
}
