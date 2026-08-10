import { Prisma } from "@prisma/client";

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  passwordHash: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  accounts: { select: { provider: true } },
} satisfies Prisma.UserSelect;

type SelectedAdminUser = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export function publicAdminUser(user: SelectedAdminUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    hasPassword: Boolean(user.passwordHash),
    providers: [...new Set(user.accounts.map((account) => account.provider))],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
