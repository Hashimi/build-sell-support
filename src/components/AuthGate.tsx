import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type ApiUser } from "@/lib/apiClient";
import { bootstrapBackend, hydrateAll } from "@/lib/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthState = {
  user: ApiUser | null;
  backendEnabled: boolean;
  loading: boolean;
  logout: () => Promise<void>;
};
const AuthCtx = createContext<AuthState>({
  user: null, backendEnabled: false, loading: true, logout: async () => {},
});
export const useAuth = () => useContext(AuthCtx);

export function AuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bootstrapBackend().then(({ user, enabled }) => {
      setUser(user);
      setEnabled(enabled);
      setLoading(false);
    });
  }, []);

  const logout = async () => {
    try { await api.logout(); } catch {}
    setUser(null);
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  // No backend (dev mode): just render the app, no login required.
  if (!enabled) {
    return <AuthCtx.Provider value={{ user: null, backendEnabled: false, loading: false, logout }}>{children}</AuthCtx.Provider>;
  }

  if (!user) {
    return <LoginScreen onLogin={async (u) => { setUser(u); await hydrateAll(); }} />;
  }

  return <AuthCtx.Provider value={{ user, backendEnabled: true, loading: false, logout }}>{children}</AuthCtx.Provider>;
}

function LoginScreen({ onLogin }: { onLogin: (u: ApiUser) => void }) {
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const r = await api.login(username.trim(), password);
      onLogin(r.user);
    } catch {
      setErr("Invalid username or password");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={submit}>
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setU(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setP(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
            <p className="text-xs text-muted-foreground pt-2">
              Defaults: <b>admin / admin123</b> (full access) · <b>moderator / mod123</b> (sales + commercial).
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
