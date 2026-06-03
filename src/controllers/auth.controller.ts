import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../services/db.service";

const JWT_SECRET = process.env.JWT_SECRET || "secure_default_secret_for_logistiq_ai_security_2026";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "S'il vous plaît, saisissez un nom d'utilisateur et un mot de passe." });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (!user) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Nom d'utilisateur ou mot de passe incorrect." });
    }

    const payload = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      driverName: user.driverName
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });

    res.json({
      token,
      user: payload
    });
  } catch (error: any) {
    console.error("Login verification error:", error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'authentification." });
  }
}

export function getMe(req: any, res: Response) {
  res.json({ user: req.user });
}
