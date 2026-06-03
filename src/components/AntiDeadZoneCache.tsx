import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  WifiOff,
  Wifi,
  Database,
  RefreshCw,
  Cpu,
  Bookmark,
  Zap,
  CheckCircle,
  Clock,
  BatteryMedium,
  Radio,
  Map,
  FileCheck,
  Smartphone,
  AlertTriangle,
  FileText
} from "lucide-react";

interface CachedPayload {
  id: string;
  type: "Signature" | "StatusUpdate" | "RouteDeviation";
  timestamp: string;
  detail: string;
  driverName: string;
}

interface AntiDeadZoneCacheProps {
  currentPlanStopsCount: number;
}

export default function AntiDeadZoneCache({ currentPlanStopsCount }: AntiDeadZoneCacheProps) {
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(true);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);
  const [signalStrength, setSignalStrength] = useState(100); // %
  const [offlineQueuedActions, setOfflineQueuedActions] = useState<CachedPayload[]>([
    {
      id: "act-1",
      type: "StatusUpdate",
      timestamp: "Il y a 10 min",
      detail: "Étape 'Dépôt Sidi Ghanem' passée en [Complété]",
      driverName: "Yassine Mansouri"
    },
    {
      id: "act-2",
      type: "Signature",
      timestamp: "Il y a 4 min",
      detail: "Signature client 'Assoc. Argan Bio' collectée hors-ligne",
      driverName: "Amine El Fassi"
    }
  ]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<string>("Tizi n'Tichka (R203 - Haut Atlas)");
  const [customActionAddedCount, setCustomActionAddedCount] = useState(0);

  // Custom hotspots in Morocco where cellular dead zones are common
  const HOTSPOTS = [
    { name: "Tizi n'Tichka (R203 - Haut Atlas)", lossRatio: 90, desc: "Traversée montagneuse de Marrakech à Ouarzazate" },
    { name: "Col de Belkassem (N13 - Errachidia)", lossRatio: 85, desc: "Zones désertiques et canyons arides du Sud-Est" },
    { name: "Boulemane d'Oulad (Moyen Atlas)", lossRatio: 75, desc: "Terrains forestiers profonds et vallées enclavées" },
    { name: "Route côtière de Tarfaya (Amgala)", lossRatio: 80, desc: "Plages sahariennes et dunes de sable isolées" }
  ];

  // Logic to simulate signal fluctuations when offline mode is toggled
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOfflineSimulated) {
      setSignalStrength(0);
    } else {
      setSignalStrength(95 + Math.floor(Math.random() * 5));
      interval = setInterval(() => {
        setSignalStrength(prev => {
          const delta = Math.floor(Math.random() * 11) - 5; // fluctuation +/- 5%
          const next = prev + delta;
          return Math.min(100, Math.max(80, next));
        });
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isOfflineSimulated]);

  // Sync handler
  const handleForceSync = () => {
    if (isOfflineSimulated) return;
    setIsSyncing(true);
    setTimeout(() => {
      setOfflineQueuedActions([]);
      setIsSyncing(false);
      setCustomActionAddedCount(0);
    }, 1500);
  };

  // Add simulated offline delivery update
  const handleAddOfflineDeliveryAttempt = () => {
    if (!isOfflineSimulated) return;
    const itemNum = customActionAddedCount + 1;
    const newAction: CachedPayload = {
      id: `act-custom-${Date.now()}`,
      type: "Signature",
      timestamp: "À l'instant",
      detail: `Preuve de dépôt sécurisée [Réf BL-SCN-${300 + itemNum}] signée offline`,
      driverName: "Chauffeur Mobile"
    };
    setOfflineQueuedActions(prev => [newAction, ...prev]);
    setCustomActionAddedCount(itemNum);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-xl p-5 md:p-6 space-y-5" id="anti-dead-zone-cache-panel">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-600/10">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-950 text-amber-400 text-[8.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-amber-900/60 leading-none">
                OFFLINE RESILIENCE
              </span>
              <span className="bg-slate-800 text-slate-300 text-[8.5px] font-bold px-1.5 py-0.5 rounded">
                Local-First Cache
              </span>
            </div>
            <h2 className="text-sm md:text-base font-black text-white tracking-tight mt-1 font-sans">
              The Anti-Dead Zone Cache (Protection Zones Blanches)
            </h2>
          </div>
        </div>

        {/* Global controller state toggle */}
        <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-xl border border-slate-700 self-stretch sm:self-auto justify-between sm:justify-start">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 pl-2">
            Service Cache local
          </span>
          <button
            onClick={() => {
              setIsFeatureEnabled(!isFeatureEnabled);
              if (isFeatureEnabled) {
                setIsOfflineSimulated(false);
              }
            }}
            className={`px-3 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
              isFeatureEnabled
                ? "bg-amber-500 text-slate-950 font-black"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            {isFeatureEnabled ? "ACTIF" : "SANS CACHE"}
          </button>
        </div>
      </div>

      {isFeatureEnabled ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LENS 1: STATUS & OFFLINE COUPLER (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* SIGNAL METER & HOTSPOT SIMULATOR */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-800 space-y-4 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-semibold">
                <div className="flex items-center gap-3">
                  <div className="flex gap-0.5 items-end h-6 w-9 px-1">
                    {[20, 40, 60, 80, 100].map((v) => (
                      <div
                        key={v}
                        className="w-1.5 rounded-t transition-all duration-300"
                        style={{
                          height: `${v}%`,
                          backgroundColor: signalStrength >= v ? (signalStrength <= 30 ? "#f43f5e" : "#10b981") : "#334155"
                        }}
                      />
                    ))}
                  </div>
                  <div>
                    <span className="text-[8px] font-bold text-slate-400 block uppercase tracking-widest">
                      RÉSEAU CELLULAIRE MAROCPIN
                    </span>
                    <span className="text-xs font-black text-white flex items-center gap-1.5 font-mono">
                      {isOfflineSimulated ? (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Zone Blanche (0% Signal)
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          📡 Connecté (4G / 5G {signalStrength}%)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Simulated connectivity cut buttons */}
                <button
                  onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                    isOfflineSimulated
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 hover:bg-emerald-600"
                      : "bg-rose-950 text-rose-300 border-rose-800/40 hover:bg-rose-900"
                  }`}
                >
                  {isOfflineSimulated ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 stroke-[2.5]" />
                      Rétablir réseau Central
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 stroke-[2.5]" />
                      Simuler Zone Blanche
                    </>
                  )}
                </button>
              </div>

              {/* Dead-zones Spot Changer */}
              <div className="space-y-1.5 border-t border-slate-800/80 pt-3">
                <label className="block text-[10.5px] text-slate-400 font-semibold">
                  Hotspot de Zone Blanche Actif :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {HOTSPOTS.map((h) => (
                    <button
                      key={h.name}
                      onClick={() => {
                        setSelectedHotspot(h.name);
                        if (!isOfflineSimulated) {
                          // Quick immersive simulation
                          setIsOfflineSimulated(true);
                        }
                      }}
                      className={`p-2 rounded-xl text-left border text-[10px] transition-all cursor-pointer ${
                        selectedHotspot === h.name
                          ? "bg-slate-800 border-amber-500/80 text-white shadow"
                          : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-300"
                      }`}
                    >
                      <div className="font-extrabold flex items-center gap-1">
                        <Radio className="h-3 w-3 text-amber-500 animate-pulse-slow" />
                        {h.name.split(" (")[0]}
                      </div>
                      <div className="text-[9px] opacity-75 mt-0.5 truncate">{h.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description explanation */}
              <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-[10.5px] leading-relaxed text-slate-400">
                <p className="font-bold text-slate-300 flex items-center gap-1 mb-1">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  Moteur Local-First Actif
                </p>
                Lorsqu'un chauffeur perd le réseau dans l'Atlas ou le désert, l'interface bascule en base de données SQL indexée locale (LocalStorage robuste). Les trajets, coordonnées GPS et manifestes de livraisons sont déjà mis en cache, évitant l'arrêt de l'opération.
              </div>
            </div>

            {/* CACHED MEMORY STATES STATS */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 text-center">
                <Map className="h-4 w-4 text-indigo-400 mx-auto stroke-[2]" />
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Tuiles Cartes Offline</p>
                <p className="text-[12.5px] font-mono font-extrabold text-white mt-0.5">148 Fichiers (2.9 Mo)</p>
              </div>
              <div className="bg-slate-800 border border-slate-700/50 rounded-xl p-3 text-center">
                <Database className="h-4 w-4 text-amber-400 mx-auto stroke-[2]" />
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Trajets Pré-chargés</p>
                <p className="text-[12.5px] font-mono font-extrabold text-white mt-0.5">{currentPlanStopsCount > 0 ? `${currentPlanStopsCount} Étapes OK` : "3 Trajets"}</p>
              </div>
              <div className="bg-slate-800 bg-slate-800 border border-slate-700/50 rounded-xl p-3 text-center">
                <Smartphone className="h-4 w-4 text-purple-400 mx-auto stroke-[2]" />
                <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">Compression SQLite</p>
                <p className="text-[12.5px] font-mono font-extrabold text-white mt-0.5">LZMA (Ratio 4.2x)</p>
              </div>
            </div>

          </div>

          {/* LENS 2: LIST OF BUFFERS & FORCE SYNC INTERACTION (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-slate-800/40 border border-slate-800 rounded-2xl p-4 gap-4">
            
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-amber-500" />
                  Buffer Local En Attente ({offlineQueuedActions.length})
                </h4>
                {offlineQueuedActions.length > 0 && (
                  <span className="bg-amber-950/80 border border-amber-800 text-amber-400 text-[8px] font-black uppercase px-2 py-0.5 rounded animate-pulse">
                    NON-SYNCHRONISÉ
                  </span>
                )}
              </div>

              {/* Buffered list */}
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {offlineQueuedActions.length === 0 ? (
                  <div className="h-24 flex flex-col items-center justify-center text-center text-slate-500">
                    <CheckCircle className="h-7 w-7 text-slate-600 mb-1" />
                    <p className="text-[10px] font-bold text-slate-400">Cache local vide</p>
                    <p className="text-[8.5px]">Toutes les actions mobiles sont synchronisées sur le Cloud.</p>
                  </div>
                ) : (
                  offlineQueuedActions.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] space-y-1 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-amber-400 font-mono text-[9px]">
                          {act.type === "Signature" ? "✍️ SIGNATURE" : "📦 STATUT ETAPE"}
                        </span>
                        <span className="text-[8px] text-slate-500 font-mono">{act.timestamp}</span>
                      </div>
                      <p className="text-slate-300 font-medium leading-relaxed">{act.detail}</p>
                      <p className="text-[8.5px] text-slate-500 font-semibold">Chauffeur: {act.driverName}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Synchronize Interaction Area */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              
              {/* Trigger local offline actions while simulator is Active */}
              {isOfflineSimulated && (
                <button
                  onClick={handleAddOfflineDeliveryAttempt}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-bold text-[10.5px] p-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  Simuler Étape & Signature Hors-ligne
                </button>
              )}

              {/* Primary Force sync button on restoration or connection */}
              <button
                onClick={handleForceSync}
                disabled={isOfflineSimulated || offlineQueuedActions.length === 0 || isSyncing}
                className={`w-full flex items-center justify-center gap-1.5 font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer ${
                  isOfflineSimulated
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed border-dashed border border-slate-700"
                    : offlineQueuedActions.length === 0
                    ? "bg-slate-800 text-slate-400 border border-slate-700"
                    : "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/10"
                }`}
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Synchronisation Cloud Atlas...
                  </>
                ) : isOfflineSimulated ? (
                  <>
                    <WifiOff className="h-3.5 w-3.5 text-slate-500" />
                    Force Sync (Bloqué Hors-Ligne)
                  </>
                ) : offlineQueuedActions.length === 0 ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 text-slate-400" />
                    Base de données Synchronisée
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                    Vider le Cache et Synchroniser !
                  </>
                )}
              </button>
              
              {isOfflineSimulated && (
                <p className="text-[8.5px] text-center text-amber-500/80 font-semibold animate-pulse">
                  ⚠️ Réseau indisponible à {selectedHotspot.split(" (")[0]}. Les informations sont conservées en sécurité.
                </p>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500">
          <WifiOff className="h-8 w-8 text-slate-700 mx-auto mb-2" />
          <p className="text-xs font-black">L'option Anti-Dead Zone Cache est désactivée.</p>
          <p className="text-[10px] text-slate-600 mt-1">
            Les chauffeurs perdront l'accès aux cartes hors-ligne et à la saisie de preuve en zone blanche s'ils traversent le col du Tizi n'Tichka.
          </p>
        </div>
      )}

    </div>
  );
}
