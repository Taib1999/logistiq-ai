import React, { useEffect, useRef } from "react";
import { Bot, MessageSquare, RefreshCw, Send } from "lucide-react";
import { ChatMessage, LogisticsPlan } from "../types";

interface SmartChatAssistantProps {
  plan: LogisticsPlan | null;
  chatMessages: ChatMessage[];
  isChatting: boolean;
  userInput: string;
  setUserInput: (text: string) => void;
  onChatSubmit: (e: React.FormEvent) => void;
}

export default function SmartChatAssistant({
  plan,
  chatMessages,
  isChatting,
  userInput,
  setUserInput,
  onChatSubmit,
}: SmartChatAssistantProps) {
  const localChatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll inside the chat assistant when message count or loading status changes
  useEffect(() => {
    localChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  return (
    <div className="lg:col-span-3 bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col h-[480px]">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-3">
        <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
          <Bot className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-sans">Ajustements IA</h3>
          <h4 className="text-xs font-semibold text-slate-200 font-sans">Conversation Directe</h4>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto mb-3 pr-1 text-xs" style={{ contentVisibility: "auto" }}>
        {chatMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-2">
            <MessageSquare className="h-8 w-8 mx-auto stroke-[1.5]" />
            <p className="text-[10px] font-sans">Générez d'abord un plan pour entamer des modifications interactives en Darija avec l'IA.</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl max-w-[90%] leading-relaxed ${
                msg.sender === "user"
                  ? "bg-slate-800 text-amber-300 ml-auto border-l-2 border-amber-400"
                  : "bg-slate-800/50 text-slate-200"
              }`}
            >
              <div className="flex items-center gap-1 mb-1 text-[9px] font-bold uppercase text-slate-400">
                <span>{msg.sender === "user" ? "Dispatcher (Vous)" : "LogistiQ Assistant"}</span>
              </div>
              <p className="text-[11px] leading-normal">{msg.text}</p>
            </div>
          ))
        )}
        {isChatting && (
          <div className="bg-slate-800 bg-slate-800/30 text-slate-300 p-2.5 rounded-xl flex items-center gap-2 animate-pulse text-[11px]">
            <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
            <span>Modification du plan de route...</span>
          </div>
        )}
        <div ref={localChatEndRef} />
      </div>

      <form onSubmit={onChatSubmit} className="relative">
        <input
          type="text"
          disabled={!plan || isChatting}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={plan ? "Modifier en Darija (ex: khlli Sidi Maarouf l Amin)" : "Rédiger d'abord le plan de route"}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 pr-10 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none text-white placeholder-slate-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!userInput.trim() || isChatting || !plan}
          className="absolute right-1.5 top-1.5 bg-indigo-600 hover:bg-indigo-700 text-white p-1 rounded-lg transition disabled:opacity-30 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
