import { Role } from "@prisma/client";
import { prisma } from "../prisma";

export const branchPublicSelect = { id: true, name: true, code: true } as const;

export type PublicBranch = {
  id: string;
  name: string;
  code: string | null;
};

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  branches: { select: branchPublicSelect, orderBy: { name: "asc" as const } },
} as const;

/** Dev picker only — no `branches` join so `/users/dev-list` works before branch migrations exist. */
export const devListUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
} as const;

/** Branches visible in the app: super_admin sees all; others see assignments only. */
export async function branchesVisibleForUser(role: Role, userId: string): Promise<PublicBranch[]> {
  if (role === "super_admin") {
    return prisma.branch.findMany({
      select: branchPublicSelect,
      orderBy: { name: "asc" },
    });
  }
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      branches: { select: branchPublicSelect, orderBy: { name: "asc" } },
    },
  });
  return row?.branches ?? [];
}
