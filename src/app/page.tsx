"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import { Navbar } from "@/components/Navbar";
import { StageCard } from "@/components/StageCard";
import { QuizModal } from "@/components/QuizModal";
import { Leaderboard } from "@/components/Leaderboard";
import { AnalyticsView } from "@/components/AnalyticsView";
import { ProfileModal } from "@/components/ProfileModal";
import { AuthModal } from "@/components/AuthModal";
import { LandingPage } from "@/components/LandingPage";
import { HowItWorksBanner } from "@/components/HowItWorksBanner";
import { NextQuestHero } from "@/components/NextQuestHero";
import { SleekBadgeIcon } from "@/components/SleekIcon";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { GradeType, Stage, SubjectType } from "@/types/curriculum";

import { sound } from "@/lib/audio";

const NUMBER_WORDS: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Eleven",
  12: "Twelve",
  13: "Thirteen",
  14: "Fourteen",
  15: "Fifteen",
  16: "Sixteen",
  17: "Seventeen",
  18: "Eighteen",
  19: "Nineteen",
  20: "Twenty",
};

function formatChapterWord(num: number): string {
  return NUMBER_WORDS[num] || String(num);
}

interface ChapterGroup {
  chapterIndex: number;
  chapterWord: string;
  chapterName: string;
  stages: Stage[];
}

interface SubjectGroup {
  subject: SubjectType;
  subjectMeta: {
    id: string;
    name: string;
    icon: string;
    description: string;
    color: string;
  };
  chapters: ChapterGroup[];
  totalStages: number;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<"landing" | "app">("landing");
  const [activeTab, setActiveTab] = useState<string>("map");
  const [selectedSubject, setSelectedSubject] = useState<string>("computer_science");
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const {
    grade,
    completedStages,

    bestScores,
    subjectProgress,
    settings,
    setProfile,
    loadCloudProfile,
  } = useEduStore();

  const { getAllStages, getAllSubjects, syncWithSupabase } = useCurriculumStore();
  const allStages = getAllStages();
  const allSubjects = getAllSubjects();

  useEffect(() => {
    syncWithSupabase();
  }, [syncWithSupabase]);

  // Listen for Supabase Auth state changes (e.g. Email confirmation or session restore)
  useEffect(() => {
    const syncUser = async (user: User) => {
      const meta = user.user_metadata || {};
      
      // Fetch user's saved progress from Supabase profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        loadCloudProfile({
          id: user.id,
          name: profile.player_name || meta.name || "Scholar",
          avatar: profile.player_avatar || meta.avatar || "🧠",
          grade: (profile.player_grade as GradeType) || (meta.grade as GradeType) || "grade_9",
          xp: profile.xp || 0,
          currentStreak: profile.current_streak || 0,
          longestStreak: profile.longest_streak || 0,
          completedStages: profile.completed_stages_list || [],
          unlockedStages: profile.subject_progress
            ? Object.values(profile.subject_progress as Record<string, { unlockedStages?: number[] }>).flatMap((s) => s.unlockedStages || [])
            : [1, 7, 13, 19],
          subjectProgress: profile.subject_progress || undefined,
          unlockedAchievements: profile.unlocked_achievements || [],
          totalQuizzesAttempted: profile.quizzes_attempted || 0,
          totalQuestionsAnswered: profile.questions_answered || 0,
          totalQuestionsCorrect: profile.questions_correct || 0,
        });
      } else {
        const fallbackName = meta.name || "Scholar";
        const fallbackAvatar = meta.avatar || "🧠";
        const fallbackGrade = (meta.grade as GradeType) || "grade_9";
        loadCloudProfile({
          id: user.id,
          name: fallbackName,
          avatar: fallbackAvatar,
          grade: fallbackGrade,
        });
        setProfile(fallbackName, fallbackAvatar, fallbackGrade, false);
      }
      setViewMode("app");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        syncUser(session.user);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setViewMode("landing");
        return;
      }
      if (session?.user) {
        syncUser(session.user);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [setProfile, loadCloudProfile]);

  // Ensure HTML has correct class on mount based on store
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [settings.theme]);

  // Filter stages by Grade and selected Subject (Merged from base + custom stages)
  const filteredStages = useMemo(() => {
    return allStages.filter((stage) => {
      const stageGrade = stage.grade || "grade_9";
      const matchesGrade = stageGrade === grade;
      return matchesGrade && stage.subject === selectedSubject;
    });
  }, [allStages, grade, selectedSubject]);

  // Classify by Subject -> Then Chapter (e.g. Chapter One) -> Then Stages
  const subjectGroups = useMemo(() => {
    const subStages = filteredStages;
    if (subStages.length === 0) return [];

    const subKey = selectedSubject as SubjectType;
    const currentSubjectObj = allSubjects.find((s) => s.id === subKey) || {
      id: subKey,
      name: subKey.replace("_", " "),
      icon: "📚",
      description: "Curriculum Track",
      color: "#38bdf8",
    };

    const chaptersMap = new Map<string, { stages: Stage[]; assignedNumber?: number }>();

    subStages.forEach((stage) => {
      const chap = stage.chapter || "Core Curriculum";
      if (!chaptersMap.has(chap)) {
        chaptersMap.set(chap, { stages: [], assignedNumber: stage.chapterNumber });
      }
      chaptersMap.get(chap)!.stages.push(stage);
      if (stage.chapterNumber !== undefined && chaptersMap.get(chap)!.assignedNumber === undefined) {
        chaptersMap.get(chap)!.assignedNumber = stage.chapterNumber;
      }
    });

    const chapters: ChapterGroup[] = Array.from(chaptersMap.entries()).map(([chapterName, info], defaultIdx) => {
      const chapterIndex = info.assignedNumber !== undefined && info.assignedNumber > 0 ? info.assignedNumber : defaultIdx + 1;
      return {
        chapterIndex,
        chapterWord: formatChapterWord(chapterIndex),
        chapterName,
        stages: info.stages,
      };
    });

    // Sort chapters according to numerical order chosen by admin
    chapters.sort((a, b) => a.chapterIndex - b.chapterIndex);

    return [{
      subject: subKey,
      subjectMeta: currentSubjectObj,
      chapters,
      totalStages: subStages.length,
    }];
  }, [filteredStages, selectedSubject, allSubjects]);

  const handleNextStage = () => {
    if (!selectedStage || !selectedStage.subject) return;
    const orderedStages = subjectGroups[0]?.chapters.flatMap((chap) => chap.stages) || [];

    const currentIdx = orderedStages.findIndex((s) => String(s.id) === String(selectedStage.id));
    let nextStage =
      currentIdx !== -1 && currentIdx + 1 < orderedStages.length
        ? orderedStages[currentIdx + 1]
        : undefined;

    if (!nextStage) {
      const fallbackStages = allStages
        .filter((s) => s.subject === selectedStage.subject && (s.grade || "grade_9") === (selectedStage.grade || grade))
        .sort((a, b) => (a.chapterNumber ?? 999) - (b.chapterNumber ?? 999) || (a.subjectStageNumber ?? 999) - (b.subjectStageNumber ?? 999));
      const fbIdx = fallbackStages.findIndex((s) => String(s.id) === String(selectedStage.id));
      if (fbIdx !== -1 && fbIdx + 1 < fallbackStages.length) {
        nextStage = fallbackStages[fbIdx + 1];
      }
    }

    if (nextStage) {
      sound.playClick();
      setSelectedStage(nextStage);
    } else {
      setSelectedStage(null);
    }
  };

  const openAuthModal = (mode: "signin" | "signup" = "signin") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* VIEW 1: LANDING PAGE */}
      {/* ======================================================== */}
      {viewMode === "landing" ? (
        <LandingPage
          onEnterApp={() => setViewMode("app")}
          onOpenAuth={openAuthModal}
        />
      ) : (
        /* ======================================================== */
        /* VIEW 2: STUDENT INTERACTIVE WORKSPACE */
        /* ======================================================== */
        <div className="min-h-screen overflow-x-clip educhain-bg vercel-grid text-slate-900 dark:text-[#F8FAFC] flex flex-col relative selection:bg-[#2563EB] selection:text-white dark:selection:bg-[#22D3EE] dark:selection:text-[#101827] transition-colors duration-300">
          
          {/* Top subtle glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 glow-orb-cyan pointer-events-none -z-10" />
          <div className="absolute top-72 right-10 w-80 h-80 glow-orb-blue pointer-events-none -z-10" />

          {/* Global Navbar */}
          <Navbar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onOpenProfile={() => setIsProfileOpen(true)}
            onOpenAuth={openAuthModal}
          />

          {/* Main Content Area */}
          <main className="flex-grow">
            
            {/* ======================================================== */}
            {/* TAB 1: CURRICULUM CHAIN MAP */}
            {/* ======================================================== */}
            {activeTab === "map" && (
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 animate-in fade-in duration-300">
                
                {/* 1. Quick Onboarding 3-Step Banner (Dismissible) */}
                <HowItWorksBanner />

                {/* 2. Sleek Next Quest Hero & Dynamic Subject Selectors */}
                <NextQuestHero
                  stages={allStages.filter((s) => (s.grade || "grade_9") === grade)}
                  selectedSubject={selectedSubject}
                  onSelectSubject={(sub) => setSelectedSubject(sub)}
                  onStartStage={(stage) => setSelectedStage(stage)}
                  onOpenProfile={() => setIsProfileOpen(true)}
                />

                {/* 3. Hierarchical Classification: Single Subject Header -> Chapter (e.g. Chapter One) -> Stages */}
                <div className="space-y-8 sm:space-y-12">
                  {subjectGroups.length > 0 ? (
                    subjectGroups.map((group) => (
                    <section key={group.subject} className="space-y-5 sm:space-y-6">
                      
                      {/* Single, Clean Subject Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 sm:pb-4 border-b border-slate-200/90 dark:border-[#263B5B]">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <SleekBadgeIcon name={group.subject} color={group.subjectMeta?.color || "#38bdf8"} size="lg" />
                          <div className="min-w-0 flex-1">
                            <h2 className="font-heading text-base sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                              {group.subjectMeta?.name || "Subject"}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                              {group.subjectMeta?.description || "Curriculum Track"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-mono font-bold px-2.5 sm:px-3 py-1 rounded-full border border-blue-500/20 dark:border-cyan-400/25 bg-blue-50/70 dark:bg-[#182438] text-[#2563EB] dark:text-[#22D3EE] shadow-2xs shrink-0 whitespace-nowrap">
                          {group.totalStages} Stages
                        </span>
                      </div>

                      {/* Chapters inside this Subject */}
                      <div className="space-y-6 sm:space-y-8 pl-0 sm:pl-2">
                        {group.chapters.map((chapter) => (
                          <div key={chapter.chapterName} className="space-y-3.5 sm:space-y-4">
                            
                            {/* Chapter Header: Like "Chapter One • Matrices and Determinants" */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-[#223149]">
                              <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                                <span className="px-2 sm:px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs shrink-0 whitespace-nowrap">
                                  Chapter {chapter.chapterWord}
                                </span>
                                <h3 className="font-heading text-sm sm:text-[15px] font-bold text-slate-900 dark:text-white min-w-0 break-words">
                                  {chapter.chapterName}
                                </h3>
                              </div>
                              <span className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 shrink-0 whitespace-nowrap">
                                {chapter.stages.length} {chapter.stages.length === 1 ? "Stage" : "Stages"}
                              </span>
                            </div>

                            {/* Stages Grid (No change to StageCard, all stages open) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {chapter.stages.map((stage) => {
                                const subProgress = (stage.subject ? subjectProgress[stage.subject] : null) || {
                                  unlockedStages: [],
                                  completedStages: [],
                                  bestScores: {},
                                };

                                const isUnlocked = true; // All chapters open to practice directly
                                const isCompleted = subProgress.completedStages.includes(stage.id) || completedStages.includes(stage.id);
                                const stageBestScore = subProgress.bestScores[stage.id] || bestScores[stage.id] || 0;

                                return (
                                  <StageCard
                                    key={stage.id}
                                    stage={stage}
                                    isUnlocked={isUnlocked}
                                    isCompleted={isCompleted}
                                    bestScore={stageBestScore}
                                    onSelect={(s) => setSelectedStage(s)}
                                  />
                                );
                              })}
                            </div>

                          </div>
                        ))}
                      </div>

                    </section>
                  ))
                ) : (
                  <div className="p-8 sm:p-12 rounded-3xl border border-dashed border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.01] text-center">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                      No curriculum stages found for this subject
                    </p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      Stages and questions for this track can be added via CSV or the MCQ builder in the Admin Panel.
                    </p>
                  </div>
                )}
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TAB 2: LEADERBOARD */}
            {/* ======================================================== */}
            {activeTab === "leaderboard" && <Leaderboard />}

            {/* ======================================================== */}
            {/* TAB 3: MY PROGRESS (Contains Performance Analytics & Review Errors) */}
            {/* ======================================================== */}
            {activeTab === "analytics" && <AnalyticsView />}

          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200/80 dark:border-[#223149] py-6 sm:py-8 bg-white/70 dark:bg-[#101827]/90 text-center text-xs text-slate-500 dark:text-[#94A3B8] font-mono transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span>EduChain • Easy Student Experience</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">Next.js 16 + Supabase</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white transition-all shadow-xs flex items-center gap-1.5 font-bold"
                >
                  <span>Admin Studio ⚙️</span>
                </Link>
                <button
                  onClick={() => setViewMode("landing")}
                  className="hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Return to Landing Page
                </button>
              </div>
            </div>
          </footer>

          {/* Active Quiz Modal */}
          {selectedStage && (
            <QuizModal
              key={selectedStage.id}
              stage={selectedStage}
              onClose={() => setSelectedStage(null)}
              onNextStage={handleNextStage}
              onOpenLeaderboard={() => {
                setSelectedStage(null);
                setActiveTab("leaderboard");
              }}
            />
          )}

          {/* Profile & Settings Modal (Includes Sign Out inside popup) */}
          {isProfileOpen && (
            <ProfileModal 
              onClose={() => setIsProfileOpen(false)}
              onSignOut={() => setViewMode("landing")}
              onOpenAuth={(mode) => openAuthModal(mode)}
            />
          )}

        </div>
      )}

      {/* Auth Modal (Available from both Landing and App views) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultMode={authMode}
        onSuccess={() => setViewMode("app")}
      />
    </>
  );
}
