import { NextResponse } from "next/server";
import { z } from "zod";
import { Accent } from "@prisma/client";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAppSettings } from "@/lib/settings";
import { recordError, jsonError, requestId } from "@/lib/errors";

const settingsSchema = z.object({ brandName: z.string().trim().min(2).max(60), dashboardTitle: z.string().trim().min(2).max(80), accent: z.nativeEnum(Accent), compactMode: z.boolean() });

export async function GET(request: Request) {
  const id = requestId(request);
  try { await requireAdmin(); return NextResponse.json(await getAppSettings(), { headers: { "x-request-id": id } }); }
  catch (error) { await recordError(error, { source: "admin_settings_get_api", path: "/api/admin/settings" }); return NextResponse.json(jsonError(error, id), { status: 500 }); }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    const admin = await requireAdmin();
    const changes = settingsSchema.parse(await request.json());
    const settings = await prisma.appSettings.upsert({ where: { id: "default" }, update: { ...changes, updatedById: admin.id }, create: { id: "default", ...changes, updatedById: admin.id } });
    return NextResponse.json({ brandName: settings.brandName, dashboardTitle: settings.dashboardTitle, accent: settings.accent, compactMode: settings.compactMode }, { headers: { "x-request-id": id } });
  } catch (error) { await recordError(error, { source: "admin_settings_patch_api", path: "/api/admin/settings" }); return NextResponse.json(jsonError(error, id), { status: 500 }); }
}

