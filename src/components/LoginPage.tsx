import React, { useState } from "react";
import { User, ShieldCheck, Lock, Eye, EyeOff, Loader2, Compass, AlertCircle, Truck, ClipboardList } from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (token: string, user: { id: string; username: string; name: string; role: string; driverName?: string }) => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick fill helper accounts
  const demoAccounts = [
    {
      title: "Administrateur",
      label: "Admin LogistiQ",
      email: "admin@logistiq.ma",
      pass: "taib123",
      color: "border-rose-500/30 hover:border-rose-500 text-rose-400 focus:ring-rose-500/20 bg-rose-950/20"
    },
    {
      title: "Directeur / Dispatcher",
      label: "Taib Hassani",
      email: "taib@logistiq.ma",
      pass: "taib123",
      color: "border-indigo-500/30 hover:border-indigo-500 text-indigo-400 focus:ring-indigo-500/20 bg-indigo-950/20"
    },
    {
      title: "Chauffeur (Moto)",
      label: "Amine El Fassi",
      email: "amine@logistiq.ma",
      pass: "taib123",
      color: "border-emerald-500/30 hover:border-emerald-500 text-emerald-400 focus:ring-emerald-500/20 bg-emerald-950/20"
    },
    {
      title: "Chauffeur (Van)",
      label: "Yassine Mansouri",
      email: "yassine@logistiq.ma",
      pass: "taib123",
      color: "border-amber-500/30 hover:border-amber-500 text-amber-400 focus:ring-amber-500/20 bg-amber-950/20"
    }
  ];

  const handleDemoFill = (email: string, pass: string) => {
    setUsername(email);
    setPassword(pass);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("المرجو إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "خطأ غير متوقع. حاول مرة أخرى.");
      }

      // Invoke callback
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "فشل الاتصال بخادم الأمان. المرجو التأكد من الخدمة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none" id="login-layout-container">
      
      {/* Decorative Orbs resembling Bento Grid glows */}
      <div className="absolute -left-20 -top-20 opacity-30 bg-indigo-600 rounded-full h-96 w-96 blur-3xl"></div>
      <div className="absolute -right-20 -bottom-20 opacity-20 bg-amber-500 rounded-full h-96 w-96 blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden relative z-10 shadow-2xl space-y-6 p-6 md:p-8">
        
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-gradient-to-br from-indigo-500 to-indigo-700 text-white p-3.5 rounded-2xl border border-indigo-400/20 shadow-md">
            <Compass className="h-6 w-6 animate-pulse" />
          </div>
          <div className="space-y-1 mt-3">
            <span className="text-[10px] uppercase tracking-widest font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              Morocco Secure System-Gate v2
            </span>
            <h1 className="text-xl font-black text-white tracking-tight pt-1">
              LogistiQ AI — بوابة الدخول
            </h1>
            <p className="text-[11px] text-slate-400 leading-normal max-w-xs mx-auto">
              تطبيق إدارة حركة وتدفق الإرساليات والخدمات اللوجستية وتتبع الشحنات الموجه للموزعين والشركاء بالمغرب.
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/85 rounded-xl p-3 flex items-start gap-2.5 text-red-300 text-xs text-right" dir="rtl" id="login-error-alert">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed flex-1 font-medium">{errorMsg}</div>
          </div>
        )}

        {/* Form panel */}
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          
          {/* Username/Email Input */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11.5px] font-bold text-slate-400" htmlFor="login-username">
              اسم المستخدم (Nom d'utilisateur / Email)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-500">
                <User className="h-4 w-4" />
              </span>
              <input
                id="login-username"
                type="email"
                placeholder="taib@logistiq.ma"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pr-10 pl-3 text-xs text-white placeholder-slate-600 focus:outline-none transition text-left"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5 text-right">
            <label className="text-[11.5px] font-bold text-slate-400" htmlFor="login-password">
              كلمة السر (Mot de passe)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500 hover:text-indigo-400 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pr-10 pl-11 text-xs text-white placeholder-slate-600 focus:outline-none transition text-left"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-xs shadow-md shadow-indigo-600/10 disabled:opacity-50 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول (Connexion)</span>
            )}
          </button>
        </form>

        {/* DEMO ACCOUNTS QUICK-FILL SECTION */}
        <div className="border-t border-slate-800/80 pt-4 space-y-2.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
              حسابات تجريبية سريعة بنقرة واحدة
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {demoAccounts.map((account, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleDemoFill(account.email, account.pass)}
                className={`p-2.5 border rounded-xl text-right transition cursor-pointer flex items-center justify-between group ${account.color}`}
              >
                <div className="flex items-center space-x-2 space-x-reverse text-right">
                  {account.title.includes("Dispatcher") ? (
                    <ClipboardList className="h-4 w-4 text-indigo-400" />
                  ) : (
                    <Truck className="h-4 w-4 text-emerald-400" />
                  )}
                  <div className="text-right">
                    <p className="text-[10.5px] font-bold text-white leading-normal">{account.label}</p>
                    <p className="text-[8.5px] text-slate-400 font-mono leading-none mt-0.5">{account.title}</p>
                  </div>
                </div>
                <span className="text-[9.5px] bg-slate-950/65 font-bold font-mono px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                  {account.pass}
                </span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Aesthetic layout footnotes */}
      <div className="mt-6 text-center text-[10px] text-slate-500 max-w-sm px-4">
        نظام آمن ومحمي بالكامل. يتم تشفير كلمات المرور باستعمال ميكانيزمات <strong>bcrypt</strong> ويتم توقيع الجلسات بواسطة رموز <strong>JWT</strong> للمقاومة ضد الوصول غير المصرح به.
      </div>
    </div>
  );
}
