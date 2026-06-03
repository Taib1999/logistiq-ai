import React, { useEffect, useState } from "react";
import { Truck, Clock, LogOut } from "lucide-react";
import { User as UserType } from "../types";

interface HeaderProps {
  activeStopsCount: number;
  activeDriversCount: number;
  user?: UserType | null;
  onLogout?: () => void;
}

export default function Header({ activeStopsCount, activeDriversCount, user, onLogout }: HeaderProps) {
  const [localTime, setLocalTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Morocco is typically GMT+1 (Africa/Casablanca)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Casablanca",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      setLocalTime(new Intl.DateTimeFormat("en-US", options).format(now));
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40" id="app-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center">
              <Truck className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-sans font-bold text-xl tracking-tight text-slate-950">LogistiQ</span>
                <span className="bg-indigo-100 text-indigo-950 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">AI</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans tracking-wide">Bureau de Dispatching — Maroc</p>
            </div>
          </div>

          {/* Quick Hub Stats & Auth Action */}
          <div className="flex items-center space-x-4 text-slate-700">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium text-slate-600">Dispatch: Actif</span>
            </div>
            
            <div className="hidden md:block text-right pr-2">
              <div className="text-xs text-slate-400 font-sans flex items-center justify-end gap-1">
                <Clock className="h-3 w-3" />
                <span>Casablanca, MA</span>
              </div>
              <span className="text-xs font-semibold font-mono text-slate-700">{localTime || "Mise à jour..."}</span>
            </div>

            {user && (
              <div className="flex items-center gap-2.5 border-l border-slate-100 pl-3.5">
                <div className="flex flex-col text-right">
                  <span className="text-[11px] font-extrabold text-slate-900 leading-none">{user.name}</span>
                  <span className="text-[9.5px] text-indigo-600 font-bold mt-0.5">{user.role}</span>
                </div>
                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="bg-red-50 hover:bg-red-100 text-red-650 font-black p-2 rounded-xl transition cursor-pointer border border-red-100 flex items-center justify-center gap-1 shadow-sm"
                    title="Se déconnecter"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="text-[10.5px] hidden md:inline">Quitter</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
