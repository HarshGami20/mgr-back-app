import { Request, Response, NextFunction } from "express";
import { isDevUserToolsEnabled } from "../modules/users/env";

export const devUserToolsOnly = (_req: Request, res: Response, next: NextFunction): void => {
  if (!isDevUserToolsEnabled()) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  next();
};
