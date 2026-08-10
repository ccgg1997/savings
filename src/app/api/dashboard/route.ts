import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/notion";
import { recordError, jsonError, requestId } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const user = await requireUser();
    const data = await getDashboardData();
    return NextResponse.json(data, { headers: { "x-request-id": id, "cache-control": "private, max-age=60" } });
  } catch (error) {
    await recordError(error, { source: "dashboard_api", path: "/api/dashboard" });
    const status = error instanceof Error && "status" in error ? Number((error as { status: number }).status) : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}

