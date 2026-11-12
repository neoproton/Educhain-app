"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { GradeType } from "@/types/curriculum";
import { GRADE_LABELS } from "@/data/constants";
import { getXpProgress } from "@/lib/progression";
import { sound } from "@/lib/audio";
import { supabase } from "@/lib/supabase/client";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { 
  X, 
  Check, 
  RotateCcw, 
  User, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Mail, 
  Sparkles,
  Zap,
  Shield,
  Crown,
  Terminal,
  Atom,
  Compass,
  Calculator,
  Languages,
  Award
} from "lucide-react";
import { ScholarAvatar, SleekIcon } from "@/components/SleekIcon";

interface ProfileModalProps {
  onClose: () => void;
  onSignOut?: () => void;
  onOpenAuth?: (mode?: "signin" | "signup") => void;
}

const AVATAR_GLYPHS = [
  { id: "sparkles", label: "Sparkles", icon: Sparkles },
  { id: "zap", label: "Energy", icon: Zap },
  { id: "shield", label: "Guardian", icon: Shield },
  { id: "crown", label: "Monarch", icon: Crown },
  { id: "terminal", label: "Coder", icon: Terminal },
  { id: "atom", label: "Scientist", icon: Atom },
  { id: "compass", label: "Explorer", icon: Compass },
  { id: "calculator", label: "Analyst", icon: Calculator },
  { id: "languages", label: "Linguist", icon: Languages },
  { id: "award", label: "Scholar", icon: Award },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  onClose,
  onSignOut,
  onOpenAuth
}) => {
  // Lock background webpage scrolling while profile modal is open
  useBodyScrollLock(true);

  const { name, avatar, grade, xp, isGuest, setProfile, resetProgress, signOut } = useEduStore();
  const { getAllClasses, getXpLevels } = useCurriculumStore();
  const allClasses = getAllClasses();
  const xpLevels = getXpLevels();
  const [tempName, setTempName] = useState(name || "Scholar");
  const [tempAvatar, setTempAvatar] = useState(avatar || "🧠");
  const [tempGrade, setTempGrade] = useState<GradeType>(grade || "grade_9");
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });
  }, []);

  const currentRank = getXpProgress(xp, xpLevels).currentLevel;

  const handleSave = () => {
    sound.playClick();
    setProfile(tempName.trim() || "Scholar", tempAvatar, tempGrade, isGuest);
    onClose();
  };

  const handleReset = () => {
    sound.playIncorrect();
    resetProgress();
    setShowConfirmReset(false);
    onClose();
  };

  const handleSignOutClick = async () => {
    setIsSigningOut(true);
    sound.playClick();
    await supabase.auth.signOut();
    signOut();
    setIsSigningOut(false);
    onClose();
    if (onSignOut) {
      onSignOut();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-[#101827]/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.playClick();
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] bg-white dark:bg-[#182438] border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl transition-all duration-200 flex flex-col min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Subtle Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 shrink-0" />

        {/* Pinned Header */}
        <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 sm:pb-4 border-b border-neutral-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#141f30]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-[#2563EB]/40 bg-[#101827] shadow-xs shrink-0">
              <Image src="/logo.png" alt="EduChain" fill sizes="32px" className="object-cover" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white font-space-grotesk">Account Details</h3>
          </div>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Middle Area */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">

          {/* Account Status Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-neutral-50 dark:bg-[#101827]/80 shadow-inner">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <ScholarAvatar name={tempName} avatar={tempAvatar} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-neutral-900 dark:text-white flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="truncate max-w-[130px] sm:max-w-[180px]">{name || "Scholar"}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/25 text-blue-600 dark:text-cyan-300 font-semibold shrink-0">
                      {currentRank.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-1 min-w-0">
                    {userEmail ? (
                      <>
                        <Mail className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[140px] sm:max-w-[190px]">{userEmail}</span>
                      </>
                    ) : (
                      <span>Guest Mode (Local Only)</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs font-mono font-extrabold text-amber-500 flex items-center justify-end gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 whitespace-nowrap">
                  <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  <span>{xp} XP</span>
                </div>
              </div>
            </div>

            {/* Cloud Sync Status */}
            <div className="mt-3 pt-2.5 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
              {userEmail ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Cloud Connected via Supabase</span>
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  ⚠️ Stored only in this browser
                </span>
              )}

              {!userEmail && onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth("signup");
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer"
                >
                  Sign Up to Sync
                </button>
              )}
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase mb-1.5 font-semibold">
              Scholar Name
            </label>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              maxLength={25}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-50 dark:bg-[#101827] border border-neutral-200 dark:border-white/10 text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
            />
          </div>

          {/* Avatar Glyph Picker */}
          <div>
            <label className="block text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase mb-1.5 font-semibold">
              Select Scholar Insignia
            </label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {AVATAR_GLYPHS.map((item) => {
                const Icon = item.icon;
                const isSelected = tempAvatar === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setTempAvatar(item.id); sound.playClick(); }}
                    title={item.label}
                    className={`h-12 px-0.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer min-w-0 ${
                      isSelected
                        ? "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white border-transparent shadow-[0_0_12px_rgba(37,99,235,0.35)] scale-105"
                        : "bg-neutral-50 dark:bg-[#101827] border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-blue-500/30"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[8px] sm:text-[9px] font-mono leading-none truncate w-full text-center">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Academic Enrolled Class Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
                Enrolled Class / Grade
              </label>
              <span className="text-[10px] font-mono text-neutral-400">
                Tailors curriculum
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1 overscroll-contain">
              {allClasses.map((cls) => {
                const isSelected = tempGrade === cls.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      setTempGrade(cls.id as GradeType);
                      sound.playClick();
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-500/50 bg-blue-500/10 dark:bg-blue-950/30 shadow-sm"
                        : "border-neutral-200 dark:border-white/10 bg-neutral-50/60 dark:bg-[#101827]/60 hover:border-blue-500/20"
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white"
                          : "bg-neutral-200/80 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      <SleekIcon name={cls.id || cls.icon} className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                          {cls.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                      </div>
                      {cls.description && (
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {cls.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SIGN OUT / SIGN IN BUTTON */}
          <div className="pt-2">
            {userEmail ? (
              <button
                type="button"
                onClick={handleSignOutClick}
                disabled={isSigningOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isSigningOut ? "Signing Out..." : "Sign Out of Account"}</span>
              </button>
            ) : (
              onOpenAuth && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuth("signin");
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-cyan-400 hover:bg-blue-500/20 text-xs font-semibold transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In / Create Account</span>
                </button>
              )
            )}
          </div>

        </div>

        {/* Pinned Footer: Save & Reset Actions */}
        <div className="shrink-0 flex items-center justify-between p-4 px-6 border-t border-neutral-200/80 dark:border-white/10 bg-white/95 dark:bg-[#182438]/95 backdrop-blur-sm z-10">
          {showConfirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/25 cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-xs text-rose-500/80 hover:text-rose-500 flex items-center gap-1 font-mono transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Progress</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="btn-educhain-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>
        </div>

      </div>
    </div>
  );
};
