import { NextResponse } from "next/server";
import { createTransactionOption, deleteTransactionOption, renameTransactionOption } from "@/lib/notion";
import { AppError, jsonError, recordError, requestId } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import {
  createTransactionOptionSchema,
  deleteTransactionOptionSchema,
  normalizeTransactionOptionError,
  renameTransactionOptionSchema,
} from "@/lib/transaction-validation";

function errorResponse(caught: unknown, id: string, source: string) {
  const error = normalizeTransactionOptionError(caught);
  return recordError(error, { source, path: "/api/transaction-options" }).then(() => {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  });
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    await requireUser();
    const input = createTransactionOptionSchema.parse(await request.json());
    const result = await createTransactionOption(input.type, input.field, input.name);
    return NextResponse.json(result, { status: 201, headers: { "x-request-id": id } });
  } catch (caught) {
    return errorResponse(caught, id, "transaction_option_create_api");
  }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    await requireUser();
    const input = renameTransactionOptionSchema.parse(await request.json());
    const result = await renameTransactionOption(input.type, input.field, input.currentName, input.nextName);
    return NextResponse.json(result, { headers: { "x-request-id": id } });
  } catch (caught) {
    return errorResponse(caught, id, "transaction_option_update_api");
  }
}

export async function DELETE(request: Request) {
  const id = requestId(request);
  try {
    await requireUser();
    const input = deleteTransactionOptionSchema.parse(await request.json());
    const result = await deleteTransactionOption(input.type, input.field, input.name, input.replacement);
    return NextResponse.json(result, { headers: { "x-request-id": id } });
  } catch (caught) {
    return errorResponse(caught, id, "transaction_option_delete_api");
  }
}
