import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AdminView } from "@/components/admin-view";
import { getAppSettings } from "@/lib/settings";
import { getCurrentSession } from "@/lib/permissions";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { recordError } from "@/lib/errors";
import { adminUserSelect, publicAdminUser } from "@/lib/admin-users";
import { isGoogleConfigured } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getCurrentSession();
  if (!session?.user || session.user.status !== "ACTIVE" || !session.user.sessionValid) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const settings = await getAppSettings();
  let users: ReturnType<typeof publicAdminUser>[] = [];
  if (isDatabaseConfigured) {
    try { users = (await prisma.user.findMany({ orderBy: { createdAt: "desc" }, select: adminUserSelect })).map(publicAdminUser); }
    catch (error) { await recordError(error, { source: "admin_page", path: "/admin", userId: session.user.id }); }
  }
  return <AppShell session={session} settings={settings}><AdminView initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() }))} initialSettings={settings} currentUserId={session.user.id} googleConfigured={isGoogleConfigured()} /></AppShell>;
}
