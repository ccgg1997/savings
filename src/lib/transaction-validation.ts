import { z } from "zod";
import { AppError } from "@/lib/errors";

export const transactionInputSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().trim().min(2).max(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.coerce.number().positive().max(999_999_999_999),
  account: z.string().trim().min(1).max(100),
  category: z.string().trim().min(1).max(100),
  division: z.string().trim().min(1).max(100),
});

const optionNameSchema = z.string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => !value.includes(","), "Las opciones de Notion no pueden contener comas.");

const transactionOptionBaseSchema = z.object({
  type: z.enum(["income", "expense"]),
  field: z.enum(["category", "division"]),
});

export const createTransactionOptionSchema = transactionOptionBaseSchema.extend({
  name: optionNameSchema,
});

export const renameTransactionOptionSchema = transactionOptionBaseSchema.extend({
  currentName: optionNameSchema,
  nextName: optionNameSchema,
});

export const deleteTransactionOptionSchema = transactionOptionBaseSchema.extend({
  name: optionNameSchema,
  replacement: optionNameSchema.optional(),
});

export function normalizeTransactionError(error: unknown) {
  return error instanceof z.ZodError
    ? new AppError("Revisa los datos del movimiento. Todos los campos son obligatorios y el monto debe ser mayor que cero.", "INVALID_TRANSACTION", 400)
    : error;
}

export function normalizeTransactionOptionError(error: unknown) {
  return error instanceof z.ZodError
    ? new AppError(error.issues[0]?.message ?? "Revisa el nombre de la opción.", "INVALID_TRANSACTION_OPTION", 400)
    : error;
}
