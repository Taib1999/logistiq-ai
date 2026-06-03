import { Request, Response } from "express";
import { prisma } from "../services/db.service";
import { getAiClient, SYSTEM_INSTRUCTION, RESPONSE_SCHEMA } from "../services/gemini.service";
import { getIO } from "../services/socket.service";

// Helper to save a generated or refined plan to SQLite
export async function persistLogisticsPlan(parsedData: any, startCity: string): Promise<any> {
  if (!parsedData || !parsedData.route_plan) return parsedData;
  try {
    // Save in SQLite using Prisma transaction or single relations create
    const savedPlan = await prisma.routePlan.create({
      data: {
        startCity: startCity || "Casablanca",
        summary: parsedData.summary || "",
        driverInstructions: parsedData.driver_instructions || "",
        warnings: JSON.stringify(parsedData.warnings || []),
        costEstimate: parsedData.cost_estimate || "",
        customerMessages: JSON.stringify(parsedData.customer_messages || []),
        deliveries: {
          create: (parsedData.route_plan || []).map((stop: any) => ({
            stop: stop.stop,
            driverName: stop.driver_name,
            estimatedTime: stop.estimated_time,
            priority: stop.priority,
            customerName: stop.customer_name,
            phone: stop.phone,
            status: "pending", // active default
            paymentMethod: stop.payment_method || "COD",
            codAmount: stop.cod_amount || "0 DH",
            preferredTime: stop.preferred_time || "14:00 - 18:00",
          }))
        }
      },
      include: {
        deliveries: true
      }
    });

    const formattedRoutePlan = savedPlan.deliveries.map(d => ({
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

    return {
      id: savedPlan.id,
      summary: savedPlan.summary,
      driver_instructions: savedPlan.driverInstructions,
      warnings: JSON.parse(savedPlan.warnings),
      cost_estimate: savedPlan.costEstimate,
      customer_messages: JSON.parse(savedPlan.customerMessages || "[]"),
      route_plan: formattedRoutePlan,
    };
  } catch (err) {
    console.error("Failed to persist logistics plan in SQLite:", err);
    return parsedData; // fallback to unpersisted structure
  }
}

export async function generatePlan(req: Request, res: Response) {
  try {
    const aiClient = getAiClient();
    const { input, drivers, startTime, startCity } = req.body;

    if (!input || !input.trim()) {
      return res.status(400).json({ error: "Input text is required" });
    }

    const driversList = (drivers || []).map((d: any) => `${d.name} (${d.vehicle || "Motorcycle"})`).join(", ");
    
    const userPrompt = `
Generate a structured logistics plan based on this dirty/messy user request:
---
${input}
---
CONTEXT AND PREFERENCES:
- Start City: ${startCity || "Casablanca"}
- Start Time: ${startTime || "09:00 AM"}
- Registered Drivers available to split: ${driversList || "2 drivers (Default Driver 1, Default Driver 2)"}

Please organize the schedule logically, group stops, assign drivers, estimate timing and calculate cost. Try to identify the neighborhoods or locations correctly.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2, // low temperature for precise, structural predictions
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    
    // Auto persist parsed data to SQLite and get database IDs
    const persistedPlan = await persistLogisticsPlan(parsedData, startCity);

    const io = getIO();
    if (io) {
      io.emit("plan:updated", persistedPlan);
    }

    res.json(persistedPlan);
  } catch (error: any) {
    console.error("Error generating logistics plan:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating the plan" });
  }
}

export async function chatRefinePlan(req: Request, res: Response) {
  try {
    const aiClient = getAiClient();
    const { message, currentPlan, drivers, startCity, startTime } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const driversList = (drivers || []).map((d: any) => `${d.name} (${d.vehicle || "Motorcycle"})`).join(", ");

    const chatContextPrompt = `
We have an active logistics plan session with the dispatcher. 
The dispatcher is talking to you to modify, correct, or ask about the active plan.

CURRENT ACTIVE COGNITIVE PLAN:
\`\`\`json
${JSON.stringify(currentPlan, null, 2)}
\`\`\`

DISPATCHER PREFERENCES:
- Start City: ${startCity}
- Start Time: ${startTime}
- Registered Drivers: ${driversList}

DISPATCHER MESSAGE:
"${message}"

YOUR TASK:
1. Understand the modification requested by the dispatcher (in Darija, French, or Arabic). E.g., reassigning a driver, changing coordinates, altering sequence, ignoring a stop, adding another stop.
2. Apply this change strictly into the json fields.
3. Update the 'summary' field in the JSON with a conversational friendly response to this request in addition to the plan update (e.g. say "Wakha bikhikh! I reassigned sidi maarouf as you wished...") to satisfy the chat experience but always output the proper complete JSON schema.
4. Output should strictly be the valid JSON scheme requested below. No markdown wrappers.
`;

    const response = await aiClient.models.generateContent({
      model: "gemini-2.0-flash",
      contents: chatContextPrompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const parsedData = JSON.parse(response.text || "{}");
    
    // Auto persist parsed data to SQLite and get database IDs
    const persistedPlan = await persistLogisticsPlan(parsedData, startCity);

    const io = getIO();
    if (io) {
      io.emit("plan:updated", persistedPlan);
    }

    res.json(persistedPlan);
  } catch (error: any) {
    console.error("Error in logistics chat endpoint:", error);
    res.status(500).json({ error: error.message || "An error occurred during interactive chat refinement" });
  }
}
