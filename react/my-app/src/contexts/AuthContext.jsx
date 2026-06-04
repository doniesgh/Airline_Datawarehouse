import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, TOKEN_KEY } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const me = await auth.me();
      setUser(me);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const completeLogin = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const loginPassword = async (email, password) =>
    completeLogin(await auth.loginPassword(email, password));

  const loginFace = async (descriptor) => {
    const r = await auth.loginFace(descriptor);
    if (!r.authenticated) throw new Error(r.message || "Face not recognized");
    return completeLogin(r);
  };

  const signup = async (payload) =>
    completeLogin(await auth.signup(payload));

  const logout = async () => {
    try { await auth.logout(); } catch { /* ignore */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const hasRole = (...roles) => !!user && roles.includes(user.role);

  const value = {
    user, loading,
    isAuthenticated: !!user,
    role: user?.role || null,
    hasRole,
    isPassenger: user?.role === "passenger",
    isManager:   user?.role === "manager" || user?.role === "admin",
    isAdmin:     user?.role === "admin",
    loginPassword, loginFace, signup, logout, refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
