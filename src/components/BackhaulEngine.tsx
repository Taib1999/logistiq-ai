import React, { useState } from "react";
import { Driver, BackhaulOffer } from "../types";
import { MOROCCAN_CITIES } from "../presets";
import { 
  Repeat, 
  Coins, 
  Scale, 
  Check, 
  ArrowLeftRight, 
  Boxes, 
  Weight, 
  CheckCircle, 
  Sparkles 
} from "lucide-react";

const VEHICLE_CAPACITIES: Record<"Motorcycle" | "Van" | "Truck" | "Any", { maxVolume: number; maxWeight: number }> = {
  Motorcycle: { maxVolume: 0.3, maxWeight: 35 },
  Van: { maxVolume: 8.5, maxWeight: 1200 },
  Truck: { maxVolume: 42.0, maxWeight: 14000 },
  Any: { maxVolume: 99.0, maxWeight: 99999 }
};

interface BackhaulEngineProps {
  drivers: Driver[];
  backhaulOffers: BackhaulOffer[];
  onMatchBackhaul: (offerId: string, driverName: string) => void;
  onCancelBackhaul: (offerId: string) => void;
  onAddCustomOffer: (newOffer: BackhaulOffer) => void;
  enableVolumetricOpt: boolean;
  setEnableVolumetricOpt: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function BackhaulEngine({
  drivers,
  backhaulOffers,
  onMatchBackhaul,
  onCancelBackhaul,
  onAddCustomOffer,
  enableVolumetricOpt,
  setEnableVolumetricOpt,
}: BackhaulEngineProps) {
  // Local form states
  const [newOfferOrigin, setNewOfferOrigin] = useState("Tanger");
  const [newOfferDest, setNewOfferDest] = useState("Casablanca");
  const [newOfferCargo, setNewOfferCargo] = useState("");
  const [newOfferReward, setNewOfferReward] = useState("800");
  const [newOfferVehicle, setNewOfferVehicle] = useState<"Van" | "Truck" | "Motorcycle" | "Any">("Van");
  const [newOfferVolume, setNewOfferVolume] = useState("2.5");
  const [newOfferWeight, setNewOfferWeight] = useState("180");
  const [showAddOfferForm, setShowAddOfferForm] = useState(false);
  const [backhaulNotification, setBackhaulNotification] = useState<string | null>(null);

  // Stats calculation
  const matchedBackhaulOffers = backhaulOffers.filter(o => o.status === "matched");
  const totalBackhaulRevenue = matchedBackhaulOffers.reduce((sum, o) => sum + o.reward, 0);
  const totalCo2Saved = matchedBackhaulOffers.reduce((sum, o) => sum + (o.savingsCo2 || 0), 0);
  const totalTollFeesRecovered = matchedBackhaulOffers.reduce((sum, o) => sum + (o.tollFees || 0), 0);
  const totalBackhaulVolume = matchedBackhaulOffers.reduce((sum, o) => sum + (o.volume || 0), 0);
  const totalBackhaulWeight = matchedBackhaulOffers.reduce((sum, o) => sum + (o.weight || 0), 0);

  const matchedDriversCapacity = matchedBackhaulOffers.reduce((acc, o) => {
    const dObj = drivers.find(d => d.name === o.matchedDriverName);
    if (!dObj) return acc;
    const cap = VEHICLE_CAPACITIES[dObj.vehicle] || { maxVolume: 0, maxWeight: 0 };
    return {
      volume: acc.volume + cap.maxVolume,
      weight: acc.weight + cap.maxWeight
    };
  }, { volume: 0, weight: 0 });

  const fillRateVolume = matchedDriversCapacity.volume > 0 
    ? Math.round((totalBackhaulVolume / matchedDriversCapacity.volume) * 100)
    : 0;

  const fillRateWeight = matchedDriversCapacity.weight > 0 
    ? Math.round((totalBackhaulWeight / matchedDriversCapacity.weight) * 100)
    : 0;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfferCargo.trim()) return;

    const newOffer: BackhaulOffer = {
      id: `bo-custom-${Date.now()}`,
      origin: newOfferOrigin,
      destination: newOfferDest,
      cargo: newOfferCargo.trim(),
      reward: parseInt(newOfferReward) || 500,
      vehicleType: newOfferVehicle,
      status: "available",
      savingsCo2: Math.floor(60 + Math.random() * 150),
      tollFees: Math.floor(20 + Math.random() * 100),
      volume: parseFloat(newOfferVolume) || 1.5,
      weight: parseFloat(newOfferWeight) || 120
    };

    onAddCustomOffer(newOffer);
    setNewOfferCargo("");
    setNewOfferVolume("2.5");
    setNewOfferWeight("180");
    setShowAddOfferForm(false);
  };

  const executeMatch = (offerId: string, offer: BackhaulOffer, driverName: string) => {
    let warningMsg = "";
    if (enableVolumetricOpt) {
      const driverObj = drivers.find(d => d.name === driverName);
      if (driverObj) {
        const cap = VEHICLE_CAPACITIES[driverObj.vehicle];
        const offerVol = offer.volume || 0;
        const offerWgt = offer.weight || 0;
        if (offerVol > cap.maxVolume || offerWgt > cap.maxWeight) {
          warningMsg = `⚠️ COMMANDE EN SURCHARGE : ${driverName} conduit un ${driverObj.vehicle} (limité à ${cap.maxVolume} m³ / ${cap.maxWeight} kg), mais ce fret requiert ${offerVol} m³ / ${offerWgt} kg ! Un véhicule plus grand ou une cargaison scindée est recommandé. `;
        }
      }
    }
    
    onMatchBackhaul(offerId, driverName);
    setBackhaulNotification(`${warningMsg}${driverName} a été matché avec succès pour rapatrier le fret de retour depuis ${offer.origin} (+${offer.reward} DH) !`);
    setTimeout(() => setBackhaulNotification(null), 5000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-md p-6 space-y-6 mt-6 w-full" id="bento-backhaul-engine">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-800 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border border-indigo-200 flex items-center gap-1 leading-none shadow-sm">
              <Repeat className="h-3 w-3 animate-spin text-indigo-600" style={{ animationDuration: "6s", display: "inline-block" }} />
              NOUVEAU: Smart Backhaul Matching Engine
            </span>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
              Zéro Retour à Vide
            </span>
          </div>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1.5 font-sans">
            Optimisation de Fret de Retour & Triangulation Logistique
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl font-medium mt-0.5 leading-relaxed">
            Les chauffeurs effectuant des livraisons inter-villes repartent souvent à vide. Ce module IA apparie instantanément vos retours vides avec des demandes d'entreprises locales pour maximiser la rentabilité de chaque kilomètre.
          </p>
        </div>

        {/* Backhaul Achievements Stats */}
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl px-3.5 py-2 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Revenus Retour</p>
            <p className="text-sm md:text-base font-mono font-black text-emerald-700 mt-1">+{totalBackhaulRevenue} DH</p>
          </div>
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl px-3.5 py-2 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">CO₂ Évité</p>
            <p className="text-sm md:text-base font-mono font-black text-indigo-700 mt-1">{totalCo2Saved} kg</p>
          </div>

          {enableVolumetricOpt && totalBackhaulVolume > 0 && (
            <div className="bg-purple-50/60 border border-purple-100 rounded-2xl px-3.5 py-2 text-center shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Vol. Rapatrié</p>
              <p className="text-sm md:text-base font-mono font-black text-purple-700 mt-1">
                {totalBackhaulVolume.toFixed(1)} m³ <span className="text-[9px] font-bold text-purple-500">({fillRateVolume}%)</span>
              </p>
            </div>
          )}

          {enableVolumetricOpt && totalBackhaulWeight > 0 && (
            <div className="bg-rose-50/60 border border-rose-100 rounded-2xl px-3.5 py-2 text-center shadow-sm">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Poids Rapatrié</p>
              <p className="text-sm md:text-base font-mono font-black text-rose-700 mt-1">
                {totalBackhaulWeight} kg <span className="text-[9px] font-bold text-rose-500">({fillRateWeight}%)</span>
              </p>
            </div>
          )}

          <div className="bg-amber-50/60 border border-amber-100 rounded-2xl px-3.5 py-2 text-center shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Péages Rentrés</p>
            <p className="text-sm md:text-base font-mono font-black text-amber-700 mt-1">+{totalTollFeesRecovered} MAD</p>
          </div>
        </div>
      </div>

      {/* VOLUMETRIC & WEIGHT OPTIMIZATION OPTION CONTROLLER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/60 to-purple-50/40 rounded-2xl p-4 border border-indigo-100/60">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl transition-all ${enableVolumetricOpt ? "bg-indigo-600 text-white shadow-md" : "bg-slate-200 text-slate-600"}`}>
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              Option: Volumetric & Weight Optimization
              <span className="bg-indigo-600 text-white text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none">Active</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-medium">Calcule les volumes cubes (m³), les masses (kg) et avertit instantanément en cas de surcharge des véhicules.</p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setEnableVolumetricOpt(!enableVolumetricOpt)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
            enableVolumetricOpt 
              ? "bg-indigo-600 text-white hover:bg-indigo-700" 
              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <div className={`h-2 w-2 rounded-full ${enableVolumetricOpt ? "bg-emerald-300 animate-pulse" : "bg-slate-400"}`} />
          {enableVolumetricOpt ? "Optimisation Activée" : "Activer l'Optimisation"}
        </button>
      </div>

      {/* Toast Notifications */}
      {backhaulNotification && (
        <div className="bg-indigo-50 border border-indigo-200 text-slate-900 p-4 rounded-xl text-xs font-semibold leading-relaxed flex items-center gap-2.5 shadow-sm">
          <div className="p-1 bg-indigo-600 rounded-full text-white flex-shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <span className="flex-1">{backhaulNotification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columns 1-8: Offers Grid Marketplace */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="h-4 w-4 text-indigo-500" />
              Offres de Fret Disponibles dans votre Secteur
            </h3>
            <button
              type="button"
              onClick={() => setShowAddOfferForm(!showAddOfferForm)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer"
            >
              {showAddOfferForm ? "Voir les offres" : "+ Poster une offre de fret"}
            </button>
          </div>

          {showAddOfferForm ? (
            <form onSubmit={handleFormSubmit} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold text-slate-800">Saisir une Offre de Fret de Retour</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Ville de Ramassage (Origine)</label>
                  <select
                    value={newOfferOrigin}
                    onChange={(e) => setNewOfferOrigin(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Ville de Destination (Base)</label>
                  <select
                    value={newOfferDest}
                    onChange={(e) => setNewOfferDest(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {MOROCCAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Prix de la course (DH)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 1200"
                    value={newOfferReward}
                    onChange={(e) => setNewOfferReward(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Véhicule requis</label>
                  <select
                    value={newOfferVehicle}
                    onChange={(e) => setNewOfferVehicle(e.target.value as any)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Van">Fourgonnette (Van)</option>
                    <option value="Truck">Poids Lourd (Truck)</option>
                    <option value="Motorcycle">Moto</option>
                    <option value="Any">N'importe quel véhicule</option>
                  </select>
                </div>
              </div>

              {/* Volumetric & Weight Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Volume de la cargaison (m³)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="Ex: 2.5"
                    value={newOfferVolume}
                    onChange={(e) => setNewOfferVolume(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">Poids de la cargaison (kg)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="Ex: 180"
                    value={newOfferWeight}
                    onChange={(e) => setNewOfferWeight(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-100 border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Description de la cargaison</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Palette d'Huile d'Argan bio ou 30 pneus à rapatrier"
                  value={newOfferCargo}
                  onChange={(e) => setNewOfferCargo(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddOfferForm(false)}
                  className="text-xs text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Publier l'offre
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {backhaulOffers.map((offer) => {
                const isAvailable = offer.status === "available";
                
                return (
                  <div
                    key={offer.id}
                    className={`border rounded-2xl p-4 transition-all flex flex-col justify-between space-y-4 ${
                      isAvailable
                        ? "bg-slate-50/50 border-slate-200/60 hover:bg-white hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-500/5"
                        : "bg-emerald-50/10 border-emerald-200 relative overflow-hidden"
                    }`}
                  >
                    {!isAvailable && (
                      <div className="absolute -right-3 -bottom-3 rotate-12 text-emerald-600/5 pointer-events-none">
                        <CheckCircle className="h-20 w-20" />
                      </div>
                    )}

                    {/* Offer Card Header */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          offer.vehicleType === "Truck"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                            : offer.vehicleType === "Van"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-slate-50 text-slate-600 border-slate-100"
                        }`}>
                          {offer.vehicleType === "Any" ? "Tout véhicule" : offer.vehicleType}
                        </span>
                        
                        <span className="bg-amber-50 text-amber-900 border border-amber-200 text-xs font-black px-2.5 py-0.5 rounded-full font-mono">
                          {offer.reward} DH
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">{offer.origin}</span>
                        <ArrowLeftRight className="h-3 w-3 text-slate-400" />
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold">{offer.destination}</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-normal font-sans font-medium">
                        {offer.cargo}
                      </p>

                      {/* Dynamic Volumetric & Weight parameters */}
                      {enableVolumetricOpt && (offer.volume || offer.weight) && (
                        <div className="flex items-center gap-2.5 text-[10px] font-sans font-semibold bg-indigo-50/40 text-indigo-950 p-2 rounded-xl border border-indigo-100/30 mt-1">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Boxes className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{offer.volume ? `${offer.volume} m³` : "N/D"}</span>
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="flex items-center gap-1 text-slate-700">
                            <Weight className="h-3.5 w-3.5 text-indigo-500" />
                            <span>{offer.weight ? `${offer.weight} kg` : "N/D"}</span>
                          </span>
                          
                          {!isAvailable && offer.matchedDriverName && (
                            <>
                              <span className="text-slate-300">|</span>
                              <span className="text-emerald-700 font-extrabold text-[8.5px]">
                                Rempli : {(() => {
                                  const dObj = drivers.find(d => d.name === offer.matchedDriverName);
                                  if (!dObj) return "N/D";
                                  const cap = VEHICLE_CAPACITIES[dObj.vehicle];
                                  if (!cap) return "N/D";
                                  const fv = offer.volume ? Math.round((offer.volume / cap.maxVolume) * 105) : 0;
                                  const fw = offer.weight ? Math.round((offer.weight / cap.maxWeight) * 105) : 0;
                                  return `${Math.max(fv, fw)}%`;
                                })()}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Savings Eco badge & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-0.5 text-emerald-600">
                          🌿 -{offer.savingsCo2}kg CO₂
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-500">
                          Péage: +{offer.tollFees} MAD
                        </span>
                      </div>

                      {isAvailable ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-[10px] text-slate-600 font-bold">Assigner:</span>
                          {drivers.filter(d => d.status === "active").length === 0 ? (
                            <span className="text-[9px] text-rose-500 italic font-semibold">Aucun dispo</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {drivers.filter(d => d.status === "active").map((d) => {
                                const cap = VEHICLE_CAPACITIES[d.vehicle];
                                const isOverload = enableVolumetricOpt && cap && ((offer.volume || 0) > cap.maxVolume || (offer.weight || 0) > cap.maxWeight);

                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => executeMatch(offer.id, offer, d.name)}
                                    className={`text-[9px] font-bold border px-1.5 py-0.5 rounded-lg transition h-6 flex items-center ${
                                      isOverload
                                        ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white"
                                        : "bg-indigo-50 hover:bg-indigo-600 border-indigo-200 text-indigo-700 hover:text-white"
                                    }`}
                                    title={
                                      isOverload
                                        ? `Attention surcharge ! Capacité max de ce conducteur dépassée (${cap.maxVolume}m³ / ${cap.maxWeight}kg)`
                                        : `Associer ce fret retour à ${d.name}`
                                    }
                                  >
                                    {d.name.split(" ")[0]} {isOverload ? "⚠️" : "⚡"}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 text-emerald-700 text-[10px] font-black">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Avec: {offer.matchedDriverName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onCancelBackhaul(offer.id)}
                            className="text-[9px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer hover:underline"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columns 9-12: Backhaul educational dashboard tip */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 space-y-4 shadow-sm border border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">Algorithme d'Appariement</h4>
          </div>
          
          <div className="space-y-4 text-[11px] leading-relaxed text-slate-300">
            <div className="bg-slate-800 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
              <p className="font-bold text-white text-xs mb-1">💡 Comment ça marche ?</p>
              Préparez une assignation inter-villes (ex. vers Tanger ou Marrakech). Notre moteur calcule automatiquement si l'un de vos véhicules rentre à vide et vous propose des chargements d'appoint payants à rapatrier vers la base.
            </div>

            <div className="space-y-2">
              <span className="block font-black text-slate-200 uppercase text-[9px] tracking-wider">Avantages Clés:</span>
              <ul className="space-y-1.5 pl-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-400 font-black">•</span>
                  <span><strong>Marge Brut Triplée:</strong> Le trajet retour est déjà amorti par la livraison aller (carburant et péages déjà budgétés).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-black">•</span>
                  <span><strong>Couverture Péages:</strong> Les frais de péage autoroutiers du Maroc (ADM) pour le retour sont à charge de l'expéditeur de backhaul.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-indigo-300 font-black">•</span>
                  <span><strong>Logistique Verte:</strong> Réduction directe de 98% des émissions par tonne-kilomètre de transport.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
