import { Request, Response } from "express";
import { prisma } from "../services/db.service";
import { getAiClient, OCR_RESPONSE_SCHEMA } from "../services/gemini.service";
import { getIO } from "../services/socket.service";

export async function getActivePlan(req: Request, res: Response) {
  try {
    const latestPlan = await prisma.routePlan.findFirst({
      orderBy: { createdAt: "desc" },
      include: { deliveries: true }
    });

    if (!latestPlan) {
      return res.json(null);
    }

    const formattedRoutePlan = latestPlan.deliveries.map(d => ({
      id: d.id,
      stop: d.stop,
      driver_name: d.driverName,
      estimated_time: d.estimatedTime,
      priority: d.priority,
      customer_name: d.customerName,
      phone: d.phone,
      status: d.status,
      payment_method: d.paymentMethod,
      cod_amount: d.codAmount,
      preferred_time: d.preferredTime,
      bonDeLivraison: d.bonDeLivraison || null
    }));

    res.json({
      id: latestPlan.id,
      summary: latestPlan.summary,
      driver_instructions: latestPlan.driverInstructions,
      warnings: JSON.parse(latestPlan.warnings),
      cost_estimate: latestPlan.costEstimate,
      customer_messages: JSON.parse(latestPlan.customerMessages || "[]"),
      route_plan: formattedRoutePlan,
    });
  } catch (error: any) {
    console.error("Error retrieving active plan:", error);
    res.status(500).json({ error: "Echec du chargement du plan logistique." });
  }
}

export async function updateDeliveryStatus(req: any, res: Response) {
  const { id } = req.params;
  const { 
    status, 
    bonDeLivraison,
    driverName,
    estimatedTime,
    priority,
    customerName,
    phone,
    paymentMethod,
    codAmount,
    preferredTime
  } = req.body;

  try {
    const existingDelivery = await prisma.delivery.findUnique({ where: { id } });
    if (!existingDelivery) {
      return res.status(404).json({ error: "Opération échouée : colis inexistant." });
    }

    // Security check: Chauffeurs can only update their own assigned orders
    if (req.user.role === "Chauffeur") {
      const driverName = req.user.driverName || req.user.name;
      if (existingDelivery.driverName.toLowerCase() !== driverName.toLowerCase()) {
        return res.status(403).json({ error: "Permission refusée : Vous n'êtes pas assigné à ce colis." });
      }
    }

    const updated = await prisma.delivery.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(bonDeLivraison !== undefined ? { bonDeLivraison } : {}),
        ...(driverName !== undefined ? { driverName } : {}),
        ...(estimatedTime !== undefined ? { estimatedTime } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(customerName !== undefined ? { customerName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod } : {}),
        ...(codAmount !== undefined ? { codAmount } : {}),
        ...(preferredTime !== undefined ? { preferredTime } : {}),
      }
    });

    const parsedUpdated = {
      id: updated.id,
      stop: updated.stop,
      driver_name: updated.driverName,
      estimated_time: updated.estimatedTime,
      priority: updated.priority,
      customer_name: updated.customerName,
      phone: updated.phone,
      status: updated.status,
      payment_method: updated.paymentMethod,
      cod_amount: updated.codAmount,
      preferred_time: updated.preferredTime,
      bonDeLivraison: updated.bonDeLivraison || null
    };

    const io = getIO();
    if (io) {
      io.emit("delivery:updated", parsedUpdated);
    }

    res.json(parsedUpdated);
  } catch (err: any) {
    console.error("Error updating delivery status:", err);
    res.status(500).json({ error: "Une erreur est survenue lors de la mise à jour." });
  }
}

export async function geocodeAddress(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(String(q))}&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LogistiQ-AI/1.0 (bilalsebti2016@gmail.com)"
      }
    });

    if (response.ok) {
      const data = await response.json();
      res.json(data);
    } else {
      res.status(response.status).json({ error: "Failed to fetch from OpenStreetMap Nominatim API" });
    }
  } catch (error: any) {
    console.error("Geocoding API error:", error);
    res.status(500).json({ error: error.message || "An error occurred while calling the OpenStreetMap Geocoding API" });
  }
}

export async function scanOcr(req: Request, res: Response) {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "L'image codée en base64 est requise." });
    }

    // Extract the raw base64 data and its mimeType
    let base64Data = image;
    let mimeType = "image/jpeg"; // default fallback

    const dataUrlMatch = image.match(/^data:([^;]+);base64,(.*)$/);
    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1];
      base64Data = dataUrlMatch[2];
    }

    const aiClient = getAiClient();

    const ocrVisionPrompt = `
You are the high-precision LogistiQ AI Document OCR and Proof of Delivery Signature Checker.
Analyze this image of a shipping receipt / delivery slip (Bon de Livraison in Morocco).

EXTRACT THE FOLLOWING DATA:
1. Is this actually a delivery slip or invoice? (boolean: isDeliverySlip)
2. Is there a readable customer name? (string: clientName)
3. Is there a unique slip / reference number (e.g., AM-908273-TNG or similar code)? (string: slipNumber)
4. Origin city (like Casablanca, Tanger, Marrakech, Kenitra, Rabat)? (string: origin)
5. Destination city (like Casablanca, Tanger, Marrakech, Kenitra, Rabat)? (string: destination)
6. Cargo description (detailed description of goods if present)? (string: cargoDescription)
7. Estimated volume in m³ and weight in kg. Deducing or extracting from slip text or physical items.
8. Validate if there is a signature, initials, hand-drawn sign, custom buyer's stamp (cachet) or validation checkmark anywhere indicating final delivery (hasSignature: boolean). This is extremely critical because our system uses this to automatically complete orders.

Generate a JSON response conforming strictly to the required schema.
`;

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: { parts: [imagePart, { text: ocrVisionPrompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: OCR_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);

  } catch (error: any) {
    console.error("AI OCR Vision error details:", error);
    res.status(500).json({ error: error.message || "Une erreur est survenue lors de l'analyse OCR par l'IA." });
  }
}
