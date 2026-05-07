// Wires the React storage layer to the PHP/MySQL backend when running on XAMPP.
// In dev (no backend) it's a no-op and the app keeps using localStorage.
import { api, apiAvailable, type ApiUser } from "./apiClient";
import {
  installSyncHooks,
  hydrateCollection,
  hydrateSettings,
  type StoreKey,
} from "./storage";

const COLLECTIONS: StoreKey[] = [
  "materials", "workers", "salaries", "expenses",
  "buildings", "floors", "apartments", "parkingSlots",
  "shops", "shopPayments", "clients", "sales", "requests",
];

// Debounced per-(collection,id) writes so a flurry of updates doesn't spam the API.
const pending = new Map<string, any>();
let timer: any = null;
function flush() {
  timer = null;
  for (const [k, v] of pending) {
    const [coll, id] = k.split("::");
    if (v === "__del__") api.removeFromCollection(coll, id).catch(() => {});
    else api.upsertCollection(coll, v).catch(() => {});
  }
  pending.clear();
}
function schedule(key: string, val: any) {
  pending.set(key, val);
  if (!timer) timer = setTimeout(flush, 250);
}

export async function bootstrapBackend(): Promise<{ user: ApiUser | null; enabled: boolean }> {
  const ok = await apiAvailable();
  if (!ok) return { user: null, enabled: false };

  // Wire write-through hooks
  installSyncHooks({
    upsert: (c, item) => schedule(`${c}::${item.id}`, item),
    remove: (c, id) => schedule(`${c}::${id}`, "__del__"),
    saveSettings: (s) => api.saveSettings(s).catch(() => {}),
  });

  const me = await api.me().catch(() => ({ user: null as ApiUser | null }));
  if (me.user) await hydrateAll();
  return { user: me.user, enabled: true };
}

export async function hydrateAll() {
  // Pull all data from MySQL into localStorage so existing components work unchanged.
  await Promise.all(
    COLLECTIONS.map(async (c) => {
      try {
        const r = await api.listCollection(c);
        hydrateCollection(c, r.items as any);
      } catch {/* ignore per-collection errors (e.g. moderator forbidden) */}
    }),
  );
  try {
    const s = await api.getSettings();
    if (s.settings && typeof s.settings === "object") hydrateSettings(s.settings as any);
  } catch {/* ignore */}
}
