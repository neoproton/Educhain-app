"use client";

import React, { useEffect, useState } from "react";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { getXpProgress, getStreakProgress } from "@/lib/progression";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import {
  Flame,
  Zap,
  X,
  CheckCircle2,
  Lock,
  Trophy,
  BookOpen,
  Sparkles,
  Calendar,
} from "lucide-react";

interface ProgressionModalProps {
  initialTab: "streak" | "xp";
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
}

/**
 * Interactive modal launched from the Navbar Streak and XP pills.
 * Displays the student's live tier progress and the full XP / Streak milestone
 * ladders configured in the Admin Control Panel.
 */
export const ProgressionModal: React.FC<ProgressionModalProps> = ({
  initialTab,
  onClose,
  onNavigateTab,
}) => {
  useBodyScrollLock(true);

  const [tab, setTab] = useState<"streak" | "xp">(initialTab);
  const { xp, currentStreak, longestStreak, lastActiveDate, completedStages } = useEduStore();
  const { getXpLevels, getStreakLevels } = useCurriculumStore();

  const xpLevels = getXpLevels();
  const streakLevels = getStreakLevels();

  const xpProgress = getXpProgress(xp, xpLevels);
  const streakProgress = getStreakProgress(currentStreak, streakLevels);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        sound.playClick();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleNavigate = (targetTab: string) => {
    sound.playClick();
    if (onNavigateTab) {
      onNavigateTab(targetTab);
    }
    onClose();
  };

  const isStreak = tab === "streak";

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
        role="dialog"
        aria-modal="true"
        aria-label="XP and Streak Progression"
        className="relative w-full max-w-lg max-h-[90dvh] bg-white dark:bg-[#182438] border border-neutral-200/80 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col min-h-0 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`h-1 w-full shrink-0 ${
            isStreak
              ? "bg-gradient-to-r from-orange-500 via-amber-400 to-rose-500"
              : "bg-gradient-to-r from-amber-400 via-blue-500 to-cyan-400"
          }`}
        />

        {/* Pinned Header + Mode Switcher */}
        <div className="shrink-0 p-4 sm:p-5 sm:pb-4 border-b border-neutral-200/80 dark:border-white/10 bg-slate-50/85 dark:bg-[#141f30]/85 backdrop-blur-sm space-y-3 sm:space-y-3.5">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                  isStreak
                    ? "bg-orange-500/15 border-orange-500/30 text-orange-500"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-500"
                }`}
              >
                {isStreak ? <Flame className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white font-space-grotesk leading-tight truncate">
                  {isStreak ? "Daily Streak Milestones" : "XP Level Progression"}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {isStreak
                    ? "Consecutive learning days & streak tiers"
                    : "Experience points & scholar ranks"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              aria-label="Close modal"
              className="p-1.5 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-neutral-200/90 dark:border-white/10 bg-neutral-100/90 dark:bg-[#101827]"
            role="tablist"
          >
            <button
              type="button"
              role="tab"
              aria-selected={isStreak}
              onClick={() => {
                sound.playClick();
                setTab("streak");
              }}
              className={`h-9 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer min-w-0 ${
                isStreak
                  ? "bg-white dark:bg-[#223149] text-neutral-900 dark:text-white shadow-sm ring-1 ring-neutral-900/5 dark:ring-white/10"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Flame className={`w-3.5 h-3.5 shrink-0 ${isStreak ? "text-orange-500" : ""}`} />
              <span className="truncate">Streak Levels</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-300 text-[10px] font-mono tabular-nums leading-none shrink-0">
                {currentStreak}d
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={!isStreak}
              onClick={() => {
                sound.playClick();
                setTab("xp");
              }}
              className={`h-9 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer min-w-0 ${
                !isStreak
                  ? "bg-white dark:bg-[#223149] text-neutral-900 dark:text-white shadow-sm ring-1 ring-neutral-900/5 dark:ring-white/10"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 shrink-0 ${!isStreak ? "text-amber-500" : ""}`} />
              <span className="truncate">XP Levels</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 text-[10px] font-mono tabular-nums leading-none shrink-0">
                {xp}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 sm:space-y-5">
          {isStreak ? (
            <>
              {/* Streak Summary Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-50/90 to-amber-50/50 dark:from-orange-950/25 dark:to-[#101827] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-semibold">
                      Current Streak Status
                    </div>
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-extrabold font-space-grotesk text-neutral-900 dark:text-white tabular-nums">
                        {currentStreak}
                      </span>
                      <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                        {currentStreak === 1 ? "Day" : "Days"}
                      </span>
                      {streakProgress.currentLevel ? (
                        <span
                          className="ml-1 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border"
                          style={{
                            color: streakProgress.currentLevel.color || "#fb923c",
                            backgroundColor: `${streakProgress.currentLevel.color || "#fb923c"}18`,
                            borderColor: `${streakProgress.currentLevel.color || "#fb923c"}45`,
                          }}
                        >
                          <span>{streakProgress.currentLevel.icon}</span>
                          <span>{streakProgress.currentLevel.name}</span>
                        </span>
                      ) : (
                        <span className="ml-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200/80 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                          Not Started
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-neutral-500 dark:text-neutral-400 space-y-1 shrink-0">
                    <div>
                      Best:{" "}
                      <strong className="text-neutral-900 dark:text-white">
                        {Math.max(longestStreak, currentStreak)}d
                      </strong>
                    </div>
                    {lastActiveDate && (
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{lastActiveDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar to Next Streak Tier */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    {streakProgress.nextLevel ? (
                      <>
                        <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                          Next:{" "}
                          <strong className="text-neutral-900 dark:text-white">
                            {streakProgress.nextLevel.icon} {streakProgress.nextLevel.name}
                          </strong>{" "}
                          ({streakProgress.nextLevel.minDays}d)
                        </span>
                        <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">
                          {streakProgress.remaining}d to go
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Top Streak Tier Achieved!
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-200/90 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${streakProgress.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Streak Tier Ladder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <span>Configured Streak Levels</span>
                  <span>{streakProgress.sortedLevels.length} Tiers</span>
                </div>
                <div className="space-y-2">
                  {streakProgress.sortedLevels.map((tier, idx) => {
                    const achieved = currentStreak >= tier.minDays;
                    const isCurrent = streakProgress.currentLevel?.id === tier.id;
                    const accent = tier.color || "#fb923c";
                    return (
                      <div
                        key={tier.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-orange-50/70 dark:bg-orange-950/20 border-orange-400/50 shadow-sm"
                            : achieved
                            ? "bg-neutral-50/70 dark:bg-[#101827]/70 border-neutral-200/80 dark:border-white/10"
                            : "bg-white/60 dark:bg-[#101827]/40 border-neutral-200/60 dark:border-white/5 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border shrink-0"
                            style={{
                              backgroundColor: `${accent}18`,
                              borderColor: `${accent}40`,
                            }}
                          >
                            {tier.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-neutral-400">#{idx + 1}</span>
                              <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                                {tier.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {tier.description || `Maintain a ${tier.minDays}-day consecutive learning streak`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                            {tier.minDays}d+
                          </span>
                          {achieved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                              <Lock className="w-3 h-3" />
                              <span>{Math.max(1, tier.minDays - currentStreak)}d left</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* XP Summary Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-50/90 to-blue-50/40 dark:from-amber-950/20 dark:to-[#101827] space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">
                      Total Experience Earned
                    </div>
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-3xl font-extrabold font-space-grotesk text-neutral-900 dark:text-white tabular-nums">
                        {xp.toLocaleString()}
                      </span>
                      <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">
                        XP
                      </span>
                      <span
                        className="ml-1 inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border"
                        style={{
                          color: xpProgress.currentLevel.color || "#38bdf8",
                          backgroundColor: `${xpProgress.currentLevel.color || "#38bdf8"}18`,
                          borderColor: `${xpProgress.currentLevel.color || "#38bdf8"}45`,
                        }}
                      >
                        <span>{xpProgress.currentLevel.icon}</span>
                        <span>{xpProgress.currentLevel.name}</span>
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-neutral-500 dark:text-neutral-400 shrink-0">
                    <div>
                      Level{" "}
                      <strong className="text-neutral-900 dark:text-white">
                        {xpProgress.levelNumber} / {xpProgress.sortedLevels.length}
                      </strong>
                    </div>
                    <div className="mt-0.5">
                      Stages:{" "}
                      <strong className="text-neutral-900 dark:text-white">
                        {completedStages.length}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Progress Bar to Next XP Level */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    {xpProgress.nextLevel ? (
                      <>
                        <span className="text-neutral-600 dark:text-neutral-300 font-medium">
                          Next:{" "}
                          <strong className="text-neutral-900 dark:text-white">
                            {xpProgress.nextLevel.icon} {xpProgress.nextLevel.name}
                          </strong>{" "}
                          ({xpProgress.nextLevel.minXp.toLocaleString()} XP)
                        </span>
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {xpProgress.remaining.toLocaleString()} XP to go
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Maximum XP Rank Achieved!
                      </span>
                    )}
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-200/90 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 via-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${xpProgress.progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* XP Level Ladder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  <span>Configured XP Levels</span>
                  <span>{xpProgress.sortedLevels.length} Ranks</span>
                </div>
                <div className="space-y-2">
                  {xpProgress.sortedLevels.map((tier, idx) => {
                    const achieved = xp >= tier.minXp;
                    const isCurrent = xpProgress.currentLevel.id === tier.id;
                    const accent = tier.color || "#38bdf8";
                    return (
                      <div
                        key={tier.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? "bg-blue-50/70 dark:bg-blue-950/25 border-blue-400/50 shadow-sm"
                            : achieved
                            ? "bg-neutral-50/70 dark:bg-[#101827]/70 border-neutral-200/80 dark:border-white/10"
                            : "bg-white/60 dark:bg-[#101827]/40 border-neutral-200/60 dark:border-white/5 opacity-80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border shrink-0"
                            style={{
                              backgroundColor: `${accent}18`,
                              borderColor: `${accent}40`,
                            }}
                          >
                            {tier.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-mono text-neutral-400">#{idx + 1}</span>
                              <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                                {tier.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/25">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                              {tier.description || `Reach ${tier.minXp.toLocaleString()} total XP`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-white">
                            {tier.minXp.toLocaleString()} XP
                          </span>
                          {achieved ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                              <Lock className="w-3 h-3" />
                              <span>{Math.max(1, tier.minXp - xp).toLocaleString()} XP</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 p-4 border-t border-neutral-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-[#141f30]/80 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => handleNavigate("map")}
            className="flex-1 h-10 px-4 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-500" />
            <span>Practice Quests</span>
          </button>

          <button
            type="button"
            onClick={() => handleNavigate("leaderboard")}
            className="flex-1 h-10 px-4 rounded-xl text-xs font-semibold btn-educhain-primary flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>View Leaderboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
