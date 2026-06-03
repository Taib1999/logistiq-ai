export interface Driver {
  id: string;
  name: string;
  vehicle: "Motorcycle" | "Van" | "Truck";
  phone?: string;
  status: "active" | "idle";
}

export interface BackhaulOffer {
  id: string;
  origin: string;
  destination: string;
  cargo: string;
  reward: number; // in DH
  vehicleType: "Van" | "Truck" | "Motorcycle" | "Any";
  status: "available" | "matched";
  matchedDriverName?: string;
  savingsCo2?: number; // kg of Co2 saved
  tollFees?: number; // MAD saved or covered
  volume?: number; // in m³
  weight?: number; // in kg
}

export interface Stop {
  id: string; // client side uuid or index mapping
  stop: string;
  driver_name: string;
  estimated_time: string;
  priority: "High" | "Medium" | "Low";
  customer_name: string;
  phone: string;
  status: "pending" | "dispatched" | "completed" | "delayed";
  payment_method?: string; // e.g. "COD (Cash on Delivery)" or "Paid"
  cod_amount?: string; // e.g. "150 DH" or "0 DH"
  preferred_time?: string; // e.g. "9:00 - 12:00" or "14:00 - 18:00" (crucial to avoid return/retour)
  bonDeLivraison?: string | null; // receipt photograph or proof of delivery link
}

export interface CustomerMessage {
  customer_name: string;
  phone: string;
  language: string;
  message: string;
}

export interface LogisticsPlan {
  summary: string;
  route_plan: Stop[];
  driver_instructions: string;
  customer_messages: CustomerMessage[];
  warnings: string[];
  cost_estimate: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export type UserRole = "Dispatcher" | "Chauffeur";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  driverName?: string; // Links user accounts of role "Chauffeur" to their corresponding assigned driver stops
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

