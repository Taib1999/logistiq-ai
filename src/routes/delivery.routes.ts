import { Router } from "express";
import { getActivePlan, updateDeliveryStatus, geocodeAddress, scanOcr } from "../controllers/delivery.controller";
import { authenticateToken } from "../middleware/auth.middleware";

const router = Router();

// Retrieve active logistics plan from SQLite
router.get("/plans/active", authenticateToken, getActivePlan);

// Update delivery/stop details like status and Bon de Livraison
router.put("/deliveries/:id", authenticateToken, updateDeliveryStatus);

// Geocode route proxy for maps auto-completion
router.get("/geocode", authenticateToken, geocodeAddress);

// OCR scan verification
router.post("/scanner/ocr", authenticateToken, scanOcr);

export default router;
