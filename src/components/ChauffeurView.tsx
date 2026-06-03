import React, { useState, useEffect, useRef } from "react";
import { Stop, User } from "../types";
import { 
  Phone, 
  MapPin, 
  Clock, 
  Coins, 
  Calendar, 
  LogOut, 
  CheckCircle2, 
  AlertTriangle, 
  Compass, 
  Bookmark, 
  Check, 
  ChevronRight, 
  Smartphone, 
  Send,
  MessageSquare,
  Radio,
  Database,
  WifiOff,
  Upload,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { getOfflineQueue, syncOfflineQueue, OfflineMutation } from "../offlineSync";

interface ChauffeurViewProps {
  user: User;
  stops: Stop[];
  token: string | null;
  onUpdateStopStatus: (stopId: string, status: Stop["status"], bonDeLivraison?: string) => void;
  onLogout: () => void;
  currentStartCity: string;
}

export default function ChauffeurView({ user, stops, token, onUpdateStopStatus, onLogout, currentStartCity }: ChauffeurViewProps) {
  const driverName = user.driverName || user.name;
  
  // Filter stops specifically assigned to this Chauffeur
  const myStops = stops.filter(s => s.driver_name.toLowerCase() === driverName.toLowerCase());
  
  // Stats calculations
  const totalStops = myStops.length;
  const completedStops = myStops.filter(s => s.status === "completed").length;
  const percentage = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;
  
  // COD amounts collected
  const totalCodToCollect = myStops.reduce((acc, stop) => {
    if (stop.payment_method === "Prepaid" || stop.payment_method === "Paid") return acc;
    const amount = parseInt((stop.cod_amount || "0").replace(/[^0-9]/g, "")) || 0;
    return acc + amount;
  }, 0);

  const collectedCod = myStops.reduce((acc, stop) => {
    if (stop.status !== "completed") return acc;
    if (stop.payment_method === "Prepaid" || stop.payment_method === "Paid") return acc;
    const amount = parseInt((stop.cod_amount || "0").replace(/[^0-9]/g, "")) || 0;
    return acc + amount;
  }, 0);

  // Clipboard copy state
  const [copiedStopId, setCopiedStopId] = useState<string | null>(null);

  const handleCopySMS = (text: string, stopId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStopId(stopId);
    setTimeout(() => setCopiedStopId(null), 2000);
  };

  // Real Network and Offline sync States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineMutation[]>(() => getOfflineQueue());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [analyzingStopId, setAnalyzingStopId] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Monitor network and synchronize automatically on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (token) {
        setIsSyncing(true);
        await syncOfflineQueue(token, (msg) => setSyncStatusMsg(msg));
        setIsSyncing(false);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Reactive subscription to localStorage queue updates
    const handleQueueUpdate = () => {
      setOfflineQueue(getOfflineQueue());
    };
    window.addEventListener("logistiq-offline-updated", handleQueueUpdate);

    // Proactive background synchronizer daemon check every 10 seconds
    const interval = setInterval(async () => {
      if (navigator.onLine && token && getOfflineQueue().length > 0 && !isSyncing) {
        setIsSyncing(true);
        await syncOfflineQueue(token, (msg) => setSyncStatusMsg(msg));
        setIsSyncing(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("logistiq-offline-updated", handleQueueUpdate);
      clearInterval(interval);
    };
  }, [token, isSyncing]);

  const forceSyncDriverSide = async () => {
    if (!navigator.onLine || !token) return;
    setIsSyncing(true);
    await syncOfflineQueue(token, (msg) => setSyncStatusMsg(msg));
    setIsSyncing(false);
  };

  const handleFileChange = (stopId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isOnline) {
      // Offline mode: read as local URL data, store in local cache with optimistic UI
      const reader = new FileReader();
      reader.onloadend = () => {
        const localBase64 = reader.result as string;
        // Optimistic Status update
        onUpdateStopStatus(stopId, "completed", localBase64);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Online mode: Run real Gemini Vision task OCR!
    setAnalyzingStopId(stopId);
    setSyncStatusMsg("Image envoyée à Gemini 3.5 pour l'analyse de signature...");
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      try {
        const response = await fetch("/api/scanner/ocr", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ image: base64Image })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.isDeliverySlip) {
            if (result.hasSignature) {
              alert(`📄 Bon validé ! Signature/Cachet détecté par l'IA de l'étape de livraison pour ${result.clientName || "le client"}.\n\nStatut changé automatiquement à : Livré ✓ .`);
              onUpdateStopStatus(stopId, "completed", base64Image);
            } else {
              alert(`⚠ Bon identifié, mais signature manquante ou indéchiffrable par l'IA.\n\nLe document est sauvegardé, restez sur 'En chemin/En retard' ou forcez manuellement.`);
              onUpdateStopStatus(stopId, "dispatched", base64Image);
            }
          } else {
            alert(`⚠ Le document ne semble pas être un Bon de Livraison standard.\n\nLe fichier est sauvegardé.`);
            onUpdateStopStatus(stopId, "dispatched", base64Image);
          }
        } else {
          onUpdateStopStatus(stopId, "completed", base64Image);
        }
      } catch (err) {
        console.error("Gemini Vision task failed, fallback to direct save:", err);
        onUpdateStopStatus(stopId, "completed", base64Image);
      } finally {
        setAnalyzingStopId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const getPriorityStyle = (priority: Stop["priority"]) => {
    switch (priority) {
      case "High":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/25";
    }
  };

  const getStatusStyle = (status: Stop["status"]) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
      case "delayed":
        return "bg-red-500/15 text-red-400 border-red-500/20";
      case "dispatched":
        return "bg-sky-500/15 text-sky-400 border-sky-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  const getStatusLabelText = (status: Stop["status"]) => {
    switch (status) {
      case "completed":
        return "Livré ✓";
      case "delayed":
        return "En retard ⚠";
      case "dispatched":
        return "En chemin ➔";
      default:
        return "En attente";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans selection:bg-indigo-600/30">
      
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800/80 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          
          <div className="flex items-center space-x-2.5 space-x-reverse">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-extrabold text-amber-500 leading-none">Chauffeur Space</p>
              <h2 className="text-xs font-black text-white mt-1">LogistiQ Chauffeur</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-800 text-[10px] font-mono px-2 py-1 rounded-lg text-slate-300">
              {driverName}
            </span>
            <button
              onClick={onLogout}
              className="bg-red-950/40 hover:bg-red-900/40 text-red-400 border border-red-900/40 hover:border-red-500/30 p-2 rounded-xl transition cursor-pointer"
              title="Déconnexion"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* Network & Offline Queue Status Toast Indicator */}
      {!isOnline && (
        <div className="bg-amber-500/20 text-amber-300 border-b border-amber-500/30 px-4 py-2.5 text-xs flex items-center justify-between font-semibold animate-pulse">
          <span className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-amber-400 shrink-0" />
            Mode Hors-Ligne (Zone Blanche active). Toutes vos modifications de COD et de Statuts sont stockées localement en cache !
          </span>
          <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">Atlas Offline</span>
        </div>
      )}

      {offlineQueue.length > 0 && (
        <div className="bg-indigo-600/20 text-indigo-300 border-b border-indigo-500/10 px-4 py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 font-semibold">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-400 shrink-0 animate-pulse" />
            <span>{offlineQueue.length} modification(s) en cache - Prêtes pour la synchronisation automatique</span>
          </span>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {syncStatusMsg && <span className="text-[9px] text-slate-400 font-mono italic mr-1">{syncStatusMsg}</span>}
            {isOnline && (
              <button
                onClick={forceSyncDriverSide}
                disabled={isSyncing}
                className="bg-indigo-500 text-slate-950 font-bold px-3 py-1 rounded-xl hover:bg-indigo-400 transition text-[10.5px] cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Synchro...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3" />
                    Synchro Cloud
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        
        {/* Welcome Card & Status */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] uppercase font-black text-indigo-400 tracking-widest block">Salam Alaykum!</span>
              <h1 className="text-lg font-black text-white mt-0.5">{driverName}</h1>
              <p className="text-[10px] text-slate-400 mt-1">
                Ville de départ de la tournée : <strong className="text-white font-black">{currentStartCity}</strong>
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40 animate-pulse"></span>
          </div>

          {/* Quick Metrics display */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-widest block">Livraisons effectuées</span>
              <p className="text-sm font-mono font-black text-white mt-1">{completedStops} / {totalStops}</p>
              <div className="w-full bg-slate-900 rounded-full h-1 mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
              </div>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[8.5px] font-extrabold text-slate-500 uppercase tracking-widest block">COD collecté (MAD)</span>
              <p className="text-sm font-mono font-black text-emerald-400 mt-1">{collectedCod} DH</p>
              <p className="text-[8.5px] text-slate-500 leading-none mt-1">Objectif total : {totalCodToCollect} DH</p>
            </div>
          </div>
        </div>

        {/* Deliveries Headings */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Bookmark className="h-3.5 w-3.5 text-indigo-500" />
            Mes étapes assignées ({totalStops})
          </h3>
          <span className="text-[10px] text-slate-500">Trier chronologiquement</span>
        </div>

        {/* Deliveries List */}
        <div className="space-y-3.5">
          {myStops.length > 0 ? (
            myStops.map((stop, index) => {
              // Build dynamic Darija WhatsApp template in-line matching previous helper forms
              const rawMessageText = `Salam Alaykum ${stop.customer_name}, Maak Chauffeur de LogistiQ AI. 3endi m3aya amana dyalk fi l'mantaqa dyal ${stop.stop}. Nkun 3ndek m3a hwali ${stop.estimated_time}. Lah ijazik bikhir sift lia localisatâon dyalk hna bach nwasalha lik deghya. Chokran !`;
              
              return (
                <div 
                  key={stop.id} 
                  className={`border rounded-2xl p-4 space-y-4 transition ${
                    stop.status === "completed" 
                      ? "bg-emerald-950/5 border-emerald-900/30 opacity-75" 
                      : "bg-slate-900 border-slate-800/80 hover:border-slate-700"
                  }`}
                  id={`chauffeur-stop-card-${index}`}
                >
                  
                  {/* Card Main Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                          Étape #{index + 1}
                        </span>
                        <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full border ${getPriorityStyle(stop.priority)}`}>
                          Priorité {stop.priority === "High" ? "Haute" : stop.priority === "Medium" ? "Moyenne" : "Basse"}
                        </span>
                        <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full border ${getStatusStyle(stop.status)}`}>
                          {getStatusLabelText(stop.status)}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-black text-white mt-1.5 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        {stop.stop}
                      </h4>
                    </div>

                    <div className="text-right text-[11px] font-mono font-black text-amber-400 whitespace-nowrap bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      {stop.estimated_time}
                    </div>
                  </div>

                  {/* Customer information and delivery requirements */}
                  <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800/60 grid grid-cols-2 gap-3 text-[11px]">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Destinataire</p>
                      <p className="font-bold text-white truncate">{stop.customer_name}</p>
                    </div>
                    {stop.preferred_time && (
                      <div className="space-y-1">
                        <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Créneau Souhaité</p>
                        <p className="font-bold text-indigo-300 flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {stop.preferred_time}
                        </p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Méthode de paiement</p>
                      <p className="font-bold text-slate-300">{stop.payment_method || "COD"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500">Montant à percevoir</p>
                      <p className={`font-mono font-extrabold ${stop.cod_amount && stop.cod_amount !== "0 DH" ? "text-emerald-400" : "text-slate-400"}`}>
                        {stop.cod_amount || "0 DH"}
                      </p>
                    </div>
                  </div>

                  {/* Persistent Bon de Livraison Photo Section */}
                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800 space-y-3">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">📷 Image / Preuve du Bon de Livraison</span>
                      {stop.bonDeLivraison ? (
                        <span className="text-emerald-400 font-bold bg-emerald-900/20 px-2 py-0.5 rounded-md text-[9px] uppercase">Enregistré ✓</span>
                      ) : (
                        <span className="text-amber-500 font-bold bg-amber-900/10 px-2 py-0.5 rounded-md text-[9px] uppercase">Manquant ⚠</span>
                      )}
                    </p>
                    
                    {stop.bonDeLivraison ? (
                      <div className="space-y-2">
                        <img 
                          src={stop.bonDeLivraison.startsWith("data:") ? stop.bonDeLivraison : stop.bonDeLivraison} 
                          alt="Bon de Livraison" 
                          className="w-full h-32 object-cover rounded-xl border border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const newUrl = prompt("Saisissez une nouvelle URL pour l'image du Bon de livraison :", stop.bonDeLivraison || "");
                              if (newUrl !== null) {
                                onUpdateStopStatus(stop.id, stop.status, newUrl);
                              }
                            }}
                            className="text-[10px] font-bold text-indigo-400 hover:underline cursor-pointer"
                          >
                            Modifier le lien
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            type="button"
                            onClick={() => onUpdateStopStatus(stop.id, stop.status, "")}
                            className="text-[10px] font-bold text-red-400 hover:underline cursor-pointer"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {analyzingStopId === stop.id ? (
                          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center space-y-2.5">
                            <RefreshCw className="h-5 w-5 text-indigo-400 animate-spin mx-auto" />
                            <p className="text-[10.5px] font-bold text-white">Analyse IA par Gemini Vision...</p>
                            <p className="text-[9px] text-slate-400">Extraction du texte, validation du BL et détection de signature en cours.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <input 
                              type="file" 
                              accept="image/*" 
                              ref={el => { fileInputRefs.current[stop.id] = el; }}
                              onChange={(e) => handleFileChange(stop.id, e)}
                              className="hidden" 
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[stop.id]?.click()}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-2 px-3 rounded-xl transition cursor-pointer text-xs"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                <span>Prendre Photo / Charger BL</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const randomPicId = Math.floor(Math.random() * 80) + 10;
                                  const mockSlipUrl = `https://picsum.photos/id/${randomPicId}/600/400`;
                                  onUpdateStopStatus(stop.id, stop.status, mockSlipUrl);
                                }}
                                className="bg-slate-800 hover:bg-slate-800 text-slate-300 font-extrabold px-3 py-2 rounded-xl transition cursor-pointer text-xs"
                              >
                                ⚡ Simulation Photo
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Ou collez l'URL directe d'une preuve d'image..."
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-[10.5px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val) {
                                      onUpdateStopStatus(stop.id, stop.status, val);
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  const inputNode = e.currentTarget.previousSibling as HTMLInputElement;
                                  const val = inputNode?.value.trim();
                                  if (val) {
                                    onUpdateStopStatus(stop.id, stop.status, val);
                                  }
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10.5px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                              >
                                Valider
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fast Contact and WhatsApp Darija messaging panel */}
                  <div className="flex items-center justify-between gap-2.5 border-t border-slate-800 pt-3">
                    
                    {/* Native phone call trigger */}
                    {stop.phone && (
                      <a 
                        href={`tel:${stop.phone}`}
                        className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold p-2 rounded-xl text-[10.5px] transition flex items-center justify-center gap-1.5"
                      >
                        <Phone className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Téléphone</span>
                      </a>
                    )}

                    {/* WhatsApp pre-formatted Darija follow-up chat */}
                    <button
                      type="button"
                      onClick={() => handleCopySMS(rawMessageText, stop.id)}
                      className={`flex-1 font-bold p-2 rounded-xl text-[10.5px] transition border flex items-center justify-center gap-1.5 cursor-pointer ${
                        copiedStopId === stop.id
                          ? "bg-indigo-600 border-indigo-600 text-white font-bold"
                          : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {copiedStopId === stop.id ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" />
                          <span>Darija Copié!</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Darija WhatsApp</span>
                        </>
                      )}
                    </button>
                    
                  </div>

                  {/* Interactive Driver Status Update Form Action Buttons */}
                  <div className="border-t border-slate-800 pt-3 flex flex-wrap gap-1.5">
                    
                    {/* Mark in progress */}
                    {stop.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStopStatus(stop.id, "dispatched")}
                        className="flex-1 bg-sky-950 hover:bg-sky-900 text-sky-300 border border-sky-800/80 font-bold py-2 rounded-xl text-[11px] transition cursor-pointer text-center"
                      >
                        Débuter l'itinéraire ➔
                      </button>
                    )}

                    {/* Mark completed (collected money) */}
                    {stop.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStopStatus(stop.id, "completed")}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-black py-2 rounded-xl text-[11px] transition cursor-pointer text-center"
                      >
                        Livré (Encaissement OK)
                      </button>
                    )}

                    {/* Mark delayed / issue */}
                    {stop.status !== "delayed" && stop.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStopStatus(stop.id, "delayed")}
                        className="bg-red-950/40 hover:bg-red-900/30 text-red-400 border border-red-900/60 font-bold px-2.5 py-2 rounded-xl text-[11px] transition cursor-pointer shrink-0 text-center"
                        title="Signaler retard"
                      >
                        Retard / Souci
                      </button>
                    )}

                    {/* Return to pending option */}
                    {stop.status === "completed" && (
                      <button
                        type="button"
                        onClick={() => onUpdateStopStatus(stop.id, "pending")}
                        className="w-full bg-slate-950 hover:bg-slate-800 text-slate-500 hover:text-slate-400 font-extrabold py-1.5 rounded-xl text-[9px] transition cursor-pointer border border-dashed border-slate-800"
                      >
                        Réinitialiser l'état (Remettre en attente)
                      </button>
                    )}

                  </div>

                </div>
              );
            })
          ) : (
            <div className="bg-slate-900/60 rounded-3xl p-10 border border-slate-800 text-center space-y-4">
              <Compass className="h-10 w-10 text-slate-600 mx-auto" strokeWidth={1.5} />
              <div className="space-y-1">
                <p className="text-xs font-black text-slate-300">Aucune étape active assignée</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  Le Dispatcher {stops.length > 0 ? "ne vous a pas attribué d'étapes dans la tournée de livraison générée" : "n'a pas encore calculé de tournée de livraison aujourd'hui"}.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Offline cache reminder */}
        <div className="bg-indigo-950/20 rounded-2xl p-4 border border-indigo-900/20 text-center text-[10.5px] leading-relaxed text-indigo-200">
          <p className="font-bold text-[11.5px] text-indigo-400 mb-1">📶 Synchro Anti-Dead Zone Active</p>
          Si vous traversez une zone blanche, vos mises à jour (Livrées ou Retards) seront automatiquement stockées sur votre appareil et synchronisées dès que vous retrouverez du réseau !
        </div>

      </main>

      <footer className="mt-12 text-center text-[9.5px] text-slate-600">
        <p>LogistiQ Mobile App v2.5 — Propulsé par Google Gemini 3.5 Flash</p>
      </footer>
    </div>
  );
}
