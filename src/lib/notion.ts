import { Client } from "@notionhq/client";
import { AppError } from "@/lib/errors";

type NotionProperty = Record<string, unknown>;
type NotionRow = { id: string; properties: Record<string, NotionProperty>; created_time: string };
type DatabaseProperty = {
  id: string;
  type: string;
  select?: { options?: Array<{ name?: string }> };
  status?: { options?: Array<{ name?: string }> };
  multi_select?: { options?: Array<{ name?: string }> };
};
type DatabaseSchema = Record<string, DatabaseProperty>;

export type TransactionType = "income" | "expense";

export type TransactionRecord = {
  id: string;
  type: TransactionType;
  description: string;
  date: string;
  amount: number;
  account: string;
  category: string;
  division: string;
};

export type TransactionInput = Omit<TransactionRecord, "id">;

export type TransactionFormOptions = {
  accounts: string[];
  categories: string[];
  divisions: string[];
};

export type TransactionsData = {
  source: "notion" | "demo";
  transactions: TransactionRecord[];
  accounts: string[];
  categories: string[];
  divisions: string[];
  formOptions: Record<TransactionType, TransactionFormOptions>;
  updatedAt: string;
};

export type ExpenseDivision = {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  categories: Array<{ label: string; amount: number; percentage: number }>;
};

export type DashboardData = {
  source: "notion" | "demo";
  period: string;
  metrics: { totalIncome: number; totalExpenses: number; savings: number; savingsRate: number };
  expenseCategories: Array<{ label: string; amount: number; percentage: number; color: string }>;
  expenseDivisions: ExpenseDivision[];
  incomeSources: Array<{ label: string; amount: number; percentage: number }>;
  monthlyTrend: Array<{ label: string; income: number; expenses: number }>;
  recentTransactions: TransactionRecord[];
  budget: number | null;
  updatedAt: string;
};

const colors = ["#2877c8", "#4da87a", "#f59e0b", "#e95454", "#8b6bc9", "#94a3b8"];
const descriptionNames = ["Descripción", "Descripcion", "Description", "Nombre", "Name", "Concepto", "Detalle"];
const amountNames = ["Monto", "Amount", "Valor", "Total"];
const dateNames = ["Fecha", "Date", "Día", "Dia"];
const accountNames = ["Cuenta", "Account", "Banco", "Medio", "Método", "Metodo"];
const categoryNames = ["Categoría", "Categoria", "Category", "Clasificación", "Clasificacion", "Classification", "Fuente", "Source", "Tipo"];
const divisionNames = ["División", "Division", "Área", "Area", "Grupo", "Group", "Segmento"];

export function isNotionConfigured() {
  return Boolean(process.env.NOTION_TOKEN && process.env.NOTION_DB_INGRESOS && process.env.NOTION_DB_GASTOS);
}

function notionClient() {
  return new Client({ auth: process.env.NOTION_TOKEN, notionVersion: process.env.NOTION_VERSION });
}

function normalized(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function propertyByNames(properties: Record<string, NotionProperty>, names: string[]) {
  const wanted = names.map(normalized);
  const entry = Object.entries(properties).find(([name]) => wanted.includes(normalized(name)));
  return entry?.[1];
}

function categoryValue(properties: Record<string, NotionProperty>) {
  const wanted = categoryNames.map(normalized);
  const matches = Object.entries(properties).filter(([name]) => wanted.includes(normalized(name)));
  const ordered = [...matches.filter(([, property]) => property.type !== "title"), ...matches.filter(([, property]) => property.type === "title")];
  for (const [, property] of ordered) {
    const value = textValue(property);
    if (value) return value;
  }
  return null;
}

function schemaPropertyByNames(schema: DatabaseSchema, names: string[], excluded = new Set<string>()) {
  const wanted = names.map(normalized);
  return Object.entries(schema).find(([name]) => !excluded.has(name) && wanted.includes(normalized(name)));
}

function textValue(property: NotionProperty | undefined): string | null {
  if (!property) return null;
  const title = property.title as Array<{ plain_text?: string }> | undefined;
  const richText = property.rich_text as Array<{ plain_text?: string }> | undefined;
  const select = property.select as { name?: string } | null | undefined;
  const status = property.status as { name?: string } | null | undefined;
  const multiSelect = property.multi_select as Array<{ name?: string }> | undefined;
  const value = title?.[0]?.plain_text ?? richText?.[0]?.plain_text ?? select?.name ?? status?.name ?? multiSelect?.[0]?.name;
  return value?.trim() || null;
}

function numberValue(property: NotionProperty | undefined): number {
  if (!property) return 0;
  if (typeof property.number === "number") return property.number;
  const formula = property.formula as { number?: number } | undefined;
  if (typeof formula?.number === "number") return formula.number;
  const text = textValue(property)?.replace(/[^0-9,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateValue(property: NotionProperty | undefined, fallback: string) {
  const date = property?.date as { start?: string } | null | undefined;
  return date?.start ?? fallback;
}

async function queryDatabase(databaseId: string): Promise<NotionRow[]> {
  const client = notionClient();
  const rows: NotionRow[] = [];
  let cursor: string | undefined;
  do {
    const response = await client.databases.query({ database_id: databaseId, page_size: 100, start_cursor: cursor });
    rows.push(...(response.results as unknown as NotionRow[]));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);
  return rows;
}

function rowToTransaction(row: NotionRow, type: TransactionType): TransactionRecord {
  const category = categoryValue(row.properties) ?? (type === "income" ? "Ingreso" : "Otros");
  const division = textValue(propertyByNames(row.properties, divisionNames)) ?? (type === "income" ? "Ingresos" : "Sin división");
  return {
    id: row.id,
    type,
    amount: Math.abs(numberValue(propertyByNames(row.properties, amountNames))),
    description: textValue(propertyByNames(row.properties, descriptionNames)) ?? category,
    account: textValue(propertyByNames(row.properties, accountNames)) ?? "Sin cuenta",
    category,
    division,
    date: dateValue(propertyByNames(row.properties, dateNames), row.created_time),
  };
}

function monthKey(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 7) : parsed.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const date = new Date(`${key}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date).replace(".", "");
}

function sortTransactions(items: TransactionRecord[]) {
  return [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function demoTransactions(): TransactionRecord[] {
  return sortTransactions([
    { id: "demo-income-salary", type: "income", description: "Salario", date: "2024-06-01", amount: 3000000, account: "Bancolombia", category: "Salario", division: "Ingresos" },
    { id: "demo-income-freelance", type: "income", description: "Proyecto freelance", date: "2024-06-06", amount: 450000, account: "Nequi", category: "Freelance", division: "Ingresos" },
    { id: "demo-home", type: "expense", description: "Arriendo", date: "2024-06-02", amount: 752000, account: "Bancolombia", category: "Vivienda", division: "Hogar" },
    { id: "demo-market", type: "expense", description: "Supermercado", date: "2024-06-04", amount: 430000, account: "Bancolombia", category: "Alimentación", division: "Hogar" },
    { id: "demo-transport", type: "expense", description: "Transporte", date: "2024-06-08", amount: 322000, account: "Nequi", category: "Transporte", division: "Movilidad" },
    { id: "demo-services", type: "expense", description: "Servicios públicos", date: "2024-06-10", amount: 215000, account: "Bancolombia", category: "Servicios", division: "Hogar" },
    { id: "demo-fun", type: "expense", description: "Entretenimiento", date: "2024-06-12", amount: 215000, account: "Daviplata", category: "Entretenimiento", division: "Estilo de vida" },
    { id: "demo-other", type: "expense", description: "Compras varias", date: "2024-06-14", amount: 216000, account: "Nequi", category: "Otros", division: "Estilo de vida" },
  ]);
}

async function loadTransactions(): Promise<{ source: "notion" | "demo"; items: TransactionRecord[] }> {
  if (!isNotionConfigured()) {
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_DATA === "true") return { source: "demo", items: demoTransactions() };
    throw new AppError("La integración con Notion no está configurada.", "NOTION_NOT_CONFIGURED", 503);
  }

  const [incomeRows, expenseRows] = await Promise.all([
    queryDatabase(process.env.NOTION_DB_INGRESOS!),
    queryDatabase(process.env.NOTION_DB_GASTOS!),
  ]);
  return {
    source: "notion",
    items: sortTransactions([
      ...incomeRows.map((row) => rowToTransaction(row, "income")),
      ...expenseRows.map((row) => rowToTransaction(row, "expense")),
    ].filter((item) => item.amount > 0)),
  };
}

function uniqueValues(items: TransactionRecord[], field: "account" | "category" | "division") {
  return [...new Set(items.map((item) => item[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function schemaOptionValues(schema: DatabaseSchema, names: string[]) {
  const wanted = names.map(normalized);
  const matches = Object.entries(schema).filter(([name]) => wanted.includes(normalized(name)));
  const property = matches.find(([, candidate]) => ["select", "status", "multi_select"].includes(candidate.type))?.[1] ?? matches[0]?.[1];
  if (!property) return [];
  const options = property.type === "select"
    ? property.select?.options
    : property.type === "status"
      ? property.status?.options
      : property.type === "multi_select"
        ? property.multi_select?.options
        : [];
  return (options ?? []).map((option) => option.name?.trim()).filter((value): value is string => Boolean(value));
}

function mergeOptions(...groups: string[][]) {
  return [...new Set(groups.flat().filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
}

function formOptionsFor(type: TransactionType, items: TransactionRecord[], schema?: DatabaseSchema): TransactionFormOptions {
  const records = items.filter((item) => item.type === type);
  return {
    accounts: mergeOptions(schema ? schemaOptionValues(schema, accountNames) : [], uniqueValues(records, "account")),
    categories: mergeOptions(schema ? schemaOptionValues(schema, categoryNames) : [], uniqueValues(records, "category")),
    divisions: mergeOptions(schema ? schemaOptionValues(schema, divisionNames) : [], uniqueValues(records, "division")),
  };
}

export async function getTransactionsData(): Promise<TransactionsData> {
  const { source, items } = await loadTransactions();
  const [incomeSchema, expenseSchema] = source === "notion"
    ? await Promise.all([
      databaseSchema(process.env.NOTION_DB_INGRESOS!),
      databaseSchema(process.env.NOTION_DB_GASTOS!),
    ])
    : [undefined, undefined];
  return {
    source,
    transactions: items,
    accounts: uniqueValues(items, "account"),
    categories: uniqueValues(items, "category"),
    divisions: uniqueValues(items, "division"),
    formOptions: {
      income: formOptionsFor("income", items, incomeSchema),
      expense: formOptionsFor("expense", items, expenseSchema),
    },
    updatedAt: new Date().toISOString(),
  };
}

function grouped(items: Array<{ label: string; amount: number }>) {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(item.label, (map.get(item.label) ?? 0) + item.amount));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function buildExpenseDivisions(expenses: TransactionRecord[], totalIncome: number): ExpenseDivision[] {
  const divisions = new Map<string, { amount: number; categories: Map<string, number> }>();
  expenses.forEach((item) => {
    const division = divisions.get(item.division) ?? { amount: 0, categories: new Map<string, number>() };
    division.amount += item.amount;
    division.categories.set(item.category, (division.categories.get(item.category) ?? 0) + item.amount);
    divisions.set(item.division, division);
  });

  return [...divisions.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([label, value], index) => ({
      label,
      amount: value.amount,
      percentage: totalIncome ? (value.amount / totalIncome) * 100 : 0,
      color: colors[index % colors.length],
      categories: [...value.categories.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, amount]) => ({ label: category, amount, percentage: value.amount ? (amount / value.amount) * 100 : 0 })),
    }));
}

export function createDemoDashboardData(): DashboardData {
  const transactions = demoTransactions();
  return dashboardFromTransactions("demo", transactions, 2400000, new Date().toISOString());
}

function dashboardFromTransactions(source: "notion" | "demo", transactions: TransactionRecord[], budget: number | null, updatedAt: string): DashboardData {
  const incomes = transactions.filter((item) => item.type === "income");
  const expenses = transactions.filter((item) => item.type === "expense");
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const savings = totalIncome - totalExpenses;
  const categoryGroups = grouped(expenses.map((item) => ({ label: item.category, amount: item.amount })));
  const sourceGroups = grouped(incomes.map((item) => ({ label: item.category, amount: item.amount })));
  const trendMap = new Map<string, { income: number; expenses: number }>();

  incomes.forEach((item) => {
    const key = monthKey(item.date);
    const current = trendMap.get(key) ?? { income: 0, expenses: 0 };
    current.income += item.amount;
    trendMap.set(key, current);
  });
  expenses.forEach((item) => {
    const key = monthKey(item.date);
    const current = trendMap.get(key) ?? { income: 0, expenses: 0 };
    current.expenses += item.amount;
    trendMap.set(key, current);
  });

  const validDates = transactions.map((item) => new Date(item.date).getTime()).filter(Number.isFinite);
  const referenceDate = new Date(validDates.length ? Math.max(...validDates) : Date.now());
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - (5 - index), 1));
    const key = date.toISOString().slice(0, 7);
    return [key, trendMap.get(key) ?? { income: 0, expenses: 0 }] as const;
  });

  return {
    source,
    period: new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(referenceDate),
    metrics: { totalIncome, totalExpenses, savings, savingsRate: totalIncome ? (savings / totalIncome) * 100 : 0 },
    expenseCategories: categoryGroups.map(([label, amount], index) => ({ label, amount, percentage: totalExpenses ? (amount / totalExpenses) * 100 : 0, color: colors[index % colors.length] })),
    expenseDivisions: buildExpenseDivisions(expenses, totalIncome),
    incomeSources: sourceGroups.map(([label, amount]) => ({ label, amount, percentage: totalIncome ? (amount / totalIncome) * 100 : 0 })),
    monthlyTrend: trend.map(([key, value]) => ({ label: monthLabel(key), ...value })),
    recentTransactions: sortTransactions(transactions),
    budget,
    updatedAt,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const { source, items } = await loadTransactions();
  return dashboardFromTransactions(source, items, null, new Date().toISOString());
}

async function databaseSchema(databaseId: string): Promise<DatabaseSchema> {
  const database = await notionClient().databases.retrieve({ database_id: databaseId });
  return database.properties as unknown as DatabaseSchema;
}

async function ensureTransactionSchema(databaseId: string, schema: DatabaseSchema) {
  const additions: Record<string, unknown> = {};
  const titleName = Object.entries(schema).find(([, property]) => property.type === "title")?.[0];
  const excludedTitle = new Set(titleName ? [titleName] : []);
  if (!schemaPropertyByNames(schema, dateNames)) additions.Fecha = { date: {} };
  if (!schemaPropertyByNames(schema, accountNames)) additions.Cuenta = { rich_text: {} };
  if (!schemaPropertyByNames(schema, categoryNames, excludedTitle)) additions[titleName && normalized(titleName) === normalized("Categoría") ? "Clasificación" : "Categoría"] = { select: { options: [] } };
  if (!schemaPropertyByNames(schema, divisionNames)) additions["División"] = { select: { options: [] } };
  if (!Object.keys(additions).length) return schema;

  const database = await notionClient().databases.update({
    database_id: databaseId,
    properties: additions as never,
  });
  return database.properties as unknown as DatabaseSchema;
}

function writableValue(type: string, value: string | number) {
  switch (type) {
    case "title": return { title: [{ text: { content: String(value) } }] };
    case "rich_text": return { rich_text: [{ text: { content: String(value) } }] };
    case "number": return { number: Number(value) };
    case "date": return { date: { start: String(value) } };
    case "select": return { select: { name: String(value) } };
    case "status": return { status: { name: String(value) } };
    case "multi_select": return { multi_select: [{ name: String(value) }] };
    default: return null;
  }
}

function transactionProperties(schema: DatabaseSchema, input: TransactionInput) {
  const properties: Record<string, unknown> = {};
  const used = new Set<string>();
  const titleEntry = schemaPropertyByNames(schema, descriptionNames) ?? Object.entries(schema).find(([, property]) => property.type === "title");
  if (!titleEntry) throw new AppError("La base de Notion necesita una propiedad de título.", "NOTION_TITLE_REQUIRED", 400);

  function assign(entry: [string, DatabaseProperty] | undefined, value: string | number, required: boolean, label: string) {
    if (!entry) {
      if (required) throw new AppError(`La base de Notion necesita la propiedad ${label}.`, "NOTION_SCHEMA_INVALID", 400);
      return;
    }
    const propertyValue = writableValue(entry[1].type, value);
    if (!propertyValue) {
      if (required) throw new AppError(`La propiedad ${label} de Notion no admite escritura.`, "NOTION_PROPERTY_READ_ONLY", 400);
      return;
    }
    properties[entry[0]] = propertyValue;
    used.add(entry[0]);
  }

  assign(titleEntry, input.description, true, "Descripción");
  assign(schemaPropertyByNames(schema, amountNames, used), input.amount, true, "Monto");
  assign(schemaPropertyByNames(schema, dateNames, used), input.date, true, "Fecha");
  assign(schemaPropertyByNames(schema, accountNames, used), input.account, false, "Cuenta");
  assign(schemaPropertyByNames(schema, categoryNames, used), input.category, true, "Categoría");
  assign(schemaPropertyByNames(schema, divisionNames, used), input.division, true, "División");
  return properties;
}

function databaseIdFor(type: TransactionType) {
  return type === "income" ? process.env.NOTION_DB_INGRESOS! : process.env.NOTION_DB_GASTOS!;
}

function requireNotionWriteConfiguration() {
  if (!isNotionConfigured()) throw new AppError("Configura Notion antes de crear o editar movimientos.", "NOTION_NOT_CONFIGURED", 503);
}

async function managedPage(pageId: string) {
  requireNotionWriteConfiguration();
  const page = await notionClient().pages.retrieve({ page_id: pageId });
  const parent = (page as unknown as { parent: { type?: string; database_id?: string } }).parent;
  const incomeDatabase = process.env.NOTION_DB_INGRESOS!;
  const expenseDatabase = process.env.NOTION_DB_GASTOS!;
  const normalizedId = (value: string) => value.replace(/-/g, "").toLowerCase();
  if (parent.type !== "database_id" || !parent.database_id || ![incomeDatabase, expenseDatabase].some((id) => normalizedId(id) === normalizedId(parent.database_id!))) {
    throw new AppError("El movimiento no pertenece a una base administrada por esta aplicación.", "TRANSACTION_NOT_MANAGED", 403);
  }
  return { page: page as unknown as NotionRow, databaseId: parent.database_id, type: normalizedId(parent.database_id) === normalizedId(incomeDatabase) ? "income" as const : "expense" as const };
}

export async function createTransaction(input: TransactionInput): Promise<TransactionRecord> {
  requireNotionWriteConfiguration();
  const databaseId = databaseIdFor(input.type);
  const schema = await ensureTransactionSchema(databaseId, await databaseSchema(databaseId));
  const page = await notionClient().pages.create({
    parent: { database_id: databaseId },
    properties: transactionProperties(schema, input) as never,
  });
  return rowToTransaction(page as unknown as NotionRow, input.type);
}

export async function updateTransaction(pageId: string, input: TransactionInput): Promise<TransactionRecord> {
  const current = await managedPage(pageId);
  if (current.type !== input.type) throw new AppError("No se puede cambiar el tipo de un movimiento existente.", "TRANSACTION_TYPE_IMMUTABLE", 400);
  const schema = await ensureTransactionSchema(current.databaseId, await databaseSchema(current.databaseId));
  const page = await notionClient().pages.update({
    page_id: pageId,
    properties: transactionProperties(schema, input) as never,
  });
  return rowToTransaction(page as unknown as NotionRow, input.type);
}

export async function deleteTransaction(pageId: string) {
  await managedPage(pageId);
  await notionClient().pages.update({ page_id: pageId, archived: true });
  return pageId;
}
