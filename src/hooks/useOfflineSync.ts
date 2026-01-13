import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SyncQueueItem {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
}

const SYNC_QUEUE_KEY = "yobbante_offline_sync_queue";
const OFFLINE_DATA_KEY = "yobbante_offline_data";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<number>(0);
  const { toast } = useToast();
  const syncInProgress = useRef(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "✅ Connexion rétablie",
        description: "Synchronisation des données en cours...",
      });
      syncPendingChanges();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "📴 Mode hors-ligne",
        description: "Vos modifications seront synchronisées automatiquement",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load pending changes count on mount
    const queue = getSyncQueue();
    setPendingChanges(queue.length);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Get sync queue from localStorage
  const getSyncQueue = useCallback((): SyncQueueItem[] => {
    try {
      const queue = localStorage.getItem(SYNC_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch {
      return [];
    }
  }, []);

  // Save sync queue to localStorage
  const saveSyncQueue = useCallback((queue: SyncQueueItem[]) => {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    setPendingChanges(queue.length);
  }, []);

  // Add item to sync queue (for offline changes)
  const addToSyncQueue = useCallback((item: Omit<SyncQueueItem, "id" | "timestamp">) => {
    const queue = getSyncQueue();
    const newItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    queue.push(newItem);
    saveSyncQueue(queue);
    return newItem.id;
  }, [getSyncQueue, saveSyncQueue]);

  // Remove item from sync queue
  const removeFromSyncQueue = useCallback((id: string) => {
    const queue = getSyncQueue();
    saveSyncQueue(queue.filter(item => item.id !== id));
  }, [getSyncQueue, saveSyncQueue]);

  // Helper to execute table operations with proper typing
  const executeTableOperation = useCallback(async (
    tableName: string, 
    operation: "insert" | "update" | "delete", 
    data: any
  ): Promise<boolean> => {
    try {
      switch (tableName) {
        case "orders":
          if (operation === "insert") await supabase.from("orders").insert(data);
          else if (operation === "update") await supabase.from("orders").update(data).eq("id", data.id);
          else if (operation === "delete") await supabase.from("orders").delete().eq("id", data.id);
          break;
        case "messages":
          if (operation === "insert") await supabase.from("messages").insert(data);
          else if (operation === "update") await supabase.from("messages").update(data).eq("id", data.id);
          else if (operation === "delete") await supabase.from("messages").delete().eq("id", data.id);
          break;
        case "gp_offers":
          if (operation === "insert") await supabase.from("gp_offers").insert(data);
          else if (operation === "update") await supabase.from("gp_offers").update(data).eq("id", data.id);
          else if (operation === "delete") await supabase.from("gp_offers").delete().eq("id", data.id);
          break;
        case "conversations":
          if (operation === "insert") await supabase.from("conversations").insert(data);
          else if (operation === "update") await supabase.from("conversations").update(data).eq("id", data.id);
          else if (operation === "delete") await supabase.from("conversations").delete().eq("id", data.id);
          break;
        case "notifications":
          if (operation === "insert") await supabase.from("notifications").insert(data);
          else if (operation === "update") await supabase.from("notifications").update(data).eq("id", data.id);
          else if (operation === "delete") await supabase.from("notifications").delete().eq("id", data.id);
          break;
        default:
          console.warn(`Unsupported table for offline sync: ${tableName}`);
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Error executing ${operation} on ${tableName}:`, error);
      return false;
    }
  }, []);

  // Sync pending changes when online
  const syncPendingChanges = useCallback(async () => {
    if (syncInProgress.current || !navigator.onLine) return;
    
    const queue = getSyncQueue();
    if (queue.length === 0) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        const success = await executeTableOperation(item.table, item.operation, item.data);
        if (success) {
          removeFromSyncQueue(item.id);
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error("Sync error for item:", item.id, error);
        failCount++;
      }
    }

    setIsSyncing(false);
    syncInProgress.current = false;

    if (successCount > 0) {
      toast({
        title: "✅ Synchronisation terminée",
        description: `${successCount} modification${successCount > 1 ? 's' : ''} synchronisée${successCount > 1 ? 's' : ''}`,
      });
    }

    if (failCount > 0) {
      toast({
        title: "⚠️ Certaines modifications non synchronisées",
        description: `${failCount} modification${failCount > 1 ? 's' : ''} en attente`,
        variant: "destructive",
      });
    }
  }, [getSyncQueue, removeFromSyncQueue, executeTableOperation, toast]);

  // Save data locally for offline access
  const saveOfflineData = useCallback((key: string, data: any) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem(OFFLINE_DATA_KEY) || "{}");
      offlineData[key] = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(OFFLINE_DATA_KEY, JSON.stringify(offlineData));
    } catch (error) {
      console.error("Error saving offline data:", error);
    }
  }, []);

  // Get offline data
  const getOfflineData = useCallback((key: string) => {
    try {
      const offlineData = JSON.parse(localStorage.getItem(OFFLINE_DATA_KEY) || "{}");
      return offlineData[key]?.data || null;
    } catch {
      return null;
    }
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    localStorage.removeItem(OFFLINE_DATA_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    setPendingChanges(0);
  }, []);

  // Wrapper for database operations that handles offline
  const executeWithOfflineSupport = useCallback(async <T>(
    table: string,
    operation: "insert" | "update" | "delete",
    data: any,
    onlineOperation: () => Promise<T>
  ): Promise<{ success: boolean; offline: boolean; data?: T }> => {
    if (navigator.onLine) {
      try {
        const result = await onlineOperation();
        return { success: true, offline: false, data: result };
      } catch (error) {
        console.error("Online operation failed:", error);
        // Fall back to offline queue
        addToSyncQueue({ table, operation, data });
        return { success: true, offline: true };
      }
    } else {
      addToSyncQueue({ table, operation, data });
      return { success: true, offline: true };
    }
  }, [addToSyncQueue]);

  // Process sync queue - manual sync execution
  const processSyncQueue = useCallback(async (queue: SyncQueueItem[]) => {
    for (const item of queue) {
      try {
        // Note: This is a simplified version - in production you'd use proper typed table names
        const tableMap: Record<string, any> = {
          orders: supabase.from("orders"),
          messages: supabase.from("messages"),
          gp_offers: supabase.from("gp_offers"),
        };
        
        const tableClient = tableMap[item.table];
        if (!tableClient) {
          console.warn(`Unknown table: ${item.table}`);
          continue;
        }

        switch (item.operation) {
          case "insert":
            await tableClient.insert(item.data);
            break;
          case "update":
            await tableClient.update(item.data).eq("id", item.data.id);
            break;
          case "delete":
            await tableClient.delete().eq("id", item.data.id);
            break;
        }
        removeFromSyncQueue(item.id);
      } catch (error) {
        console.error("Sync error for item:", item.id, error);
      }
    }
  }, [removeFromSyncQueue]);

  return {
    isOnline,
    isSyncing,
    pendingChanges,
    addToSyncQueue,
    syncPendingChanges,
    saveOfflineData,
    getOfflineData,
    clearOfflineData,
    executeWithOfflineSupport,
  };
}
