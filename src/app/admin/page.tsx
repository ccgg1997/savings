import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminView } from "@/components/admin-view";
import { getAppSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/permissions";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { recordError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const settings = await getAppSettings();
  let users: Array<{ id: string; name: string | null; email: string | null; image: string | null; role: "USER" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; createdAt: Date; updatedAt: Date }> = [];
  if (isDatabaseConfigured) {
    try { users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, image: true, role: true, status: true, createdAt: true, updatedAt: true } }); }
    catch (error) { await recordError(error, { source: "admin_page", path: "/admin", userId: session.user.id }); }
  }
  return <AppShell session={session} settings={settings}><AdminView initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))} initialSettings={settings} /></AppShell>;
}
