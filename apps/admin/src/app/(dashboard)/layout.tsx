import type { ReactNode } from "react";

import { AdminAuthGate } from "@/components/admin/AdminAuthGate/AdminAuthGate";
import { AdminShell } from "@/components/admin/AdminShell/AdminShell";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <AdminAuthGate>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGate>
  );
}
