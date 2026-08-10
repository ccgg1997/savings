import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUserSelect, publicAdminUser } from "@/lib/admin-users";
import { AppError, jsonError, recordError, requestId } from "@/lib/errors";
import { hashPassword } from "@/lib/passwords";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const userCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(190),
  password: z.string().min(12).max(128).optional().or(z.literal("")),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  persistentSession: z.boolean().default(false),
});

function normalizeError(error: unknown) {
  return error instanceof z.ZodError
    ? new AppError("Revisa los datos del usuario. La contraseña debe tener al menos 12 caracteres.", "INVALID_USER", 400)
    : error;
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: adminUserSelect });
    return NextResponse.json({ users: users.map(publicAdminUser) }, { headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeError(caught);
    await recordError(error, { source: "admin_users_api", path: "/api/admin/users" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    await requireAdmin();
    const input = userCreateSchema.parse(await request.json());
    const email = input.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new AppError("Ya existe un usuario con ese correo.", "EMAIL_EXISTS", 409);
    }

    const passwordHash = input.password ? await hashPassword(input.password) : null;
    const user = await prisma.user.create({
      data: { name: input.name, email, passwordHash, role: input.role, status: input.status, persistentSession: input.persistentSession },
      select: adminUserSelect,
    });
    return NextResponse.json({ user: publicAdminUser(user) }, { status: 201, headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeError(caught);
    await recordError(error, { source: "admin_user_create_api", path: "/api/admin/users" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}
