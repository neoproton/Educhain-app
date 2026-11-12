"use client";

import React from "react";
import {
  Terminal,
  Cpu,
  Atom,
  FlaskConical,
  Calculator,
  Languages,
  BookOpen,
  GraduationCap,
  Sparkles,
  Zap,
  Shield,
  Crown,
  Award,
  Trophy,
  Flame,
  Globe,
  Dna,
  Compass,
  Boxes,
  Code2,
  BookMarked,
  LucideIcon,
  Target,
  Brain,
  Rocket
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // Subjects
  computer_science: Terminal,
  cs: Terminal,
  coding: Code2,
  cpu: Cpu,
  binary: Terminal,
  "💻": Terminal,
  "🖥️": Terminal,

  science: Atom,
  physics: Compass,
  chemistry: FlaskConical,
  biology: Dna,
  "🧬": Dna,
  "🔬": FlaskConical,
  "⚗️": FlaskConical,

  mathematics: Calculator,
  math: Calculator,
  maths: Calculator,
  algebra: Calculator,
  geometry: Compass,
  "📐": Calculator,
  "📊": Calculator,
  "🔢": Calculator,

  english: Languages,
  urdu: Languages,
  language: Languages,
  languages: Languages,
  literature: BookOpen,
  "📖": BookOpen,
  "📚": BookOpen,
  "✍️": BookOpen,

  pak_studies: Globe,
  history: Globe,
  geography: Globe,
  "🌍": Globe,

  islamiat: BookMarked,
  islamic_studies: BookMarked,
  ethics: BookMarked,

  // Classes & Standards
  grade_9: Sparkles,
  class_9: Sparkles,
  "🌱": Sparkles,

  grade_10: Zap,
  class_10: Zap,
  "⚡": Zap,

  grade_11: Shield,
  class_11: Shield,
  "🛡️": Shield,

  grade_12: Crown,
  class_12: Crown,
  "👑": Crown,

  class_8: GraduationCap,
  class_7: GraduationCap,
  class_6: GraduationCap,
  "🎒": GraduationCap,
  "🎓": GraduationCap,

  // Ranks & Achievements
  novice: Sparkles,
  apprentice: Zap,
  adept: Shield,
  expert: Award,
  master: Crown,
  "💎": Award,
  "🔥": Flame,
  "💯": Trophy,
  "🎯": Target,

  // Direct Icon & Keyword Aliases
  sparkles: Sparkles,
  "✨": Sparkles,
  zap: Zap,
  shield: Shield,
  crown: Crown,
  terminal: Terminal,
  atom: Atom,
  "⚛️": Atom,
  calculator: Calculator,
  compass: Compass,
  award: Award,
  brain: Brain,
  rocket: Rocket,
  flame: Flame,
  target: Target,
  trophy: Trophy,
  book_open: BookOpen,
  graduation_cap: GraduationCap,
  graduationcap: GraduationCap,
  flask_conical: FlaskConical,
  code: Code2,
  boxes: Boxes,
};

/**
 * Maps icon names to clean unicode glyphs/emojis for native select options
 */
export function getIconGlyph(name?: string): string {
  if (!name) return "📚";
  if (/\p{Extended_Pictographic}/u.test(name)) return name;
  const key = name.toLowerCase().trim();
  const map: Record<string, string> = {
    sparkles: "✨",
    grade_9: "✨",
    class_9: "✨",
    zap: "⚡",
    grade_10: "⚡",
    class_10: "⚡",
    shield: "🛡️",
    grade_11: "🛡️",
    class_11: "🛡️",
    crown: "👑",
    grade_12: "👑",
    class_12: "👑",
    graduation_cap: "🎓",
    graduationcap: "🎓",
    class_8: "🎓",
    class_7: "🎓",
    class_6: "🎓",
    atom: "⚛️",
    science: "⚛️",
    terminal: "💻",
    computer_science: "💻",
    cs: "💻",
    calculator: "📐",
    mathematics: "📐",
    languages: "📖",
    english: "📖",
    book_open: "📚",
    pak_studies: "🌍",
    islamiat: "🕌",
  };
  return map[key] || "📚";
}

interface SleekIconProps {
  name?: string;
  fallback?: LucideIcon;
  className?: string;
  size?: number;
  color?: string;
}

export const SleekIcon: React.FC<SleekIconProps> = ({
  name = "",
  fallback = Boxes,
  className = "w-4 h-4",
  size,
  color,
}) => {
  const cleanKey = name.toLowerCase().trim();
  const IconComponent = ICON_MAP[cleanKey] || fallback;

  return <IconComponent className={className} size={size} color={color} strokeWidth={1.8} />;
};

/**
 * Renders an icon inside a refined micro-badge container
 */
export const SleekBadgeIcon: React.FC<{
  name?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}> = ({ name = "", color, size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-6 h-6 rounded-lg text-xs",
    md: "w-8 h-8 rounded-xl text-sm",
    lg: "w-10 h-10 rounded-2xl text-base",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  return (
    <div
      className={`shrink-0 flex items-center justify-center border transition-all ${sizeClasses} ${className}`}
      style={{
        backgroundColor: color ? `${color}14` : "rgba(0, 0, 0, 0.04)",
        borderColor: color ? `${color}33` : "rgba(0, 0, 0, 0.08)",
        color: color || "currentColor",
      }}
    >
      <SleekIcon name={name} className={iconSizes} />
    </div>
  );
};

export interface ScholarInsigniaDef {
  id: string;
  label: string;
  icon: LucideIcon;
  gradient: string;
  border: string;
  text: string;
}

export const SCHOLAR_INSIGNIAS: ScholarInsigniaDef[] = [
  {
    id: "brain",
    label: "Mastermind",
    icon: Brain,
    gradient: "from-fuchsia-500/20 via-pink-500/15 to-rose-500/20 dark:from-fuchsia-500/25 dark:to-rose-500/20",
    border: "border-fuchsia-400/45 dark:border-fuchsia-400/35",
    text: "text-fuchsia-600 dark:text-fuchsia-300",
  },
  {
    id: "sparkles",
    label: "Luminous",
    icon: Sparkles,
    gradient: "from-cyan-500/20 via-sky-500/15 to-blue-500/20 dark:from-cyan-500/25 dark:to-blue-500/20",
    border: "border-cyan-400/45 dark:border-cyan-400/35",
    text: "text-cyan-600 dark:text-cyan-300",
  },
  {
    id: "zap",
    label: "Energy",
    icon: Zap,
    gradient: "from-amber-400/25 via-yellow-400/15 to-orange-500/20 dark:from-amber-400/25 dark:to-orange-500/20",
    border: "border-amber-400/50 dark:border-amber-400/40",
    text: "text-amber-600 dark:text-amber-300",
  },
  {
    id: "flame",
    label: "Blazer",
    icon: Flame,
    gradient: "from-orange-500/25 via-rose-500/15 to-red-500/20 dark:from-orange-500/25 dark:to-rose-500/20",
    border: "border-orange-400/50 dark:border-orange-400/40",
    text: "text-orange-600 dark:text-orange-300",
  },
  {
    id: "shield",
    label: "Guardian",
    icon: Shield,
    gradient: "from-indigo-500/20 via-blue-500/15 to-sky-500/20 dark:from-indigo-500/25 dark:to-blue-500/20",
    border: "border-indigo-400/45 dark:border-indigo-400/35",
    text: "text-indigo-600 dark:text-indigo-300",
  },
  {
    id: "crown",
    label: "Monarch",
    icon: Crown,
    gradient: "from-yellow-400/30 via-amber-400/20 to-orange-500/25 dark:from-yellow-400/25 dark:to-amber-500/25",
    border: "border-amber-400/60 dark:border-amber-400/45",
    text: "text-amber-600 dark:text-amber-300",
  },
  {
    id: "terminal",
    label: "Coder",
    icon: Terminal,
    gradient: "from-emerald-500/20 via-teal-500/15 to-green-500/20 dark:from-emerald-500/25 dark:to-teal-500/20",
    border: "border-emerald-400/45 dark:border-emerald-400/35",
    text: "text-emerald-600 dark:text-emerald-300",
  },
  {
    id: "atom",
    label: "Scientist",
    icon: Atom,
    gradient: "from-teal-500/20 via-cyan-500/15 to-emerald-500/20 dark:from-teal-500/25 dark:to-cyan-500/20",
    border: "border-teal-400/45 dark:border-teal-400/35",
    text: "text-teal-600 dark:text-teal-300",
  },
  {
    id: "compass",
    label: "Explorer",
    icon: Compass,
    gradient: "from-sky-500/20 via-blue-500/15 to-indigo-500/20 dark:from-sky-500/25 dark:to-indigo-500/20",
    border: "border-sky-400/45 dark:border-sky-400/35",
    text: "text-sky-600 dark:text-sky-300",
  },
  {
    id: "rocket",
    label: "Trailblazer",
    icon: Rocket,
    gradient: "from-violet-500/20 via-purple-500/15 to-pink-500/20 dark:from-violet-500/25 dark:to-pink-500/20",
    border: "border-violet-400/45 dark:border-violet-400/35",
    text: "text-violet-600 dark:text-violet-300",
  },
  {
    id: "languages",
    label: "Linguist",
    icon: Languages,
    gradient: "from-violet-500/20 via-indigo-500/15 to-purple-500/20 dark:from-violet-500/25 dark:to-purple-500/20",
    border: "border-violet-400/45 dark:border-violet-400/35",
    text: "text-violet-600 dark:text-violet-300",
  },
  {
    id: "award",
    label: "Scholar",
    icon: Award,
    gradient: "from-blue-600/20 via-blue-500/15 to-cyan-500/20 dark:from-blue-500/25 dark:to-cyan-500/20",
    border: "border-blue-400/45 dark:border-blue-400/35",
    text: "text-blue-600 dark:text-cyan-300",
  },
];

const EXTRA_INSIGNIA_THEMES: Record<string, ScholarInsigniaDef> = {
  calculator: {
    id: "calculator",
    label: "Analyst",
    icon: Calculator,
    gradient: "from-purple-500/20 via-indigo-500/15 to-blue-500/20 dark:from-purple-500/25 dark:to-indigo-500/20",
    border: "border-purple-400/45 dark:border-purple-400/35",
    text: "text-purple-600 dark:text-purple-300",
  },
};

const INSIGNIA_BY_ID: Record<string, ScholarInsigniaDef> = {
  ...Object.fromEntries(SCHOLAR_INSIGNIAS.map((item) => [item.id, item])),
  ...EXTRA_INSIGNIA_THEMES,
};

const LEGACY_AVATAR_TO_INSIGNIA: Record<string, string> = {
  "🧠": "brain",
  "🦉": "brain",
  "✨": "sparkles",
  "🌟": "sparkles",
  "🌱": "sparkles",
  "🧙‍♂️": "sparkles",
  "🧙": "sparkles",
  "🎨": "sparkles",
  "👤": "sparkles",
  "⚡": "zap",
  "🔥": "flame",
  "🐉": "flame",
  "🛡️": "shield",
  "🥷": "shield",
  "👑": "crown",
  "💻": "terminal",
  "🖥️": "terminal",
  "🤖": "terminal",
  "⚛️": "atom",
  "🧬": "atom",
  "🔬": "atom",
  "⚗️": "atom",
  "🧪": "atom",
  "🔭": "atom",
  "🧭": "compass",
  "🌍": "compass",
  "🪐": "compass",
  "🚀": "rocket",
  "🦅": "rocket",
  "📐": "calculator",
  "📊": "calculator",
  "🔢": "calculator",
  "📖": "languages",
  "📚": "languages",
  "✍️": "languages",
  "📝": "languages",
  "🎓": "award",
  "💎": "award",
  "🎒": "award",
  "🏆": "award",
  "🎯": "award",
  "🏅": "award",
  "🥇": "crown",
  "🥈": "award",
  "🥉": "award",
  "🦁": "crown",
  "🦊": "flame",
  "🐼": "brain",
  "🐯": "flame",
  "💡": "sparkles",
  "⭐": "sparkles",
  "🦋": "sparkles",
  "🦄": "sparkles",
  "🧩": "brain",
  "🔮": "sparkles",
  "🎮": "terminal",
  "🕹️": "terminal",
};

/**
 * Resolves either a modern insignia ID or a legacy stored emoji into a unified insignia ID.
 * Any unlisted emoji deterministically maps to an EduChain insignia so avatars stay visually consistent.
 */
export function resolveScholarInsigniaId(avatar?: string): string | null {
  const rawAv = (avatar || "").trim();
  if (!rawAv) return null;
  if (LEGACY_AVATAR_TO_INSIGNIA[rawAv]) return LEGACY_AVATAR_TO_INSIGNIA[rawAv];
  const cleanAv = rawAv.toLowerCase();
  if (INSIGNIA_BY_ID[cleanAv]) return cleanAv;
  if (
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/u.test(rawAv) ||
    (!/^[a-z0-9_\s-]+$/i.test(rawAv) && rawAv.length <= 6)
  ) {
    let hash = 0;
    for (let i = 0; i < rawAv.length; i++) {
      hash = (hash * 31 + rawAv.charCodeAt(i)) >>> 0;
    }
    return SCHOLAR_INSIGNIAS[hash % SCHOLAR_INSIGNIAS.length].id;
  }
  return null;
}

/**
 * Modern Scholar Insignia Avatar (themed vector medallion or clean initials fallback)
 */
export const ScholarAvatar: React.FC<{
  name?: string;
  avatar?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}> = ({ name = "Scholar", avatar = "", size = "sm", className = "" }) => {
  const sizeClass = {
    xs: "w-5 h-5 text-[10px]",
    sm: "w-6 h-6 text-[11px]",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-2xl",
  }[size];

  const iconSize = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-4.5 h-4.5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }[size];

  const rawAv = (avatar || "").trim();
  const resolvedId = resolveScholarInsigniaId(rawAv);
  const insignia = resolvedId ? INSIGNIA_BY_ID[resolvedId] : undefined;
  const cleanAv = rawAv.toLowerCase();
  const FallbackGlyph = !insignia ? ICON_MAP[cleanAv] : undefined;

  const isEmojiOrSymbol =
    !insignia &&
    !FallbackGlyph &&
    Boolean(rawAv) &&
    (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/u.test(rawAv) ||
      (!/^[a-z0-9_\s-]+$/i.test(rawAv) && rawAv.length <= 6));

  // Otherwise generate elegant 2-letter initials
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "S";

  if (insignia) {
    const InsigniaIcon = insignia.icon;
    return (
      <div
        className={`rounded-full shrink-0 flex items-center justify-center border bg-gradient-to-br ring-1 ring-inset ring-white/50 dark:ring-white/10 shadow-xs select-none ${insignia.gradient} ${insignia.border} ${insignia.text} ${sizeClass} ${className}`}
      >
        <InsigniaIcon className={iconSize} strokeWidth={2.15} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-mono font-bold border border-black/10 dark:border-white/10 bg-gradient-to-br from-blue-500/15 via-neutral-100 to-cyan-500/15 dark:from-[#223149] dark:to-[#182438] text-neutral-800 dark:text-neutral-100 shadow-xs select-none ${sizeClass} ${className}`}
    >
      {FallbackGlyph ? (
        <FallbackGlyph className={iconSize} strokeWidth={2} />
      ) : isEmojiOrSymbol ? (
        <span className="leading-none">{rawAv}</span>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
