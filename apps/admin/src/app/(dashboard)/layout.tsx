import type { ReactNode } from "react";

import { AdminAuthGate } from "@/components/admin/AdminAuthGate/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell/AdminShell";
import { AdminMonthProvider } from "@/contexts/AdminMonthContext";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <AdminAuthGate>
      <AdminMonthProvider>
        <AdminShell>{children}</AdminShell>
      </AdminMonthProvider>
    </AdminAuthGate>
  );
}
