"use client";

import React, { useState } from "react";
import Image from "next/image";
import { sound } from "@/lib/audio";
import { useEduStore } from "@/store/useEduStore";
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  BookOpen, 
  Hammer, 
  Trophy, 
  BarChart3, 
  Sun, 
  Moon, 
  Play, 
  Zap, 
  Clock,
  ChevronRight,
  LogOut
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
  const [demoSelected, setDemoSelected] = useState<number | null>(null);
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
    <div className="min-h-screen educhain-bg vercel-grid text-slate-900 dark:text-[#F8FAFC] flex flex-col selection:bg-[#2563EB] selection:text-white dark:selection:bg-[#22D3EE] dark:selection:text-[#101827] transition-colors duration-300 relative overflow-hidden">
      
      {/* Atmospheric Radial Gradient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[550px] glow-orb-cyan pointer-events-none -z-10" />
      <div className="absolute top-40 left-10 w-96 h-96 glow-orb-blue pointer-events-none -z-10" />
      <div className="absolute top-80 right-10 w-96 h-96 glow-orb-violet pointer-events-none -z-10" />

      {/* ======================================================== */}
      {/* 1. NAVBAR */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-[#223149]/70 bg-white/85 dark:bg-[#101827]/85 backdrop-blur-xl">
        <div className="h-[2px] w-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] opacity-80" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_16px_rgba(37,99,235,0.35)] shrink-0">
              <Image
                src="/logo.png"
                alt="EduChain Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] text-base">
                EduChain
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border border-[#2563EB]/25 dark:border-[#22D3EE]/30 text-[#2563EB] dark:text-[#22D3EE] bg-[#2563EB]/10 dark:bg-[#22D3EE]/10 font-bold">
                v2.0
              </span>
            </div>
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-[#94A3B8]">
            <a href="#curriculum" className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Curriculum Tracks</a>
            <a href="#features" className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Features</a>
            <a href="#mistake-forge" className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Mistake Forge</a>
            <a href="#leaderboard" className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Leaderboard</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => { sound.playClick(); toggleTheme(); }}
              aria-label="Toggle theme"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {hasSession ? (
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={() => handleAuth("signin")}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#2563EB] dark:hover:text-[#22D3EE] px-3.5 py-1.5 rounded-xl transition-colors"
              >
                Sign In
              </button>
            )}

            <button
              onClick={handleLaunch}
              className="btn-educhain-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. HERO SECTION */}
      {/* ======================================================== */}
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center flex flex-col items-center">
        
        {/* Floating Tag */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-6 rounded-3xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_40px_rgba(37,99,235,0.45)] card-lift">
          <Image
            src="/logo.png"
            alt="EduChain Emblem"
            fill
            sizes="(max-width: 640px) 96px, 112px"
            className="object-cover"
            priority
          />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/20 dark:border-cyan-400/30 bg-blue-50/80 dark:bg-[#182438]/80 text-xs font-mono text-[#2563EB] dark:text-[#22D3EE] mb-6 shadow-sm backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#22D3EE] animate-pulse" />
          <span className="font-semibold">Secondary School Curriculum Platform • Grades 9–12</span>
        </div>

        {/* Giant Headline */}
        <h1 className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] max-w-4xl leading-[1.08] mb-6">
          Master Your Curriculum.
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] mt-1">
            One Link at a Time.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-[#94A3B8] max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          The gamified learning chain engineered for secondary students. Conquer independent tracks in Mathematics, Science, English, and CS with deliberate recall, sound effects, and live multiplayer leaderboards.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-16">
          <button
            onClick={handleLaunch}
            className="w-full sm:w-auto btn-educhain-primary px-9 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.5)] active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Learning Free</span>
          </button>

          <button
            onClick={() => handleAuth("signup")}
            className="w-full sm:w-auto btn-educhain-secondary px-7 py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all card-lift"
          >
            <span>Create Scholar Account</span>
            <ChevronRight className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
          </button>
        </div>

        {/* Interactive Sample Card */}
        <div className="w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:to-[#1a293f] p-6 sm:p-8 shadow-2xl dark:shadow-[0_20px_60px_rgba(16,24,39,0.5)] text-left relative overflow-hidden card-lift">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-[#263B5B]/70">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] font-bold">
                Live Interactive Sample • Mathematics Stage 1
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>20s timer</span>
            </div>
          </div>

          <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F8FAFC] mb-4">
            What is the order of a matrix having 2 rows and 3 columns?
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {[
              { id: 0, text: "3-by-2", isCorrect: false },
              { id: 1, text: "2-by-3", isCorrect: true },
              { id: 2, text: "2-by-2", isCorrect: false },
              { id: 3, text: "3-by-3", isCorrect: false },
            ].map((item) => {
              const isSelected = demoSelected === item.id;
              let style = "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 text-slate-800 dark:text-[#F8FAFC]";
              if (demoSelected !== null) {
                if (item.isCorrect) style = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]";
                else if (isSelected) style = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300";
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setDemoSelected(item.id);
                    if (item.isCorrect) sound.playCorrect();
                    else sound.playIncorrect();
                  }}
                  className={`p-3.5 rounded-2xl border text-left text-xs font-medium transition-all duration-200 card-lift ${style}`}
                >
                  <span className="font-mono mr-2 font-bold opacity-60">
                    {String.fromCharCode(65 + item.id)}.
                  </span>
                  {item.text}
                </button>
              );
            })}
          </div>

          {demoSelected !== null && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-[#223149]/70 border border-blue-500/20 dark:border-[#22D3EE]/30 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
              <span className="leading-relaxed">
                {demoSelected === 1
                  ? "✨ Correct! The order of a matrix is stated as rows-by-columns (2-by-3)."
                  : "💡 Hint: The order is always stated as (rows) × (columns)."}
              </span>
              <button
                onClick={handleLaunch}
                className="btn-educhain-primary px-3.5 py-1.5 rounded-xl text-[11px] font-bold shrink-0 shadow-xs"
              >
                Play Full Stage
              </button>
            </div>
          )}
        </div>

      </section>

      {/* ======================================================== */}
      {/* 3. METRICS STRIP */}
      {/* ======================================================== */}
      <section className="border-y border-slate-200/80 dark:border-[#223149] bg-slate-100/60 dark:bg-[#141f30]/80 backdrop-blur-md py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="font-heading text-3xl sm:text-4xl font-extrabold text-[#2563EB] dark:text-[#22D3EE]">30+</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">Curriculum Stages</div>
          </div>
          <div>
            <div className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">150+</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">Board-Standard Questions</div>
          </div>
          <div>
            <div className="font-heading text-3xl sm:text-4xl font-extrabold text-[#A78BFA]">4</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">Independent Tracks</div>
          </div>
          <div>
            <div className="font-heading text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">100%</div>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] mt-1 font-semibold">Free & Offline-Ready</div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. CURRICULUM TRACKS */}
      {/* ======================================================== */}
      <section id="curriculum" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#22D3EE] mb-2">
            Structured Curriculum
          </h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            4 Independent Academic Chains
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-3 leading-relaxed">
            No gatekeeping. Master Mathematics, Science, English, and Computer Science on your own terms. Clear stages sequentially to build confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: "📐",
              name: "Mathematics",
              color: "#38bdf8",
              topics: "Matrices, Real Numbers, Linear Algebra, Logarithms, Quadratic Equations & Geometry.",
              badge: "Class 9–12",
            },
            {
              icon: "🔬",
              name: "Science",
              color: "#34d399",
              topics: "Kinematics, Atomic Structure, Chemical Bonding, Bioenergetics & Environmental Ecology.",
              badge: "General & Pre-Med",
            },
            {
              icon: "📖",
              name: "English",
              color: "#a78bfa",
              topics: "Grammar Tenses, Active/Passive Voice, Direct/Indirect Narration & Literary Rhetoric.",
              badge: "Core SSC/HSSC",
            },
            {
              icon: "💻",
              name: "Computer Science",
              color: "#fbbf24",
              topics: "CPU Architecture, Binary Logic Gates, Flowcharts, C/Python Foundations & Database Normalization.",
              badge: "Tech Track",
            },
          ].map((item) => (
            <div
              key={item.name}
              className="p-6 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/50 transition-all duration-300 shadow-sm dark:shadow-[0_8px_30px_rgba(16,24,39,0.35)] flex flex-col justify-between card-lift"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-3xl">{item.icon}</span>
                  <span
                    className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold"
                    style={{ backgroundColor: `${item.color}20`, color: item.color }}
                  >
                    {item.badge}
                  </span>
                </div>
                <h4 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-2">{item.name}</h4>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{item.topics}</p>
              </div>

              <button
                onClick={handleLaunch}
                className="mt-6 pt-4 border-t border-slate-100 dark:border-[#263B5B]/70 text-xs font-bold flex items-center justify-between text-slate-900 dark:text-[#F8FAFC] hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors"
              >
                <span>Explore Track</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. THE 4 PILLARS (FEATURES) */}
      {/* ======================================================== */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200/80 dark:border-[#223149]">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#22D3EE] mb-2">
            Powerful Architecture
          </h2>
          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC]">
            Engineered for Deep Learning
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Pillar 1 */}
          <div id="mistake-forge" className="p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:to-[#1b2a40] card-lift shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 shadow-xs">
              <Hammer className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">The Mistake Forge</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-4">
              Never repeat an error. Every question you miss or time-out on during any quiz is automatically cataloged in your private Forge. Practice missed questions with deliberate recall until they are marked as Mastered.
            </p>
            <div className="text-xs font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Converts academic weaknesses into permanent strength</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div id="leaderboard" className="p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:to-[#1b2a40] card-lift shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Multi-Category Leaderboard</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-4">
              Compete across 4 distinct rankings: Total XP, Stages Conquered, Daily Streaks, and Accuracy Rate. Fair threshold rules ensure consistent high-performers are recognized fairly.
            </p>
            <div className="text-xs font-mono text-purple-600 dark:text-purple-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Real-time Postgres sync powered by Supabase</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:to-[#1b2a40] card-lift shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-5 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Scientific Learning Analytics</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-4">
              High-definition Canvas charts track your comparative accuracy in Mathematics, Science, English, and Computer Science. Export authenticated progress reports in JSON with 1 click.
            </p>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% data portability & offline backup</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:to-[#1b2a40] card-lift shadow-md">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Synthesized Web Audio Engine</h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-4">
              Tactile audio feedback generated live in your browser using native oscillators. Delightful ascending chords for correct answers, gentle dips for misses, and celebratory fanfares.
            </p>
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero audio files to download • Instant response</span>
            </div>
          </div>

        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. CALL TO ACTION BANNER */}
      {/* ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-gradient-to-br from-blue-50/90 via-cyan-50/50 to-white dark:from-[#182438] dark:via-[#1e324e] dark:to-[#182438] p-10 sm:p-14 shadow-xl dark:shadow-[0_20px_50px_rgba(16,24,39,0.5)] card-lift">
          <div className="relative w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_25px_rgba(37,99,235,0.4)]">
            <Image
              src="/logo.png"
              alt="EduChain Emblem"
              fill
              sizes="64px"
              className="object-cover"
            />
          </div>

          <h3 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
            Ready to Begin Your Learning Chain?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-md mx-auto mb-8 leading-relaxed">
            Join hundreds of secondary school scholars. Conquer your curriculum, earn scholar badges, and ascend to Master rank.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={handleLaunch}
              className="btn-educhain-primary px-8 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.5)] active:scale-95 transition-all"
            >
              <span>Launch Learning App</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleAuth("signup")}
              className="btn-educhain-secondary px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all"
            >
              <span>Create Free Account</span>
            </button>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. FOOTER */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-200/80 dark:border-[#223149] py-10 bg-white/70 dark:bg-[#101827]/90 text-xs text-slate-500 dark:text-[#94A3B8] font-mono transition-colors">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="relative w-6 h-6 rounded-lg overflow-hidden border border-[#2563EB]/30 bg-[#101827] shrink-0">
              <Image src="/logo.png" alt="EduChain Logo" fill sizes="24px" className="object-cover" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">EduChain v2.0</span>
            <span>•</span>
            <span>Learn • Connect • Unlock</span>
          </div>

          <div className="flex items-center gap-4 font-semibold">
            <button onClick={handleLaunch} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Launch App</button>
            <button onClick={() => handleAuth("signin")} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Sign In</button>
            <button onClick={() => handleAuth("signup")} className="hover:text-[#2563EB] dark:hover:text-[#22D3EE] transition-colors">Sign Up</button>
          </div>
        </div>
      </footer>

    </div>
  );
};
