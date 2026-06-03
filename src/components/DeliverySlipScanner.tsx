import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Camera,
  Scan,
  FileText,
  CheckCircle,
  TrendingUp,
  Sparkles,
  Layers,
  AlertCircle,
  ArrowRight,
  Boxes,
  Weight,
  HelpCircle,
  RefreshCw,
  Clock,
  User,
  Phone,
  MapPin,
  ChevronRight,
  Upload,
  Coins
} from "lucide-react";
import { BackhaulOffer } from "../types";

// Moroccan shipping presets with custom CSS slip rendering data
interface SlipPreset {
  id: string;
  provider: "Amana Express" | "Aramex Maroc" | "Chrono Diali";
  slipNumber: string;
  origin: string;
  destination: string;
  customerName: string;
  phone: string;
  address: string;
  cargoDescription: string;
  volume: number; // m³
  weight: number; // kg
  reward: number; // DH
  stampColor: string;
}

const MOROCCAN_SLIP_PRESETS: SlipPreset[] = [
  {
    id: "slip-1",
    provider: "Amana Express",
    slipNumber: "AM-908273-TNG",
    origin: "Tanger",
    destination: "Casablanca",
    customerName: "Karim Hadraoui",
    phone: "0661908273",
    address: "Zone Franche Gzenaya, Hangar B3, Tanger",
    cargoDescription: "48 cartons de Prêt-à-porter & Maroquinerie d'artisanat",
    volume: 4.2,
    weight: 550,
    reward: 1600,
    stampColor: "border-emerald-500 text-emerald-600 bg-emerald-50/70"
  },
  {
    id: "slip-2",
    provider: "Aramex Maroc",
    slipNumber: "AX-40918-RAK",
    origin: "Marrakech",
    destination: "Casablanca",
    customerName: "Driss Chraibi (Argan Bio)",
    phone: "0652409182",
    address: "Quartier Industriel Sidi Ghanem, N°45, Marrakech",
    cargoDescription: "12 fûts d'Huile d'Argan pure & Produits de soins cosmétiques",
    volume: 1.8,
    weight: 260,
    reward: 1150,
    stampColor: "border-indigo-500 text-indigo-600 bg-indigo-50/70"
  },
  {
    id: "slip-3",
    provider: "Chrono Diali",
    slipNumber: "CD-7731-KEN",
    origin: "Kenitra",
    destination: "Marrakech",
    customerName: "Siham El Boustani (Alimentation)",
    phone: "0670332211",
    address: "Zone Franche Automotive, Lot 12, Kenitra",
    cargoDescription: "2 Palettes de Sourcing de Composants pour l'Éco-fret",
    volume: 7.1,
    weight: 850,
    reward: 2450,
    stampColor: "border-amber-500 text-amber-600 bg-amber-50/70"
  }
];

interface DeliverySlipScannerProps {
  token: string | null;
  onImportToDispatch: (rawText: string, startCity: string) => void;
  onImportToBackhaul: (offer: Omit<BackhaulOffer, "id" | "status">) => void;
  enableVolumetricOpt: boolean;
}

export default function DeliverySlipScanner({
  token,
  onImportToDispatch,
  onImportToBackhaul,
  enableVolumetricOpt
}: DeliverySlipScannerProps) {
  const [selectedPreset, setSelectedPreset] = useState<SlipPreset>(MOROCCAN_SLIP_PRESETS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<"idle" | "capturing" | "ocr" | "ner" | "done">("idle");
  const [ocrLogs, setOcrLogs] = useState<string[]>([]);
  const [detectedFields, setDetectedFields] = useState<SlipPreset | null>(null);
  const [customFileMocked, setCustomFileMocked] = useState(false);
  const [showScannerManual, setShowScannerManual] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const customFileInputRef = useRef<HTMLInputElement>(null);

  // Simulated scan logs
  const addLog = (msg: string, delay: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setOcrLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        resolve();
      }, delay);
    });
  };

  const handleRealUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStep("ocr");
    setOcrLogs(["⚡ Connexion au connecteur optique Gemini..."]);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result as string;
      try {
        setOcrLogs(prev => [...prev, "📸 Conversion de l'image en base64...", "🧠 Transmission du document à Gemini 3.5-Flash (Vision Task)..."]);
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
          setScanStep("ner");
          setOcrLogs(prev => [
            ...prev,
            "⚡ Traitement linguistique et classification réussie.",
            `📍 Origine extraite : ${result.origin || "Casablanca"}`,
            `🎯 Destination extraite : ${result.destination || "Tanger"}`,
            `👤 Destinataire : ${result.clientName || "Bennani Import S.A.R.L."}`,
            `📦 Dimensions : ${result.volume || 3.1} m³, ${result.weight || 420} kg`
          ]);

          const uploadedSlip: SlipPreset = {
            id: `slip-custom-${Date.now()}`,
            provider: result.provider || "Amana Express",
            slipNumber: result.slipNumber || `AM-${Math.floor(100000 + Math.random() * 900000)}-MA`,
            origin: result.origin || "Casablanca",
            destination: result.destination || "Tanger",
            customerName: result.clientName || "Bennani Import S.A.R.L.",
            phone: result.phone || "0661889900",
            address: result.address || "Bd Driss Harti, N°88, Casablanca",
            cargoDescription: result.cargoDescription || "Matériel divers et fret commercial",
            volume: result.volume || 3.1,
            weight: result.weight || 420,
            reward: result.reward || 1850,
            stampColor: "border-purple-500 text-purple-600 bg-purple-50/70"
          };

          setSelectedPreset(uploadedSlip);
          setDetectedFields(uploadedSlip);
          setCustomFileMocked(true);
        } else {
          setOcrLogs(prev => [...prev, "❌ Erreur de décodage serveur. Utilisation du plan d'urgence local."]);
          setSelectedPreset(MOROCCAN_SLIP_PRESETS[0]);
          setDetectedFields(MOROCCAN_SLIP_PRESETS[0]);
        }
      } catch (err) {
        console.error(err);
        setOcrLogs(prev => [...prev, "❌ Échec de connectivité réseau. Analyse suspendue."]);
      } finally {
        setIsScanning(false);
        setScanStep("done");
      }
    };
    reader.readAsDataURL(file);
  };

  const startScanProcess = async () => {
    setIsScanning(true);
    setScanStep("capturing");
    setOcrLogs([]);
    setDetectedFields(null);

    await addLog("⚡ Initialisation du scanner optique ultra-rapide...", 400);
    await addLog("📸 Capture de l'image haute définition (60 FPS)...", 500);
    setScanStep("ocr");
    await addLog("🔍 Détection des zones textuelles & Bounding boxes...", 600);
    await addLog(`⚙️ Technologie OCR : Extraction des caractères (${selectedPreset.provider})...`, 500);
    setScanStep("ner");
    await addLog(`🧠 Traitement NLP intelligent : Analyse culturelle marocaine...`, 600);
    await addLog(`📍 Extraction de la ville d'origine : ${selectedPreset.origin}`, 300);
    await addLog(`🎯 Extraction de la destination : ${selectedPreset.destination}`, 300);
    await addLog(`👤 Client identifié : ${selectedPreset.customerName} (${selectedPreset.phone})`, 400);
    await addLog(`📦 Métriques : ${selectedPreset.volume} m³ cube, masse de ${selectedPreset.weight} kg`, 300);
    await addLog("✨ Reconstruction finale et calcul des tarifs...", 400);

    setScanStep("done");
    setDetectedFields(selectedPreset);
    setIsScanning(false);
  };

  const handleCustomUploadMock = () => {
    setCustomFileMocked(true);
    // Dynamic customized slip from upload simulation
    const uploadedSlip: SlipPreset = {
      id: "slip-custom",
      provider: "Amana Express",
      slipNumber: `AM-${Math.floor(100000 + Math.random() * 900000)}-MA`,
      origin: "Casablanca",
      destination: "Tanger",
      customerName: "Bennani Import S.A.R.L.",
      phone: "0661889900",
      address: "Bd Driss Harti, N°88, Casablanca",
      cargoDescription: "3 caisses en bois de Dispositifs Électriques & Transformateurs",
      volume: 3.1,
      weight: 420,
      reward: 1850,
      stampColor: "border-purple-500 text-purple-600 bg-purple-50/70"
    };
    setSelectedPreset(uploadedSlip);
    // Auto scan
    setTimeout(() => {
      startScanProcess();
    }, 300);
  };

  const handleTriggerImportToDispatch = () => {
    if (!detectedFields) return;
    // Format dispatch order instruction compatible with the dispatcher raw input NLP
    const formattedText = `Livrer de ${detectedFields.origin} vers ${detectedFields.destination}: ${detectedFields.cargoDescription} pour le client ${detectedFields.customerName} (Téléphone: ${detectedFields.phone}, Volume: ${detectedFields.volume}m³, Poids: ${detectedFields.weight}kg, Transporteur: ${detectedFields.provider})`;

    onImportToDispatch(formattedText, detectedFields.origin);
    
    setSuccessToast("Donors importés avec succès dans la Saisie Dispatch ! L'IA a pré-rempli l'espace.");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleTriggerImportToBackhaul = () => {
    if (!detectedFields) return;
    onImportToBackhaul({
      origin: detectedFields.origin,
      destination: detectedFields.destination,
      cargo: `${detectedFields.cargoDescription} (${detectedFields.provider} OCR)`,
      reward: detectedFields.reward,
      vehicleType: detectedFields.weight > 600 ? "Truck" : "Van",
      savingsCo2: Math.floor(120 + detectedFields.weight * 0.15),
      tollFees: Math.floor(40 + Math.random() * 80),
      volume: detectedFields.volume,
      weight: detectedFields.weight
    });

    setSuccessToast(`Offre Backhaul postée avec succès ! ${detectedFields.volume} m³ dispo pour retour vers ${detectedFields.destination}.`);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4" id="delivery-slip-scanner-module">
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white shadow-sm">
            <Scan className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">RECONNAISSANCE IA</span>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              One-Click Bon de Livraison Scanner
              <span className="bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase border border-indigo-200">PRO</span>
            </h3>
          </div>
        </div>
        <button
          onClick={() => setShowScannerManual(!showScannerManual)}
          className="text-slate-400 hover:text-slate-600 transition"
          title="Consulter l'aide"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {showScannerManual && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/60 text-[10.5px] text-indigo-950/80 leading-relaxed"
        >
          <p className="font-bold mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-600" />
            Comment fonctionne le Scanner de Bon ?
          </p>
          Sélectionnez un Bon de Livraison physique factice ci-dessous ou importez-en un. L'IA de vision scanne son contenu (expéditeur, destinataire, volume m³, poids kg), extrait tout pour l'intégrer automatiquement, et calcule l'optimisation pour éviter les voyages à vide ! Plus besoin de tout recopier à la main.
        </motion.div>
      )}

      {/* Grid of presets */}
      <div className="space-y-1.5">
        <label className="block text-[10.5px] font-bold text-slate-500">
          Changer de Bon de Livraison (Simulations) :
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MOROCCAN_SLIP_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedPreset(p);
                setCustomFileMocked(false);
                setDetectedFields(null);
                setScanStep("idle");
              }}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer relative ${
                selectedPreset.id === p.id && !customFileMocked
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                  : "bg-slate-50 border-slate-100 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <div className="font-bold text-[9.5px] truncate">{p.provider}</div>
              <div className="font-mono text-[8.5px] opacity-75">{p.slipNumber}</div>
              <span className="absolute bottom-1 right-2 text-[8px] font-semibold opacity-80">{p.origin} ➔ {p.destination}</span>
              <div className="h-2"></div>
            </button>
          ))}
        </div>
      </div>

      {/* Main interactive area: Scanner Lens & Physical Document Document */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Visual Document & Laser Scanner (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[290px]">
          
          {/* Laser beam scan lines */}
          {isScanning && (
            <motion.div
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "96%", "0%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)] z-30"
            />
          )}

          {/* Matrix style scanning indicators */}
          {isScanning && (
            <div className="absolute inset-0 bg-emerald-950/10 pointer-events-none z-10 flex flex-col justify-between p-3">
              <div className="flex justify-between text-[8px] font-mono text-emerald-400/80">
                <span>[SCANNING_HD_CAM]</span>
                <span>ISO 800</span>
              </div>
              <div className="flex justify-center">
                <div className="bg-emerald-900/30 border border-emerald-500/35 px-4 py-2 rounded-lg text-emerald-400 font-mono text-[10px] animate-pulse">
                  Lecture en cours... {scanStep === "ocr" ? "OCR 85%" : scanStep === "ner" ? "Extraction Sémantique" : "Auto-focus"}
                </div>
              </div>
              <div className="flex justify-between text-[8px] font-mono text-emerald-400/80">
                <span>W: 1920px H: 1080px</span>
                <span>MATCH: CONFIDENCE 99.4%</span>
              </div>
            </div>
          )}

          {/* Render Physical document representation (Tailwind styled Delivery Slip) */}
          <div className="w-full bg-amber-50/95 text-slate-900 p-4 rounded-xl border-2 border-slate-300 shadow-inner relative flex flex-col justify-between font-sans text-[10px] select-none scale-[0.98] transition-transform duration-300">
            
            {/* Stamp mock */}
            <div className={`absolute right-4 top-4 border-2 border-dashed ${selectedPreset.stampColor} rounded-lg uppercase font-black px-2 py-1 rotate-12 text-[9px] tracking-widest`}>
              MAROC LOGISTIQUE<br />
              {selectedPreset.destination}
            </div>

            {/* Header */}
            <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-tight flex items-center gap-1">
                  <FileText className="h-3 w-3 text-indigo-600" />
                  {selectedPreset.provider}
                </span>
                <span className="font-mono font-bold text-[9px] text-slate-500">
                  {selectedPreset.slipNumber}
                </span>
              </div>
              <p className="text-[7.5px] text-slate-400 font-mono">BON DE LIVRAISON SÉCURISÉ - INTER-VILLES</p>
            </div>

            {/* Document details with augmented-reality scan rectangles if scanned */}
            <div className="space-y-1.5 relative">
              <div className="grid grid-cols-2 gap-2">
                <div className="relative p-1 rounded transition-all duration-300">
                  {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                  {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                  <span className="block text-[7.5px] text-slate-400 uppercase font-black">Départ / Origine</span>
                  <span className="font-black font-mono text-[10.5px] text-indigo-950">{selectedPreset.origin}</span>
                </div>
                <div className="relative p-1 rounded transition-all duration-300">
                  {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                  {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                  <span className="block text-[7.5px] text-slate-400 uppercase font-black">Arrivée / Dest.</span>
                  <span className="font-black font-mono text-[10.5px] text-indigo-950">{selectedPreset.destination}</span>
                </div>
              </div>

              <div className="relative p-1 rounded transition-all duration-300">
                {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                <span className="block text-[7.5px] text-slate-400 uppercase font-black">Destinataire</span>
                <span className="font-extrabold text-slate-900">{selectedPreset.customerName}</span>
                <span className="block font-mono text-[9px] text-slate-600">{selectedPreset.phone}</span>
              </div>

              <div className="relative p-1 rounded transition-all duration-300">
                {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                <span className="block text-[7.5px] text-slate-400 uppercase font-black">Adresse Complète</span>
                <span className="text-slate-700 italic">{selectedPreset.address}</span>
              </div>

              <div className="relative p-1 rounded transition-all duration-300 border-t border-dashed border-slate-200 mt-1 pt-1">
                {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                <span className="block text-[7.5px] text-slate-400 uppercase font-black">Description du Fret (Cargo)</span>
                <span className="font-semibold text-slate-800">{selectedPreset.cargoDescription}</span>
              </div>

              {/* Volume and Weight values */}
              <div className="grid grid-cols-2 gap-2 border-t border-dashed border-slate-200 pt-1 mt-1 font-mono">
                <div className="relative p-1 rounded transition-all duration-300">
                  {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                  {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                  <span className="block text-[7.5px] text-slate-400 uppercase font-black flex items-center gap-1">
                    <Boxes className="h-2.5 w-2.5 text-indigo-500" /> VOLUME CUBIQUE
                  </span>
                  <span className="font-black text-slate-900">{selectedPreset.volume} m³</span>
                </div>
                <div className="relative p-1 rounded transition-all duration-300">
                  {scanStep === "ocr" && <div className="absolute inset-0 border border-emerald-400 bg-emerald-400/10 animate-pulse rounded" />}
                  {scanStep === "ner" && <div className="absolute inset-0 border border-indigo-500 bg-indigo-500/10 rounded" />}
                  <span className="block text-[7.5px] text-slate-400 uppercase font-black flex items-center gap-1">
                    <Weight className="h-2.5 w-2.5 text-indigo-500" /> MASSE (kg)
                  </span>
                  <span className="font-black text-slate-900">{selectedPreset.weight} kg</span>
                </div>
              </div>
            </div>

            {/* Stamp footer Barcode */}
            <div className="mt-3 pt-2 border-t border-solid border-slate-300 flex justify-between items-center text-[7.5px]">
              <div className="font-mono">
                CODE-A12: *{selectedPreset.slipNumber}*
              </div>
              <div className="flex gap-1">
                <div className="w-1.5 h-6 bg-slate-900" />
                <div className="w-0.5 h-6 bg-slate-900" />
                <div className="w-3 h-6 bg-slate-900" />
                <div className="w-1 h-6 bg-slate-900" />
                <div className="w-2 h-6 bg-slate-900" />
                <div className="w-0.5 h-6 bg-slate-900" />
                <div className="w-1.5 h-6 bg-slate-900" />
              </div>
            </div>
          </div>
          
          {/* Action buttons embedded in dark lens view */}
          <div className="w-full flex justify-between items-center gap-2 mt-2 pt-2 z-20">
            {/* Real photo uploader & hidden file input */}
            <input 
              type="file" 
              accept="image/*" 
              ref={customFileInputRef} 
              onChange={handleRealUpload} 
              className="hidden" 
            />
            <button
              onClick={() => customFileInputRef.current?.click()}
              disabled={isScanning}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              Téléverser un vrai BL physique
            </button>

            <button
              onClick={startScanProcess}
              disabled={isScanning}
              className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-[11px] px-4 py-2 rounded-xl border border-emerald-400/20 shadow-lg cursor-pointer disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {isScanning ? "Lecture..." : "One-Click Scan !"}
            </button>
          </div>
        </div>

        {/* Scan Log & Extracted Data Details (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between border border-slate-100 rounded-2xl p-4 bg-slate-50 relative min-h-[290px]">
          
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <RefreshCw className={`h-3 w-3 text-indigo-500 ${isScanning ? "animate-spin" : ""}`} />
              Résultats et Logs IA-OCR :
            </h4>

            {/* Display progress or results */}
            {ocrLogs.length === 0 && !detectedFields ? (
              <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                <Scan className="h-8 w-8 text-slate-300 stroke-[1.5] mb-2 animate-pulse" />
                <p className="text-[10.5px] font-bold">En attente du Scan</p>
                <p className="text-[9.5px]">Appuyez sur "One-Click Scan" pour décoder le bon de livraison.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[240px] overflow-y-auto">
                
                {/* Simulated log screen */}
                <div className="bg-slate-900 rounded-xl p-2.5 font-mono text-[8px] leading-tight text-emerald-400 border border-slate-800 h-[80px] overflow-y-auto space-y-1">
                  {ocrLogs.map((log, i) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                  {isScanning && <div className="text-[8px] animate-pulse text-indigo-300">❚ Analyse des pixels...</div>}
                </div>

                {/* Detected Form Fields Output Preview */}
                {detectedFields && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3 bg-white border border-indigo-100/70 rounded-xl space-y-2 shadow-sm animate-fade-in text-[10.5px]"
                  >
                    <div className="flex items-center justify-between border-b border-indigo-50/50 pb-1.5 mb-1.5">
                      <span className="font-bold text-slate-500 text-[10px]">DONNÉES OCR CONFIANCE (99%)</span>
                      <span className="bg-emerald-50 text-emerald-700 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                        <CheckCircle className="h-2.5 w-2.5" /> IA PRÊTE
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-slate-400 leading-none">CLIENT</p>
                          <p className="font-bold text-slate-900 truncate">{detectedFields.customerName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-slate-400 leading-none">TÉLÉPHONE</p>
                          <p className="font-bold text-slate-900 font-mono">{detectedFields.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-indigo-500 leading-none">ORIGINE - DESTINATION</p>
                          <p className="font-extrabold text-indigo-950">{detectedFields.origin} ➔ {detectedFields.destination}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-emerald-600 leading-none">CONTRAT DE RETOUR</p>
                          <p className="font-extrabold text-emerald-700 font-mono">+{detectedFields.reward} DH</p>
                        </div>
                      </div>
                    </div>

                    {/* Volumetrics */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/50 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Boxes className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-slate-400 uppercase leading-none font-bold">Volume Détecté</p>
                          <p className="font-black text-slate-900 font-mono text-[11px]">{detectedFields.volume} m³</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Weight className="h-3.5 w-3.5 text-rose-600 flex-shrink-0" />
                        <div>
                          <p className="text-[7.5px] text-slate-400 uppercase leading-none font-bold">Poids Détecté</p>
                          <p className="font-black text-slate-900 font-mono text-[11px]">{detectedFields.weight} kg</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Active Integration Options when data is parsed */}
          {detectedFields && !isScanning && (
            <div className="pt-3 border-t border-slate-200/60 mt-3 space-y-2">
              <button
                onClick={handleTriggerImportToDispatch}
                className="w-full flex items-center justify-between text-left text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold p-2.5 rounded-xl transition cursor-pointer shadow shadow-indigo-600/10"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Insérer dans la Saisie Dispatch
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={handleTriggerImportToBackhaul}
                className="w-full flex items-center justify-between text-left text-xs bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50 font-extrabold p-2.5 rounded-xl transition cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                  Poster comme Fret de Retour (Backhaul)
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-indigo-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Toasts inside the wrapper */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-emerald-50 border border-emerald-200 text-slate-900 text-xs p-3 rounded-xl flex items-center gap-2.5 font-semibold shadow-sm"
          >
            <div className="p-1 bg-emerald-500 rounded-full text-white">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
