import { NextResponse } from "next/server";
import { createTransaction, getTransactionsData } from "@/lib/notion";
import { jsonError, recordError, requestId, AppError } from "@/lib/errors";
import { requireUser } from "@/lib/permissions";
import { normalizeTransactionError, transactionInputSchema } from "@/lib/transaction-validation";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    await requireUser();
    const data = await getTransactionsData();
    return NextResponse.json(data, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (caught) {
    const error = normalizeTransactionError(caught);
    await recordError(error, { source: "transactions_api", path: "/api/transactions" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    await requireUser();
    const input = transactionInputSchema.parse(await request.json());
    const transaction = await createTransaction(input);
    return NextResponse.json({ transaction }, { status: 201, headers: { "x-request-id": id } });
  } catch (caught) {
    const error = normalizeTransactionError(caught);
    await recordError(error, { source: "transaction_create_api", path: "/api/transactions" });
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(jsonError(error, id), { status, headers: { "x-request-id": id } });
  }
}
