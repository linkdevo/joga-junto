"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { clearSession, getStoredUser } from "@/lib/auth";
import { ProfileMenu } from "../ProfileMenu/ProfileMenu";
import type { AuthUser } from "@/types/auth";
import styles from "./Header.module.css";

const LANDING_URL =
  process.env.NEXT_PUBLIC_LANDING_URL ?? "http://localhost:3000";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setUser(null);
    router.replace("/login");
  }

  return (
    <header className={styles.header}>
      <div className={`container ${styles.content}`}>
        <a href={LANDING_URL} className={styles.logo}>
          <span className={styles.logoMark}>⚽</span>

          <span>Joga Junto</span>
        </a>

        {user ? (
          <ProfileMenu
            user={user}
            onUserUpdate={setUser}
            onLogout={handleLogout}
          />
        ) : (
          <Link href="/login" className={styles.loginButton}>
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
