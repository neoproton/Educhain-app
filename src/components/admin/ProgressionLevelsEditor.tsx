"use client";

import React, { useMemo, useState } from "react";
import { useCurriculumStore, CloudActionResult } from "@/store/useCurriculumStore";
import { XpLevelRule, StreakLevelRule } from "@/types/user";
import { normalizeXpLevels, normalizeStreakLevels } from "@/lib/progression";
import { sound } from "@/lib/audio";
import {
  Flame,
  Zap,
  Plus,
  Trash2,
  Save,
  RotateCcw,
} from "lucide-react";

interface ProgressionLevelsEditorProps {
  onCloudAction: (result: CloudActionResult, successMessage: string) => void;
}

interface EditableTierRow {
  id: string;
  name: string;
  threshold: number;
  icon: string;
  color: string;
  description: string;
}

const ICON_OPTIONS = ["🌱", "🔥", "✨", "⚡", "🛡️", "💎", "👑", "🚀", "🏆", "🌟", "🎯", "📚"];

const COLOR_OPTIONS = [
  { label: "Orange", value: "#fb923c" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Emerald", value: "#34d399" },
  { label: "Sky Blue", value: "#38bdf8" },
  { label: "Indigo", value: "#818cf8" },
  { label: "Violet", value: "#a78bfa" },
];

function toEditableFromXp(rules: XpLevelRule[]): EditableTierRow[] {
  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    threshold: r.minXp,
    icon: r.icon || "⚡",
    color: r.color || "#38bdf8",
    description: r.description || "",
  }));
}

function toEditableFromStreak(rules: StreakLevelRule[]): EditableTierRow[] {
  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    threshold: r.minDays,
    icon: r.icon || "🔥",
    color: r.color || "#fb923c",
    description: r.description || "",
  }));
}

interface TierCardProps {
  title: string;
  subtitle: string;
  thresholdHeader: string;
  unitShort: string;
  minThreshold: number;
  headerIcon: React.ReactNode;
  rows: EditableTierRow[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<EditableTierRow>) => void;
  onRemove: (id: string) => void;
}

const TierSectionCard: React.FC<TierCardProps> = ({
  title,
  subtitle,
  thresholdHeader,
  unitShort,
  minThreshold,
  headerIcon,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  const sortedPreview = useMemo(
    () => [...rows].sort((a, b) => a.threshold - b.threshold),
    [rows]
  );

  return (
    <section className="rounded-xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs overflow-hidden">
      {/* Uniform Card Header */}
      <div className="px-3.5 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-200/80 dark:border-white/10 bg-neutral-50/70 dark:bg-[#141f31]/70 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] flex items-center justify-center shrink-0 shadow-xs">
            {headerIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
                {title}
              </h4>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-neutral-200/75 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 tabular-nums shrink-0">
                {rows.length} {rows.length === 1 ? "Level" : "Levels"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 sm:truncate mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            sound.playClick();
            onAdd();
          }}
          className="h-9 px-3 sm:px-3.5 rounded-lg text-xs font-semibold border border-neutral-200/90 dark:border-white/15 bg-white dark:bg-[#223149] text-neutral-800 dark:text-white hover:bg-neutral-50 dark:hover:bg-[#2a3b57] flex items-center justify-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
          <span>Add Level</span>
        </button>
      </div>

      {/* Uniform Sorted Ladder Strip */}
      <div className="px-3.5 sm:px-5 py-3 border-b border-neutral-200/70 dark:border-white/10 bg-neutral-50/35 dark:bg-[#101827]/45 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mr-1 shrink-0">
          Active Ladder:
        </span>
        {sortedPreview.map((item, idx) => (
          <div
            key={item.id}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] text-xs"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[10px] font-mono text-neutral-400 tabular-nums">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-100">
              {item.name || "Untitled"}
            </span>
            <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
              {item.threshold.toLocaleString()}
              {unitShort}
            </span>
          </div>
        ))}
      </div>

      {/* Formal Table Column Headers (Desktop) */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-3 px-5 py-2.5 border-b border-neutral-200/70 dark:border-white/10 bg-neutral-50/50 dark:bg-[#141f31]/40 text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        <div className="col-span-1 text-center">Icon</div>
        <div className="col-span-3">Level Name</div>
        <div className="col-span-2">{thresholdHeader}</div>
        <div className="col-span-2">Accent Tone</div>
        <div className="col-span-3">Student Description</div>
        <div className="col-span-1 text-right">Remove</div>
      </div>

      {/* Uniform Single-Line Table Rows */}
      <div className="divide-y divide-neutral-200/70 dark:divide-white/10">
        {rows.map((row, idx) => {
          const validColor = COLOR_OPTIONS.some((c) => c.value === row.color)
            ? row.color
            : COLOR_OPTIONS[0].value;

          return (
            <div
              key={row.id}
              className="px-3.5 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center hover:bg-neutral-50/60 dark:hover:bg-white/[0.02] transition-colors"
            >
              {/* Icon */}
              <div className="lg:col-span-1">
                <label className="block lg:hidden text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  Icon
                </label>
                <select
                  value={ICON_OPTIONS.includes(row.icon) ? row.icon : ICON_OPTIONS[0]}
                  onChange={(e) => onUpdate(row.id, { icon: e.target.value })}
                  aria-label={`Icon for level ${idx + 1}`}
                  className="w-full h-9 px-2 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-sm text-center focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {ICON_OPTIONS.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>

              {/* Level Name */}
              <div className="lg:col-span-3">
                <label className="block lg:hidden text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  Level Name
                </label>
                <input
                  type="text"
                  value={row.name}
                  onChange={(e) => onUpdate(row.id, { name: e.target.value })}
                  placeholder="e.g. Intermediate"
                  className="w-full h-9 px-3 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-xs font-semibold text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Threshold */}
              <div className="lg:col-span-2">
                <label className="block lg:hidden text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  {thresholdHeader}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={minThreshold}
                    step={minThreshold === 0 ? 50 : 1}
                    value={row.threshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      onUpdate(row.id, {
                        threshold: Number.isNaN(val) ? minThreshold : Math.max(minThreshold, val),
                      });
                    }}
                    className="w-full h-9 pl-3 pr-10 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-xs font-mono font-bold tabular-nums text-neutral-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-neutral-400 pointer-events-none">
                    {unitShort}
                  </span>
                </div>
              </div>

              {/* Accent Tone */}
              <div className="lg:col-span-2">
                <label className="block lg:hidden text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  Accent Tone
                </label>
                <div className="relative flex items-center">
                  <span
                    className="w-2.5 h-2.5 rounded-full absolute left-3 pointer-events-none"
                    style={{ backgroundColor: validColor }}
                  />
                  <select
                    value={validColor}
                    onChange={(e) => onUpdate(row.id, { color: e.target.value })}
                    aria-label={`Accent color for ${row.name || "level"}`}
                    className="w-full h-9 pl-7 pr-2 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-xs font-medium text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {COLOR_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block lg:hidden text-[10px] font-mono uppercase text-neutral-500 mb-1">
                  Student Description
                </label>
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => onUpdate(row.id, { description: e.target.value })}
                  placeholder="Optional milestone description"
                  className="w-full h-9 px-3 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-xs text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Remove Action */}
              <div className="sm:col-span-2 lg:col-span-1 flex justify-end">
                <button
                  type="button"
                  disabled={rows.length <= 1}
                  onClick={() => {
                    sound.playClick();
                    onRemove(row.id);
                  }}
                  title={rows.length <= 1 ? "At least 1 level is required" : `Remove ${row.name}`}
                  className="w-9 h-9 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#101827] text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30 flex items-center justify-center transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * Admin Control Panel section for configuring custom XP levels and Streak tiers.
 */
export const ProgressionLevelsEditor: React.FC<ProgressionLevelsEditorProps> = ({
  onCloudAction,
}) => {
  const {
    xpLevels,
    streakLevels,
    saveProgressionLevels,
    resetProgressionLevels,
  } = useCurriculumStore();

  const [draftStreakOverride, setDraftStreakOverride] = useState<EditableTierRow[] | null>(null);
  const [draftXpOverride, setDraftXpOverride] = useState<EditableTierRow[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const draftStreak = useMemo(
    () => draftStreakOverride ?? toEditableFromStreak(normalizeStreakLevels(streakLevels)),
    [draftStreakOverride, streakLevels]
  );
  const draftXp = useMemo(
    () => draftXpOverride ?? toEditableFromXp(normalizeXpLevels(xpLevels)),
    [draftXpOverride, xpLevels]
  );
  const isDirty = draftStreakOverride !== null || draftXpOverride !== null;

  const updateStreakDraft = (updater: (rows: EditableTierRow[]) => EditableTierRow[]) => {
    setDraftStreakOverride((prev) =>
      updater(prev ?? toEditableFromStreak(normalizeStreakLevels(streakLevels)))
    );
  };

  const updateXpDraft = (updater: (rows: EditableTierRow[]) => EditableTierRow[]) => {
    setDraftXpOverride((prev) =>
      updater(prev ?? toEditableFromXp(normalizeXpLevels(xpLevels)))
    );
  };

  const addStreakTier = () => {
    const maxDays = draftStreak.reduce((max, r) => Math.max(max, r.threshold), 0);
    const nextDays = maxDays < 10 ? 10 : maxDays < 30 ? 30 : maxDays + 15;
    updateStreakDraft((prev) => [
      ...prev,
      {
        id: `streak_${Date.now()}`,
        name: nextDays >= 30 ? "Legend" : "Intermediate",
        threshold: nextDays,
        icon: nextDays >= 30 ? "👑" : "⚡",
        color: "#38bdf8",
        description: `Reach a ${nextDays}-day consecutive study streak`,
      },
    ]);
  };

  const addXpTier = () => {
    const maxXp = draftXp.reduce((max, r) => Math.max(max, r.threshold), 0);
    const nextXp = maxXp + 1000;
    updateXpDraft((prev) => [
      ...prev,
      {
        id: `xp_${Date.now()}`,
        name: `Rank ${prev.length + 1}`,
        threshold: nextXp,
        icon: "🏆",
        color: "#a78bfa",
        description: `Earn ${nextXp.toLocaleString()} total XP`,
      },
    ]);
  };

  const handleSaveAll = async () => {
    sound.playClick();
    setIsSaving(true);
    const nextXpRules: XpLevelRule[] = draftXp.map((r) => ({
      id: r.id,
      name: r.name.trim() || "Level",
      minXp: Math.max(0, Math.round(r.threshold)),
      icon: r.icon || "⚡",
      color: r.color,
      description: r.description.trim() || undefined,
    }));
    const nextStreakRules: StreakLevelRule[] = draftStreak.map((r) => ({
      id: r.id,
      name: r.name.trim() || "Tier",
      minDays: Math.max(1, Math.round(r.threshold)),
      icon: r.icon || "🔥",
      color: r.color,
      description: r.description.trim() || undefined,
    }));

    const res = await saveProgressionLevels(nextXpRules, nextStreakRules);
    setDraftXpOverride(null);
    setDraftStreakOverride(null);
    setIsSaving(false);

    onCloudAction(
      res,
      `Saved ${nextStreakRules.length} Streak levels and ${nextXpRules.length} XP levels!`
    );
  };

  const handleResetDefaults = async () => {
    sound.playClick();
    setIsSaving(true);
    const res = await resetProgressionLevels();
    setDraftXpOverride(null);
    setDraftStreakOverride(null);
    setIsSaving(false);
    onCloudAction(res, "Restored default XP & Streak levels!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Control Header Card */}
      <div className="p-4 sm:p-5 rounded-xl border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white tracking-tight">
              XP &amp; Streak Progression Rules
            </h3>
            {isDirty && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-semibold">
                Unsaved
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Configure daily streak milestones (such as 10 days for Intermediate and 30 days for Master) and cumulative XP ranks across Navbar badges, Profiles, and Leaderboards.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleResetDefaults}
            className="flex-1 sm:flex-initial h-9 px-3.5 rounded-lg text-xs font-semibold border border-neutral-200/90 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAll}
            className="flex-1 sm:flex-initial h-9 px-4 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save & Apply"}</span>
          </button>
        </div>
      </div>

      {/* Full-Width Uniform Tables */}
      <div className="space-y-6">
        <TierSectionCard
          title="Daily Streak Milestones"
          subtitle="Consecutive study-day thresholds evaluated in the Streak badge and Progression view"
          thresholdHeader="Min Days"
          unitShort="d"
          minThreshold={1}
          headerIcon={<Flame className="w-4 h-4 text-orange-500" />}
          rows={draftStreak}
          onAdd={addStreakTier}
          onUpdate={(id, patch) => {
            updateStreakDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
          }}
          onRemove={(id) => {
            updateStreakDraft((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
          }}
        />

        <TierSectionCard
          title="Experience Point (XP) Ranks"
          subtitle="Cumulative XP thresholds evaluated across Navbar ranks, Profiles, and Leaderboards"
          thresholdHeader="Min XP"
          unitShort="XP"
          minThreshold={0}
          headerIcon={<Zap className="w-4 h-4 text-amber-500" />}
          rows={draftXp}
          onAdd={addXpTier}
          onUpdate={(id, patch) => {
            updateXpDraft((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
          }}
          onRemove={(id) => {
            updateXpDraft((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
          }}
        />
      </div>
    </div>
  );
};
