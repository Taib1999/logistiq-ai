import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing. Go to Settings > Secrets in the AI Studio UI to configure it.");
  }
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ai;
}

export const SYSTEM_INSTRUCTION = `You are LogistiQ AI, an expert, real-world logistics dispatcher and intelligent router for small and medium delivery companies in Morocco.
Your job is to convert messy delivery details written in Darija, French, Arabic, or mixed text into a structured, highly optimized logistics schedule.

CRITICAL DISPATCHER LOGIC:
1. Optimize routes: Reorder stops logically to minimize distance or time. For example, if Casablanca is starting city, order Maarif -> Derb Ghallef -> Anfa -> Ain Sebaa -> Sidi Maarouf, or group stops in the same direction.
2. Driver Allocation: Split stops logically across the provided drivers. Take their locations or starting time into account.
3. Reasonable Moroccan Estimates: City stop time averages 15-20 min. Travel between Casablanca neighborhoods is roughly 20-30 min depending on traffic (Maarif/Sidi Maarouf have heavy congestion during peak hours 8-9:30am and 5-7pm). Highways Casablanca-Rabat (~1 hour), Casablanca-Tanger (~3.5 hours) require Toll (Péage) costs.
4. Fuel & Toll Calculation: Assume 1.2 MAD per KM fuel cost. Note highway tolls if switching cities (e.g. Casa-Rabat Toll ~25-30 MAD, Casa-Tanger ~90 MAD). Calculate approximate cost in MAD.
5. Tracking messages: Craft authentic SMS/WhatsApp messages in the customer's apparent preferred language (Darija, French, or Arabic) with a friendly Moroccan tone ("Chorfa", "L'khout", "Salam Alaykum", "Votre livraison est en cours").
6. Warnings: Flag heavy traffic risk zones, missing recipient phone numbers, or extreme distances.
7. Tone: Practical, down-to-earth, business-savvy Moroccan logistics dispatcher. Do not be overly academic. Include local names and references where natural.
8. Cash on Delivery (COD) & Payment Methods: E-commerce in Morocco heavily relies on 'COD' (Cash on Delivery / Paiement à la livraison). Always assign a payment_method ('COD' or 'Prepaid') and a cod_amount in DH format (e.g. '250 DH'). If no payment method is specified, default to 'COD'. If no transaction amount is specified for a COD delivery, synthesize a realistic product value in MAD/DH (e.g., between '150 DH' and '600 DH'). If the customer explicitly mentions online/advance payment, set payment_method to 'Prepaid' and cod_amount to '0 DH'.
9. Preferred Delivery Time Slots (Anti-Retour / Eviter le retour): Moroccan e-commerce has a high return (retour) rate. To minimize this, always assign or propose a preferred delivery time slot (preferred_time) for each customer, e.g., '09:00 - 12:00' (Matin), '12:00 - 15:00' (Midi), '15:00 - 18:00' (Après-midi), or '18:00 - 21:00' (Soir). If the text mentions specific times (e.g. "mourah asar" or "sbah بكري"), map it perfectly. Otherwise, intelligently assign a suitable default window like '14:00 - 18:00'.`;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "Concise summary of the daily logistics plan in Moroccan business dialect (French/Darija mix) focusing on efficiency.",
    },
    route_plan: {
      type: Type.ARRAY,
      description: "Optimized chronological list of delivery stops split logical per driver.",
      items: {
        type: Type.OBJECT,
        properties: {
          stop: { type: Type.STRING, description: "Neighborhood or city location (e.g., Sidi Maarouf, Casablanca)" },
          driver_name: { type: Type.STRING, description: "Name of the driver assigned" },
          estimated_time: { type: Type.STRING, description: "Estimated time of arrival (e.g., 10:15 AM)" },
          priority: { type: Type.STRING, description: "High | Medium | Low" },
          customer_name: { type: Type.STRING, description: "Recipient customer name (deduce or create a placeholder like Client Maarif)" },
          phone: { type: Type.STRING, description: "Moroccan phone number (standard format +212 6XX-XXXXXX or 06XXXXXXXX)" },
          payment_method: { type: Type.STRING, description: "Payment method: 'COD' (Cash on Delivery / Paiement à la livraison) or 'Prepaid' (Payé d'avance)." },
          cod_amount: { type: Type.STRING, description: "Amount in Moroccan Dirhams (DH) to be collected on delivery, e.g. '350 DH' or '0 DH'." },
          preferred_time: { type: Type.STRING, description: "Preferred delivery time window chosen by or proposed for the customer to avoid returns, e.g. '09:00 - 12:00', '15:00 - 18:00'." },
        },
        required: ["stop", "driver_name", "estimated_time", "priority", "customer_name", "phone", "payment_method", "cod_amount", "preferred_time"],
      },
    },
    driver_instructions: {
      type: Type.STRING,
      description: "Direct, clear, practical dispatch instructions. Group instructions nicely per driver.",
    },
    customer_messages: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          customer_name: { type: Type.STRING },
          phone: { type: Type.STRING },
          language: { type: Type.STRING, description: "darija | french | arabic" },
          message: { type: Type.STRING, description: "Polite SMS/WhatsApp ready template informing them their package with LogistiQ AI is on its way, estimated hour, and asking for a live location pin if needed." },
        },
        required: ["customer_name", "phone", "language", "message"],
      },
    },
    warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Critical warnings: missing info, high traffic times, long distances, toll needs, etc.",
    },
    cost_estimate: {
      type: Type.STRING,
      description: "Estimated cost explanation in MAD (e.g., 'Total: ~180 MAD (Fuel: 150 MAD, Tolls: 30 MAD)') based on basic assumptions.",
    },
  },
  required: ["summary", "route_plan", "driver_instructions", "customer_messages", "warnings", "cost_estimate"],
};

export const OCR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isDeliverySlip: {
      type: Type.BOOLEAN,
      description: "True if the document is a transport slip, shipping voucher, invoice, or delivery note."
    },
    hasSignature: {
      type: Type.BOOLEAN,
      description: "True if a handwritten signature, buyer initials, delivery stamp or checkmark confirming delivery is detected on the slip."
    },
    clientName: {
      type: Type.STRING,
      description: "Recipient customer's name on the document."
    },
    slipNumber: {
      type: Type.STRING,
      description: "The reference code, invoice number, or barcoded delivery ID."
    },
    origin: {
      type: Type.STRING,
      description: "The originating source city (e.g. Casablanca, Tanger, Marrakech, Kenitra, Rabat)."
    },
    destination: {
      type: Type.STRING,
      description: "The destination target city (e.g. Casablanca, Tanger, Marrakech, Kenitra, Rabat)."
    },
    cargoDescription: {
      type: Type.STRING,
      description: "Short list of items, cargo description or products on the slip."
    },
    volume: {
      type: Type.NUMBER,
      description: "The cubic volume of the cargo in m³. If not listed, intelligently estimate it (0.1 to 15.0)."
    },
    weight: {
      type: Type.NUMBER,
      description: "The weight of the cargo in kg. If not listed, intelligently estimate it (5 to 1000)."
    },
    deliverySucceeded: {
      type: Type.BOOLEAN,
      description: "True if the invoice is valid and delivery is confirmed."
    }
  },
  required: [
    "isDeliverySlip",
    "hasSignature",
    "clientName",
    "slipNumber",
    "origin",
    "destination",
    "cargoDescription",
    "volume",
    "weight",
    "deliverySucceeded"
  ],
};
export { Type };
