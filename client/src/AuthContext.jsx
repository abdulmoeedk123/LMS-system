import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refresh = () => api('/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setReady(true));
  useEffect(() => { localStorage.getItem('token') ? refresh() : setReady(true); }, []);
  const sign = async (path, body) => { const d = await api(path, { method: 'POST', body }); localStorage.setItem('token', d.token); setUser(d.user); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <Ctx.Provider value={{ user, ready, refresh, login: b => sign('/auth/login', b), register: b => sign('/auth/register', b), logout }}>{children}</Ctx.Provider>;
}
