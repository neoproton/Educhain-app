"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { ScholarAvatar } from "@/components/SleekIcon";
import { ProgressionModal } from "@/components/ProgressionModal";
import { getXpProgress, getStreakProgress } from "@/lib/progression";
import { 
  Flame, 
  Zap, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  BarChart3, 
  Trophy, 
  Sun, 
  Moon, 
  LogIn,
  Swords
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings?: () => void;
  onOpenProfile?: () => void;
  onOpenLanding?: () => void;
  onOpenAuth?: (mode?: "signin" | "signup") => void;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenProfile,
  onOpenAuth,
}) => {
  const { xp, currentStreak, settings, updateSettings, toggleTheme, mistakes, name, avatar, isGuest } = useEduStore();
  const { getXpLevels, getStreakLevels } = useCurriculumStore();
  const [hasSession, setHasSession] = useState(false);
  const [progressionModalTab, setProgressionModalTab] = useState<"streak" | "xp" | null>(null);

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

  // Compute current dynamic XP & Streak tiers
  const xpProgress = getXpProgress(xp, getXpLevels());
  const streakProgress = getStreakProgress(currentStreak, getStreakLevels());
  const currentRank = xpProgress.currentLevel;

  // Count pending mistakes
  const pendingMistakes = mistakes.filter((m) => !m.mastered).length;

  const toggleSound = () => {
    const nextVal = !settings.soundEnabled;
    updateSettings({ soundEnabled: nextVal });
    if (nextVal) sound.playClick();
  };

  const handleToggleTheme = () => {
    sound.playClick();
    toggleTheme();
  };

  const isDark = settings.theme === "dark";

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-[#223149]/70 bg-white/85 dark:bg-[#101827]/85 backdrop-blur-xl transition-colors duration-300 shadow-xs">
      {/* Top subtle gradient accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] opacity-80" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <button 
            onClick={() => { setActiveTab("map"); sound.playClick(); }}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group min-w-0"
          >
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-[0_0_16px_rgba(37,99,235,0.35)] group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(34,211,238,0.6)] transition-all shrink-0">
              <Image
                src="/logo.png"
                alt="EduChain Logo"
                fill
                sizes="36px"
                className="object-cover"
                priority
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-heading font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] text-sm sm:text-base group-hover:text-[#2563EB] dark:group-hover:text-[#22D3EE] transition-colors truncate">
                EduChain
              </span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] -mt-0.5 hidden sm:inline font-normal">
                Learn • Connect • Unlock
              </span>
            </div>
          </button>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1.5 border-l border-slate-200 dark:border-[#223149] pl-5 ml-1">
            {[
              { id: "map", label: "My Quests", icon: BookOpen },
              { id: "leaderboard", label: "Leaderboard", icon: Trophy },
              { 
                id: "analytics", 
                label: "My Progress", 
                icon: BarChart3, 
                badge: pendingMistakes > 0 ? `${pendingMistakes}` : null 
              },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    sound.playClick();
                  }}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-slate-900 dark:text-[#F8FAFC] bg-gradient-to-r from-blue-500/15 via-cyan-500/10 to-transparent dark:from-[#2563EB]/25 dark:via-[#22D3EE]/15 dark:to-transparent border border-[#2563EB]/30 dark:border-[#22D3EE]/30 shadow-xs font-semibold"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#182438] font-medium"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#2563EB] dark:text-[#22D3EE]" : ""}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="ml-0.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <Link
              href="/battle"
              onClick={() => sound.playClick()}
              className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-[#182438]"
            >
              <Swords className="w-3.5 h-3.5 text-rose-500" />
              <span>Multiplayer</span>
              <span className="ml-0.5 text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                LIVE
              </span>
            </Link>
          </nav>
        </div>

        {/* Right Status / Scholar Stats & Profile */}
        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
          
          {/* Streak Counter Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setProgressionModalTab("streak");
            }}
            aria-label={`Current Streak: ${currentStreak} days${streakProgress.currentLevel ? ` (${streakProgress.currentLevel.name})` : ""}. Click for Streak Levels.`}
            title={`Streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"}${streakProgress.currentLevel ? ` • ${streakProgress.currentLevel.name}` : ""} (Click to view Streak Levels)`}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-orange-500/25 bg-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/45 text-[11px] sm:text-xs font-mono text-orange-600 dark:text-orange-400 font-bold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 fill-orange-500/30 text-orange-500 dark:text-orange-400 animate-pulse shrink-0" />
            <span>{currentStreak}d</span>
            {streakProgress.currentLevel && (
              <span className="hidden lg:inline text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-700 dark:text-orange-300 leading-none">
                {streakProgress.currentLevel.name}
              </span>
            )}
          </button>

          {/* XP Level Button */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setProgressionModalTab("xp");
            }}
            aria-label={`Total Experience Points: ${xp} XP (${currentRank.name}). Click for XP Levels.`}
            title={`${xp} XP • ${currentRank.name}${xpProgress.nextLevel ? ` (${xpProgress.remaining} XP to ${xpProgress.nextLevel.name})` : " (Max Level)"} — Click to view XP Levels`}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl border border-amber-500/25 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/45 text-[11px] sm:text-xs font-mono text-amber-600 dark:text-amber-400 font-bold shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0" />
            <span>{xp} <span className="hidden sm:inline">XP</span></span>
          </button>

          {/* Theme Switcher Toggle */}
          <button
            onClick={handleToggleTheme}
            aria-label={isDark ? "Switch to White / Light Mode" : "Switch to Dark Mode"}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-all shadow-xs shrink-0"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label={settings.soundEnabled ? "Mute Sound FX" : "Unmute Sound FX"}
            title={settings.soundEnabled ? "Mute Web Audio API" : "Unmute Web Audio API"}
            className="p-1.5 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-all shadow-xs shrink-0"
          >
            {settings.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#2563EB] dark:text-[#22D3EE]" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-600" />
            )}
          </button>

          {/* Login button if guest */}
          {!hasSession && isGuest && onOpenAuth && (
            <button
              onClick={() => { sound.playClick(); onOpenAuth("signin"); }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-[#F8FAFC] border border-slate-200 dark:border-[#223149] hover:bg-slate-100 dark:hover:bg-[#182438] hover:border-[#2563EB]/40 transition-all shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}

          {/* Scholar Profile / Avatar Button */}
          <button
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              sound.playClick();
            }}
            title="Account Details & Settings"
            className="flex items-center gap-2 p-1 sm:pl-1.5 sm:pr-3 sm:py-1 rounded-full border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] hover:border-[#2563EB]/50 dark:hover:border-[#22D3EE]/50 hover:shadow-[0_0_16px_rgba(37,99,235,0.25)] transition-all text-xs font-medium shadow-xs shrink-0"
          >
            <ScholarAvatar name={name} avatar={avatar} size="sm" />
            <span className="hidden sm:inline font-mono text-slate-800 dark:text-[#F8FAFC] font-semibold text-xs">
              {name || (isGuest ? "Guest Explorer" : "Scholar")}
            </span>
            <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-[#2563EB]/20 dark:to-[#22D3EE]/20 text-[#2563EB] dark:text-[#22D3EE] border border-[#2563EB]/20 dark:border-[#22D3EE]/30 font-mono font-semibold">
              {isGuest && xp === 0 ? "Guest" : currentRank.name}
            </span>
          </button>

        </div>

      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden grid grid-cols-4 gap-1 border-t border-slate-200/80 dark:border-[#223149]/70 bg-white/95 dark:bg-[#101827]/95 backdrop-blur-md py-1.5 px-2">
        {[
          { id: "map", label: "Quests", icon: BookOpen },
          { id: "leaderboard", label: "Ranks", icon: Trophy },
          { 
            id: "analytics", 
            label: "Progress", 
            icon: BarChart3, 
            badge: pendingMistakes > 0 ? pendingMistakes : null 
          },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                sound.playClick();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] rounded-xl transition-all relative ${
                isActive 
                  ? "text-[#2563EB] dark:text-[#22D3EE] bg-blue-500/10 dark:bg-cyan-500/10 font-bold" 
                  : "text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}

        <Link
          href="/battle"
          onClick={() => sound.playClick()}
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] rounded-xl transition-all relative text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/10"
        >
          <div className="relative">
            <Swords className="w-4 h-4" />
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <span className="truncate max-w-full">Battle</span>
        </Link>
      </div>
    </header>

    {progressionModalTab && (
      <ProgressionModal
        key={progressionModalTab}
        initialTab={progressionModalTab}
        onClose={() => setProgressionModalTab(null)}
        onNavigateTab={(target) => setActiveTab(target)}
      />
    )}
    </>
  );
};
