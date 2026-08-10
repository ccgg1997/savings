function readableMessage(error: unknown) {
  return error instanceof Error ? error.message : "Se produjo un error inesperado.";
}

async function getAlertify() {
  if (typeof window === "undefined") return null;
  const module = await import("alertifyjs");
  return module.default;
}

export function notifyError(message = "No pudimos completar la solicitud.") {
  void getAlertify().then((alertify) => alertify?.error(message));
}

export function notifySuccess(message: string) {
  void getAlertify().then((alertify) => alertify?.success(message));
}

export function captureClientError(error: unknown, context: Record<string, unknown> = {}) {
  const payload = {
    message: readableMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
    source: "client",
    path: typeof window === "undefined" ? undefined : window.location.pathname,
    metadata: context,
  };

  void fetch("/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
