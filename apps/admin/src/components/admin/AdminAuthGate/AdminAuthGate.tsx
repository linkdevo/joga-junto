"use client";

import { useEffect, type ReactNode } from "react";

import { usePathname, useRouter } from "next/navigation";

import { useAdminAuth } from "@/contexts/AdminAuthContext";

import styles from "./AdminAuthGate.module.css";

type AdminAuthGateProps = {
  children: ReactNode;
};

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (isLoading || isAuthenticated) {
      return;
    }

    const from = encodeURIComponent(pathname);

    router.replace(`/login?from=${from}`);
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />

        <span>Carregando Joga Junto...</span>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className={styles.loading}>
        <div className={styles.spinner} />

        <span>Redirecionando...</span>
      </main>
    );
  }

  return children;
}
