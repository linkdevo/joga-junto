"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { useAdminAuth } from "@/contexts/AdminAuthContext";

export default function Home() {
  const router = useRouter();

  const { isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (isAuthenticated) {
      router.replace("/resumo");

      return;
    }

    router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1015",
        color: "#93a1b7",
      }}
    >
      Carregando Joga Junto...
    </main>
  );
}
