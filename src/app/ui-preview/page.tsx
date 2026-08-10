import type { Session } from "next-auth";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/dashboard-view";
import { createDemoDashboardData } from "@/lib/notion";
import { defaultSettings } from "@/lib/settings";

const previewSession = {
  expires: "2099-12-31T23:59:59.999Z",
  user: {
    id: "preview-user",
    name: "Cristian",
    email: "preview@example.com",
    image: null,
    role: "ADMIN",
    status: "ACTIVE",
  },
} as Session;

export default function UiPreviewPage() {
  return (
    <AppShell session={previewSession} settings={defaultSettings}>
      <DashboardView initialData={createDemoDashboardData()} settings={defaultSettings} />
    </AppShell>
  );
}
