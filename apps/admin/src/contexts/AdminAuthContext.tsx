"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { adminLogin, getAdminMe } from "@/services/admin-api";

import {
  clearAdminSession,
  getAdminSession,
  getAdminToken,
  saveAdminSession,
} from "@/services/admin-auth-storage";

import type { AdminComplex, AdminSession, AdminUser } from "@/types/admin";

type AdminAuthContextData = {
  admin: AdminUser | null;
  complex: AdminComplex | null;

  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;

  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextData | undefined>(
  undefined,
);

type AdminAuthProviderProps = {
  children: ReactNode;
};

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  const [complex, setComplex] = useState<AdminComplex | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function validateSession() {
      const token = getAdminToken();
      const storedSession = getAdminSession();

      if (!token || !storedSession) {
        if (mounted) {
          setAdmin(null);
          setComplex(null);
          setIsLoading(false);
        }

        return;
      }

      /*
       * Mostra inicialmente os dados armazenados,
       * mas ainda valida o token no backend.
       */
      if (mounted) {
        setAdmin(storedSession.admin);
        setComplex(storedSession.complex);
      }

      try {
        const response = await getAdminMe();

        if (!mounted) {
          return;
        }

        const validatedSession: AdminSession = {
          token,
          admin: response.admin,
          complex: response.complex,
        };

        saveAdminSession(validatedSession);

        setAdmin(response.admin);
        setComplex(response.complex);
      } catch {
        clearAdminSession();

        if (mounted) {
          setAdmin(null);
          setComplex(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void validateSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await adminLogin(email, password);

    const session: AdminSession = {
      token: response.token,
      admin: response.admin,
      complex: response.complex,
    };

    saveAdminSession(session);

    setAdmin(response.admin);
    setComplex(response.complex);
  }, []);

  const logout = useCallback(() => {
    clearAdminSession();

    setAdmin(null);
    setComplex(null);
  }, []);

  const value = useMemo<AdminAuthContextData>(
    () => ({
      admin,
      complex,

      isAuthenticated: Boolean(admin && complex),

      isLoading,

      login,
      logout,
    }),
    [admin, complex, isLoading, login, logout],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth deve ser utilizado dentro de AdminAuthProvider.",
    );
  }

  return context;
}
