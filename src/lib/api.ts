import { captureClientError, notifyError } from "@/lib/client-errors";

export async function apiFetch<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(input, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
    const body = (await response.json()) as T & { error?: { message?: string; requestId?: string } };
    if (!response.ok) {
      const message = body.error?.message ?? "No pudimos completar la solicitud.";
      const error = new Error(message);
      captureClientError(error, { status: response.status, requestId: body.error?.requestId, input: String(input) });
      notifyError(message);
      throw error;
    }
    return body;
  } catch (error) {
    if (!(error instanceof Error && error.message === "No pudimos completar la solicitud.")) {
      captureClientError(error, { input: String(input) });
    }
    throw error;
  }
}

