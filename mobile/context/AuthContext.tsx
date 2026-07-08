import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { login as apiLogin } from '../lib/api';
import { storage } from '../lib/storage';
import { Role } from '../types/chat';

interface User {
  id: string;
  name: string;
  role: Role;
}

// Bump the suffix whenever the stored shape changes, so old sessions saved
// under a previous shape get ignored instead of silently misread.
const STORAGE_KEY = 'applause.session.v2';

function isValidUser(value: unknown): value is User {
  const candidate = value as Partial<User> | null;
  return (
    !!candidate &&
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    (candidate.role === 'technician' || candidate.role === 'manager')
  );
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (name: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    storage
      .getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (isValidUser(parsed)) {
          setUser(parsed);
        } else {
          storage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        // corrupted/unreadable session — fall through to logged-out state
        storage.removeItem(STORAGE_KEY);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (name: string, role: Role) => {
    const result = await apiLogin(name, role);
    setUser(result.user);
    await storage.setItem(STORAGE_KEY, JSON.stringify(result.user));
  };

  const logout = () => {
    setUser(null);
    storage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
