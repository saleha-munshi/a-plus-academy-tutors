import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword,
  User,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { api } from '../services/api';
import { Role } from '../types';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  loading: boolean;
  requiresPasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setRole((tokenResult.claims.role as Role) ?? null);
        setRequiresPasswordChange(!!tokenResult.claims.requiresPasswordChange);
      } else {
        setRole(null);
        setRequiresPasswordChange(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await firebaseSignOut(auth);
  };

  const changePassword = async (newPassword: string) => {
    if (!user) throw new Error('Not authenticated');
    await updatePassword(user, newPassword);
    await api.patch('/auth/clearPasswordFlag', {});
    setRequiresPasswordChange(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, requiresPasswordChange, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
