"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { GradeType, SubjectType, MistakeRecord, QuizAttemptRecord } from "@/types/curriculum";
import { supabase } from "@/lib/supabase/client";
import { UserState } from "@/types/user";
import { ACHIEVEMENTS } from "@/data/constants";
import { getXpProgress, getStreakProgress } from "@/lib/progression";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";

interface EduStoreState extends UserState {
  mistakes: MistakeRecord[];
  quizHistory: QuizAttemptRecord[];
  celebratedLeaderboards: string[];
  
  // Actions
  setProfile: (name: string, avatar: string, grade: GradeType, isGuest?: boolean) => void;
  setGrade: (grade: GradeType) => void;
  loadCloudProfile: (cloudData: Partial<UserState>) => void;
  setGuestSession: () => void;
  signOut: () => void;
  updateSettings: (settings: Partial<UserState["settings"]>) => void;
  addXp: (amount: number) => void;
  markLeaderboardCelebrated: (category: string) => void;
  clearLeaderboardCelebrated: (category: string) => void;
  recordQuizAttempt: (attempt: {
    stageId: number | string;
    subject: SubjectType;
    score: number;
    total: number;
    accuracy: number;
    xpEarned: number;
    fastAnswersCount?: number;
    missedQuestions: Array<{
      id: string;
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;
  }) => void;
  masterMistake: (mistakeId: string) => void;
  checkStreak: () => void;
  toggleTheme: () => void;
  resetProgress: () => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
}

const DEFAULT_STATE: UserState = {
  id: null,
  name: "Guest Scholar",
  avatar: "👤",
  grade: "grade_9",
  isGuest: true,
  xp: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: null,
  completedStages: [],
  unlockedStages: [1, 7, 13, 19], // Initial stage unlocked for each subject
  bestScores: {},
  subjectProgress: {
    mathematics: { unlockedStages: [1], completedStages: [], bestScores: {} },
    science: { unlockedStages: [7], completedStages: [], bestScores: {} },
    english: { unlockedStages: [13], completedStages: [], bestScores: {} },
    computer_science: { unlockedStages: [19], completedStages: [], bestScores: {} },
  },
  totalQuizzesAttempted: 0,
  totalQuestionsAnswered: 0,
  totalQuestionsCorrect: 0,
  totalQuestionsMissed: 0,
  totalQuestionsTimedOut: 0,
  unlockedAchievements: [],
  settings: {
    soundEnabled: true,
    volume: 0.7,
    theme: "light",
  },
};

function syncEduProfileToCloud(get: () => EduStoreState) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      const current = get();
      const accuracy =
        current.totalQuestionsAnswered > 0
          ? Math.round((current.totalQuestionsCorrect / current.totalQuestionsAnswered) * 100)
          : 0;
      supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          player_name: current.name,
          player_avatar: current.avatar,
          player_grade: current.grade,
          xp: current.xp,
          stages_completed: current.completedStages.length,
          current_streak: current.currentStreak,
          longest_streak: current.longestStreak,
          accuracy,
          quizzes_attempted: current.totalQuizzesAttempted,
          questions_answered: current.totalQuestionsAnswered,
          questions_correct: current.totalQuestionsCorrect,
          subject_progress: current.subjectProgress,
          completed_stages_list: current.completedStages.filter((id) => typeof id === "number"),
          unlocked_achievements: current.unlockedAchievements,
        })
        .then(() => {});
    }
  });
}

export const useEduStore = create<EduStoreState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      mistakes: [],
      quizHistory: [],
      celebratedLeaderboards: [],

      markLeaderboardCelebrated: (category) => {
        set((state) => ({
          celebratedLeaderboards: state.celebratedLeaderboards.includes(category)
            ? state.celebratedLeaderboards
            : [...state.celebratedLeaderboards, category],
        }));
      },

      clearLeaderboardCelebrated: (category) => {
        set((state) => ({
          celebratedLeaderboards: state.celebratedLeaderboards.filter((c) => c !== category),
        }));
      },

      setProfile: (name, avatar, grade, isGuest = false) => {
        set({ name, avatar, grade, isGuest });
        const id = get().id;
        if (id) {
          supabase
            .from("profiles")
            .update({ 
              player_name: name, 
              player_avatar: avatar, 
              player_grade: grade 
            })
            .eq("id", id)
            .then();
        }
      },

      setGrade: (grade) => {
        set({ grade });
        const id = get().id;
        if (id) {
          supabase.from("profiles").update({ player_grade: grade }).eq("id", id).then();
        }
      },

      loadCloudProfile: (cloudData) => {
        set((state) => ({
          ...state,
          ...cloudData,
          subjectProgress: {
            ...DEFAULT_STATE.subjectProgress,
            ...(cloudData.subjectProgress || {}),
          },
          settings: state.settings,
          isGuest: false,
        }));
      },

      setGuestSession: () => {
        const preservedSettings = get().settings;
        set({
          ...DEFAULT_STATE,
          name: "Guest Explorer",
          avatar: "🧭",
          isGuest: true,
          mistakes: [],
          quizHistory: [],
          celebratedLeaderboards: [],
          settings: preservedSettings,
        });
      },

      signOut: () => {
        const preservedSettings = get().settings;
        set({
          ...DEFAULT_STATE,
          name: "Guest Explorer",
          avatar: "👤",
          isGuest: true,
          mistakes: [],
          quizHistory: [],
          celebratedLeaderboards: [],
          settings: preservedSettings,
        });
      },

      toggleTheme: () => {
        set((state) => {
          const nextTheme = state.settings.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            if (nextTheme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
          return {
            settings: { ...state.settings, theme: nextTheme },
          };
        });
      },

      updateSettings: (newSettings) => {
        set((state) => {
          const updated = { ...state.settings, ...newSettings };
          sound.syncSettings(updated.soundEnabled, updated.volume);
          if (typeof document !== "undefined" && updated.theme) {
            if (updated.theme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
          return { settings: updated };
        });
      },

      addXp: (amount) => {
        set((state) => {
          const oldXp = state.xp;
          const newXp = Math.max(0, oldXp + amount);

          // Check for Rank Level Up against dynamic XP rules
          const xpLevels = useCurriculumStore.getState().getXpLevels();
          const oldRank = getXpProgress(oldXp, xpLevels);
          const newRank = getXpProgress(newXp, xpLevels);
          if (newRank.levelNumber > oldRank.levelNumber) {
            sound.playUnlock();
          }

          return { xp: newXp };
        });
        syncEduProfileToCloud(get);
      },

      recordQuizAttempt: (attempt) => {
        const state = get();
        const { stageId, subject, score, total, accuracy, xpEarned, fastAnswersCount = 0, missedQuestions } = attempt;

        const dateStr = new Date().toISOString();
        const passed = accuracy >= 70;

        // Clone subject progress
        const currentSubProgress = state.subjectProgress[subject] || {
          unlockedStages: [stageId],
          completedStages: [],
          bestScores: {},
        };

        const updatedCompleted = passed && !currentSubProgress.completedStages.includes(stageId)
          ? [...currentSubProgress.completedStages, stageId]
          : currentSubProgress.completedStages;

        // Auto unlock next stage in sequence
        const nextStageId = typeof stageId === "number" ? stageId + 1 : stageId;
        const updatedUnlocked = passed && !currentSubProgress.unlockedStages.includes(nextStageId)
          ? [...currentSubProgress.unlockedStages, nextStageId]
          : currentSubProgress.unlockedStages;

        const updatedBestScores = {
          ...currentSubProgress.bestScores,
          [stageId]: Math.max(currentSubProgress.bestScores[stageId] || 0, accuracy),
        };

        // Global unions
        const globalCompleted = passed && !state.completedStages.includes(stageId)
          ? [...state.completedStages, stageId]
          : state.completedStages;

        const globalUnlocked = passed && !state.unlockedStages.includes(nextStageId)
          ? [...state.unlockedStages, nextStageId]
          : state.unlockedStages;

        // Update mistakes pool immutably
        const updatedMistakes = [...state.mistakes];
        missedQuestions.forEach((q) => {
          const existingIdx = updatedMistakes.findIndex((m) => m.questionId === q.id);
          if (existingIdx >= 0) {
            updatedMistakes[existingIdx] = {
              ...updatedMistakes[existingIdx],
              timesMissed: updatedMistakes[existingIdx].timesMissed + 1,
              mastered: false,
              missedAt: dateStr,
            };
          } else {
            updatedMistakes.push({
              id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              questionId: q.id,
              subject,
              stageId,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
              missedAt: dateStr,
              mastered: false,
              timesMissed: 1,
            });
          }
        });

        // Achievements check (accumulate bonus XP so state.xp update preserves all rewards)
        const newAchievements = [...state.unlockedAchievements];
        let bonusAchievementXp = 0;
        const checkUnlock = (id: string) => {
          if (!newAchievements.includes(id)) {
            newAchievements.push(id);
            sound.playAchievement();
            const ach = ACHIEVEMENTS.find((a) => a.id === id);
            if (ach) {
              bonusAchievementXp += ach.xpReward;
            }
          }
        };

        if (passed) checkUnlock("first_link");
        if (fastAnswersCount >= 1) checkUnlock("quick_thinker");
        if (accuracy === 100) checkUnlock("perfect_round");
        if (subject === "mathematics" && updatedCompleted.length >= 2) checkUnlock("math_explorer");
        if (subject === "science" && updatedCompleted.length >= 2) checkUnlock("science_voyager");
        if (subject === "english" && updatedCompleted.length >= 2) checkUnlock("english_scholar");
        if (subject === "computer_science" && updatedCompleted.length >= 2) checkUnlock("cs_architect");

        const allSubjectsHaveCompletion =
          (subject === "mathematics" ? updatedCompleted.length : state.subjectProgress.mathematics?.completedStages?.length || 0) >= 1 &&
          (subject === "science" ? updatedCompleted.length : state.subjectProgress.science?.completedStages?.length || 0) >= 1 &&
          (subject === "english" ? updatedCompleted.length : state.subjectProgress.english?.completedStages?.length || 0) >= 1 &&
          (subject === "computer_science" ? updatedCompleted.length : state.subjectProgress.computer_science?.completedStages?.length || 0) >= 1;

        if (allSubjectsHaveCompletion) checkUnlock("polymath");

        const oldXp = state.xp;
        const totalXpGain = xpEarned + bonusAchievementXp;
        const newXp = oldXp + totalXpGain;
        const xpLevels = useCurriculumStore.getState().getXpLevels();
        const oldRank = getXpProgress(oldXp, xpLevels);
        const newRank = getXpProgress(newXp, xpLevels);
        if (newRank.levelNumber > oldRank.levelNumber) {
          sound.playUnlock();
        }

        set({
          xp: newXp,
          completedStages: globalCompleted,
          unlockedStages: globalUnlocked,
          bestScores: { ...state.bestScores, [stageId]: Math.max(state.bestScores[stageId] || 0, accuracy) },
          subjectProgress: {
            ...state.subjectProgress,
            [subject]: {
              unlockedStages: updatedUnlocked,
              completedStages: updatedCompleted,
              bestScores: updatedBestScores,
            },
          },
          totalQuizzesAttempted: state.totalQuizzesAttempted + 1,
          totalQuestionsAnswered: state.totalQuestionsAnswered + total,
          totalQuestionsCorrect: state.totalQuestionsCorrect + score,
          totalQuestionsMissed: state.totalQuestionsMissed + (total - score),
          mistakes: updatedMistakes,
          quizHistory: [
            ...state.quizHistory,
            { stageId, subject, score, total, accuracy, xpEarned: totalXpGain, completedAt: dateStr },
          ],
          unlockedAchievements: newAchievements,
        });

        get().checkStreak();

        // Automatically sync progress to Supabase for authenticated users
        syncEduProfileToCloud(get);
      },

      masterMistake: (mistakeId) => {
        let unlockedForger = false;
        set((state) => {
          const updated = state.mistakes.map((m) =>
            m.id === mistakeId ? { ...m, mastered: true } : m
          );
          const masteredCount = updated.filter((m) => m.mastered).length;
          if (masteredCount >= 5 && !state.unlockedAchievements.includes("mistake_forger")) {
            unlockedForger = true;
            sound.playAchievement();
            return {
              mistakes: updated,
              xp: state.xp + 100,
              unlockedAchievements: [...state.unlockedAchievements, "mistake_forger"],
            };
          }
          return { mistakes: updated };
        });
        if (unlockedForger) {
          syncEduProfileToCloud(get);
        }
      },

      checkStreak: () => {
        const today = new Date().toLocaleDateString("en-CA"); // Local YYYY-MM-DD
        const state = get();
        if (!state.lastActiveDate) {
          set({ lastActiveDate: today, currentStreak: 1, longestStreak: Math.max(1, state.longestStreak) });
          return;
        }

        if (state.lastActiveDate === today) return;

        const parseDayUtc = (isoDay: string) => {
          const parts = isoDay.split("-").map(Number);
          if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
          return Date.UTC(parts[0], parts[1] - 1, parts[2]);
        };

        const lastMs = parseDayUtc(state.lastActiveDate);
        const currMs = parseDayUtc(today);
        const diffDays = lastMs !== null && currMs !== null ? Math.round((currMs - lastMs) / 86400000) : 1;

        if (diffDays === 1) {
          const nextStreak = state.currentStreak + 1;
          const nextLongest = Math.max(nextStreak, state.longestStreak);
          const nextAchievements = [...state.unlockedAchievements];
          let bonusXp = 0;

          if (nextStreak >= 3 && !nextAchievements.includes("streak_starter")) {
            nextAchievements.push("streak_starter");
            bonusXp += 75;
            sound.playAchievement();
          }
          if (nextStreak >= 7 && !nextAchievements.includes("streak_titan")) {
            nextAchievements.push("streak_titan");
            bonusXp += 150;
            sound.playAchievement();
          }

          const streakLevels = useCurriculumStore.getState().getStreakLevels();
          const oldStreakTier = getStreakProgress(state.currentStreak, streakLevels);
          const newStreakTier = getStreakProgress(nextStreak, streakLevels);
          if (newStreakTier.levelNumber > oldStreakTier.levelNumber) {
            sound.playUnlock();
          }

          set({
            currentStreak: nextStreak,
            longestStreak: nextLongest,
            lastActiveDate: today,
            xp: state.xp + bonusXp,
            unlockedAchievements: nextAchievements,
          });
          syncEduProfileToCloud(get);
        } else if (diffDays > 1) {
          set({ currentStreak: 1, lastActiveDate: today });
          syncEduProfileToCloud(get);
        }
      },

      resetProgress: () => {
        const currentSettings = get().settings;
        set({
          ...DEFAULT_STATE,
          mistakes: [],
          quizHistory: [],
          celebratedLeaderboards: [],
          settings: currentSettings,
        });
        sound.syncSettings(currentSettings.soundEnabled, currentSettings.volume);
      },

      exportData: () => {
        const state = get();
        return JSON.stringify(state, null, 2);
      },

      importData: (jsonData) => {
        try {
          const parsed = JSON.parse(jsonData);
          if (parsed && typeof parsed.xp === "number" && parsed.subjectProgress) {
            const restoredSettings = parsed.settings ?? get().settings;
            set({
              ...DEFAULT_STATE,
              ...parsed,
              celebratedLeaderboards: Array.isArray(parsed.celebratedLeaderboards)
                ? parsed.celebratedLeaderboards
                : [],
              settings: restoredSettings,
            });
            sound.syncSettings(restoredSettings.soundEnabled, restoredSettings.volume);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },
    }),
    {
      name: "educhain_v2_store",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.settings) {
          sound.syncSettings(state.settings.soundEnabled, state.settings.volume);
        }
      },
    }
  )
);
