import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secure_default_secret_for_logistiq_ai_security_2026";

export function authenticateToken(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentification requise : Jeton de connexion manquant." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Votre session a expiré ou le jeton de connexion est invalide." });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ error: `Accès non autorisé : Vous n'avez pas de privilège suffisant.` });
    }
    const role = req.user.role;
    if (role === "Admin" || allowedRoles.includes(role)) {
      return next();
    }
    return res.status(403).json({ error: `Accès non autorisé : Vous n'avez pas de privilège suffisant.` });
  };
}
