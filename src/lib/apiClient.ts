// Thin client for the PHP/MySQL backend that ships with the XAMPP build.
// In dev (no /api), all calls fail silently and the app keeps using localStorage.

const BASE = (() => {
  if (typeof window === "undefined") return "/api";
  // Same-origin: <site>/realestate/  →  <site>/realestate/api
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
