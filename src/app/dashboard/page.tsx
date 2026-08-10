import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { getDashboardData } from "@/lib/notion";
import { getAppSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/permissions";
import { recordError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.status !== "ACTIVE") redirect("/login");

  let data;
  try { data = await getDashboardData(); }
  catch (error) { await recordError(error, { source: "dashboard_page", path: "/dashboard", userId: session.user.id }); data = undefined; }
  const settings = await getAppSettings();
  return <AppShell session={session} settings={settings}>{data ? <DashboardView initialData={data} settings={settings} /> : <div className="rounded-2xl border border-border bg-card p-8 text-center"><h1 className="text-xl font-bold">No pudimos cargar el dashboard</h1><p className="mt-2 text-sm text-muted-foreground">La incidencia fue registrada. Revisa la configuración de Notion o intenta actualizar la página.</p></div>}</AppShell>;
}
