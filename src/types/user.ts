import { GradeType, SubjectType } from "./curriculum";

export interface SubjectProgress {
  unlockedStages: (number | string)[];
  completedStages: (number | string)[];
  bestScores: Record<string | number, number>; // stageId -> score percentage
}

export interface UserState {
  id: string | null;
  name: string;
  avatar: string;
  grade: GradeType;
  isGuest?: boolean;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  completedStages: (number | string)[];
  unlockedStages: (number | string)[];
  bestScores: Record<string | number, number>;
  subjectProgress: Record<SubjectType, SubjectProgress>;
  totalQuizzesAttempted: number;
  totalQuestionsAnswered: number;
  totalQuestionsCorrect: number;
  totalQuestionsMissed: number;
  totalQuestionsTimedOut: number;
  unlockedAchievements: string[];
  settings: {
    soundEnabled: boolean;
    volume: number;
    theme: "dark" | "light";
  };
}

export interface ScholarRank {
  level: number;
  name: string;
  minXp: number;
  maxXp: number;
  stages: string;
  icon: string;
}

export interface LeaderboardScholar {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  rank: string;
  stages: number;
  streak: number;
  accuracy: number;
  quizzes: number;
  isCurrentUser?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
  xpReward: number;
}

export interface XpLevelRule {
  id: string;
  name: string;
  minXp: number;
  icon: string;
  color?: string;
  description?: string;
}

export interface StreakLevelRule {
  id: string;
  name: string;
  minDays: number;
  icon: string;
  color?: string;
  description?: string;
}
