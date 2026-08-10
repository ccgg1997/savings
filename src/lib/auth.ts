import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { recordError } from "@/lib/errors";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const secretConfigured = Boolean(process.env.NEXTAUTH_SECRET);
const adminEmails = new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers: googleConfigured
    ? [GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: process.env.GOOGLE_DEFAULT_EMAIL
            ? { login_hint: process.env.GOOGLE_DEFAULT_EMAIL }
            : {},
        },
      })]
    : [],
  session: { strategy: "database" },
  pages: { signIn: "/login", error: "/login" },
  events: {
    async createUser({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || !adminEmails.has(email)) return;

      try {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      } catch (error) {
        await recordError(error, {
          source: "auth.create_user",
          userId: user.id,
          metadata: { email },
        });
        throw error;
      }
    },
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          select: { id: true, role: true, status: true },
        });
        if (existing?.status === "SUSPENDED") return false;
        if (existing && adminEmails.has(email) && existing.role !== "ADMIN") {
          await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
        }
        return true;
      } catch (error) {
        await recordError(error, {
          source: "auth.sign_in",
          metadata: { email },
        });
        throw error;
      }
    },
    async session({ session, user }) {
      if (session.user && user) {
        try {
          session.user.id = user.id;
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true, status: true },
          });
          session.user.role = dbUser?.role ?? "USER";
          session.user.status = dbUser?.status ?? "ACTIVE";
        } catch (error) {
          await recordError(error, {
            source: "auth.session",
            userId: user.id,
          });
          throw error;
        }
      }
      return session;
    },
  },
};

export function isGoogleConfigured() {
  return googleConfigured;
}

export function getAuthConfigurationStatus() {
  return {
    googleConfigured,
    secretConfigured,
    databaseConfigured: isDatabaseConfigured,
    ready: googleConfigured && secretConfigured && isDatabaseConfigured,
  };
}
