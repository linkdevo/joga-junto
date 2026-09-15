import type { ReactNode } from "react";

import { Header } from "@/components/admin/Header/Header";
import { Sidebar } from "@/components/admin/Sidebar/Sidebar";

import styles from "./AdminShell.module.css";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.main}>
        <Header />

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
