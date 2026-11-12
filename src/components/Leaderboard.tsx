"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import confetti from "canvas-confetti";
import { useEduStore } from "@/store/useEduStore";
import { BENCHMARK_PLAYERS } from "@/data/constants";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { getXpProgress, getStreakProgress, normalizeXpLevels, normalizeStreakLevels } from "@/lib/progression";
import { LeaderboardScholar } from "@/types/user";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";
import { Trophy, Zap, Flame, Target, Award, RotateCw, Crown, Sparkles, PartyPopper } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type Category = "xp" | "stages" | "streak" | "accuracy";

const CATEGORY_META: Record<Category, { label: string; crownTitle: string; unit: string }> = {
  xp: { label: "XP Points", crownTitle: "Grand XP Champion", unit: "XP" },
  stages: { label: "Stages", crownTitle: "Curriculum Conqueror", unit: "Stages" },
  streak: { label: "Streaks", crownTitle: "Streak Legend", unit: "Days" },
  accuracy: { label: "Accuracy", crownTitle: "Precision Sharpshooter", unit: "%" },
};

const getRankName = (points: number, xpLevels?: ReturnType<ReturnType<typeof useCurriculumStore.getState>["getXpLevels"]>): string => {
  return getXpProgress(points, xpLevels).currentLevel.name;
};

export const Leaderboard: React.FC = () => {
  const { 
    name, 
    avatar, 
    xp, 
    completedStages, 
    currentStreak, 
    totalQuizzesAttempted, 
    totalQuestionsCorrect, 
    totalQuestionsAnswered, 
    isGuest,
    celebratedLeaderboards,
    markLeaderboardCelebrated,
    clearLeaderboardCelebrated,
  } = useEduStore();

  const [activeCategory, setActiveCategory] = useState<Category>("xp");
  const rawXpLevels = useCurriculumStore((s) => s.xpLevels);
  const rawStreakLevels = useCurriculumStore((s) => s.streakLevels);
  const xpLevels = useMemo(() => normalizeXpLevels(rawXpLevels), [rawXpLevels]);
  const streakLevels = useMemo(() => normalizeStreakLevels(rawStreakLevels), [rawStreakLevels]);
  const [cloudScholars, setCloudScholars] = useState<LeaderboardScholar[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(true);
  const [crownToast, setCrownToast] = useState<{ label: string; crownTitle: string; unit?: string } | null>(null);
  const prevTopRef = useRef<Record<string, boolean>>({});

  // Compute current user's accuracy
  const userAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100)
    : 0;

  const currentRankName = getRankName(xp, xpLevels);

  const fireCrownCheer = useCallback(() => {
    sound.playChampion();
    try {
      confetti({
        particleCount: 110,
        spread: 90,
        origin: { y: 0.52 },
        colors: ["#F59E0B", "#FDE047", "#22D3EE", "#2563EB", "#A78BFA"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 65,
          angle: 60,
          spread: 65,
          origin: { x: 0.08, y: 0.65 },
        });
        confetti({
          particleCount: 65,
          angle: 120,
          spread: 65,
          origin: { x: 0.92, y: 0.65 },
        });
      }, 240);
    } catch {
      // Ignore confetti errors in reduced environments
    }
  }, []);

  // Fetch profiles dynamically from Supabase (keeps realtime channel stable)
  const fetchProfiles = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    
    try {
      // Get current auth session to identify current user
      const { data: sessionData } = await supabase.auth.getSession();
      const authId = sessionData?.session?.user?.id || null;
      setCurrentUserId(authId);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, player_name, player_avatar, xp, stages_completed, current_streak, accuracy, quizzes_attempted, questions_answered, questions_correct")
        .order("xp", { ascending: false })
        .limit(100);

      if (error) {
        console.warn("Could not fetch live leaderboard profiles:", error.message);
        setIsLiveConnected(false);
        return;
      }

      if (data && data.length > 0) {
        const mapped: LeaderboardScholar[] = data.map((p) => {
          const isCurrent =
            (Boolean(authId) && p.id === authId) ||
            (!authId && !isGuest && p.player_name === name);

          let calculatedAcc = p.accuracy;
          if (calculatedAcc === null || calculatedAcc === undefined) {
            calculatedAcc = (p.questions_answered && p.questions_answered > 0)
              ? Math.round(((p.questions_correct || 0) / p.questions_answered) * 100)
              : 0;
          }

          return {
            id: p.id,
            name: p.player_name || "Scholar",
            avatar: p.player_avatar || "🦉",
            xp: p.xp || 0,
            rank: getRankName(p.xp || 0),
            stages: p.stages_completed || 0,
            streak: p.current_streak || 0,
            accuracy: calculatedAcc,
            quizzes: p.quizzes_attempted || 0,
            isCurrentUser: Boolean(isCurrent),
          };
        });

        setCloudScholars(mapped);
        setIsLiveConnected(true);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Leaderboard load exception:", err);
      setIsLiveConnected(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isGuest, name]);

  useEffect(() => {
    fetchProfiles();

    // Set up Realtime subscription for instant live updates
    const channel = supabase
      .channel("public-profiles-leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchProfiles(false);
        }
      )
      .subscribe((status) => {
        setIsLiveConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfiles]);

  // Overlay latest local progress onto the current user's live row smoothly
  const allScholars = useMemo(() => {
    const rawBase = cloudScholars.length > 0 ? cloudScholars : BENCHMARK_PLAYERS;
    const overlaidBase = rawBase.map((s) => {
      if (!s.isCurrentUser) {
        return { ...s, rank: getRankName(s.xp, xpLevels) };
      }
      const mergedXp = Math.max(s.xp, xp);
      const mergedStages = Math.max(s.stages, completedStages.length);
      const mergedStreak = Math.max(s.streak, currentStreak);
      const mergedQuizzes = Math.max(s.quizzes, totalQuizzesAttempted);
      const mergedAccuracy = totalQuizzesAttempted > 0 ? userAccuracy : s.accuracy;
      return {
        ...s,
        name: name || s.name,
        avatar: avatar || s.avatar,
        xp: mergedXp,
        rank: getRankName(mergedXp, xpLevels),
        stages: mergedStages,
        streak: mergedStreak,
        accuracy: mergedAccuracy,
        quizzes: mergedQuizzes,
      };
    });

    const hasCurrentUserInList = overlaidBase.some((s) => s.isCurrentUser);
    const shouldShowUser = !hasCurrentUserInList && (!isGuest || xp > 0 || totalQuizzesAttempted > 0);

    const currentUserScholar: LeaderboardScholar = {
      id: currentUserId || "current_user",
      name: name || (isGuest ? "Guest Scholar" : "Scholar"),
      avatar: avatar || "🧠",
      xp,
      rank: currentRankName,
      stages: completedStages.length,
      streak: currentStreak,
      accuracy: userAccuracy,
      quizzes: totalQuizzesAttempted,
      isCurrentUser: true,
    };

    return [...overlaidBase, ...(shouldShowUser ? [currentUserScholar] : [])].sort((a, b) => {
      if (activeCategory === "xp") {
        return b.xp - a.xp || b.stages - a.stages || b.accuracy - a.accuracy;
      }
      if (activeCategory === "stages") {
        return b.stages - a.stages || b.xp - a.xp || b.accuracy - a.accuracy;
      }
      if (activeCategory === "streak") {
        return b.streak - a.streak || b.xp - a.xp || b.stages - a.stages;
      }
      if (activeCategory === "accuracy") {
        const aQualified = a.quizzes >= 2;
        const bQualified = b.quizzes >= 2;
        if (aQualified && !bQualified) return -1;
        if (!aQualified && bQualified) return 1;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.xp - a.xp;
      }
      return 0;
    });
  }, [
    cloudScholars,
    activeCategory,
    xp,
    completedStages.length,
    currentStreak,
    totalQuizzesAttempted,
    userAccuracy,
    isGuest,
    name,
    avatar,
    currentUserId,
    currentRankName,
    xpLevels,
  ]);

  const categoryMeta = CATEGORY_META;

  const getMetricValue = (scholar: LeaderboardScholar, cat: Category) => {
    if (cat === "xp") return scholar.xp;
    if (cat === "stages") return scholar.stages;
    if (cat === "streak") return scholar.streak;
    return scholar.accuracy;
  };

  const userIndex = allScholars.findIndex((s) => s.isCurrentUser);
  const userRank = userIndex >= 0 ? userIndex + 1 : null;
  const userScholar = userIndex >= 0 ? allScholars[userIndex] : null;
  const leaderScholar = allScholars[0];
  const userHasEarnedScore = userScholar
    ? activeCategory === "accuracy"
      ? userScholar.quizzes >= 2 && userScholar.accuracy > 0
      : getMetricValue(userScholar, activeCategory) > 0
    : false;
  const isUserNumberOne = userRank === 1 && userHasEarnedScore;

  // Cheer when user reaches #1 on ANY leaderboard category!
  useEffect(() => {
    if (isLoading) return;
    if (isUserNumberOne) {
      const wasAlreadyCelebrated = celebratedLeaderboards.includes(activeCategory);
      const wasCelebratedInSession = prevTopRef.current[activeCategory];
      if (!wasAlreadyCelebrated || !wasCelebratedInSession) {
        prevTopRef.current[activeCategory] = true;
        markLeaderboardCelebrated(activeCategory);
        fireCrownCheer();
        setCrownToast(CATEGORY_META[activeCategory]);
      }
    } else if (userRank !== null && userRank > 1) {
      prevTopRef.current[activeCategory] = false;
      if (celebratedLeaderboards.includes(activeCategory)) {
        clearLeaderboardCelebrated(activeCategory);
      }
    }
  }, [
    isLoading,
    isUserNumberOne,
    userRank,
    activeCategory,
    celebratedLeaderboards,
    markLeaderboardCelebrated,
    clearLeaderboardCelebrated,
    fireCrownCheer,
  ]);

  useEffect(() => {
    if (!crownToast) return;
    const t = setTimeout(() => setCrownToast(null), 6500);
    return () => clearTimeout(t);
  }, [crownToast]);

  const gapToFirst =
    !isUserNumberOne && userScholar && leaderScholar
      ? Math.max(
          1,
          getMetricValue(leaderScholar, activeCategory) -
            getMetricValue(userScholar, activeCategory) +
            (activeCategory === "accuracy" ? 0 : 1)
        )
      : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 animate-in fade-in duration-300 relative">

      {/* Floating #1 Crown Cheer Toast */}
      {crownToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-sm p-4 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-[#182438] via-[#263B5B] to-[#182438] text-white shadow-[0_12px_40px_rgba(245,158,11,0.35)] animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 fill-amber-400 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                👑 #1 Top of the Leaderboard!
              </div>
              <p className="text-sm font-heading font-bold mt-0.5">
                All hail our {crownToast.crownTitle}!
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                You claimed Rank #1 in {crownToast.label}! Enjoy the standing ovation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCrownToast(null)}
              className="text-slate-400 hover:text-white text-xs font-mono px-1.5 py-0.5 rounded-lg"
              aria-label="Dismiss cheer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-slate-200/90 dark:border-[#263B5B]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 shadow-xs shrink-0">
              <Trophy className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-[#2563EB] dark:text-[#22D3EE] font-bold">
              Live Scholar Rankings
            </span>

            {/* Live Database Status Indicator */}
            <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-slate-100 dark:bg-[#182438] border border-slate-200 dark:border-[#263B5B]">
              {isLiveConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Live Supabase DB</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">Offline Fallback</span>
                </>
              )}
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-slate-600 dark:text-[#94A3B8] font-bold">{allScholars.length} Scholars</span>
            </div>
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Global Leaderboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-1 leading-relaxed">
            Real-time rankings synchronized across all registered students. Reach #1 on any board to claim the Crown Cheer!
          </p>
        </div>

        {/* Controls: Refresh & Category Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Refresh Button */}
          <button
            onClick={() => {
              sound.playClick();
              fetchProfiles(true);
            }}
            disabled={isRefreshing}
            title="Refresh Leaderboard"
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] text-xs font-bold text-slate-700 dark:text-[#F8FAFC] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-all disabled:opacity-50 shadow-xs card-lift cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-500" : ""}`} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Category Filter Tabs */}
          <div className="grid grid-cols-2 sm:flex items-center gap-1 border border-slate-200 dark:border-[#263B5B] rounded-2xl p-1 bg-white dark:bg-[#182438] shadow-xs flex-1 sm:flex-initial">
            {[
              { id: "xp", label: "XP Points", icon: Zap },
              { id: "stages", label: "Stages", icon: Award },
              { id: "streak", label: "Streaks", icon: Flame },
              { id: "accuracy", label: "Accuracy", icon: Target },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id as Category);
                    sound.playClick();
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* #1 Leaderboard Champion Celebration Spotlight Banner */}
      {isUserNumberOne && (
        <div className="mb-5 sm:mb-8 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-cyan-500/15 dark:from-amber-500/20 dark:via-[#263B5B]/80 dark:to-cyan-500/15 shadow-[0_10px_35px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="relative p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.45)] shrink-0">
              <Crown className="w-6 h-6 sm:w-7 sm:h-7 fill-slate-950/20 animate-bounce" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold mb-1">
                <PartyPopper className="w-3 h-3" />
                <span>Rank #1 Champion Spotlight</span>
              </div>
              <h2 className="font-heading text-base sm:text-xl font-extrabold text-slate-900 dark:text-white">
                🎉 Cheers, {userScholar?.name}! You&apos;re #1 in {categoryMeta[activeCategory].label}!
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Crowned <strong>{categoryMeta[activeCategory].crownTitle}</strong> — leading all {allScholars.length} scholars across EduChain!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fireCrownCheer}
            className="px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md flex items-center gap-2 transition-all hover:scale-[1.03] active:scale-[0.98] cursor-pointer shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            <span>Encore Cheer!</span>
          </button>
        </div>
      )}

      {/* Motivational Gap-to-#1 Strip when climbing */}
      {!isUserNumberOne && userRank && userScholar && (
        <div className="mb-5 sm:mb-8 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-500/20 dark:border-[#263B5B] bg-gradient-to-r from-blue-500/[0.06] via-cyan-500/[0.05] to-transparent dark:from-[#182438] dark:to-[#223149]/50 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-mono font-extrabold bg-[#2563EB]/15 text-[#2563EB] dark:bg-[#22D3EE]/15 dark:text-[#22D3EE] border border-[#2563EB]/25 dark:border-[#22D3EE]/30 shrink-0">
              Your Rank: #{userRank}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {activeCategory === "accuracy" && userScholar.quizzes < 2 ? (
                <>Complete <strong>{2 - userScholar.quizzes} more quiz{2 - userScholar.quizzes === 1 ? "" : "zes"}</strong> to qualify for the #1 Accuracy Crown!</>
              ) : gapToFirst > 0 ? (
                <>Only <strong>{gapToFirst.toLocaleString()} {categoryMeta[activeCategory].unit}</strong> away from overtaking <strong>{leaderScholar?.name}</strong> for #1!</>
              ) : (
                <>Tied at the top metric! Earn 1 more {categoryMeta[activeCategory].unit} to claim solo #1!</>
              )}
            </p>
          </div>
          <span className="hidden sm:inline text-[11px] font-mono font-semibold text-cyan-600 dark:text-cyan-400">
            🚀 Keep chaining!
          </span>
        </div>
      )}

      {/* Podium Top 3 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5 sm:mb-8">
        {allScholars.slice(0, 3).map((scholar, idx) => {
          const medals = ["🥇", "🥈", "🥉"];
          const borderColors = [
            "border-amber-400/60 bg-gradient-to-b from-amber-500/12 via-amber-500/5 to-white dark:from-amber-400/15 dark:to-[#182438] shadow-[0_0_25px_rgba(245,158,11,0.22)]",
            "border-slate-300 dark:border-slate-400/30 bg-gradient-to-b from-slate-200/50 to-white dark:from-slate-400/10 dark:to-[#182438]",
            "border-amber-700/40 bg-gradient-to-b from-amber-700/10 to-white dark:from-amber-700/10 dark:to-[#182438]",
          ];

          return (
            <div
              key={scholar.id}
              className={`px-3.5 py-2.5 sm:p-5 rounded-2xl sm:rounded-3xl border relative flex flex-row sm:flex-col items-center justify-between sm:justify-start gap-2.5 sm:gap-0 text-left sm:text-center transition-all card-lift ${borderColors[idx]} ${
                idx === 0 ? "mt-2 sm:mt-0" : ""
              } ${
                scholar.isCurrentUser ? "ring-2 ring-[#2563EB] dark:ring-[#22D3EE] shadow-[0_0_20px_rgba(34,211,238,0.3)]" : ""
              }`}
            >
              {idx === 0 && (
                <div className="absolute -top-2.5 left-3.5 sm:left-1/2 sm:-translate-x-1/2 sm:-top-3 px-2 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[9px] sm:text-[10px] font-mono font-extrabold uppercase tracking-wider shadow-md flex items-center gap-1 whitespace-nowrap">
                  <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-slate-950/20" />
                  <span>#1 Crown Holder</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 min-w-0 flex-1 sm:contents">
                <div className="text-xl sm:text-3xl shrink-0 sm:mb-1.5 sm:mt-1">{medals[idx]}</div>
                <div className="sm:hidden shrink-0">
                  <ScholarAvatar name={scholar.name} avatar={scholar.avatar} size="md" />
                </div>
                <div className="hidden sm:block mb-2 relative">
                  <ScholarAvatar name={scholar.name} avatar={scholar.avatar} size="xl" />
                </div>
                <div className="min-w-0 flex-1 sm:w-full sm:flex sm:flex-col sm:items-center">
                  <div className="text-xs sm:text-sm font-bold font-heading text-slate-900 dark:text-white flex items-center sm:justify-center gap-1.5 min-w-0">
                    <span className="truncate sm:max-w-[140px]">{scholar.name}</span>
                    {scholar.isCurrentUser && (
                      <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-[#2563EB]/20 text-[#2563EB] dark:bg-[#22D3EE]/20 dark:text-[#22D3EE] font-bold border border-[#2563EB]/30 dark:border-[#22D3EE]/40 shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] mt-0.5 truncate">
                    {scholar.rank} • {scholar.quizzes} Quizzes
                  </div>
                </div>
              </div>

              {/* Dynamic Metric Value */}
              <div className="shrink-0 sm:mt-3.5 text-sm sm:text-lg font-extrabold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                {activeCategory === "xp" && `${scholar.xp.toLocaleString()} XP`}
                {activeCategory === "stages" && `${scholar.stages} Stages`}
                {activeCategory === "streak" && `${scholar.streak} Days`}
                {activeCategory === "accuracy" && `${scholar.accuracy}%`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard Table */}
      <div className="border border-slate-200 dark:border-[#263B5B] rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-[#182438] shadow-lg dark:shadow-[0_12px_40px_rgba(16,24,39,0.4)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-[#263B5B]/80 bg-slate-50/80 dark:bg-[#141f30] text-slate-500 dark:text-[#94A3B8] font-mono font-bold">
              <tr>
                <th className="py-2.5 px-2 sm:py-3.5 sm:px-4 w-9 sm:w-12 text-center">#</th>
                <th className="py-2.5 px-2 sm:py-3.5 sm:px-4">Scholar</th>
                <th className="hidden sm:table-cell py-3.5 px-4 whitespace-nowrap">Rank</th>
                <th className={`${activeCategory === "stages" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right whitespace-nowrap`}>Stages</th>
                <th className={`${activeCategory === "streak" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right whitespace-nowrap`}>Streak</th>
                <th className={`${activeCategory === "xp" || activeCategory === "accuracy" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right whitespace-nowrap`}>
                  <span className="sm:hidden">Acc</span>
                  <span className="hidden sm:inline">Accuracy</span>
                </th>
                <th className="py-2.5 px-2 sm:py-3.5 sm:px-4 text-right whitespace-nowrap">XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#263B5B]/40">
              {allScholars.map((scholar, idx) => (
                <tr
                  key={scholar.id}
                  className={`transition-colors ${
                    scholar.isCurrentUser
                      ? "bg-blue-500/[0.08] dark:bg-[#223149] font-bold border-l-4 border-l-[#2563EB] dark:border-l-[#22D3EE]"
                      : "hover:bg-slate-50/80 dark:hover:bg-[#1e2f47]"
                  }`}
                >
                  <td className="py-2.5 px-2 sm:py-3.5 sm:px-4 text-center font-mono text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                  </td>
                  <td className="py-2.5 px-2 sm:py-3.5 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="sm:hidden shrink-0">
                        <ScholarAvatar name={scholar.name} avatar={scholar.avatar} size="sm" />
                      </span>
                      <span className="hidden sm:inline-flex shrink-0">
                        <ScholarAvatar name={scholar.name} avatar={scholar.avatar} size="md" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[125px] sm:max-w-none">{scholar.name}</span>
                          {idx === 0 && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400/50 shrink-0" />
                          )}
                          {scholar.isCurrentUser && (
                            <span className="text-[9px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-[#2563EB]/20 text-[#2563EB] dark:bg-[#22D3EE]/20 dark:text-[#22D3EE] font-bold border border-[#2563EB]/30 dark:border-[#22D3EE]/40 shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 dark:text-slate-400 sm:hidden truncate">
                          {scholar.rank} • {scholar.stages} stg • {scholar.streak}d
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell py-3.5 px-4 text-slate-600 dark:text-[#94A3B8] font-mono whitespace-nowrap">
                    {scholar.rank}
                  </td>
                  <td className={`${activeCategory === "stages" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap`}>
                    {scholar.stages}
                  </td>
                  <td className={`${activeCategory === "streak" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right font-mono text-orange-600 dark:text-orange-400 font-bold whitespace-nowrap`}>
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <span>{scholar.streak}d</span>
                      {(() => {
                        const streakTier = getStreakProgress(scholar.streak, streakLevels).currentLevel;
                        return streakTier ? (
                          <span className="hidden md:inline text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-600 dark:text-orange-300 border border-orange-500/20">
                            {streakTier.name}
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </td>
                  <td className={`${activeCategory === "xp" || activeCategory === "accuracy" ? "" : "hidden sm:table-cell"} py-2.5 px-2 sm:py-3.5 sm:px-4 text-right font-mono whitespace-nowrap`}>
                    <span className={scholar.accuracy >= 90 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-700 dark:text-slate-300"}>
                      {scholar.accuracy}%
                    </span>
                  </td>
                  <td className="py-2.5 px-2 sm:py-3.5 sm:px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {scholar.xp.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 dark:text-[#94A3B8] gap-2">
        <span>⚡ Synchronized in real-time with EduChain Cloud Network</span>
        {lastUpdated && (
          <span>Last sync: {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>

    </div>
  );
};
