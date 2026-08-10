import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordError, jsonError, requestId, AppError } from "@/lib/errors";

const userUpdateSchema = z.object({ role: z.enum(["USER", "ADMIN"]).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }).refine((value) => value.role || value.status, "Debes enviar un cambio");

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    const admin = await requireAdmin();
    const { id: userId } = await context.params;
    const changes = userUpdateSchema.parse(await request.json());
    if (admin.id === userId && (changes.role === "USER" || changes.status === "SUSPENDED")) throw new AppError("No puedes quitarte tus propios permisos o suspenderte.", "SELF_LOCKOUT", 400);
    const user = await prisma.user.update({ where: { id: userId }, data: changes, select: { id: true, name: true, email: true, image: true, role: true, status: true, createdAt: true, updatedAt: true } });
    return NextResponse.json({ user }, { headers: { "x-request-id": id } });
  } catch (error) {
    await recordError(error, { source: "admin_user_update_api", path: "/api/admin/users" });
    const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 500;
    return NextResponse.json(jsonError(error, id), { status });
  }
}

