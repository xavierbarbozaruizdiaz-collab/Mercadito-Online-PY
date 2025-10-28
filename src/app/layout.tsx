
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserMenu from "@/components/UserMenu";
import CartButton from "@/components/CartButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mercadito Online PY",
  description: "Ecommerce simple con Next.js + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Header global */}
        <header className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <h1 className="text-xl font-bold">🛒 Mercadito Online PY</h1>
          <div className="flex items-center gap-4">
            <CartButton />
            <UserMenu />
          </div>
        </header>

        {/* Contenido de cada página */}
        {children}
      </body>
    </html>
  );
}
