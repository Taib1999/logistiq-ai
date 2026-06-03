import React, { useState } from "react";
import { Driver } from "../types";
import { Bike, Car, Truck, Plus, Trash2, User, Smartphone, Sparkles } from "lucide-react";

interface FleetManagerProps {
  drivers: Driver[];
  onAddDriver: (driver: Omit<Driver, "id">) => void;
  onRemoveDriver: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export default function FleetManager({
  drivers,
  onAddDriver,
  onRemoveDriver,
  onToggleStatus,
}: FleetManagerProps) {
  const [name, setName] = useState("");
  const [vehicle, setVehicle] = useState<Driver["vehicle"]>("Motorcycle");
  const [phone, setPhone] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // Standard Moroccan number fallback
    const formattedPhone = phone.trim() || "+212 6" + Math.floor(10000000 + Math.random() * 90000000);

    onAddDriver({
      name: name.trim(),
      vehicle,
      phone: formattedPhone,
      status: "active",
    });

    setName("");
    setPhone("");
    setIsAdding(false);
  };

  const getVehicleIcon = (type: Driver["vehicle"]) => {
    switch (type) {
      case "Motorcycle":
        return <Bike className="h-4 w-4" />;
      case "Van":
        return <Car className="h-4 w-4" />;
      case "Truck":
        return <Truck className="h-4 w-4" />;
    }
  };

  const getVehicleColor = (type: Driver["vehicle"]) => {
    switch (type) {
      case "Motorcycle":
        return "bg-sky-50 text-sky-700 border-sky-100";
      case "Van":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Truck":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" id="fleet-manager">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">MAROC LOGISTIQUE</span>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 font-sans">
            Chauffeurs & Flotte
            <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded-full font-mono font-medium">
              {drivers.length}
            </span>
          </h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition duration-150 shadow-sm shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nom du Chauffeur *</label>
            <input
              type="text"
              required
              placeholder="Ex: Youssef Belkhayat"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Téléphone Whatsapp</label>
              <input
                type="text"
                placeholder="Ex: 0661234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Véhicule</label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value as Driver["vehicle"])}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Motorcycle">Moto (City Couriers)</option>
                <option value="Van">Fourgonnette (Standard)</option>
                <option value="Truck">Poids Lourd (Inter-city)</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-slate-500 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Drivers List */}
      <div className="space-y-2 max-h-[290px] overflow-y-auto">
        {drivers.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">Aucun chauffeur enregistré.</div>
        ) : (
          drivers.map((driver) => (
            <div
              key={driver.id}
              className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition animate-fade-in"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl border ${getVehicleColor(driver.vehicle)}`}>
                  {getVehicleIcon(driver.vehicle)}
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    {driver.name}
                    <span
                      onClick={() => onToggleStatus(driver.id)}
                      className={`cursor-pointer h-2 w-2 rounded-full ${
                        driver.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                      title={driver.status === "active" ? "Actif (cliquez pour suspendre)" : "Inactif"}
                    ></span>
                  </h3>
                  <p className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Smartphone className="h-2.5 w-2.5" />
                    {driver.phone}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onToggleStatus(driver.id)}
                  className={`text-[10px] px-2 py-0.5 rounded font-medium border cursor-pointer ${
                    driver.status === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {driver.status === "active" ? "Dispo" : "Pause"}
                </button>
                <button
                  onClick={() => onRemoveDriver(driver.id)}
                  title="Supprimer le chauffeur"
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <p className="text-[10.5px] leading-relaxed text-slate-500">
          Les chauffeurs actifs ci-dessus et leurs véhicules seront pris en compte lors de l'optimisation par IA pour répartir équitablement les stops.
        </p>
      </div>
    </div>
  );
}
