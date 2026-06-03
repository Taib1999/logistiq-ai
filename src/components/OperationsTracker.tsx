import React from "react";
import { Coins } from "lucide-react";

interface OperationsTrackerProps {
  progressRatio: number;
  completedStops: number;
  totalStops: number;
  collectedCod: number;
  totalCodToCollect: number;
}

export default function OperationsTracker({
  progressRatio,
  completedStops,
  totalStops,
  collectedCod,
  totalCodToCollect,
}: OperationsTrackerProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">SUIVI RAPIDE DES OPÉRATIONS</h3>
      <div className="grid grid-cols-1 gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
            <span className="text-[9px] text-slate-400 uppercase font-black font-sans">Progression</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-mono font-bold text-slate-800">{progressRatio}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1 mt-2">
              <div className="bg-indigo-600 h-1 rounded-full transition-all duration-300" style={{ width: `${progressRatio}%` }}></div>
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-black font-sans font-sans">Livré / Total</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-mono font-bold text-slate-800">{completedStops}</span>
                <span className="text-slate-400 text-xs">/ {totalStops} stops</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-200/50 flex flex-col justify-between">
          <div>
            <span className="text-[9px] text-amber-700 uppercase font-black flex items-center gap-1 font-sans">
              <Coins className="h-3 w-3 text-amber-600" />
              Collecte Cash On Delivery (COD)
            </span>
            <div className="flex items-baseline justify-between mt-1 flex-wrap gap-1">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-mono font-black text-amber-900">{collectedCod} DH</span>
                <span className="text-amber-600 text-[10px] font-bold font-sans">encaissés</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold font-mono">
                Objectif: <span className="text-slate-800 font-extrabold">{totalCodToCollect} DH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
