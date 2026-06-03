import { createContext, useContext, useState, useEffect } from 'react';
import { api, token } from '../api/client';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token.get()) {
      api.auth.me()
        .then(({user}) => setUser(user))
        .catch(() => token.clear())
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, []);

  const login = async (username, password) => {
    const { token:t, user:u } = await api.auth.login(username, password);
    token.set(t); setUser(u);
  };

  const logout = () => { token.clear(); setUser(null); };

  return (
    <Ctx.Provider value={{ user, setUser, loading, login, logout }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-paper">
          <div className="text-center">
            <div className="w-10 h-10 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
            <p className="text-stone-500 text-sm">Loading Ghana School Feeding System...</p>
          </div>
        </div>
      ) : children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
