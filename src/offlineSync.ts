import { Stop } from "./types";

export interface OfflineMutation {
  id: string;
  stopId: string;
  status: Stop["status"];
  bonDeLivraison?: string;
  timestamp: string;
  customerName: string;
  stopName: string;
  codAmount: string;
}

// Key for storage persistence
const OFFLINE_QUEUE_KEY = "logistiq_offline_queue";

// Helpers
export function getOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Error reading offline queue", err);
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineMutation[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    // Dispatch a local custom event so that components can reactive-update their state instantly
    window.dispatchEvent(new CustomEvent("logistiq-offline-updated"));
  } catch (err) {
    console.error("Error writing offline queue", err);
  }
}

export function addToOfflineQueue(
  stopId: string,
  status: Stop["status"],
  bonDeLivraison?: string,
  customerName: string = "Client",
  stopName: string = "Livraison",
  codAmount: string = "0 DH"
): void {
  const queue = getOfflineQueue();
  
  // Filter out any duplicate queued action for the same stop to optimize sync steps (latest wins)
  const filteredQueue = queue.filter(item => item.stopId !== stopId);

  const newMutation: OfflineMutation = {
    id: `offline-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    stopId,
    status,
    bonDeLivraison,
    timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    customerName,
    stopName,
    codAmount
  };

  filteredQueue.push(newMutation);
  saveOfflineQueue(filteredQueue);
}

export function removeQueueItem(id: string): void {
  const queue = getOfflineQueue();
  saveOfflineQueue(queue.filter(item => item.id !== id));
}

export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

/**
 * Iterates through the stored offline cache actions and sends them to the SQLite backend.
 * Aborts early if a fetch fails due to network outage.
 */
export async function syncOfflineQueue(
  token: string,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return true;

  onProgress?.(`Mise en route de la synchronisation de ${queue.length} actions...`);
  
  const remaining = [...queue];
  let successCount = 0;

  for (const action of queue) {
    onProgress?.(`Synchro : ${action.customerName} (${action.status})`);
    try {
      const response = await fetch(`/api/deliveries/${action.stopId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: action.status,
          bonDeLivraison: action.bonDeLivraison
        })
      });

      if (response.ok) {
        successCount++;
        // Remove from remaining list
        const index = remaining.findIndex(item => item.id === action.id);
        if (index !== -1) {
          remaining.splice(index, 1);
        }
        // Save intermediate state in case we drop off again
        saveOfflineQueue([...remaining]);
      } else {
        console.warn(`Server rejected sync for stop ${action.stopId} with status ${response.status}`);
        // Keep it in the queue for later retry, but don't disrupt the whole sync flow unless network is dead
      }
    } catch (err) {
      console.error("Network error during offline sync background worker:", err);
      onProgress?.("⚠️ Échec réseau : Synchronisation interrompue.");
      return false; // Connection is still dead or severed during sync
    }
  }

  saveOfflineQueue(remaining);
  onProgress?.(`Synchronisation terminée. ${successCount} étape(s) enregistrée(s) avec succès.`);
  return remaining.length === 0;
}
