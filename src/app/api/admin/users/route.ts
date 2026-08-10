import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { recordError, jsonError, requestId } from "@/lib/errors";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, image: true, role: true, status: true, createdAt: true, updatedAt: true } });
    return NextResponse.json({ users }, { headers: { "x-request-id": id } });
  } catch (error) {
    await recordError(error, { source: "admin_users_api", path: "/api/admin/users" });
    const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 500;
    return NextResponse.json(jsonError(error, id), { status });
  }
}

