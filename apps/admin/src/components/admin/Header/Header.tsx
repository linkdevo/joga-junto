"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./Header.module.css";

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/agenda")) {
    return "Controle de Agenda Mensal";
  }

  if (pathname.startsWith("/quadras")) {
    return "Configuração das Quadras";
  }

  return "Resumo Geral";
}

function getCurrentMonthLabel() {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const formatted = formatter.format(new Date());

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function Header() {
  const pathname = usePathname();
  const [monthLabel, setMonthLabel] = useState("");

  useEffect(() => {
    setMonthLabel(getCurrentMonthLabel());
  }, []);

  return (
    <header className={styles.header}>
      <h1>{getPageTitle(pathname)}</h1>

      {monthLabel && <div className={styles.month}>{monthLabel}</div>}
    </header>
  );
}
