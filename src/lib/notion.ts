import { Client } from "@notionhq/client";
import { AppError } from "@/lib/errors";

type NotionProperty = Record<string, unknown>;
type NotionRow = { id: string; properties: Record<string, NotionProperty>; created_time: string };

export type DashboardData = {
  source: "notion" | "demo";
  period: string;
  metrics: { totalIncome: number; totalExpenses: number; savings: number; savingsRate: number };
  expenseCategories: Array<{ label: string; amount: number; percentage: number; color: string }>;
  incomeSources: Array<{ label: string; amount: number; percentage: number }>;
  monthlyTrend: Array<{ label: string; income: number; expenses: number }>;
  recentTransactions: Array<{ id: string; type: "income" | "expense"; description: string; date: string; amount: number; account: string; category: string }>;
  budget: number | null;
  updatedAt: string;
};

const colors = ["#2877c8", "#4da87a", "#f59e0b", "#e95454", "#8b6bc9", "#94a3b8"];

function configured() {
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

function textValue(property: NotionProperty | undefined): string | null {
  if (!property) return null;
  const title = property.title as Array<{ plain_text?: string }> | undefined;
  const richText = property.rich_text as Array<{ plain_text?: string }> | undefined;
  const select = property.select as { name?: string } | null | undefined;
  const status = property.status as { name?: string } | null | undefined;
  const value = title?.[0]?.plain_text ?? richText?.[0]?.plain_text ?? select?.name ?? status?.name;
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

function rowToItem(row: NotionRow, kind: "income" | "expense") {
  const amount = Math.abs(numberValue(propertyByNames(row.properties, ["Monto", "Amount", "Valor", "Total"])));
  const label = textValue(propertyByNames(row.properties, kind === "income" ? ["Fuente", "Source", "Nombre", "Concepto"] : ["Categoría", "Categoria", "Category", "Tipo", "Concepto"])) ?? "Otros";
  const description = textValue(propertyByNames(row.properties, ["Descripción", "Descripcion", "Description", "Nombre", "Concepto", "Detalle"])) ?? label;
  const account = textValue(propertyByNames(row.properties, ["Cuenta", "Account", "Banco", "Medio", "Método", "Metodo"])) ?? "Sin cuenta";
  const date = dateValue(propertyByNames(row.properties, ["Fecha", "Date", "Día", "Dia"]), row.created_time);
  return { id: row.id, kind, amount, label, description, account, date };
}

function monthKey(date: string) {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 7) : parsed.toISOString().slice(0, 7);
}

function monthLabel(key: string) {
  const date = new Date(`${key}-01T12:00:00Z`);
  return new Intl.DateTimeFormat("es-CO", { month: "short" }).format(date).replace(".", "");
}

export function createDemoDashboardData(): DashboardData {
  return {
    source: "demo",
    period: "Junio 2024",
    metrics: { totalIncome: 3450000, totalExpenses: 2150000, savings: 1300000, savingsRate: 37.7 },
    expenseCategories: [
      { label: "Vivienda", amount: 752000, percentage: 35, color: colors[0] },
      { label: "Alimentación", amount: 430000, percentage: 20, color: colors[1] },
      { label: "Transporte", amount: 322000, percentage: 15, color: colors[2] },
      { label: "Servicios", amount: 215000, percentage: 10, color: colors[3] },
      { label: "Entretenimiento", amount: 215000, percentage: 10, color: colors[4] },
      { label: "Otros", amount: 215000, percentage: 10, color: colors[5] },
    ],
    incomeSources: [
      { label: "Empleo Principal", amount: 2960000, percentage: 81 },
      { label: "Proyectos Freelance", amount: 450000, percentage: 13 },
      { label: "Inversiones", amount: 200000, percentage: 6 },
    ],
    monthlyTrend: [
      { label: "Ene", income: 2100000, expenses: 1050000 },
      { label: "Feb", income: 2700000, expenses: 1350000 },
      { label: "Mar", income: 2300000, expenses: 1150000 },
      { label: "Abr", income: 2350000, expenses: 1300000 },
      { label: "May", income: 2700000, expenses: 1350000 },
      { label: "Jun", income: 3050000, expenses: 1750000 },
    ],
    recentTransactions: [
      { id: "demo-income", type: "income", description: "Salario", date: "2024-06-01", amount: 2800000, account: "Bancolombia", category: "Empleo" },
      { id: "demo-market", type: "expense", description: "Supermercado", date: "2024-06-02", amount: 320000, account: "Bancolombia", category: "Alimentación" },
      { id: "demo-transport", type: "expense", description: "Transporte", date: "2024-06-03", amount: 120000, account: "Nequi", category: "Transporte" },
    ],
    budget: 2400000,
    updatedAt: new Date().toISOString(),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!configured()) {
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_DATA === "true") return createDemoDashboardData();
    throw new AppError("La integración con Notion no está configurada.", "NOTION_NOT_CONFIGURED", 503);
  }

  const [incomeRows, expenseRows] = await Promise.all([
    queryDatabase(process.env.NOTION_DB_INGRESOS!),
    queryDatabase(process.env.NOTION_DB_GASTOS!),
  ]);
  const incomes = incomeRows.map((row) => rowToItem(row, "income")).filter((item) => item.amount > 0);
  const expenses = expenseRows.map((row) => rowToItem(row, "expense")).filter((item) => item.amount > 0);
  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const savings = totalIncome - totalExpenses;

  const grouped = (items: Array<{ label: string; amount: number }>) => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.label, (map.get(item.label) ?? 0) + item.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  const categoryGroups = grouped(expenses);
  const sourceGroups = grouped(incomes);
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
  const validDates = [...incomes, ...expenses].map((item) => new Date(item.date).getTime()).filter(Number.isFinite);
  const referenceDate = new Date(validDates.length ? Math.max(...validDates) : Date.now());
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() - (5 - index), 1));
    const key = date.toISOString().slice(0, 7);
    return [key, trendMap.get(key) ?? { income: 0, expenses: 0 }] as const;
  });
  const recentTransactions = [...incomes, ...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((item) => ({ id: item.id, type: item.kind, description: item.description, date: item.date, amount: item.amount, account: item.account, category: item.label }));

  return {
    source: "notion",
    period: new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(new Date()),
    metrics: { totalIncome, totalExpenses, savings, savingsRate: totalIncome ? (savings / totalIncome) * 100 : 0 },
    expenseCategories: categoryGroups.map(([label, amount], index) => ({ label, amount, percentage: totalExpenses ? (amount / totalExpenses) * 100 : 0, color: colors[index % colors.length] })),
    incomeSources: sourceGroups.map(([label, amount]) => ({ label, amount, percentage: totalIncome ? (amount / totalIncome) * 100 : 0 })),
    monthlyTrend: trend.map(([key, value]) => ({ label: monthLabel(key), ...value })),
    recentTransactions,
    budget: null,
    updatedAt: new Date().toISOString(),
  };
}
