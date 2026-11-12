import { DEFAULT_XP_LEVELS, DEFAULT_STREAK_LEVELS } from "@/data/constants";
import { XpLevelRule, StreakLevelRule } from "@/types/user";

export interface TierProgressResult<T> {
  sortedLevels: T[];
  currentLevel: T | null;
  levelNumber: number;
  nextLevel: T | null;
  progressPct: number;
  remaining: number;
}

/**
 * Ensures XP level rules are valid, deduplicated, and sorted ascending by minXp.
 */
export function normalizeXpLevels(levels?: XpLevelRule[] | null): XpLevelRule[] {
  const source = Array.isArray(levels) && levels.length > 0 ? levels : DEFAULT_XP_LEVELS;
  const seen = new Set<string>();
  const cleaned = source
    .map((item, idx) => {
      const baseId = String(item?.id || `xp_level_${idx + 1}`).trim() || `xp_level_${idx + 1}`;
      let id = baseId;
      let suffix = 1;
      while (seen.has(id)) {
        suffix += 1;
        id = `${baseId}_${suffix}`;
      }
      seen.add(id);

      const minXpNum = Number(item?.minXp);
      return {
        id,
        name: String(item?.name || `Level ${idx + 1}`).trim() || `Level ${idx + 1}`,
        minXp: Number.isFinite(minXpNum) ? Math.max(0, Math.round(minXpNum)) : 0,
        icon: String(item?.icon || "⚡").trim() || "⚡",
        color: typeof item?.color === "string" && item.color.trim() ? item.color.trim() : "#38bdf8",
        description: typeof item?.description === "string" ? item.description.trim() : undefined,
      };
    })
    .sort((a, b) => a.minXp - b.minXp);

  return cleaned.length > 0 ? cleaned : [...DEFAULT_XP_LEVELS];
}

/**
 * Ensures streak level rules are valid, deduplicated, and sorted ascending by minDays.
 */
export function normalizeStreakLevels(levels?: StreakLevelRule[] | null): StreakLevelRule[] {
  const source = Array.isArray(levels) && levels.length > 0 ? levels : DEFAULT_STREAK_LEVELS;
  const seen = new Set<string>();
  const cleaned = source
    .map((item, idx) => {
      const baseId = String(item?.id || `streak_level_${idx + 1}`).trim() || `streak_level_${idx + 1}`;
      let id = baseId;
      let suffix = 1;
      while (seen.has(id)) {
        suffix += 1;
        id = `${baseId}_${suffix}`;
      }
      seen.add(id);

      const minDaysNum = Number(item?.minDays);
      return {
        id,
        name: String(item?.name || `Tier ${idx + 1}`).trim() || `Tier ${idx + 1}`,
        minDays: Number.isFinite(minDaysNum) ? Math.max(1, Math.round(minDaysNum)) : 1,
        icon: String(item?.icon || "🔥").trim() || "🔥",
        color: typeof item?.color === "string" && item.color.trim() ? item.color.trim() : "#fb923c",
        description: typeof item?.description === "string" ? item.description.trim() : undefined,
      };
    })
    .sort((a, b) => a.minDays - b.minDays);

  return cleaned.length > 0 ? cleaned : [...DEFAULT_STREAK_LEVELS];
}

function evaluateTierProgress<T>(
  value: number,
  sortedLevels: T[],
  getThreshold: (level: T) => number,
  fallbackToFirst: boolean
): TierProgressResult<T> {
  const safeVal = Number.isFinite(value) ? Math.max(0, value) : 0;
  let achievedIdx = -1;

  for (let i = 0; i < sortedLevels.length; i++) {
    if (safeVal >= getThreshold(sortedLevels[i])) {
      achievedIdx = i;
    }
  }

  const effectiveIdx = achievedIdx === -1 && fallbackToFirst ? 0 : achievedIdx;
  const currentLevel = effectiveIdx >= 0 ? sortedLevels[effectiveIdx] : null;
  const nextIdx = achievedIdx + 1;
  const nextLevel = nextIdx < sortedLevels.length ? sortedLevels[nextIdx] : null;

  if (!nextLevel) {
    return {
      sortedLevels,
      currentLevel,
      levelNumber: achievedIdx >= 0 ? achievedIdx + 1 : 0,
      nextLevel: null,
      progressPct: sortedLevels.length > 0 ? 100 : 0,
      remaining: 0,
    };
  }

  const floorVal = achievedIdx >= 0 ? getThreshold(sortedLevels[achievedIdx]) : 0;
  const ceilVal = getThreshold(nextLevel);
  const span = Math.max(1, ceilVal - floorVal);
  const clamped = Math.max(0, Math.min(span, safeVal - floorVal));

  return {
    sortedLevels,
    currentLevel,
    levelNumber: achievedIdx >= 0 ? achievedIdx + 1 : 0,
    nextLevel,
    progressPct: Math.round((clamped / span) * 100),
    remaining: Math.max(0, ceilVal - safeVal),
  };
}

/**
 * Evaluates a user's current XP level, next level target, and progress percentage.
 */
export function getXpProgress(xp: number, levels?: XpLevelRule[] | null): TierProgressResult<XpLevelRule> & { currentLevel: XpLevelRule } {
  const sorted = normalizeXpLevels(levels);
  const result = evaluateTierProgress(xp, sorted, (l) => l.minXp, true);
  return {
    ...result,
    currentLevel: result.currentLevel || sorted[0],
  };
}

/**
 * Evaluates a user's current streak level, next milestone target, and progress percentage.
 */
export function getStreakProgress(streakDays: number, levels?: StreakLevelRule[] | null): TierProgressResult<StreakLevelRule> {
  const sorted = normalizeStreakLevels(levels);
  return evaluateTierProgress(streakDays, sorted, (l) => l.minDays, false);
}
