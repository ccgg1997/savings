import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { isDatabaseConfigured } from "@/lib/prisma";

export async function getCurrentSession() {
  if (!isDatabaseConfigured) return null;
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user?.id) throw new AppError("Debes iniciar sesión para continuar.", "UNAUTHORIZED", 401);
  if (session.user.status === "SUSPENDED") throw new AppError("Tu usuario está suspendido.", "SUSPENDED", 403);
  if (!session.user.sessionValid) throw new AppError("Tu sesión venció. Inicia sesión nuevamente.", "SESSION_EXPIRED", 401);
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AppError("No tienes permisos de administrador.", "FORBIDDEN", 403);
  return user;
}
