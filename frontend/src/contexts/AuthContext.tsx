'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import type { User, LoginInput, RegisterInput } from '@/types';
import { useToast } from '@/components/toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast=useToast()
  const router = useRouter();

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  // Load current user on mount (via cookie)
useEffect(() => {
  const loadUser = async () => {
    try {
      const res = await axios.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  loadUser();
}, []);

const login = useCallback(async (input: LoginInput) => {
  try {
    await axios.post('/auth/login', input);

    const res = await axios.get('/auth/me');

    if (res?.status === 200) {
      setUser(res.data);
      toast('login Successfully')
      return res.data; // ✅ RETURN USER
    }

    toast("Login failed",'error');

  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      "Something went wrong";

    toast(message,'error'); // ✅ THROW ERROR
  }
}, []);

const register = useCallback(async (input: RegisterInput) => {
  try {
    await axios.post('/auth/register', input);

    // auto login after register
    const res = await axios.get('/auth/me');
    setUser(res.data);
toast("Registered Successfully")
    return res.data;

  } catch (err: any) {
    const message =
      err?.response?.data?.message ||
      "Registration failed";

    toast(message,'error');
  }
}, []);

  const logout = useCallback(async () => {
    try {
      await axios.post('/auth/logout');
    } finally {
      setUser(null);
      router.push('/');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await axios.get('/auth/me');
      setUser(res.data);
    } catch {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}