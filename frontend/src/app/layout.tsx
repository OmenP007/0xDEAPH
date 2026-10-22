import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "0xSeq • Plateforme de Séquestre Automatisé",
  description: "Séquestre (escrow) automatisé, sécurisé et interopérable en FCFA (XOF) avec auto-libération 3 jours et garantie de livraison.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0B1120] text-slate-100">
        {children}
      </body>
    </html>
  );
}
