import { LoginCard } from "@/components/login-card";
import { getAuthConfigurationStatus } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <LoginCard authStatus={getAuthConfigurationStatus()} authError={error} />;
}
