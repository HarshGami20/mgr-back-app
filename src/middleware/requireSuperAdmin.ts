import { Request, Response, NextFunction } from "express";

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== "super_admin") {
    res.status(403).json({ message: "Access denied. Super Admins only." });
    return;
  }

  next();
};
