"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { GradeType } from "@/types/curriculum";
import { GRADE_LABELS } from "@/data/constants";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { X, Lock, Mail, User, Sparkles, ArrowRight, CheckCircle2, AlertCircle, MailCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
  onSuccess?: () => void;
}

const AVATARS = ["🧠", "🦉", "🚀", "⚡", "🧬", "🧙‍♂️", "🎨", "🤖", "🛡️", "💎"];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = "signin",
  onSuccess,
}) => {
  // Lock background webpage scrolling while the auth modal is open
  useBodyScrollLock(isOpen);

  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<GradeType>("grade_9");
  const [avatar, setAvatar] = useState("🧠");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);

  const { setProfile, setGuestSession } = useEduStore();
  const { getAllClasses } = useCurriculumStore();
  const allClasses = getAllClasses();

  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setPendingConfirmationEmail(null);
    }
  }, [isOpen, defaultMode]);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setErrorMsg("Invalid email or password. Need an account? Click 'Create Account' below.");
        } else {
          setErrorMsg(error.message);
        }
        sound.playIncorrect();
      } else if (data?.user) {
        sound.playUnlock();
        setSuccessMsg("Welcome back, Scholar!");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          setProfile(
            profile.player_name || data.user.email?.split("@")[0] || "Scholar",
            profile.player_avatar || "🧠",
            (profile.player_grade as GradeType) || "grade_9"
          );
        }

        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 800);
      }
    } catch {
      setErrorMsg("Connection issue. Please check your network or continue as Guest.");
      sound.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      sound.playIncorrect();
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}` : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name.trim() || "Scholar",
            avatar,
            grade,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        sound.playIncorrect();
      } else {
        sound.playUnlock();

        if (!data.session) {
          setPendingConfirmationEmail(email.trim());
          return;
        }

        setSuccessMsg("Account created successfully!");
        setProfile(name.trim() || email.split("@")[0] || "Scholar", avatar, grade);

        if (data.user) {
          try {
            await supabase.from("profiles").upsert({
              id: data.user.id,
              player_name: name.trim() || "Scholar",
              player_avatar: avatar,
              player_grade: grade,
            });
          } catch {}
        }

        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1000);
      }
    } catch {
      setErrorMsg("Sign up error. You can continue as a Guest.");
      sound.playIncorrect();
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = () => {
    sound.playClick();
    setGuestSession();
    onClose();
    if (onSuccess) onSuccess();
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
        className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] bg-white dark:bg-[#182438] border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Decorative Top Accent Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-500 z-10" />
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => { sound.playClick(); onClose(); }}
          className="absolute top-4 right-4 p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Modal Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 sm:p-8">

        {/* ========================================================= */}
        {/* VIEW: EMAIL CONFIRMATION REQUIRED SCREEN */}
        {/* ========================================================= */}
        {pendingConfirmationEmail ? (
          <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mb-4 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <MailCheck className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2 font-space-grotesk">
              Check Your Email!
            </h2>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mb-4">
              We sent a verification link to:
              <span className="block font-mono font-semibold text-neutral-900 dark:text-cyan-300 mt-1 break-all bg-neutral-100 dark:bg-[#101827] p-2 rounded-xl border border-neutral-200 dark:border-white/10">
                {pendingConfirmationEmail}
              </span>
            </p>

            <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-500/20 text-xs text-blue-800 dark:text-blue-300 text-left mb-6 leading-relaxed">
              👉 Click the <strong>confirmation link in your inbox</strong> to activate your scholar account and immediately start learning!
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setPendingConfirmationEmail(null);
                  setMode("signin");
                  sound.playClick();
                }}
                className="w-full btn-educhain-primary py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <span>Back to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleGuestContinue}
                className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white py-1 transition-colors cursor-pointer"
              >
                Explore as Guest meanwhile
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Brand Icon & Heading */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] mb-3 shadow-[0_0_24px_rgba(37,99,235,0.4)]">
                <Image
                  src="/logo.png"
                  alt="EduChain Logo"
                  fill
                  sizes="64px"
                  className="object-cover"
                  priority
                />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-neutral-900 dark:text-white font-space-grotesk">
                {mode === "signin" ? "Welcome Back to EduChain" : "Create Your Scholar Account"}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 max-w-xs leading-relaxed">
                {mode === "signin"
                  ? "Sign in to sync your quiz progress, badges, and rankings across devices."
                  : "Join the learning chain, track your accuracy, and conquer your curriculum."}
              </p>
            </div>

            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-[#101827] border border-neutral-200/80 dark:border-white/10 mb-6">
              <button
                type="button"
                onClick={() => { setMode("signin"); setErrorMsg(null); setSuccessMsg(null); sound.playClick(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "signin"
                    ? "bg-white dark:bg-[#223149] text-blue-600 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMsg(null); setSuccessMsg(null); sound.playClick(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "signup"
                    ? "bg-white dark:bg-[#223149] text-blue-600 dark:text-white shadow-sm"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

        {/* Status Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="scholar@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-educhain-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Scholar Hub"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                Scholar Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayesha Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="ayesha@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                  Grade / Class
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value as GradeType)}
                  className="w-full px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-900 dark:text-white text-xs focus:outline-none focus:border-cyan-400"
                >
                  {allClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-500 dark:text-neutral-400 mb-1 font-semibold">
                  Avatar
                </label>
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  {AVATARS.slice(0, 5).map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`w-8 h-8 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                        avatar === av
                          ? "bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-md scale-105"
                          : "bg-neutral-100 dark:bg-[#223149] text-neutral-700 dark:text-neutral-300 hover:scale-105"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-educhain-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Creating Account..." : "Create Free Account"}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Guest Option Divider */}
        <div className="mt-5 pt-4 border-t border-neutral-200/70 dark:border-white/10 text-center">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-2 font-medium">
            Just exploring or evaluating the demo?
          </p>
          <button
            type="button"
            onClick={handleGuestContinue}
            className="w-full py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827]/70 hover:bg-neutral-100 dark:hover:bg-[#223149] text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-all cursor-pointer"
          >
            Continue as Guest / Evaluator
          </button>
        </div>
        </>
      )}

        </div>

      </div>
    </div>
  );
};
