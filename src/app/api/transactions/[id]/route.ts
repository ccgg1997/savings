import { NextResponse } from "next/server";
import { deleteTransaction, updateTransaction } from "@/lib/notion";
import { jsonError, recordError, requestId, AppError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { normalizeTransactionError, transactionInputSchema } from "@/lib/transaction-validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    await requireUser();
    const { id: pageId } = await context.params;
    const input = transactionInputSchema.parse(await request.json());
    const transaction = await updateTransaction(pageId, input);
    return NextResponse.json({ transaction }, { headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeTransactionError(caught);
    await recordError(error, { source: "transaction_update_api", path: "/api/transactions/[id]" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const id = requestId(request);
  try {
    await requireUser();
    const { id: pageId } = await context.params;
    const deletedId = await deleteTransaction(pageId);
    return NextResponse.json({ deletedId }, { headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeTransactionError(caught);
    await recordError(error, { source: "transaction_delete_api", path: "/api/transactions/[id]" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}
