import type { NextFunction, Request, Response } from "express";
import { Role } from "core/constants/role";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== Role.admin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}
