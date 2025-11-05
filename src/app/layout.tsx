
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import "./print.css";
import { FirebaseErrorListener } from "@/components/FirebaseErrorListener";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "StockWise",
  description: "Un sistema inteligente de gestión de inventario.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          inter.variable
        )}
      >
        <Suspense>
          <FirebaseErrorListener />
        </Suspense>
        <div className="printable-content">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
