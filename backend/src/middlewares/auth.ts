import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user: { userId: number; role: string };
    }
  }
}



//================================================================================== requireLogin ========================================================================

export function requireLogin(req: Request, res: Response, next: NextFunction) {


  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "login required" });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as { userId: number; role: string };
    req.user = { userId: payload.userId, role: payload.role };

    next(); 
  } catch (error) {
    return res.status(401).json({ message: "invalid or expired token" });
  }
}



//================================================================================== requireAdmin ==========================================================================

export function requireAdmin(req: Request, res: Response, next: NextFunction) {

  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "admin only" });
  }

  next();
}
