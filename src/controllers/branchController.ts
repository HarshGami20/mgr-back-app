import { Request, Response } from "express";
import { prisma } from "../prisma";
import { User } from "../types/custom";
import { branchesVisibleForUser, branchPublicSelect } from "../utils/userPublic";

export const listBranches = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as User;
  try {
    const branches = await branchesVisibleForUser(user.role, user.id);
    res.json(branches);
  } catch {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

export const createBranch = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as User;
  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Only super_admin can create branches" });
    return;
  }
  const { name, code } = req.body as { name?: string; code?: string | null };
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ message: "name is required" });
    return;
  }
  const codeTrim = typeof code === "string" && code.trim() ? code.trim() : null;
  try {
    const branch = await prisma.branch.create({
      data: {
        name: name.trim(),
        ...(codeTrim ? { code: codeTrim } : {}),
      },
      select: branchPublicSelect,
    });
    res.status(201).json(branch);
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002"
      ? "A branch with this code already exists"
      : "Failed to create branch";
    res.status(400).json({ message: msg });
  }
};

export const updateBranch = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as User;
  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Only super_admin can update branches" });
    return;
  }
  const { id } = req.params;
  const { name, code } = req.body as { name?: string; code?: string | null };
  const data: { name?: string; code?: string | null } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({ message: "name cannot be empty" });
      return;
    }
    data.name = name.trim();
  }
  if (code !== undefined) {
    data.code = typeof code === "string" && code.trim() ? code.trim() : null;
  }
  if (Object.keys(data).length === 0) {
    res.status(400).json({ message: "No fields to update" });
    return;
  }
  try {
    const branch = await prisma.branch.update({
      where: { id },
      data,
      select: branchPublicSelect,
    });
    res.json(branch);
  } catch {
    res.status(400).json({ message: "Failed to update branch" });
  }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
  const user = req.user as User;
  if (user.role !== "super_admin") {
    res.status(403).json({ message: "Only super_admin can delete branches" });
    return;
  }
  const { id } = req.params;
  try {
    await prisma.branch.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(400).json({ message: "Failed to delete branch" });
  }
};
