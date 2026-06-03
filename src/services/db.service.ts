import dotenv from "dotenv";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const prisma = new PrismaClient();

export async function seedUsers() {
  const count = await prisma.user.count();
  if (count > 0) return;
  const hashedPassword = await bcrypt.hash("taib123", 10);
  await prisma.user.createMany({
    data: [
      { name: "Taib Hassani", username: "taib@logistiq.ma", passwordHash: hashedPassword, role: "Admin" },
      { name: "Admin LogistiQ", username: "admin@logistiq.ma", passwordHash: hashedPassword, role: "Admin" },
      { name: "Salma Benali", username: "salma@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
      { name: "Driss El Fassi", username: "driss@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
      { name: "Leila Amrani", username: "leila@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
      { name: "Khalid Zniber", username: "khalid@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
      { name: "Amine El Fassi", username: "amine@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
      { name: "Yassine Mansouri", username: "yassine@logistiq.ma", passwordHash: hashedPassword, role: "Chauffeur" },
    ],
  });
}
