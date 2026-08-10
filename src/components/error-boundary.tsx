"use client";

import React from "react";
import { captureClientError, notifyError } from "@/lib/client-errors";

type State = { hasError: boolean };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    captureClientError(error, { componentStack: info.componentStack });
    notifyError("La vista encontró un problema. Puedes intentar recargarla.");
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Centro de Finanzas</p>
            <h1 className="text-2xl font-semibold text-card-foreground">Algo salió mal</h1>
            <p className="mt-3 text-sm text-muted-foreground">El incidente fue registrado. Recarga la vista para continuar.</p>
            <button className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90" onClick={() => window.location.reload()}>
              Recargar vista
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

