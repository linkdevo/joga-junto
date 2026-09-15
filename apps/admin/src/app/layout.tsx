import type { Metadata } from "next";

import { AdminAuthProvider } from "@/contexts/AdminAuthContext";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Joga Junto Admin",
    template: "%s | Joga Junto Admin",
  },

  description:
    "Painel administrativo Joga Junto para gestão de complexos esportivos.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
