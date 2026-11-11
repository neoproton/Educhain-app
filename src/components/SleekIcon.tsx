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
  HelpCircle,
  FileText,
  Target
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

/**
 * Modern Minimalist Scholar Avatar (clean monogram or glyph)
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
    md: "w-4 h-4",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }[size];

  const rawAv = (avatar || "").trim();
  const cleanAv = rawAv.toLowerCase();
  const Glyph = ICON_MAP[cleanAv];
  const isEmojiOrSymbol =
    Boolean(rawAv) &&
    !Glyph &&
    (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]/u.test(rawAv) ||
      (!/^[a-z0-9_\s-]+$/i.test(rawAv) && rawAv.length <= 6));

  // Otherwise generate elegant 2-letter initials
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "S";

  return (
    <div
      className={`rounded-full shrink-0 flex items-center justify-center font-mono font-bold border border-black/10 dark:border-white/10 bg-gradient-to-br from-blue-500/10 via-neutral-100 to-cyan-500/10 dark:from-[#223149] dark:to-[#182438] text-neutral-800 dark:text-neutral-100 shadow-xs select-none ${sizeClass} ${className}`}
    >
      {Glyph ? (
        <Glyph className={iconSize} strokeWidth={2} />
      ) : isEmojiOrSymbol ? (
        <span className="leading-none">{rawAv}</span>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};