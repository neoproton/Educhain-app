import { ScholarRank, Achievement, LeaderboardScholar, XpLevelRule, StreakLevelRule } from "@/types/user";
import { GradeType, SubjectType, StreamDomain, StreamDomainId, SchoolClass } from "@/types/curriculum";

export const DEFAULT_CLASSES: SchoolClass[] = [
  {
    id: "grade_9",
    name: "Class 9",
    description: "SSC Part I (Secondary School Certificate)",
    icon: "sparkles",
    displayOrder: 1,
  },
  {
    id: "grade_10",
    name: "Class 10",
    description: "SSC Part II (Matriculation)",
    icon: "zap",
    displayOrder: 2,
  },
  {
    id: "grade_11",
    name: "Class 11",
    description: "HSSC Part I (1st Year College)",
    icon: "shield",
    displayOrder: 3,
  },
  {
    id: "grade_12",
    name: "Class 12",
    description: "HSSC Part II (2nd Year College)",
    icon: "crown",
    displayOrder: 4,
  },
];

export const RANKS: ScholarRank[] = [
  { level: 1, name: "Novice", minXp: 0, maxXp: 499, stages: "1–6", icon: "🌱" },
  { level: 2, name: "Apprentice", minXp: 500, maxXp: 1299, stages: "7–12", icon: "⚡" },
  { level: 3, name: "Adept", minXp: 1300, maxXp: 2499, stages: "13–18", icon: "🛡️" },
  { level: 4, name: "Expert", minXp: 2500, maxXp: 3999, stages: "19–24", icon: "💎" },
  { level: 5, name: "Master", minXp: 4000, maxXp: Infinity, stages: "25+", icon: "👑" },
];

export const DEFAULT_XP_LEVELS: XpLevelRule[] = [
  { id: "xp_novice", name: "Novice", minXp: 0, icon: "🌱", color: "#34d399", description: "Beginning your academic chain" },
  { id: "xp_apprentice", name: "Apprentice", minXp: 500, icon: "⚡", color: "#38bdf8", description: "Building steady mastery across subjects" },
  { id: "xp_adept", name: "Intermediate", minXp: 1300, icon: "🛡️", color: "#818cf8", description: "Consistent scholar tackling harder concepts" },
  { id: "xp_expert", name: "Expert", minXp: 2500, icon: "💎", color: "#a78bfa", description: "High-accuracy problem solver" },
  { id: "xp_master", name: "Master", minXp: 4000, icon: "👑", color: "#fbbf24", description: "Top-tier academic achiever" },
];

export const DEFAULT_STREAK_LEVELS: StreakLevelRule[] = [
  { id: "streak_starter", name: "Starter", minDays: 1, icon: "🔥", color: "#fb923c", description: "First daily quest active" },
  { id: "streak_dedicated", name: "Dedicated", minDays: 3, icon: "✨", color: "#f59e0b", description: "Three-day study momentum" },
  { id: "streak_intermediate", name: "Intermediate", minDays: 10, icon: "⚡", color: "#38bdf8", description: "Ten consecutive days of practice" },
  { id: "streak_master", name: "Master", minDays: 30, icon: "👑", color: "#a78bfa", description: "Unbroken 30-day dedication" },
];

export const GRADE_LABELS: Record<GradeType, string> = {
  grade_9: "Grade 9 / Class 9 (SSC Part I)",
  grade_10: "Grade 10 / Matric (SSC Part II)",
  grade_11: "Grade 11 / 1st Year (HSSC Part I)",
  grade_12: "Grade 12 / 2nd Year (HSSC Part II)",
};

export const GRADE_SHORT_LABELS: Record<GradeType, string> = {
  grade_9: "Grade 9",
  grade_10: "Grade 10",
  grade_11: "Grade 11",
  grade_12: "Grade 12",
};

export const SUBJECT_TO_STREAM: Record<SubjectType, StreamDomainId> = {
  science: "stem_science",
  computer_science: "stem_science",
  mathematics: "mathematics_stream",
  english: "humanities_languages",
};

export const STREAM_DOMAINS: StreamDomain[] = [
  {
    id: "stem_science",
    name: "Science & Technology",
    shortName: "Science & CS",
    icon: "🔬",
    description: "Computing architecture, algorithmic logic, physics, chemistry & cell biology",
    color: "#34d399",
    borderColor: "rgba(52, 211, 153, 0.3)",
    badgeBg: "rgba(52, 211, 153, 0.1)",
    subCategories: [
      {
        subjectId: "computer_science",
        name: "Computer Science",
        shortName: "Computer Science",
        icon: "💻",
        description: "Hardware Architecture, Binary Logic, Algorithms & Programming in C",
        primaryTopics: [
          "Hardware & Architecture",
          "Binary Logic & Digital Gates",
          "Algorithms & Flowcharts",
          "Programming & Data Structures"
        ],
      },
      {
        subjectId: "science",
        name: "Natural Sciences",
        shortName: "Physics & Chemistry",
        icon: "🧬",
        description: "Kinematics, Atomic Structure, Chemical Bonding & Cell Biology",
        primaryTopics: [
          "Mechanics & Kinematics",
          "Atomic Structure & Periodic Table",
          "Cell Biology & Biomolecules",
          "Physical Quantities & Measurement"
        ],
      },
    ],
  },
  {
    id: "mathematics_stream",
    name: "Mathematics & Analytics",
    shortName: "Mathematics",
    icon: "📐",
    description: "Linear algebra, matrix operations, logarithms, radicals & geometry",
    color: "#38bdf8",
    borderColor: "rgba(56, 189, 248, 0.3)",
    badgeBg: "rgba(56, 189, 248, 0.1)",
    subCategories: [
      {
        subjectId: "mathematics",
        name: "Core Mathematics",
        shortName: "Core Math",
        icon: "📐",
        description: "Matrices & Determinants, Real Numbers, Algebraic Expressions & Linear Equations",
        primaryTopics: [
          "Matrices and Determinants",
          "Real and Complex Numbers",
          "Logarithms & Scientific Notation",
          "Algebraic Formulas & Geometry"
        ],
      },
    ],
  },
  {
    id: "humanities_languages",
    name: "Languages & Humanities",
    shortName: "Languages",
    icon: "📖",
    description: "Grammar systems, voice & narration, vocabulary synthesis & literary rhetoric",
    color: "#a78bfa",
    borderColor: "rgba(167, 139, 250, 0.3)",
    badgeBg: "rgba(167, 139, 250, 0.1)",
    subCategories: [
      {
        subjectId: "english",
        name: "English Language & Rhetoric",
        shortName: "English",
        icon: "📖",
        description: "Parts of Speech, Active/Passive Voice, Direct/Indirect Narration & Comprehension",
        primaryTopics: [
          "Parts of Speech & Sentence Forms",
          "Active & Passive Voice Transformation",
          "Direct & Indirect Narration",
          "Vocabulary & Literary Devices"
        ],
      },
    ],
  },
];

export const SUBJECT_METADATA: Record<SubjectType, {
  name: string;
  color: string;
  icon: string;
  borderColor: string;
  badgeBg: string;
  description: string;
}> = {
  mathematics: {
    name: "Mathematics",
    color: "#38bdf8",
    icon: "📐",
    borderColor: "rgba(56, 189, 248, 0.3)",
    badgeBg: "rgba(56, 189, 248, 0.1)",
    description: "Arithmetic, Matrices, Real Numbers, Algebra & Geometry",
  },
  science: {
    name: "Natural Sciences",
    color: "#34d399",
    icon: "🔬",
    borderColor: "rgba(52, 211, 153, 0.3)",
    badgeBg: "rgba(52, 211, 153, 0.1)",
    description: "Physics, Chemistry, Atomic Structure & Cell Biology",
  },
  english: {
    name: "English",
    color: "#a78bfa",
    icon: "📖",
    borderColor: "rgba(167, 139, 250, 0.3)",
    badgeBg: "rgba(167, 139, 250, 0.1)",
    description: "Grammar, Tenses, Voice, Narration & Literary Rhetoric",
  },
  computer_science: {
    name: "Computer Science",
    color: "#fbbf24",
    icon: "💻",
    borderColor: "rgba(251, 191, 36, 0.3)",
    badgeBg: "rgba(251, 191, 36, 0.1)",
    description: "Hardware Architecture, Binary Logic, Algorithms & Programming",
  },
};

export const DEFAULT_SUBJECT_FALLBACK = {
  name: "Curriculum Track",
  color: "#38bdf8",
  icon: "📚",
  borderColor: "rgba(56, 189, 248, 0.3)",
  badgeBg: "rgba(56, 189, 248, 0.1)",
  description: "Curriculum Module",
};

export function getSubjectMeta(subjectId?: string): {
  name: string;
  color: string;
  icon: string;
  borderColor: string;
  badgeBg: string;
  description: string;
} {
  if (!subjectId) return DEFAULT_SUBJECT_FALLBACK;
  const direct = SUBJECT_METADATA[subjectId as SubjectType];
  if (direct) return direct;
  return {
    name: subjectId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "#38bdf8",
    icon: "📚",
    borderColor: "rgba(56, 189, 248, 0.3)",
    badgeBg: "rgba(56, 189, 248, 0.1)",
    description: "Curriculum Track",
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_link", title: "First Link", desc: "Complete your first quiz stage with 70%+ score.", icon: "⛓️", xpReward: 50 },
  { id: "quick_thinker", title: "Quick Thinker", desc: "Answer a question correctly with 15+ seconds remaining.", icon: "⚡", xpReward: 50 },
  { id: "perfect_round", title: "Perfect Round", desc: "Score 100% (5/5 correct) on any stage.", icon: "🌟", xpReward: 100 },
  { id: "math_explorer", title: "Math Pioneer", desc: "Conquer at least 2 stages in the Mathematics chain.", icon: "📐", xpReward: 75 },
  { id: "science_voyager", title: "Science Voyager", desc: "Conquer at least 2 stages in the Science chain.", icon: "🔬", xpReward: 75 },
  { id: "english_scholar", title: "Linguistic Ace", desc: "Conquer at least 2 stages in the English chain.", icon: "📖", xpReward: 75 },
  { id: "cs_architect", title: "Byte Architect", desc: "Conquer at least 2 stages in the Computer Science chain.", icon: "💻", xpReward: 75 },
  { id: "polymath", title: "Universal Polymath", desc: "Complete at least one stage across all 4 independent subjects.", icon: "🧭", xpReward: 150 },
  { id: "streak_starter", title: "Streak Starter", desc: "Maintain a daily learning streak of 3 consecutive days.", icon: "🔥", xpReward: 75 },
  { id: "streak_titan", title: "Streak Titan", desc: "Maintain a daily learning streak of 7 consecutive days.", icon: "🌋", xpReward: 150 },
  { id: "mistake_forger", title: "Master Forger", desc: "Master 5 missed questions in the Mistake Forge.", icon: "🔨", xpReward: 100 },
];

export const BENCHMARK_PLAYERS: LeaderboardScholar[] = [
  { id: "bm_1", name: "Priya Sharma", avatar: "🦉", xp: 4850, rank: "Master", stages: 24, streak: 21, quizzes: 28, accuracy: 96 },
  { id: "bm_2", name: "Arjun Kumar", avatar: "⚡", xp: 3450, rank: "Expert", stages: 18, streak: 14, quizzes: 22, accuracy: 91 },
  { id: "bm_3", name: "Sophia Chen", avatar: "🚀", xp: 2980, rank: "Expert", stages: 16, streak: 12, quizzes: 18, accuracy: 94 },
  { id: "bm_4", name: "Elena Rostova", avatar: "🧬", xp: 2180, rank: "Adept", stages: 12, streak: 9, quizzes: 15, accuracy: 87 },
  { id: "bm_5", name: "Marcus Vance", avatar: "🧙‍♂️", xp: 1920, rank: "Adept", stages: 10, streak: 7, quizzes: 12, accuracy: 83 },
  { id: "bm_6", name: "Maya Lin", avatar: "🎨", xp: 1240, rank: "Apprentice", stages: 7, streak: 5, quizzes: 9, accuracy: 80 },
  { id: "bm_7", name: "Jordan Hayes", avatar: "🤖", xp: 420, rank: "Novice", stages: 3, streak: 3, quizzes: 4, accuracy: 75 },
];
