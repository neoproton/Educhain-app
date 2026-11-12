"use client";

import React, { useState } from "react";
import { Stage } from "@/types/curriculum";
import { getSubjectMeta } from "@/data/constants";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { Lock, CheckCircle2, Play, ChevronDown, ChevronUp, Info } from "lucide-react";

interface StageCardProps {
  stage: Stage;
  isUnlocked: boolean;
  isCompleted: boolean;
  bestScore?: number;
  onSelect: (stage: Stage) => void;
}

export const StageCard: React.FC<StageCardProps> = ({
  stage,
  isUnlocked,
  isCompleted,
  bestScore = 0,
  onSelect,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { getAllSubjects } = useCurriculumStore();
  const allSubjects = getAllSubjects();
  const customSub = allSubjects.find((s) => s.id === stage.subject);
  const meta = getSubjectMeta(stage.subject);
  const subColor = customSub?.color || meta?.color || "#22D3EE";
  const subName = customSub?.name || stage.subjectName || meta?.name || "Track";

  const handleClick = (e: React.MouseEvent) => {
    // If clicking the info toggle, don't trigger quiz
    if ((e.target as HTMLElement).closest(".btn-details-toggle")) return;

    if (!isUnlocked) {
      sound.playIncorrect();
      return;
    }
    sound.playClick();
    onSelect(stage);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between card-lift ${
        isUnlocked
          ? "cursor-pointer bg-white dark:bg-[#182438] hover:bg-slate-50/80 dark:hover:bg-[#1f304b] border-slate-200 dark:border-[#263B5B] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/50 shadow-sm dark:shadow-[0_4px_20px_rgba(16,24,39,0.35)] hover:shadow-xl dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.4),0_0_20px_rgba(34,211,238,0.12)]"
          : "opacity-45 bg-slate-100/60 dark:bg-[#131c2b] border-slate-200/60 dark:border-[#1d2a3f] cursor-not-allowed select-none"
      }`}
    >
      <div>
        {/* Top Row: Subject & Stage #, Difficulty, XP */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-slate-100 dark:ring-[#223149] shadow-xs"
              style={{ backgroundColor: subColor }}
            />
            <span className="text-[11px] font-mono font-medium uppercase tracking-wider text-slate-500 dark:text-[#94A3B8] truncate">
              {subName} • Stage {stage.subjectStageNumber || (typeof stage.id === "number" ? stage.id : 1)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
              stage.difficulty === "Easy"
                ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : stage.difficulty === "Medium"
                ? "text-amber-700 dark:text-amber-400 border-amber-500/30 bg-amber-500/10"
                : "text-rose-700 dark:text-rose-400 border-rose-500/30 bg-rose-500/10"
            }`}>
              {stage.difficulty || "Standard"}
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
              +{stage.xpReward} XP
            </span>
          </div>
        </div>

        {/* Big Stage Title */}
        <h3 className="font-heading text-[16px] font-bold text-slate-900 dark:text-[#F8FAFC] mb-1 leading-snug group-hover:text-[#2563EB] dark:group-hover:text-[#22D3EE] transition-colors">
          {stage.title}
        </h3>

        {/* Topic Tag */}
        <p className="text-xs text-slate-500 dark:text-[#94A3B8] line-clamp-1 mb-3">
          {stage.topic && stage.topic !== stage.chapter
            ? `${stage.chapter} — ${stage.topic}`
            : stage.chapter}
        </p>

        {/* Collapsible Curriculum Objective & Tags */}
        {showDetails && (
          <div className="mt-2 mb-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#223149]/60 border border-slate-200 dark:border-[#263B5B] text-xs text-slate-700 dark:text-slate-300 leading-relaxed animate-in fade-in duration-200">
            <div className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3EE]" />
              <span>Learning Objective:</span>
            </div>
            <p className="mb-2 text-slate-600 dark:text-[#94A3B8]">{stage.learningObjective || stage.description}</p>
            {stage.questions[0]?.tags && stage.questions[0].tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {stage.questions[0].tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/10 dark:bg-[#182438] text-[#2563EB] dark:text-[#22D3EE] border border-blue-500/20 dark:border-[#22D3EE]/20"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer: Status & Start Button */}
      <div className="pt-3.5 border-t border-slate-100 dark:border-[#263B5B]/80 flex items-center justify-between gap-2">
        
        {/* Status Pill */}
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4 fill-emerald-500/20" />
              <span>Passed ({bestScore}%)</span>
            </span>
          ) : isUnlocked ? (
            <span className="flex items-center gap-1.5 text-xs font-mono font-medium text-[#2563EB] dark:text-[#22D3EE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] dark:bg-[#22D3EE] animate-pulse" />
              <span>Ready</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-600">
              <Lock className="w-3.5 h-3.5" />
              <span>Locked</span>
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn-details-toggle p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#223149] transition-colors"
            title={showDetails ? "Hide syllabus details" : "View syllabus details"}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <Info className="w-4 h-4" />}
          </button>

          {isUnlocked && (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white text-xs font-bold tracking-tight shadow-[0_2px_10px_rgba(37,99,235,0.3)] hover:shadow-[0_4px_16px_rgba(34,211,238,0.5)] active:scale-95 transition-all">
              <Play className="w-3 h-3 fill-current" />
              <span>{isCompleted ? "Retry" : "Start"}</span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
