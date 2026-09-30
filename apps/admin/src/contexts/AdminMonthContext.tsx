"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { formatMonthLabel, getCurrentMonth } from "@/utils/month";

type AdminMonthContextValue = {
  /**
   * Mês selecionado ("YYYY-MM"). Quando `isCurrentMonth` é
   * true, este valor acompanha o mês real automaticamente.
   */
  month: string;
  monthLabel: string;
  isCurrentMonth: boolean;

  selectMonth: (month: string) => void;

  /**
   * Volta a acompanhar o mês atual automaticamente.
   */
  resetToCurrentMonth: () => void;
};

const AdminMonthContext = createContext<AdminMonthContextValue | null>(null);

export function AdminMonthProvider({ children }: { children: ReactNode }) {
  /*
   * `null` significa "acompanhar o mês real automaticamente".
   * Uma string significa que o administrador escolheu ver um
   * mês específico (geralmente um mês passado).
   */
  const [manualMonth, setManualMonth] = useState<string | null>(null);
  const [liveCurrentMonth, setLiveCurrentMonth] = useState(getCurrentMonth());

  useEffect(() => {
    /*
     * Confere a cada minuto se o mês real mudou (ex.: a
     * virada da meia-noite no último dia do mês), para o
     * badge trocar sozinho sem precisar recarregar a página.
     */
    const interval = window.setInterval(() => {
      setLiveCurrentMonth((current) => {
        const now = getCurrentMonth();

        return now === current ? current : now;
      });
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const month = manualMonth ?? liveCurrentMonth;
  const isCurrentMonth = month === liveCurrentMonth;

  const value = useMemo<AdminMonthContextValue>(
    () => ({
      month,
      monthLabel: formatMonthLabel(month),
      isCurrentMonth,
      selectMonth: (nextMonth: string) => {
        setManualMonth(nextMonth === liveCurrentMonth ? null : nextMonth);
      },
      resetToCurrentMonth: () => setManualMonth(null),
    }),
    [month, isCurrentMonth, liveCurrentMonth],
  );

  return (
    <AdminMonthContext.Provider value={value}>
      {children}
    </AdminMonthContext.Provider>
  );
}

export function useAdminMonth() {
  const context = useContext(AdminMonthContext);

  if (!context) {
    throw new Error("useAdminMonth deve ser usado dentro de AdminMonthProvider.");
  }

  return context;
}
