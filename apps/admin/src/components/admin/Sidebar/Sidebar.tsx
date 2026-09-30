"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  CircleDollarSign,
  CircleDot,
  CircleUserRound,
  Flame,
  LayoutDashboard,
  LogOut,
  Package,
  Wallet,
} from "lucide-react";

import { useAdminAuth } from "@/contexts/AdminAuthContext";

import styles from "./Sidebar.module.css";

const navigation = [
  {
    href: "/resumo",
    label: "Resumo Geral",
    icon: LayoutDashboard,
  },
  {
    href: "/agenda",
    label: "Agenda Mensal",
    icon: CalendarDays,
  },
  {
    href: "/quadras",
    label: "Quadras & Preços",
    icon: CircleDot,
  },
  {
    href: "/areas-de-lazer",
    label: "Áreas de Lazer",
    icon: Flame,
  },
  {
    href: "/financeiro",
    label: "Financeiro & Custos",
    icon: CircleDollarSign,
  },
  {
    href: "/carteira",
    label: "Carteira & Pix",
    icon: Wallet,
  },
  {
    href: "/estoque",
    label: "Estoque do Bar",
    icon: Package,
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { admin, complex, logout } = useAdminAuth();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>⚽</div>

        <div className={styles.brandText}>
          <strong>Joga Junto</strong>
          <span>ADMINISTRADOR</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${
                isActive ? styles.navItemActive : ""
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.bottom}>
        <div className={styles.user}>
          <div className={styles.userIcon}>
            <CircleUserRound size={23} />
          </div>

          <div className={styles.userInfo}>
            <strong>{admin?.name ?? "Administrador"}</strong>
            <span>{complex?.name ?? "Complexo"}</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.logout}
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span>Desconectar</span>
        </button>
      </div>
    </aside>
  );
}
