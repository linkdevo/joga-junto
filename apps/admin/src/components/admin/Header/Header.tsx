"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, RotateCcw } from "lucide-react";

import { useAdminMonth } from "@/contexts/AdminMonthContext";
import { listRecentMonths } from "@/utils/month";

import styles from "./Header.module.css";

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/agenda")) {
    return "Controle de Agenda Mensal";
  }

  if (pathname.startsWith("/quadras")) {
    return "Configuração das Quadras";
  }

  if (pathname.startsWith("/areas-de-lazer")) {
    return "Áreas de Lazer";
  }

  if (pathname.startsWith("/financeiro")) {
    return "Painel Financeiro";
  }

  if (pathname.startsWith("/carteira")) {
    return "Fluxo Financeiro & Carteira";
  }

  if (pathname.startsWith("/estoque")) {
    return "Estoque do Bar";
  }

  return "Resumo Geral";
}

export function Header() {
  const pathname = usePathname();
  const { month, monthLabel, isCurrentMonth, selectMonth, resetToCurrentMonth } =
    useAdminMonth();

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const months = listRecentMonths(12);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <header className={styles.header}>
      <div>
        <h1>{getPageTitle(pathname)}</h1>

        {!isCurrentMonth && (
          <button
            type="button"
            className={styles.backToCurrent}
            onClick={resetToCurrentMonth}
          >
            <RotateCcw size={12} />
            Visualizando {monthLabel} · voltar para o mês atual
          </button>
        )}
      </div>

      <div className={styles.monthWrapper} ref={wrapperRef}>
        <button
          type="button"
          className={styles.month}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          {monthLabel}
          <ChevronDown size={14} />
        </button>

        {isOpen && (
          <div className={styles.monthDropdown} role="menu">
            {months.map((option) => (
              <button
                key={option.month}
                type="button"
                className={
                  option.month === month
                    ? styles.monthOptionActive
                    : styles.monthOption
                }
                onClick={() => {
                  selectMonth(option.month);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
