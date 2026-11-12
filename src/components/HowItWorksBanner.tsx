"use client";

import React, { useState, useEffect } from "react";
import { sound } from "@/lib/audio";
import { Compass, X } from "lucide-react";

export const HowItWorksBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("educhain_how_it_works_dismissed");
    if (!dismissed) {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sound.playClick();
    setIsDismissed(true);
    localStorage.setItem("educhain_how_it_works_dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div className="relative mb-6 sm:mb-8 p-4 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-[#263B5B] bg-white dark:bg-gradient-to-r dark:from-[#182438] dark:via-[#1c2c43] dark:to-[#182438] shadow-md dark:shadow-[0_8px_30px_rgba(16,24,39,0.35)] animate-in fade-in duration-300 overflow-hidden">
      
      {/* Top subtle gradient accent border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA]" />

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        title="Dismiss guide"
        className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223149] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pr-8">
        <span className="p-1.5 rounded-xl bg-gradient-to-br from-[#2563EB]/15 to-[#22D3EE]/15 border border-[#2563EB]/25 text-[#2563EB] dark:text-[#22D3EE] shrink-0">
          <Compass className="w-4 h-4" />
        </span>
        <h2 className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-[#F8FAFC]">
          How EduChain Works • 3 Quick Steps
        </h2>
      </div>

      {/* 3 Step Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Step 1 */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#101827]/60 border border-slate-200/70 dark:border-[#223149] card-lift">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
            01
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold text-slate-900 dark:text-white">
              Pick Your Track
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
              Choose Math, Science, English, or CS. Master stages sequentially at your own personal pace.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#101827]/60 border border-slate-200/70 dark:border-[#223149] card-lift">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
            02
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold text-slate-900 dark:text-white">
              Conquer 5 Questions
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
              Beat the 20s countdown. Score 70% or higher to unlock achievements and the next challenge.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#101827]/60 border border-slate-200/70 dark:border-[#223149] card-lift">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#22D3EE] text-white flex items-center justify-center font-mono font-extrabold text-xs shrink-0 shadow-[0_2px_10px_rgba(37,99,235,0.3)]">
            03
          </div>
          <div>
            <h3 className="font-heading text-xs font-bold text-slate-900 dark:text-white">
              Rank Up & Forge Errors
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
              Earn XP for scholar ranks. Missed questions go directly to the Mistake Forge for deliberate recall!
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
