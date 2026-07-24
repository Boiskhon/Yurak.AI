import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearTokens, getToken, setTokens } from "./api";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: "admin" | "doctor" | "technician";
  branch: string;
  is_active: boolean;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api.get("/auth/me");
      setUser(me);
    } catch {
      clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login(username: string, password: string) {
    const tokens = await api.login(username, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    await refreshUser();
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
