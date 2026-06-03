import { Router } from "express";
import { listUsers, createUser, deleteUser } from "../controllers/user.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["Dispatcher", "Admin"]));

router.get("/", listUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;
