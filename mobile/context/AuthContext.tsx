import { createContext, ReactNode, useContext, useState } from 'react';
import { Role } from '../types/chat';

interface User {
  id: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  login: (name: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // TODO: replace with real auth against the backend once it exists
  const login = (name: string, role: Role) => {
    setUser({ id: `${role}-${name.trim().toLowerCase()}`, name: name.trim(), role });
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
