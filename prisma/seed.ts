import { PrismaClient, Accent } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      brandName: "Centro de Finanzas",
      dashboardTitle: "Resumen financiero",
      accent: Accent.MINT,
      compactMode: false,
    },
  });
}

seed().finally(async () => {
  await prisma.$disconnect();
});

