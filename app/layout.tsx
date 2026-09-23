import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SIGBM Market Intelligence | Rafael Provezano",
  description: "Painel independente para explorar dados públicos do SIGBM e construir recortes de inteligência de mercado.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children:React.ReactNode}>) { return <html lang="pt-BR"><body>{children}</body></html>; }
