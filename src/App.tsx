import React, { useState } from "react";
import { io } from "socket.io-client";
import Header from "./components/Header";
import FleetManager from "./components/FleetManager";
import DeliverySlipScanner from "./components/DeliverySlipScanner";
import AntiDeadZoneCache from "./components/AntiDeadZoneCache";
import InteractiveMap from "./components/InteractiveMap";
import RoutePlanList from "./components/RoutePlanList";
import BackhaulEngine from "./components/BackhaulEngine";
import DispatchInput from "./components/DispatchInput";
import SmartChatAssistant from "./components/SmartChatAssistant";
import OperationsTracker from "./components/OperationsTracker";
import LoginPage from "./components/LoginPage";
import ChauffeurView from "./components/ChauffeurView";
import { addToOfflineQueue } from "./offlineSync";

import { Driver, Stop, LogisticsPlan, ChatMessage, BackhaulOffer, User } from "./types";
import { DEFAULT_DRIVERS, PRESET_SCENARIOS, MOROCCAN_CITIES } from "./presets";
import { 
  Layers, 
  Coins, 
  AlertTriangle, 
  User as UserIcon, 
  Phone, 
  Clock, 
  Check, 
  Copy, 
  Compass,
  Repeat
} from "lucide-react";

const VEHICLE_CAPACITIES: Record<"Motorcycle" | "Van" | "Truck" | "Any", { maxVolume: number; maxWeight: number }> = {
  Motorcycle: { maxVolume: 0.3, maxWeight: 35 },
  Van: { maxVolume: 8.5, maxWeight: 1200 },
  Truck: { maxVolume: 42.0, maxWeight: 14000 },
  Any: { maxVolume: 99.0, maxWeight: 99999 }
};

const INITIAL_BACKHAUL_OFFERS: BackhaulOffer[] = [
  { id: "bo-1", origin: "Tanger", destination: "Casablanca", cargo: "45 Colis E-commerce (Vêtements de prêt-à-porter)", reward: 1250, vehicleType: "Van", status: "available", savingsCo2: 120, tollFees: 90, volume: 3.8, weight: 320 },
  { id: "bo-2", origin: "Marrakech", destination: "Casablanca", cargo: "8 Cartons d'Artisanat (Maroquinerie & Tapis)", reward: 900, vehicleType: "Van", status: "available", savingsCo2: 160, tollFees: 80, volume: 1.4, weight: 110 },
  { id: "bo-3", origin: "Kenitra", destination: "Rabat", cargo: "15 Boîtes de Composants Automobiles (Sourcing local)", reward: 550, vehicleType: "Any", status: "available", savingsCo2: 45, tollFees: 20, volume: 0.12, weight: 15 },
  { id: "bo-4", origin: "Fes", destination: "Casablanca", cargo: "2 Palettes de Poterie Traditionnelle (Haute valeur)", reward: 1950, vehicleType: "Truck", status: "available", savingsCo2: 210, tollFees: 120, volume: 16.5, weight: 1850 },
];

export default function App() {
  // Authentication & session management states
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("logistiq_auth_token");
  });
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("logistiq_auth_user");
    return cached ? JSON.parse(cached) : null;
  });

  const handleLoginSuccess = (newToken: string, loggedInUser: User) => {
    setToken(newToken);
    setUser(loggedInUser);
    localStorage.setItem("logistiq_auth_token", newToken);
    localStorage.setItem("logistiq_auth_user", JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("logistiq_auth_token");
    localStorage.removeItem("logistiq_auth_user");
  };

  // Application State
  const [drivers, setDrivers] = useState<Driver[]>(DEFAULT_DRIVERS);
  const [startCity, setStartCity] = useState("Casablanca");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [inputText, setInputText] = useState(PRESET_SCENARIOS[0].input);
  const [isLoading, setIsLoading] = useState(false);

  // Smart Backhaul Matching State
  const [backhaulOffers, setBackhaulOffers] = useState<BackhaulOffer[]>(INITIAL_BACKHAUL_OFFERS);
  const [enableVolumetricOpt, setEnableVolumetricOpt] = useState(true);

  // Dynamic Logistics Plan
  const [plan, setPlan] = useState<LogisticsPlan | null>(null);

  // Load active plan from SQLite on boot
  React.useEffect(() => {
    if (!token) return;
    const initPersistentPlan = async () => {
      try {
        const response = await fetch("/api/plans/active", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (response.ok) {
          const storedPlan = await response.json();
          if (storedPlan) {
            setPlan(storedPlan);
          }
        }
      } catch (err) {
        console.error("Prisma SQLite automatic resume error:", err);
      }
    };
    initPersistentPlan();
  }, [token]);

  // Connect to Real-time socket updates via Socket.io
  React.useEffect(() => {
    if (!token) return;

    const socket = io({
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      // connected
    });

    // Listen for single delivery/stop updates
    socket.on("delivery:updated", (updatedStop: any) => {
      setPlan((prevPlan) => {
        if (!prevPlan) return null;
        
        // Find if this stop belongs to the current active route plan
        const exists = prevPlan.route_plan.some(s => s.id === updatedStop.id);
        if (!exists) return prevPlan;

        return {
          ...prevPlan,
          route_plan: prevPlan.route_plan.map(s => 
            s.id === updatedStop.id 
              ? { 
                  ...s, 
                  status: updatedStop.status,
                  driver_name: updatedStop.driver_name,
                  estimated_time: updatedStop.estimated_time,
                  priority: updatedStop.priority,
                  customer_name: updatedStop.customer_name,
                  phone: updatedStop.phone,
                  payment_method: updatedStop.payment_method,
                  cod_amount: updatedStop.cod_amount,
                  preferred_time: updatedStop.preferred_time,
                  bonDeLivraison: updatedStop.bonDeLivraison 
                } 
              : s
          )
        };
      });
    });

    // Listen for full plan/optimizer/refinement updates
    socket.on("plan:updated", (updatedPlan: any) => {
      setPlan(updatedPlan);
    });

    socket.on("disconnect", () => {
      // disconnected
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  // Chat Refinement State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState("");

  // Copy state helper
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load a preset scenario immediately
  const handleLoadScenario = (presetIndex: number) => {
    const scenario = PRESET_SCENARIOS[presetIndex];
    setStartCity(scenario.city);
    setStartTime(scenario.startTime);
    setInputText(scenario.input);
  };

  // Fleet management callbacks
  const handleAddDriver = (newDriver: Omit<Driver, "id">) => {
    const nextId = (Math.max(...drivers.map(d => parseInt(d.id) || 0), 0) + 1).toString();
    setDrivers([...drivers, { ...newDriver, id: nextId }]);
  };

  const handleRemoveDriver = (id: string) => {
    setDrivers(drivers.filter(d => d.id !== id));
  };

  const handleToggleDriverStatus = (id: string) => {
    setDrivers(drivers.map(d => {
      if (d.id === id) {
        return { ...d, status: d.status === "active" ? "idle" : "active" };
      }
      return d;
    }));
  };

  // Trigger Plan Generation through backend Gemini API
  const handleGeneratePlan = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setChatError("");
    try {
      const activeDrivers = drivers.filter(d => d.status === "active");
      const response = await fetch("/api/logistics/plan", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          input: inputText,
          startCity,
          startTime,
          drivers: activeDrivers,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Une erreur est survenue lors de l'appel au serveur API.");
      }

      const data: LogisticsPlan = await response.json();
      
      // Inject unique local state ids/status to stops for dynamic tracking
      const finalRoutePlan = (data.route_plan || []).map((stop, index) => ({
        ...stop,
        id: `stop-${index}-${Date.now()}`,
        status: "pending" as Stop["status"]
      }));

      setPlan({
        ...data,
        route_plan: finalRoutePlan
      });
      
      // Reset chatbot chat messages when a new original plan is baked
      setChatMessages([
        {
          id: "sys-1",
          sender: "ai",
          text: `Salam Alaykum! J'ai analysé et structuré votre demande de livraison pour ${startCity}. Voici le plan de dispatching optimisé pour vos chauffeurs actifs. Vous pouvez affiner ce plan ci-dessous ou directement me parler en Darija, Français, ou Arabe !`,
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Impossible de joindre le modèle IA. Veuillez vérifier vos clés API ou les variables d'environnement.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refine / Chat to update live plan
  const handleChatCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !plan) return;

    const dispatcherText = userInput;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: dispatcherText,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setUserInput("");
    setIsChatting(true);
    setChatError("");

    try {
      const activeDrivers = drivers.filter(d => d.status === "active");
      const response = await fetch("/api/logistics/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: dispatcherText,
          currentPlan: plan,
          drivers: activeDrivers,
          startCity,
          startTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Échec de la mise à jour dynamique du plan par IA.");
      }

      const data: LogisticsPlan = await response.json();
      
      // Merge status of existing stops back if we find matching stop names
      const refinedRoutePlan = (data.route_plan || []).map((newStop, i) => {
        const matchingOldStop = plan.route_plan.find(
          oldStop => oldStop.stop.toLowerCase() === newStop.stop.toLowerCase()
        );
        return {
          ...newStop,
          id: matchingOldStop?.id || `stop-${i}-${Date.now()}`,
          status: matchingOldStop?.status || "pending"
        };
      });

      setPlan({
        ...data,
        route_plan: refinedRoutePlan
      });

      setChatMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: data.summary || "Le plan a été mis à jour d'après vos directives chirurgicales.",
          timestamp: new Date()
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "Erreur de connexion lors de la modification assistée par l'IA.");
    } finally {
      setIsChatting(false);
    }
  };

  // Callback implementations for the activated RoutePlanList component with persistent database sync
  const handleUpdateStop = async (id: string, updated: Partial<Stop>) => {
    if (!plan) return;
    
    // Update local state first
    setPlan({
      ...plan,
      route_plan: plan.route_plan.map(s => s.id === id ? { ...s, ...updated } : s)
    });

    // If it's a real persistent ID from SQLite (doesn't contain client-side manual/test tags)
    if (id && !id.startsWith("stop-") && !id.startsWith("manual")) {
      try {
        await fetch(`/api/deliveries/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            status: updated.status,
            driverName: updated.driver_name,
            estimatedTime: updated.estimated_time,
            priority: updated.priority,
            customerName: updated.customer_name,
            phone: updated.phone,
            paymentMethod: updated.payment_method,
            codAmount: updated.cod_amount,
            preferredTime: updated.preferred_time,
            bonDeLivraison: updated.bonDeLivraison
          }),
        });
      } catch (err) {
        console.error("Failed to persist manual stop update to SQLite:", err);
      }
    }
  };

  const handleRemoveStop = (id: string) => {
    if (!plan) return;
    setPlan({
      ...plan,
      route_plan: plan.route_plan.filter(s => s.id !== id)
    });
  };

  const handleReorderStops = (indexA: number, indexB: number) => {
    if (!plan) return;
    const nextStops = [...plan.route_plan];
    if (indexA < 0 || indexA >= nextStops.length || indexB < 0 || indexB >= nextStops.length) return;
    const temp = nextStops[indexA];
    nextStops[indexA] = nextStops[indexB];
    nextStops[indexB] = temp;
    setPlan({
      ...plan,
      route_plan: nextStops
    });
  };

  const handleAddStop = (newStop: Omit<Stop, "id" | "status">) => {
    if (!plan) return;
    const added: Stop = {
      ...newStop,
      id: `stop-manual-${Date.now()}`,
      status: "pending"
    };
    setPlan({
      ...plan,
      route_plan: [...plan.route_plan, added]
    });
  };

  // Match Backhaul cargo load to return empty leg of a driver
  const handleMatchBackhaul = (offerId: string, driverName: string) => {
    const offer = backhaulOffers.find(o => o.id === offerId);
    if (!offer) return;

    // Update offer status
    setBackhaulOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return { ...o, status: "matched", matchedDriverName: driverName };
      }
      return o;
    }));

    // If we have an active logistics plan, append a return stop to that driver's route
    if (plan) {
      const backhaulStop: Stop = {
        id: `backhaul-${offerId}-${Date.now()}`,
        stop: `Retour: ${offer.origin} ➔ ${offer.destination}`,
        driver_name: driverName,
        estimated_time: "H-Retour (Fret de retour)",
        priority: "Medium",
        customer_name: `Fret Retour: ${offer.cargo}`,
        phone: "+212 522-887765", 
        status: "pending",
        payment_method: "Prepaid",
        cod_amount: "0 DH",
        preferred_time: "Creneau Retour"
      };

      setPlan({
        ...plan,
        route_plan: [...plan.route_plan, backhaulStop]
      });
    }
  };

  // Cancel match
  const handleCancelBackhaul = (offerId: string) => {
    const offer = backhaulOffers.find(o => o.id === offerId);
    if (!offer) return;

    setBackhaulOffers(prev => prev.map(o => {
      if (o.id === offerId) {
        return { ...o, status: "available", matchedDriverName: undefined };
      }
      return o;
    }));

    if (plan) {
      setPlan({
        ...plan,
        route_plan: plan.route_plan.filter(s => !s.id.startsWith(`backhaul-${offerId}`))
      });
    }
  };

  // Add custom return load offer
  const handleAddCustomOffer = (newOffer: BackhaulOffer) => {
    setBackhaulOffers(prev => [newOffer, ...prev]);
  };

  // One-Click Scanner Handlers
  const handleImportToDispatch = (rawText: string, city: string) => {
    setInputText(prev => prev ? `${prev}\n\n${rawText}` : rawText);
    setStartCity(city);
    const panel = document.getElementById("bento-input-panel");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleImportToBackhaul = (offer: Omit<BackhaulOffer, "id" | "status">) => {
    const newOffer: BackhaulOffer = {
      ...offer,
      id: `bo-scan-${Date.now()}`,
      status: "available"
    };
    setBackhaulOffers(prev => [newOffer, ...prev]);
  };

  // Copy SMS templates to clipboard
  const handleCopyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Calculations for stats
  const totalStops = plan ? plan.route_plan.length : 0;
  const completedStops = plan ? plan.route_plan.filter(s => s.status === "completed").length : 0;
  const progressRatio = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  // Calculate total COD to collect based on Moroccan Dirham amounts
  const totalCodToCollect = plan
    ? plan.route_plan.reduce((sum, stop) => {
        if (stop.payment_method === "Prepaid" || stop.payment_method === "Paid") return sum;
        const amtStr = stop.cod_amount || "0";
        const num = parseInt(amtStr.replace(/[^0-9]/g, "")) || 0;
        return sum + num;
      }, 0)
    : 0;

  // Calculate COD successfully collected (completed stops)
  const collectedCod = plan
    ? plan.route_plan.reduce((sum, stop) => {
        if (stop.status !== "completed") return sum;
        if (stop.payment_method === "Prepaid" || stop.payment_method === "Paid") return sum;
        const amtStr = stop.cod_amount || "0";
        const num = parseInt(amtStr.replace(/[^0-9]/g, "")) || 0;
        return sum + num;
      }, 0)
    : 0;

  const activeDriverNames = drivers.filter(d => d.status === "active").map(d => d.name);

  if (!token || !user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  if (user.role === "Chauffeur") {
    return (
      <ChauffeurView 
        user={user} 
        stops={plan ? plan.route_plan : []} 
        token={token}
        onUpdateStopStatus={async (stopId, status, bonDeLivraison) => {
          if (!plan) return;

          // Identify stop details for offline logging
          const tgtStop = plan.route_plan.find(s => s.id === stopId);
          const customerName = tgtStop?.customer_name || "Client";
          const stopName = tgtStop?.stop || "Étape";
          const codAmount = tgtStop?.cod_amount || "0 DH";

          // Optimistic local update
          setPlan({
            ...plan,
            route_plan: plan.route_plan.map(s => s.id === stopId ? { ...s, status, ...(bonDeLivraison !== undefined ? { bonDeLivraison } : {}) } : s)
          });

          // Check connectivity
          if (!navigator.onLine) {
            addToOfflineQueue(stopId, status, bonDeLivraison, customerName, stopName, codAmount);
            return;
          }

          // Sync with SQLite database using the JWT token
          try {
            const response = await fetch(`/api/deliveries/${stopId}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ status, bonDeLivraison }),
            });
            if (!response.ok) {
              addToOfflineQueue(stopId, status, bonDeLivraison, customerName, stopName, codAmount);
            }
          } catch (err) {
            console.error("Network interface disconnected, backing up locally:", err);
            addToOfflineQueue(stopId, status, bonDeLivraison, customerName, stopName, codAmount);
          }
        }} 
        onLogout={handleLogout}
        currentStartCity={startCity}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 flex flex-col font-sans" id="app-root-container">
      {/* Top Header with info */}
      <Header 
        activeStopsCount={totalStops} 
        activeDriversCount={drivers.filter(d => d.status === "active").length} 
        user={user}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full flex flex-col space-y-6">
        
        {/* Intro Info Banner - Moroccan Context */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative border border-slate-800">
          <div className="absolute -right-12 -bottom-12 opacity-10 bg-amber-500 rounded-full h-48 w-48"></div>
          <div className="space-y-2 max-w-2xl relative z-10">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-indigo-400/20">
                LogistiQ AI Intelligence Engine v2.5
              </span>
              <span className="bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-full">
                Morocco Core
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-sans text-neutral-50">
              Transformez vos informations de livraison en plans structurés.
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Reconnaissance automatique des villes (Casablanca, Rabat, Tanger, Marrakech...) et quartiers populaires (Maarif, Sidi Maarouf, Medina). Distribution automatique, temps estimés intelligents et fiches SMS pour vos clients en 
              <span className="text-amber-300 font-semibold"> Darija, Français, et Arabe</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 flex-shrink-0 self-stretch md:self-center items-center justify-start md:justify-end relative z-10">
            <span className="text-xs text-slate-400 font-mono hidden lg:inline">Quick Scenario presets:</span>
            {PRESET_SCENARIOS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadScenario(idx)}
                className="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Layers className="h-3 w-3 text-indigo-400" />
                {p.title.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* BENTO GRID MAIN WRAPPER */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-start" id="bento-grid-dashboard">
          
          {/* Dispatcher Input Controls */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <DispatchInput 
              startCity={startCity}
              setStartCity={setStartCity}
              startTime={startTime}
              setStartTime={setStartTime}
              inputText={inputText}
              setInputText={setInputText}
              isLoading={isLoading}
              onGeneratePlan={handleGeneratePlan}
              chatError={chatError}
            />
          </div>

          {/* Fleet Management and Operations tracker tracker */}
          <div className="lg:col-span-4 space-y-6">
            <FleetManager
              drivers={drivers}
              onAddDriver={handleAddDriver}
              onRemoveDriver={handleRemoveDriver}
              onToggleStatus={handleToggleDriverStatus}
            />

            <OperationsTracker 
              progressRatio={progressRatio}
              completedStops={completedStops}
              totalStops={totalStops}
              collectedCod={collectedCod}
              totalCodToCollect={totalCodToCollect}
            />
          </div>

          {/* Smart Interactive Chat Assistant Refiner */}
          <SmartChatAssistant 
            plan={plan}
            chatMessages={chatMessages}
            isChatting={isChatting}
            userInput={userInput}
            setUserInput={setUserInput}
            onChatSubmit={handleChatCompletion}
          />

        </div>

        {/* OpenStreetMap Map Section */}
        <div className="w-full" id="always-visible-map">
          <InteractiveMap stops={plan ? plan.route_plan : []} startCity={startCity} token={token} />
        </div>

        {/* ACTIVE RESOLVED DYNAMIC PLAN DETAILS */}
        {plan ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in" id="plan-section-view">
            
            {/* Main Interactive Route Plan detailed list */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-5">
              
              <RoutePlanList 
                stops={plan.route_plan}
                drivers={activeDriverNames}
                onUpdateStop={handleUpdateStop}
                onRemoveStop={handleRemoveStop}
                onReorderStops={handleReorderStops}
                onAddStop={handleAddStop}
              />

              {/* Total Highway Fuel & Toll Gate Financial Estimates Section */}
              <div className="px-6 py-4 bg-slate-100 hover:bg-slate-200/50 border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl transition shadow-sm">
                <div>
                  <span className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-widest block">ASSISTANCE CARBURANT & PÉAGES DIRECTS</span>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-sans mt-0.5">
                    <Coins className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Estimation réalisée sur l'axe routier du Maroc</span>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center justify-center gap-2 shadow-sm">
                  <span className="font-bold text-slate-800 font-mono text-base">{plan.cost_estimate || "Non disponible"}</span>
                </div>
              </div>

            </div>

            {/* Right Side Cards: Instructions, Warnings list, Customer follow templates */}
            <div className="lg:col-span-5 space-y-6">

              {/* Driver Dispatch directives */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3" id="bento-driver-notes">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <h3 className="text-xs font-black text-slate-400" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Notes Curieuses pour Chauffeurs
                  </h3>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-indigo-100 border-slate-100 italic text-[11.5px] leading-relaxed text-indigo-950 font-medium whitespace-pre-line">
                  "{plan.driver_instructions || 'Suivre les routes optimisées dans l\'ordre de passage.'}"
                </div>
              </div>

              {/* Safety/Risk Warnings warnings */}
              {plan.warnings && plan.warnings.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 space-y-3" id="bento-warnings">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest">
                      Alertes & Points de Vigilance (IA)
                    </h3>
                  </div>
                  <ul className="space-y-2 text-[11px] text-amber-900 font-medium">
                    {plan.warnings.map((warn, wIdx) => (
                      <li key={wIdx} className="flex items-start gap-1.5 leading-normal">
                        <span className="text-amber-500 select-none">•</span>
                        <span>{warn}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Customer relations center template templates */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4" id="bento-sms-templates">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">SUPPORT CLIENTS MAROC</span>
                    <h3 className="text-xs font-bold text-slate-800">Messages de Suivi WhatsApp / SMS</h3>
                  </div>
                  <Compass className="h-4 w-4 text-indigo-600" />
                </div>

                <div className="space-y-3 font-sans">
                  {plan.customer_messages && plan.customer_messages.length > 0 ? (
                    plan.customer_messages.map((item, msgIdx) => (
                      <div key={msgIdx} className="bg-slate-50 hover:bg-slate-100/50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 relative group hover:border-indigo-200 transition">
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-bold text-slate-700">{item.customer_name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">({item.language === "darija" ? "Darîja" : item.language === "french" ? "Français" : "Arabe"})</span>
                          </div>
                          
                          {item.phone && (
                            <span className="text-[9px] text-slate-500 font-mono italic">{item.phone}</span>
                          )}
                        </div>

                        <p className="text-[11px] leading-relaxed text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100 border-slate-200/40">
                          {item.message}
                        </p>

                        <div className="flex items-center gap-2 self-end">
                          <button
                            type="button"
                            onClick={() => handleCopyToClipboard(item.message, msgIdx)}
                            className={`flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition duration-150 cursor-pointer ${
                              copiedIndex === msgIdx 
                                ? "bg-emerald-600 border-emerald-600 text-white font-bold" 
                                : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {copiedIndex === msgIdx ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Copié!</span>
                              </>
                            ) : (
                              <>
                                <span>Copier le SMS</span>
                              </>
                            )}
                          </button>
                        </div>

                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucun message de suivi n'a été pré-calculé.</p>
                  )}
                </div>

                <div className="bg-indigo-50/40 p-3 rounded-xl border border-indigo-100 text-[10.5px] leading-relaxed text-indigo-950">
                  <p className="font-bold">✨ Traduction Culturelle Marocaine</p>
                  Les salutations s'adaptent dynamiquement de "Salam Alaykum, khoutna" à "Cher Client" selon le profil détecté du destinataire ou de l'adresse de livraison.
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* Landing CTA Empty State dashboard layout */
          <div className="bg-white border border-slate-100/80 rounded-3xl p-16 text-center shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="inline-flex bg-indigo-50 text-indigo-600 p-4 rounded-full border border-indigo-100 shadow-sm">
              <Compass className="h-10 w-10 stroke-[1.5]" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 text-center font-sans tracking-tight">Prêt à optimiser vos routes marocaines ?</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Choisissez l'un des cas d'usage prédéfinis au-dessus ou décrivez librement vos livraisons d'aujourd'hui, l'heure de départ, et vos chauffeurs disponibles. Notre IA LogistiQ calculera l'ordre optimal immédiatement !
              </p>
            </div>

            <button
              onClick={handleGeneratePlan}
              disabled={isLoading || !inputText.trim()}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/10 hover:bg-indigo-700 cursor-pointer transition flex items-center gap-1.5 mx-auto"
            >
              <span>Démarrer l'essai sur l'exemple actif</span>
            </button>
          </div>
        )}

        {/* ONE-CLICK BON DE LIVRAISON SCANNER */}
        <DeliverySlipScanner 
          token={token}
          onImportToDispatch={handleImportToDispatch}
          onImportToBackhaul={handleImportToBackhaul}
          enableVolumetricOpt={enableVolumetricOpt}
        />

        {/* THE ANTI-DEAD ZONE CACHE PLATFORM */}
        <div className="mt-6">
          <AntiDeadZoneCache currentPlanStopsCount={totalStops} />
        </div>

        {/* SMART BACKHAUL MATCHING ENGINE BENTO CARD */}
        <BackhaulEngine 
          drivers={drivers}
          backhaulOffers={backhaulOffers}
          onMatchBackhaul={handleMatchBackhaul}
          onCancelBackhaul={handleCancelBackhaul}
          onAddCustomOffer={handleAddCustomOffer}
          enableVolumetricOpt={enableVolumetricOpt}
          setEnableVolumetricOpt={setEnableVolumetricOpt}
        />

      </main>

      {/* Decorative footer block */}
      <footer className="max-w-7xl mx-auto px-4 text-center mt-12 text-[11px] text-slate-400 font-sans border-t border-slate-100 pt-6 w-full">
        <p>© 2026 LogistiQ AI Inc — Conçu pour les PME marocaines (Casablanca, Rabat, Marrakech, Tanger).</p>
        <p className="mt-1 opacity-75">Connecté à l'API Google Gemini 3.5 Flash.</p>
      </footer>
    </div>
  );
}
