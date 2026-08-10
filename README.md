# Centro de Finanzas

Dashboard financiero en Next.js que consume datos de Notion desde el servidor. Incluye autenticación de Google, sesiones persistentes con Prisma/PostgreSQL, roles `USER`/`ADMIN`, configuración visual administrable y registro centralizado de errores.

## Inicio rápido

1. Copia `.env.example` a `.env.local` y completa las variables server-only. El token entregado debe permanecer en `NOTION_TOKEN`; nunca uses `NEXT_PUBLIC_NOTION_TOKEN`.
2. Configura Google OAuth con callback `http://localhost:3000/api/auth/callback/google`.
3. Ejecuta `npm install`, `npm run db:push`, `npm run db:seed` y `npm run dev`.

Para producción, usa PostgreSQL administrado, configura las variables en Vercel y deja `ALLOW_DEMO_DATA=false`. El modo demo solo evita que un preview sin Notion configurado quede sin una interfaz visual; aparece etiquetado en el dashboard.

## Política de sesiones

Desde Administración, cada usuario puede usar una sesión normal de 8 horas o una sesión persistente. La sesión persistente conserva el acceso mientras el navegador mantenga su cookie y el administrador no la revoque. El botón **Cerrar todas las sesiones** invalida inmediatamente los tokens emitidos para ese usuario; suspenderlo o cambiar su contraseña también los invalida.

Después de actualizar el esquema de Prisma, ejecuta `npm run db:push` contra cada base de datos antes de desplegar la nueva versión.

## Notion

Comparte con la integración las bases configuradas en `NOTION_DB_INGRESOS` y `NOTION_DB_GASTOS`. Los nombres aceptados son flexibles: para ingresos se buscan propiedades como `Monto`, `Fuente` y `Fecha`; para gastos, `Monto`, `Categoría` y `Fecha`. La API agregada está en `GET /api/dashboard`.

## Despliegue

Usa `vercel` o conecta el repositorio a Vercel. En Vercel deben existir `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, las variables de Notion y una lista `ADMIN_EMAILS` separada por comas.
