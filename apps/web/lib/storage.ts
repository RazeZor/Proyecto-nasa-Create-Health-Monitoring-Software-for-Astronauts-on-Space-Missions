import type { CheckInEntry } from "./types"

/** Swap this implementation for IndexedDB/Dexie later; consumers only use the interface. */
export interface HealthStore {
  listCheckIns(): Promise<CheckInEntry[]>
  saveCheckIn(entry: CheckInEntry): Promise<void>
  listSharedAlertIds(): Promise<string[]>
  shareAlert(id: string): Promise<void>
  listAcknowledgedAlertIds(): Promise<string[]>
  acknowledgeAlert(id: string): Promise<void>
  listSyncedCheckInIds(): Promise<string[]>
  markCheckInSynced(id: string): Promise<void>
}

const PREFIX = "vigia:"

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(PREFIX + key)
  return raw ? (JSON.parse(raw) as T) : fallback
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

async function append<T>(key: string, item: T) {
  write(key, [...read<T[]>(key, []), item])
}

export const localStore: HealthStore = {
  listCheckIns: async () => read<CheckInEntry[]>("checkins", []),
  saveCheckIn: (e) => append("checkins", e),
  listSharedAlertIds: async () => read<string[]>("shared", []),
  shareAlert: (id) => append("shared", id),
  listAcknowledgedAlertIds: async () => read<string[]>("acked", []),
  acknowledgeAlert: (id) => append("acked", id),
  listSyncedCheckInIds: async () => read<string[]>("synced", []),
  markCheckInSynced: (id) => append("synced", id),
}

export const store: HealthStore = localStore
