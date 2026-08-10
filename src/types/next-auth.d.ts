import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      status: "ACTIVE" | "SUSPENDED";
      persistentSession: boolean;
      sessionValid: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "USER" | "ADMIN";
    status?: "ACTIVE" | "SUSPENDED";
    sessionVersion?: number;
    sessionStartedAt?: number;
  }
}
