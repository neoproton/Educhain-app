"use client";

import React, { useState } from "react";
import Image from "next/image";
import { sound } from "@/lib/audio";
import { useEduStore } from "@/store/useEduStore";
import {
  ArrowRight,
  Sun,
  Moon,
  Play,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface LandingPageProps {
  onEnterApp: () => void;
  onOpenAuth: (mode?: "signin" | "signup") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onOpenAuth,
}) => {
  const { settings, toggleTheme, signOut } = useEduStore();
  const [hasSession, setHasSession] = useState(false);
  const isDark = settings.theme === "dark";

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session?.user));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session?.user));
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleLaunch = () => {
    sound.playClick();
    onEnterApp();
  };

  const handleAuth = (mode: "signin" | "signup") => {
    sound.playClick();
    onOpenAuth(mode);
  };

  const handleSignOut = async () => {
    sound.playClick();
    await supabase.auth.signOut();
    signOut();
    setHasSession(false);
  };

  return (
    <div className="min-h-screen overflow-x-clip educhain-bg vercel-grid text-slate-900 dark:text-[#F8FAFC] flex flex-col selection:bg-[#2563EB] selection:text-white dark:selection:bg-[#22D3EE] dark:selection:text-[#101827] transition-colors duration-300 relative">
      {/* Subtle Atmospheric Gradient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[480px] glow-orb-cyan pointer-events-none -z-10" />
      <div className="absolute top-32 left-10 w-80 h-80 glow-orb-blue pointer-events-none -z-10" />
      <div className="absolute bottom-24 right-10 w-80 h-80 glow-orb-violet pointer-events-none -z-10" />

      {/* Minimal Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-[#223149]/70 bg-white/85 dark:bg-[#101827]/85 backdrop-blur-xl">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] opacity-80" />

        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_16px_rgba(37,99,235,0.35)] shrink-0">
              <Image
                src="/logo.png"
                alt="EduChain Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <span className="font-heading font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] text-sm sm:text-base truncate">
              EduChain
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                sound.playClick();
                toggleTheme();
              }}
              aria-label="Toggle theme"
              className="p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {hasSession ? (
              <button
                onClick={handleSignOut}
                className="text-[11px] sm:text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-2 sm:px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center gap-1 sm:gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => handleAuth("signin")}
                className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-[#22D3EE] px-2 sm:px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
            )}

            <button
              onClick={handleLaunch}
              className="btn-educhain-primary px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-md cursor-pointer whitespace-nowrap"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Clean Centered Simple Hero */}
      <main className="flex-1 flex items-center justify-center px-3.5 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="max-w-3xl w-full mx-auto text-center flex flex-col items-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-5 sm:mb-6 rounded-3xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_36px_rgba(37,99,235,0.4)] card-lift">
            <Image
              src="/logo.png"
              alt="EduChain Emblem"
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className="object-cover"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full border border-blue-500/20 dark:border-cyan-400/30 bg-blue-50/80 dark:bg-[#182438]/80 text-[11px] sm:text-xs font-mono text-[#2563EB] dark:text-[#22D3EE] mb-5 sm:mb-6 shadow-sm backdrop-blur-md max-w-full">
            <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse shrink-0" />
            <span className="font-semibold truncate">Grades 9–12 • Learn • Connect • Unlock</span>
          </div>

          <h1 className="font-heading text-[2rem] leading-[1.1] sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] sm:leading-[1.08] mb-4 sm:mb-5">
            Master Your Curriculum.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] mt-1">
              One Link at a Time.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed mb-8">
            Practice chapter quests in Mathematics, Science, English, and Computer Science, turn missed answers into strength in Mistake Forge, and compete on live leaderboards.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto mb-10">
            <button
              onClick={handleLaunch}
              className="w-full sm:w-auto btn-educhain-primary px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.5)] active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{hasSession ? "Continue Learning" : "Start Learning Free"}</span>
            </button>

            {!hasSession && (
              <button
                onClick={() => handleAuth("signup")}
                className="w-full sm:w-auto btn-educhain-secondary px-7 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all card-lift cursor-pointer"
              >
                <span>Create Account</span>
                <ChevronRight className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-mono text-slate-600 dark:text-[#94A3B8]">
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#263B5B] bg-white/80 dark:bg-[#182438]/70">
              Chapter Quests
            </span>
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#263B5B] bg-white/80 dark:bg-[#182438]/70">
              Mistake Forge
            </span>
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#263B5B] bg-white/80 dark:bg-[#182438]/70">
              Live Leaderboards
            </span>
            <span className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#263B5B] bg-white/80 dark:bg-[#182438]/70">
              Multiplayer Battles
            </span>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200/80 dark:border-[#223149] py-6 bg-white/70 dark:bg-[#101827]/90 text-xs text-slate-500 dark:text-[#94A3B8] font-mono transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-[#2563EB]/30 bg-[#101827] shrink-0">
              <Image src="/logo.png" alt="EduChain Logo" fill sizes="24px" className="object-cover" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EduChain</span>
            <span>•</span>
            <span>Learn • Connect • Unlock</span>
          </div>

          <div className="flex items-center gap-4 font-semibold">
            <button onClick={handleLaunch} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors cursor-pointer">
              Launch App
            </button>
            {!hasSession && (
              <>
                <button onClick={() => handleAuth("signin")} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors cursor-pointer">
                  Sign In
                </button>
                <button onClick={() => handleAuth("signup")} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors cursor-pointer">
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
