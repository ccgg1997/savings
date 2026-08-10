import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MovementsView } from "@/components/movements-view";
import { getTransactionsData, type TransactionsData } from "@/lib/notion";
import { getAppSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/permissions";
import { recordError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function MovementsPage({ searchParams }: { searchParams: Promise<{ division?: string; category?: string; type?: string }> }) {
  const session = await getCurrentSession();
  if (!session?.user || session.user.status !== "ACTIVE" || !session.user.sessionValid) redirect("/login");
  const { division, category, type } = await searchParams;
  const initialType = type === "income" || type === "expense" ? type : undefined;

  let data: TransactionsData;
  try {
    data = await getTransactionsData();
  } catch (error) {
    await recordError(error, { source: "movements_page", path: "/movimientos", userId: session.user.id });
    data = {
      source: "demo",
      transactions: [],
      accounts: [],
      categories: [],
      divisions: [],
      formOptions: {
        income: { accounts: [], categories: [], divisions: [] },
        expense: { accounts: [], categories: [], divisions: [] },
      },
      updatedAt: new Date().toISOString(),
    };
  }
  const settings = await getAppSettings();
  return <AppShell session={session} settings={settings}><MovementsView initialData={data} initialDivision={division} initialCategory={category} initialType={initialType} /></AppShell>;
}
