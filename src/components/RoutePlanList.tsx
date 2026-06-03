import React, { useState } from "react";
import { Stop } from "../types";
import { 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Check, 
  Clock, 
  Phone, 
  MapPin, 
  AlertTriangle, 
  User, 
  Search,
  CheckCircle,
  XCircle,
  HelpCircle,
  Plus,
  Coins
} from "lucide-react";

interface RoutePlanListProps {
  stops: Stop[];
  drivers: string[];
  onUpdateStop: (id: string, updated: Partial<Stop>) => void;
  onRemoveStop: (id: string) => void;
  onReorderStops: (indexA: number, indexB: number) => void;
  onAddStop: (newStop: Omit<Stop, "id" | "status">) => void;
}

export default function RoutePlanList({
  stops,
  drivers,
  onUpdateStop,
  onRemoveStop,
  onReorderStops,
  onAddStop,
}: RoutePlanListProps) {
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states for manual additions
  const [manualStop, setManualStop] = useState("");
  const [manualDriver, setManualDriver] = useState(drivers[0] || "Driver 1");
  const [manualTime, setManualTime] = useState("10:00 AM");
  const [manualPriority, setManualPriority] = useState<Stop["priority"]>("Medium");
  const [manualCustomer, setManualCustomer] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualPaymentMethod, setManualPaymentMethod] = useState("COD");
  const [manualCodAmount, setManualCodAmount] = useState("250 DH");
  const [manualPreferredTime, setManualPreferredTime] = useState("14:00 - 18:00");

  // Edit inline state
  const [editStopName, setEditStopName] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDriverName, setEditDriverName] = useState("");
  const [editPriority, setEditPriority] = useState<Stop["priority"]>("Medium");
  const [editPaymentMethod, setEditPaymentMethod] = useState("COD");
  const [editCodAmount, setEditCodAmount] = useState("");
  const [editPreferredTime, setEditPreferredTime] = useState("");

  const startEditing = (stop: Stop) => {
    setEditingId(stop.id);
    setEditStopName(stop.stop);
    setEditCustomerName(stop.customer_name);
    setEditPhone(stop.phone);
    setEditTime(stop.estimated_time);
    setEditDriverName(stop.driver_name);
    setEditPriority(stop.priority);
    setEditPaymentMethod(stop.payment_method || "COD");
    setEditCodAmount(stop.cod_amount || "0 DH");
    setEditPreferredTime(stop.preferred_time || "14:00 - 18:00");
  };

  const saveEdit = (id: string) => {
    onUpdateStop(id, {
      stop: editStopName,
      customer_name: editCustomerName,
      phone: editPhone,
      estimated_time: editTime,
      driver_name: editDriverName,
      priority: editPriority,
      payment_method: editPaymentMethod,
      cod_amount: editPaymentMethod === "Prepaid" ? "0 DH" : editCodAmount || "0 DH",
      preferred_time: editPreferredTime || "14:00 - 18:00",
    });
    setEditingId(null);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStop.trim()) return;

    onAddStop({
      stop: manualStop.trim(),
      driver_name: manualDriver,
      estimated_time: manualTime,
      priority: manualPriority,
      customer_name: manualCustomer.trim() || `Client ${manualStop}`,
      phone: manualPhone.trim() || "06XXXXXXXX",
      payment_method: manualPaymentMethod,
      cod_amount: manualPaymentMethod === "Prepaid" ? "0 DH" : manualCodAmount.trim() || "0 DH",
      preferred_time: manualPreferredTime.trim() || "14:00 - 18:00",
    });

    setManualStop("");
    setManualCustomer("");
    setManualPhone("");
    setManualCodAmount("250 DH");
    setManualPaymentMethod("COD");
    setManualPreferredTime("14:00 - 18:00");
    setShowAddForm(false);
  };

  // Filter stops by selected driver
  const filteredStops = selectedDriver === "all"
    ? stops
    : stops.filter((s) => s.driver_name === selectedDriver);

  const getPriorityBadge = (p: Stop["priority"]) => {
    switch (p) {
      case "High":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Medium":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Low":
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusBadge = (status: Stop["status"]) => {
    switch (status) {
      case "pending":
        return "bg-slate-100 text-slate-700";
      case "dispatched":
        return "bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border border-emerald-100";
      case "delayed":
        return "bg-rose-50 text-rose-700 border border-rose-100";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="route-plan-list">
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">SÉQUENCE DÉTAILLÉE</span>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Feuille de Route AI Optimisée</h2>
          <p className="text-xs text-slate-500">Chronologie et répartition des livraisons de la journée</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1">
            <button
              onClick={() => setSelectedDriver("all")}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition ${
                selectedDriver === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Tous
            </button>
            {drivers.map((drv) => (
              <button
                key={drv}
                onClick={() => setSelectedDriver(drv)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition max-w-[120px] truncate ${
                  selectedDriver === drv ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {drv.split(" ")[0]}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="xl:flex items-center gap-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl transition"
          >
            <Plus className="h-3.5 w-3.5 text-amber-600" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Manual Stop Addition Form */}
      {showAddForm && (
        <form onSubmit={handleManualSubmit} className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-4 mb-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Point de Livraison / Quartier *</label>
            <input
              type="text"
              required
              placeholder="Ex: Maarif Center, imm 4, Casablanca"
              value={manualStop}
              onChange={(e) => setManualStop(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Attribuer au Chauffeur</label>
            <select
              value={manualDriver}
              onChange={(e) => setManualDriver(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            >
              {drivers.length === 0 ? (
                <option value="Driver 1">Driver 1</option>
              ) : (
                drivers.map((d) => <option key={d} value={d}>{d}</option>)
              )}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom Destinataire</label>
            <input
              type="text"
              placeholder="Ex: Amina"
              value={manualCustomer}
              onChange={(e) => setManualCustomer(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">GSM Maroc</label>
            <input
              type="text"
              placeholder="Ex: 0661234567"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Horaire Prévu</label>
              <input
                type="text"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Priorité</label>
              <select
                value={manualPriority}
                onChange={(e) => setManualPriority(e.target.value as Stop["priority"])}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="High">Haute (VIP)</option>
                <option value="Medium">Moyenne</option>
                <option value="Low">Basse</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mode de Paiement</label>
            <select
              value={manualPaymentMethod}
              onChange={(e) => {
                setManualPaymentMethod(e.target.value);
                if (e.target.value === "Prepaid") {
                  setManualCodAmount("0 DH");
                } else if (manualCodAmount === "0 DH") {
                  setManualCodAmount("250 DH");
                }
              }}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            >
              <option value="COD">COD (Paiement à la livraison)</option>
              <option value="Prepaid">Prepaid (Payé d'avance)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Montant COD (Collecte)</label>
            <input
              type="text"
              disabled={manualPaymentMethod === "Prepaid"}
              placeholder="Ex: 250 DH"
              value={manualCodAmount}
              onChange={(e) => setManualCodAmount(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Créneau Horaire Préféré (Anti-Retour)</label>
            <input
              type="text"
              placeholder="Ex: 15:00 - 18:00 or mora l'3asr"
              value={manualPreferredTime}
              onChange={(e) => setManualPreferredTime(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="text-xs font-semibold bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700"
            >
              Ajouter Stop
            </button>
          </div>
        </form>
      )}
        {/* Stop list mapping */}
      <div className="relative pl-6 border-l border-slate-100 space-y-4">
        {filteredStops.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
            Donnez une liste à LogistiQ AI ou ajoutez un stop pour commencer.
          </div>
        ) : (
          filteredStops.map((stop, idx) => {
            const isEditing = editingId === stop.id;
            return (
              <div
                key={stop.id}
                className={`relative p-4 border rounded-xl transition duration-150 ${
                  stop.status === "completed"
                    ? "bg-slate-50/70 border-slate-100 text-slate-500"
                    : isEditing
                    ? "border-amber-400 bg-amber-50/10"
                    : "bg-white border-slate-100 hover:border-slate-300 shadow-xs"
                }`}
              >
                {/* Visual Timeline Bubble Indicator */}
                <div
                  className={`absolute -left-[31px] top-6 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] font-bold ${
                    stop.status === "completed"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : stop.status === "delayed"
                      ? "bg-red-500 border-rose-600 text-white"
                      : "bg-white border-slate-300 text-slate-600"
                  }`}
                  title={`Stop #${idx + 1}`}
                >
                  {stop.status === "completed" ? "✓" : idx + 1}
                </div>

                {isEditing ? (
                  /* Edit Mode Inputs */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editStopName}
                        onChange={(e) => setEditStopName(e.target.value)}
                        placeholder="Quartier/Stop"
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        placeholder="Client"
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Téléphone"
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="Créneau horaire"
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      />
                      <select
                        value={editDriverName}
                        onChange={(e) => setEditDriverName(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      >
                        {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        value={editPaymentMethod}
                        onChange={(e) => {
                          setEditPaymentMethod(e.target.value);
                          if (e.target.value === "Prepaid") {
                            setEditCodAmount("0 DH");
                          } else if (editCodAmount === "0 DH") {
                            setEditCodAmount("250 DH");
                          }
                        }}
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      >
                        <option value="COD">COD (Paiement à la livraison)</option>
                        <option value="Prepaid">Prepaid (Payé d'avance)</option>
                      </select>
                      <input
                        type="text"
                        disabled={editPaymentMethod === "Prepaid"}
                        placeholder="Montant COD"
                        value={editCodAmount}
                        onChange={(e) => setEditCodAmount(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-slate-500">Créneau horaire préféré (Anti-Retour):</label>
                      <input
                        type="text"
                        placeholder="Ex: 15:00 - 18:00"
                        value={editPreferredTime}
                        onChange={(e) => setEditPreferredTime(e.target.value)}
                        className="text-xs bg-white border border-slate-200 rounded p-1.5 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[11px] px-2.5 py-1 bg-slate-100 text-slate-600 rounded"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => saveEdit(stop.id)}
                        className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-600 text-white rounded"
                      >
                        Sauvegarder
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal Mode Layout */
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 tracking-tight flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {stop.stop}
                        </span>
                        
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadge(stop.priority)}`}>
                          {stop.priority}
                        </span>

                        <span className={`text-[10px] font-medium font-mono px-2 py-0.5 rounded-full ${getStatusBadge(stop.status)}`}>
                          {stop.status}
                        </span>
                      </div>

                      {/* Client Info Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 pt-1.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-700">{stop.customer_name}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          {stop.phone}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="text-amber-800 font-medium">ETA: {stop.estimated_time}</span>
                        </span>
                      </div>

                      {/* Display assigned chauffeur and payment method/COD info */}
                      <div className="pt-2 flex flex-wrap gap-2">
                        <span className="bg-slate-50 text-slate-800 border border-slate-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Chauffeur: {stop.driver_name}
                        </span>
                        
                        {stop.payment_method === "Prepaid" || stop.payment_method === "Paid" ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Coins className="h-3 w-3 text-emerald-600" />
                            Payé d'avance (0 DH)
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-950 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Coins className="h-3 w-3 text-amber-600" />
                            COD: {stop.cod_amount || "250 DH"}
                          </span>
                        )}

                        {stop.preferred_time && (
                          <span className="bg-purple-50 text-purple-900 border border-purple-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1" title="Créneau horaire préféré pour la livraison">
                            <Clock className="h-3 w-3 text-purple-600 text-purple-600" />
                            Créneau: {stop.preferred_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="flex items-center justify-end space-x-1 border-t border-slate-50 md:border-t-0 pt-2 md:pt-0">
                      {/* Move timeline order buttons */}
                      <button
                        disabled={idx === 0}
                        onClick={() => onReorderStops(idx, idx - 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-50 rounded"
                        title="Monter l'ordre"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={idx === filteredStops.length - 1}
                        onClick={() => onReorderStops(idx, idx + 1)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 hover:bg-slate-50 rounded"
                        title="Descendre l'ordre"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Status selectors */}
                      <button
                        onClick={() => onUpdateStop(stop.id, { status: "completed" })}
                        className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-0.5 ${
                          stop.status === "completed"
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-500"
                        }`}
                        title="Marquer comme livré"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onUpdateStop(stop.id, { status: "delayed" })}
                        className={`p-1.5 rounded-lg border text-xs transition flex items-center gap-0.5 ${
                          stop.status === "delayed"
                            ? "bg-rose-500 border-rose-500 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-500"
                        }`}
                        title="Signaler retard"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>

                      {/* Manual text corrections */}
                      <button
                        onClick={() => startEditing(stop)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Modifier les détails"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      {/* Remove stop */}
                      <button
                        onClick={() => onRemoveStop(stop.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Annuler le stop"
                      >
                        <XCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
