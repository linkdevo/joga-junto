import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/player/Header/Header";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Joga Junto | Área do Jogador",
  description:
    "Encontre quadras, organize seus jogos e acompanhe suas partidas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Header />

        {children}
      </body>
    </html>
  );
}
