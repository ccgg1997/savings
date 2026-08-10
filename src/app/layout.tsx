import type { Metadata } from "next";
import { AlertifyProvider } from "@/components/alertify-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Centro de Finanzas",
  description: "Panel de control de ingresos, gastos y ahorro.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <AlertifyProvider />
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}

