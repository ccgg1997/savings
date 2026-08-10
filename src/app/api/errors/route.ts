import { NextResponse } from "next/server";
import { z } from "zod";
import { recordError } from "@/lib/errors";
import { getCurrentSession } from "@/lib/permissions";

const errorSchema = z.object({
  message: z.string().min(1).max(1000),
  stack: z.string().max(8000).optional(),
  source: z.string().max(120).default("client"),
  path: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = errorSchema.parse(await request.json());
    const session = await getCurrentSession();
    await recordError(new Error(body.message), { source: body.source, path: body.path, userId: session?.user?.id, metadata: { ...body.metadata, stack: body.stack } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 202 });
  }
}

