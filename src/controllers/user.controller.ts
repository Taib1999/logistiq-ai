import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../services/db.service";

export async function listUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    const safeUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      role: u.role,
      driverName: u.driverName,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    console.error("Error listing users:", err);
    res.status(500).json({ error: "Impossible de récupérer les utilisateurs." });
  }
}

export async function createUser(req: Request, res: Response) {
  const { username, name, role, password, driverName } = req.body;

  if (!username || !name || !role || !password) {
    return res.status(400).json({ error: "Tous les champs requis ne sont pas remplis." });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });
    if (existing) {
      return res.status(400).json({ error: "Ce nom d'utilisateur est déjà utilisé." });
    }

    const newUser = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        name,
        role,
        driverName: role === "Chauffeur" ? (driverName || name) : null,
        passwordHash: bcrypt.hashSync(password, 10),
      }
    });

    res.json({
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      driverName: newUser.driverName,
    });
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Une erreur est survenue lors de l'création d'utilisateur." });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: "Utilisateur supprimé avec succès." });
  } catch (err: any) {
    console.error("Error deleting user:", err);
    if (err?.code === "P2025") {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    res.status(500).json({ error: "Impossible de supprimer l'utilisateur." });
  }
}
