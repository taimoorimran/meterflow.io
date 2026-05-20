import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { Gauge, LogOut, LogIn, Zap, Activity, Settings2, AlertTriangle, Sparkles } from 'lucide-react';
import ReadingForm from './components/ReadingForm';
import ReadingList from './components/ReadingList';
import Metrics from './components/Metrics';
import AnalyticsCharts from './components/AnalyticsCharts';
import BackupManager from './components/BackupManager';
import TariffCalculator from './components/TariffCalculator';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [user, loading, error] = useAuthState(auth);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Settings: Cutoff Day and Protected Limit (kWh threshold)
  const [cutoffDay, setCutoffDay] = useState(() => {
    return Number(localStorage.getItem('cutoffDay')) || 13;
  });
  const [threshold, setThreshold] = useState(() => {
    return Number(localStorage.getItem('threshold')) || 200;
  });

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Sign-in error: ", err);
      if (err?.code === 'auth/popup-blocked') {
        setSignInError("Browser Blocked the Popup Window! (This is very common for first-time login inside secure sandboxed previews. Clicking the button again often bypasses this, or you can allow popups in your browser settings).");
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setSignInError("Sign-in window was closed before completion. Please try again.");
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setSignInError("Sign-in request was cancelled. Please click once and wait a moment.");
      } else {
        setSignInError(err?.message || "An unexpected error occurred during Google Sign-In. Please try again or open the app in a new tab.");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Initializing MeterFlow...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 max-w-md text-center">
          <h2 className="text-lg font-bold mb-2">Configuration Error</h2>
          <p className="text-sm">Please check your Firebase configuration and try again.</p>
          <pre className="mt-4 p-2 bg-red-100 rounded text-xs overflow-auto">{error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 flex flex-col md:border-8 md:border-slate-900 overflow-x-hidden">
      {/* Header */}
      <header className="h-20 bg-white border-b-2 border-slate-900 flex items-center justify-between px-6 md:px-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white rotate-45"></div>
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter uppercase whitespace-nowrap">MeterFlow.io</span>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] uppercase font-black text-slate-400">Connected User</span>
              <span className="text-sm font-bold">{user.displayName || user.email}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 border-2 border-slate-900 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400">Next Cutoff</span>
            <span className="text-sm font-black uppercase">June {cutoffDay}, 2026</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto">
        <main className="max-w-screen-2xl mx-auto h-full">
          <AnimatePresence mode="wait">
            {!user ? (
              <motion.div
                key="auth"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-5rem)] bg-slate-100"
              >
                {/* Left Column: Story, Backstory, details */}
                <div className="lg:col-span-6 p-6 md:p-12 xl:p-16 flex flex-col justify-center bg-white border-b-2 lg:border-b-0 lg:border-r-2 border-slate-900 space-y-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-slate-900 px-3 py-1 border-2 border-slate-900 text-xs font-black uppercase tracking-tight shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                      100% Client Sovereign
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl xl:text-6xl font-black text-slate-900 leading-none uppercase tracking-tighter">
                      Utility Control <br />
                      <span className="bg-slate-900 text-white px-2 py-0.5 inline-block my-1 leading-normal rotate-[-1deg]">WITHOUT spreadsheets</span>
                    </h1>
                    
                    <p className="text-xs md:text-sm font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                      Honestly, MeterFlow.io turned out so practical that I’ve completely replaced my old setup of iPhone Shortcuts + Google Sheets!
                    </p>
                  </div>

                  {/* Backstory */}
                  <div className="bg-amber-50/50 border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-2">
                    <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">The Backstory</span>
                    <p className="text-[11px] text-slate-800 font-extrabold leading-relaxed uppercase">
                      "I used to track my daily electricity meter readings using an iPhone Shortcut that pushed data to Google Sheets via Google Apps Script. It worked, but it wasn't elegant. With conceptual prompts on Google AI Studio, I built this custom tracking dashboard in less than an hour."
                    </p>
                  </div>

                  {/* Feature highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="border border-slate-200 p-3 space-y-1 bg-slate-50">
                      <span className="font-extrabold text-slate-900 block uppercase tracking-tight">📱 Mobile Friendly</span>
                      <p className="text-slate-400 font-extrabold uppercase text-[9px] leading-tight">
                        Built from the ground up to feel fast and sleek on your phone right inside your utility cupboard.
                      </p>
                    </div>

                    <div className="border border-slate-200 p-3 space-y-1 bg-slate-50">
                      <span className="font-extrabold text-slate-900 block uppercase tracking-tight">🗓️ Smart billing Slabs</span>
                      <p className="text-slate-400 font-extrabold uppercase text-[9px] leading-tight">
                        Select your custom official meter read day (defaults to 13th) to align with actual billing cycles.
                      </p>
                    </div>

                    <div className="border border-slate-200 p-3 space-y-1 bg-slate-50">
                      <span className="font-extrabold text-slate-900 block uppercase tracking-tight">🛡️ Protected Slab warnings</span>
                      <p className="text-slate-400 font-extrabold uppercase text-[9px] leading-tight">
                        Crucial warning offsets to keep monthly consumption below 200 kWh, avoiding punishing tariff jumps.
                      </p>
                    </div>

                    <div className="border border-slate-200 p-3 space-y-1 bg-slate-50">
                      <span className="font-extrabold text-slate-900 block uppercase tracking-tight">⚡ Instant Backup</span>
                      <p className="text-slate-400 font-extrabold uppercase text-[9px] leading-tight">
                        Download raw data as CSV at any time, import existing historical logs, or wipe database instantly.
                      </p>
                    </div>
                  </div>

                  {/* Google Login CTA */}
                  <div className="space-y-4 pt-4 border-t border-slate-200">
                    <button
                      onClick={handleSignIn}
                      disabled={isSigningIn}
                      className="group relative inline-flex items-center justify-center gap-4 bg-slate-900 text-white border-2 border-slate-900 px-8 py-4 w-full sm:w-auto font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(15,23,42,0.15)] hover:bg-slate-800 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSigningIn ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5 bg-white p-0.5" alt="Google" />
                      )}
                      {isSigningIn ? "Signing In..." : "Log in with Google Account"}
                    </button>
                    
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tight leading-normal">
                      💡 Tip: Popups blocked? Double-click or open app in a new tab to bypass iframe popups!
                    </p>
                  </div>

                  {signInError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-md bg-amber-50 border-2 border-slate-900 p-5 mt-4 text-left shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-amber-200 border border-slate-900 shrink-0">
                          <AlertTriangle className="w-4 h-4 text-slate-900" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-900">Sign-In Troubleshooting</h4>
                          <p className="text-[11px] text-slate-700 mt-1 font-bold leading-normal">
                            {signInError}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t-2 border-slate-900/10 flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={handleSignIn}
                          className="flex-1 bg-slate-900 text-white text-[10px] font-black uppercase py-2 border-2 border-slate-900 hover:bg-slate-800 transition-colors cursor-pointer text-center"
                        >
                          Retry Login
                        </button>
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-white text-slate-900 text-[10px] font-black uppercase py-2 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-50 transition-colors text-center block"
                        >
                          Open In New Tab ↗
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Right Column: Interactive Simulator Sandbox Preview */}
                <div className="lg:col-span-6 p-6 md:p-12 xl:p-16 flex flex-col justify-center bg-slate-100 border-t-2 lg:border-t-0 border-slate-900">
                  <div className="mb-6 space-y-1">
                    <span className="bg-slate-900 text-white font-mono text-[9px] uppercase font-black px-1.5 py-0.5">
                      Sandbox Simulator
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">
                      Calculate your domestic slab & tariff
                    </h2>
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase leading-relaxed">
                      Drag the usage projection block to model exactly how NEPRA protected tier discounts disappear when exceeding 200 kWh.
                    </p>
                  </div>
                  
                  <TariffCalculator />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-12 min-h-full"
              >
                {/* Left Panel: Stats, Settings & Input */}
                <div className="lg:col-span-4 border-b-2 lg:border-b-0 lg:border-r-2 border-slate-900 bg-slate-50 h-full">
                  <div className="p-6 md:p-8 space-y-8 sticky top-0">
                    <Metrics cutoffDay={cutoffDay} threshold={threshold} />

                    {/* Neubrutalist Settings Panel */}
                    <div className="bg-white border-2 border-slate-900 p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] space-y-4">
                      <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
                        <Settings2 className="w-4 h-4 text-slate-800" />
                        <span className="text-xs font-black uppercase text-slate-900">Tariff & Cycle Settings</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Cutoff Day (1 - 28)</label>
                          <input
                            type="number"
                            min="1"
                            max="28"
                            value={cutoffDay}
                            onChange={(e) => {
                              const v = Math.max(1, Math.min(28, parseInt(e.target.value) || 1));
                              setCutoffDay(v);
                              localStorage.setItem('cutoffDay', String(v));
                            }}
                            className="w-full border-2 border-slate-900 p-2 text-sm font-mono font-bold focus:outline-none focus:bg-slate-50"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Protected Limit (kWh)</label>
                          <input
                            type="number"
                            min="10"
                            max="1000"
                            value={threshold}
                            onChange={(e) => {
                              const v = Math.max(10, parseInt(e.target.value) || 200);
                              setThreshold(v);
                              localStorage.setItem('threshold', String(v));
                            }}
                            className="w-full border-2 border-slate-900 p-2 text-sm font-mono font-bold focus:outline-none focus:bg-slate-50"
                          />
                        </div>
                      </div>
                    </div>

                    <BackupManager />

                    <div>
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Submit Reading</h2>
                      <ReadingForm />
                    </div>
                  </div>
                </div>

                {/* Right Panel: Analytics & History */}
                <div className="lg:col-span-8 flex flex-col bg-white">
                  <div className="p-6 md:p-8 space-y-8">
                    <AnalyticsCharts cutoffDay={cutoffDay} threshold={threshold} />
                    <ReadingList />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-12 bg-slate-900 text-white flex items-center justify-between px-6 md:px-10 text-[10px] font-black uppercase tracking-widest shrink-0">
        <div className="flex gap-6">
          <span className="hidden sm:inline">System Active: 2026-05-20</span>
          <span>Cutoff Logic: {cutoffDay}th Day</span>
          <span>Rolling Protection Limit: {threshold} kWh</span>
        </div>
        <div className="flex gap-4">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>v1.0.0-GEOMETRIC</span>
        </div>
      </footer>
    </div>
  );
}
