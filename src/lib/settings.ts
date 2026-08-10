import { Accent } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export type AppSettingsData = {
  brandName: string;
  dashboardTitle: string;
  accent: Accent;
  compactMode: boolean;
};

export const defaultSettings: AppSettingsData = {
  brandName: "Centro de Finanzas",
  dashboardTitle: "Resumen financiero",
  accent: Accent.MINT,
  compactMode: false,
};

export async function getAppSettings(): Promise<AppSettingsData> {
  if (!isDatabaseConfigured) return defaultSettings;
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  if (!settings) return defaultSettings;
  return { brandName: settings.brandName, dashboardTitle: settings.dashboardTitle, accent: settings.accent, compactMode: settings.compactMode };
}

