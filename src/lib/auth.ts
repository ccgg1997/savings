import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { recordError } from "@/lib/errors";
import { verifyPassword } from "@/lib/passwords";
import { isDatabaseConfigured, prisma } from "@/lib/prisma";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const secretConfigured = Boolean(process.env.NEXTAUTH_SECRET);
const credentialsConfigured = secretConfigured && isDatabaseConfigured;
const adminEmails = new Set((process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean));
const credentialsSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) });

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Correo y contraseña",
    credentials: {
      email: { label: "Correo", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const parsed = credentialsSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const email = parsed.data.email.toLowerCase();
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.status !== "ACTIVE") return null;
        if (!(await verifyPassword(parsed.data.password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      } catch (error) {
        await recordError(error, { source: "auth.credentials", metadata: { email } });
        throw error;
      }
    },
  }),
];

if (googleConfigured) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    allowDangerousEmailAccountLinking: true,
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email.toLowerCase(),
        image: profile.picture,
      };
    },
    authorization: {
      params: process.env.GOOGLE_DEFAULT_EMAIL ? { login_hint: process.env.GOOGLE_DEFAULT_EMAIL } : {},
    },
  }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  providers,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  logger: {
    error(code, metadata) {
      void recordError(new Error(code), { source: "next_auth.error", metadata: metadata as Record<string, unknown> });
    },
    warn(code) {
      void recordError(new Error(code), { source: "next_auth.warning" });
    },
    debug() {},
  },
  events: {
    async createUser({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email || !adminEmails.has(email)) return;

      try {
        await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      } catch (error) {
        await recordError(error, { source: "auth.create_user", userId: user.id, metadata: { email } });
        throw error;
      }
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;
      if (account?.provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified === false) return false;

      try {
        const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, status: true } });
        if (existing?.status === "SUSPENDED") return false;
        if (!existing && !adminEmails.has(email)) return false;
        if (existing && adminEmails.has(email) && existing.role !== "ADMIN") {
          await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
        }
        return true;
      } catch (error) {
        await recordError(error, { source: "auth.sign_in", metadata: { email } });
        throw error;
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (!session.user || !token.sub) return session;

      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { id: true, name: true, email: true, image: true, role: true, status: true },
        });
        session.user.id = token.sub;
        session.user.role = dbUser?.role ?? "USER";
        session.user.status = dbUser?.status ?? "SUSPENDED";
        if (dbUser) {
          session.user.name = dbUser.name;
          session.user.email = dbUser.email;
          session.user.image = dbUser.image;
        }
      } catch (error) {
        await recordError(error, { source: "auth.session", userId: token.sub });
        throw error;
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
    credentialsConfigured,
    secretConfigured,
    databaseConfigured: isDatabaseConfigured,
    ready: credentialsConfigured || (googleConfigured && secretConfigured && isDatabaseConfigured),
  };
}
