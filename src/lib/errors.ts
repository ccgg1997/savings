import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ErrorContext = {
  source: string;
  path?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code = "INTERNAL_ERROR", status = 500, details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Se produjo un error inesperado.";
}

function stackFrom(error: unknown) {
  return error instanceof Error ? error.stack : undefined;
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  const sensitiveKeys = new Set(["token", "access_token", "refresh_token", "id_token", "client_secret", "password", "secret"]);
  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, entry]) => {
    result[key] = sensitiveKeys.has(key.toLowerCase()) ? "[REDACTED]" : redact(entry);
    return result;
  }, {});
}

export async function recordError(error: unknown, context: ErrorContext) {
  const normalized = {
    message: messageFrom(error).slice(0, 1000),
    stack: stackFrom(error)?.slice(0, 8000),
    source: context.source.slice(0, 120),
    path: context.path?.slice(0, 500),
    userId: context.userId,
    metadata: redact(context.metadata ?? {}),
  };

  try {
    await prisma.errorLog.create({
      data: {
        message: normalized.message,
        stack: normalized.stack,
        source: normalized.source,
        path: normalized.path,
        metadata: normalized.metadata as Prisma.InputJsonValue,
        ...(context.userId ? { user: { connect: { id: context.userId } } } : {}),
      },
    });
  } catch {
    // Error capture must never mask the original failure or create a logging loop.
  }

  return normalized;
}

export function jsonError(error: unknown, requestId: string) {
  const appError = error instanceof AppError ? error : new AppError("Se produjo un error inesperado.");
  return {
    error: {
      code: appError.code,
      message: appError.status >= 500 ? "No pudimos completar la solicitud." : appError.message,
      requestId,
    },
  };
}

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function publicErrorMessage(error: unknown) {
  return error instanceof AppError && error.status < 500 ? error.message : "No pudimos completar la solicitud.";
}
