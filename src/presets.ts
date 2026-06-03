import { Driver } from "./types";

export const DEFAULT_DRIVERS: Driver[] = [
  { id: "1", name: "Amine El Fassi", vehicle: "Motorcycle", phone: "+212 661-234567", status: "active" },
  { id: "2", name: "Yassine Mansouri", vehicle: "Van", phone: "+212 662-987654", status: "active" },
  { id: "3", name: "Khadija Benani", vehicle: "Truck", phone: "+212 663-112233", status: "active" },
];

export const MOROCCAN_CITIES = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Tanger",
  "Agadir",
  "Fes",
  "Oujda",
  "Kenitra",
];

export interface PresetScenario {
  title: string;
  city: string;
  startTime: string;
  driversCount: number;
  input: string;
  description: string;
}

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    title: "Casablanca Delivery Loop",
    city: "Casablanca",
    startTime: "09:00 AM",
    driversCount: 2,
    input: "Sift 5 colis l Casablanca lyoum: Maarif (Amina Bourkane, +212611223344, must be before 12h), Sidi Maarouf near Nearshore office, drop off package to Khalid, Ain Sebaa near train station, l'Anfa 24 Ghandi boulevard, and last one in Derb Ghallef to a shoe shop. Use 2 of our riders starting at 9 AM.",
    description: "Multi-driver dispatch across high-congestion neighborhoods in Casablanca with mix of Arabic-Darija/French names.",
  },
  {
    title: "Moroccan Highway Axis",
    city: "Rabat",
    startTime: "08:00 AM",
    driversCount: 2,
    input: "We have an urgent delivery loop from Rabat to Tanger and Kenitra. One delivery is at Kenitra Center (Mounir, 0655443322), the other is at Tanger Free Zone industrial warehouse (Sorec, 0539123456). Start at 8:00 AM. Estimate toll and highway time.",
    description: "Inter-city run utilizing truck/van drivers with toll gate (péage) warnings on the A1 highway.",
  },
  {
    title: "Marrakech Medina Courier",
    city: "Marrakech",
    startTime: "10:00 AM",
    driversCount: 1,
    input: "I have 3 deliveries in Marrakech: Gueliz (Hotel Plazza reception, 0612131415), Medina inner alleys near Jemaa El Fna (Riad Al Ksar, 0524332211 - note: dense streets, advise rider on motorcycle), and Hivernage residential cluster. Let's send Amine on his Motorcycle at 10 AM.",
    description: "Focuses on narrow street navigation in the Marrakech old city with specialized instructions.",
  },
];
