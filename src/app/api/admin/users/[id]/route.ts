import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUserSelect, publicAdminUser } from "@/lib/admin-users";
import { AppError, jsonError, recordError, requestId } from "@/lib/errors";
import { hashPassword } from "@/lib/passwords";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const userUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(190).optional(),
  password: z.string().min(12).max(128).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  persistentSession: z.boolean().optional(),
  revokeSessions: z.literal(true).optional(),
}).refine((value) => Object.keys(value).length > 0, "Debes enviar un cambio");

function normalizeError(error: unknown) {
  return error instanceof z.ZodError
    ? new AppError("Revisa los datos enviados. La contraseña debe tener al menos 12 caracteres.", "INVALID_USER", 400)
    : error;
}

async function ensureAdminContinuity(userId: string, changes: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "SUSPENDED" }) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
  if (!target) throw new AppError("El usuario ya no existe.", "USER_NOT_FOUND", 404);
  const removesActiveAdmin = target.role === "ADMIN" && target.status === "ACTIVE" && (changes.role === "USER" || changes.status === "SUSPENDED");
  if (!removesActiveAdmin) return;
  const activeAdmins = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
  if (activeAdmins <= 1) throw new AppError("Debe existir al menos un administrador activo.", "LAST_ADMIN", 400);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const admin = await requireAdmin();
    const { id: userId } = await context.params;
    const input = userUpdateSchema.parse(await request.json());
    if (admin.id === userId && (input.role === "USER" || input.status === "SUSPENDED")) {
      throw new AppError("No puedes quitarte tus propios permisos o suspenderte.", "SELF_LOCKOUT", 400);
    }
    await ensureAdminContinuity(userId, input);

    const email = input.email?.toLowerCase();
    if (email) {
      const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: userId } }, select: { id: true } });
      if (duplicate) throw new AppError("Ya existe un usuario con ese correo.", "EMAIL_EXISTS", 409);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(email ? { email } : {}),
        ...(input.role ? { role: input.role } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.persistentSession !== undefined ? { persistentSession: input.persistentSession } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
        ...(input.revokeSessions || input.password || input.status === "SUSPENDED" ? { sessionVersion: { increment: 1 } } : {}),
      },
      select: adminUserSelect,
    });
    return NextResponse.json({ user: publicAdminUser(user) }, { headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeError(caught);
    await recordError(error, { source: "admin_user_update_api", path: "/api/admin/users" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const admin = await requireAdmin();
    const { id: userId } = await context.params;
    if (admin.id === userId) throw new AppError("No puedes eliminar tu propio usuario.", "SELF_DELETE", 400);
    await ensureAdminContinuity(userId, { role: "USER" });
    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ deletedId: userId }, { headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeError(caught);
    await recordError(error, { source: "admin_user_delete_api", path: "/api/admin/users" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}
