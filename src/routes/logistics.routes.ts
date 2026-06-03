import { Router } from "express";
import { generatePlan, chatRefinePlan } from "../controllers/logistics.controller";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireRole(["Dispatcher", "Admin"]));

router.post("/plan", generatePlan);
router.post("/chat", chatRefinePlan);

export default router;
