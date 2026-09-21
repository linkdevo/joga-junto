"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearSession, getStoredUser, getToken } from "@/lib/auth";
import styles from "./Header.module.css";

function hasStoredSession() {
  return Boolean(getToken() && getStoredUser());
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(hasStoredSession());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setIsAuthenticated(false);
    router.replace("/login");
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark}>⚽</span>

          <span>Joga Junto</span>
        </Link>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleLogout}
            className={styles.loginButton}
          >
            Sair
          </button>
        ) : (
          <Link href="/login" className={styles.loginButton}>
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
