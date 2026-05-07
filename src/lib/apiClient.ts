// Thin client for the PHP/MySQL backend that ships with the XAMPP build.
// In dev (no /api), all calls fail silently and the app keeps using localStorage.

// API base resolution:
//   1. window.__API_BASE__   (set in index.html for static deploys)
//   2. import.meta.env.VITE_API_BASE  (set in .env.local for dev)
//   3. same-origin /api      (when SPA is served from XAMPP)
const BASE = (() => {
  if (typeof window !== "undefined" && (window as any).__API_BASE__) {
    return (window as any).__API_BASE__ as string;
  }
  // @ts-expect-error vite env
  const envBase = import.meta.env?.VITE_API_BASE as string | undefined;
  if (envBase) return envBase.replace(/\/$/, "");
  if (typeof window === "undefined") return "/api";
  const path = window.location.pathname.replace(/\/[^/]*$/, "/");
  return path + "api";
})();

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

let _available: boolean | null = null;
export async function apiAvailable(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    const r = await fetch(BASE + "/me", { credentials: "include" });
    _available = r.ok || r.status === 401;
  } catch {
    _available = false;
  }
  return _available;
}

export type ApiUser = { id: number; username: string; role: "super_admin" | "moderator" };

export const api = {
  me: () => req<{ user: ApiUser | null }>("/me"),
  login: (username: string, password: string) =>
    req<{ user: ApiUser }>("/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => req<{ ok: true }>("/logout", { method: "POST" }),

  listCollection: (name: string) => req<{ items: any[] }>(`/collections/${name}`),
  upsertCollection: (name: string, item: any) =>
    req(`/collections/${name}/${encodeURIComponent(item.id)}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }),
  removeFromCollection: (name: string, id: string) =>
    req(`/collections/${name}/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getSettings: () => req<{ settings: any }>("/settings"),
  saveSettings: (data: any) =>
    req("/settings", { method: "PUT", body: JSON.stringify(data) }),
};
