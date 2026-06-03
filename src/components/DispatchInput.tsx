import React from "react";
import { Sliders, Bot, RefreshCw, Play, AlertTriangle } from "lucide-react";
import { MOROCCAN_CITIES } from "../presets";

interface DispatchInputProps {
  startCity: string;
  setStartCity: (city: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  inputText: string;
  setInputText: (text: string) => void;
  isLoading: boolean;
  onGeneratePlan: () => void;
  chatError: string;
}

export default function DispatchInput({
  startCity,
  setStartCity,
  startTime,
  setStartTime,
  inputText,
  setInputText,
  isLoading,
  onGeneratePlan,
  chatError,
}: DispatchInputProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between" id="bento-input-panel">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">SAISIE DISPATCHING</span>
            <h3 className="text-sm font-bold text-slate-900 font-sans">Demande de Livraison Brute</h3>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <Sliders className="h-3 w-3 text-indigo-600" />
            <span className="text-[10px] font-bold text-slate-600 uppercase">Configuration</span>
          </div>
        </div>

        {/* Form Input Variables */}
        <div className="grid grid-cols-2 gap-3 pb-1">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ville de Départ</label>
            <select
              value={startCity}
              onChange={(e) => setStartCity(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {MOROCCAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Heure de Lancement</label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="Ex: 09:00 AM"
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Messy Dispatch Input */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-slate-400">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              Texte en vrac (Audio, Mail, WhatsApp...)
            </label>
            <span className="text-[10px] font-semibold">{inputText.length} chars</span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ex: Sift 3 colis: l'maarif l Amina (06612233), sidi maarouf, sidi belyout. 2 drivers start b 9h..."
            rows={6}
            className="w-full text-xs bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-3 focus:ring-1 focus:ring-indigo-500 focus:outline-none leading-relaxed transition"
          ></textarea>
        </div>

        <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/60 flex items-start gap-2.5">
          <Bot className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-[10.5px] leading-relaxed text-indigo-950/80">
            <span className="font-bold">Astuce de Dispatcher</span>: Vous pouvez écrire dans n'importe quel langage ou mixer l'Arabe marocain ("lyoum sift", "had lcolis"), les numéros de téléphone et le nom des clients. L'IA extrait tout chirurgicalement.
          </p>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onGeneratePlan}
          disabled={isLoading || !inputText.trim()}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold py-3 px-4 rounded-xl text-white transition-all duration-200 shadow-md ${
            isLoading || !inputText.trim()
              ? "bg-slate-300 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10 cursor-pointer hover:scale-[1.01]"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Traitement et Analyse en cours par l'IA...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Générer et Optimiser le Plan de Route</span>
            </>
          )}
        </button>
        {chatError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[11px] leading-relaxed flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{chatError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
