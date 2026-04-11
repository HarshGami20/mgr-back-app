import { Request, Response } from "express";
import { prisma } from "../../prisma";
import { User } from "../../types/custom";
import { generateToken } from "../../utils/auth";
import { Role as PrismaRole } from "@prisma/client";
import { branchesVisibleForUser, devListUserSelect, userPublicSelect } from "../../utils/userPublic";

const ASSIGNABLE_ROLES: PrismaRole[] = [
  "admin",
  "sales_person",
  "worker",
  "supplier",
  "manufacturer",
];

/** GET /users/roles — roles super_admin may assign when creating or editing users */
export const getAssignableRoles = (_req: Request, res: Response): void => {
  res.json({ roles: ASSIGNABLE_ROLES });
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: userPublicSelect,
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

/** Narrow list for order assignees — available to roles that work with orders (not super-admin–only). */
export const getUsersForOrderAssignment = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: [
            "super_admin",
            "admin",
            "sales_person",
            "worker",
            "supplier",
            "manufacturer",
          ],
        },
      },
      select: userPublicSelect,
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body as { role?: PrismaRole };
  const currentUser = req.user as User;

  if (currentUser.role !== "super_admin") {
    res.status(403).json({ message: "Only super_admin can assign roles" });
    return;
  }

  if (!role || !ASSIGNABLE_ROLES.includes(role)) {
    res.status(400).json({
      message: "Invalid role",
      allowed: ASSIGNABLE_ROLES,
    });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    if (existing.role === "super_admin") {
      res.status(403).json({ message: "Super admin role cannot be changed from the API" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: userPublicSelect,
    });

    res.json({
      message: `Role updated to ${role}`,
      user,
    });
  } catch {
    res.status(500).json({ error: "Failed to update role" });
  }
};

export const updateUserBranches = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { branchIds } = req.body as { branchIds?: string[] };
  const currentUser = req.user as User;

  if (currentUser.role !== "super_admin") {
    res.status(403).json({ message: "Only super_admin can assign branches" });
    return;
  }

  if (!Array.isArray(branchIds)) {
    res.status(400).json({ message: "branchIds must be an array of branch ids" });
    return;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        branches: { set: branchIds.map((bid) => ({ id: bid })) },
      },
      select: userPublicSelect,
    });
    res.json({ message: "Branches updated", user });
  } catch {
    res.status(500).json({ error: "Failed to update branches" });
  }
};

/** GET /users/dev-list — no auth; gated by devUserToolsOnly middleware */
export const listDevUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: devListUserSelect,
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (e) {
    console.error("listDevUsers", e);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

/** POST /users/dev-login { userId } — returns JWT; gated by devUserToolsOnly middleware */
export const devImpersonateLogin = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ message: "userId is required" });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    let branches: Awaited<ReturnType<typeof branchesVisibleForUser>> = [];
    try {
      branches = await branchesVisibleForUser(user.role, user.id);
    } catch (branchErr) {
      console.warn("devImpersonateLogin: could not load branches (run migrations / seed?)", branchErr);
    }
    const token = generateToken(user as User);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branches,
      },
      token,
    });
  } catch (e) {
    console.error("devImpersonateLogin", e);
    res.status(500).json({ message: "Something went wrong" });
  }
};
