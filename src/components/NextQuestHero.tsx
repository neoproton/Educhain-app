"use client";

import React, { useEffect } from "react";
import { Stage, SubjectType } from "@/types/curriculum";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { Play, Sparkles, Compass } from "lucide-react";
import { SleekBadgeIcon } from "@/components/SleekIcon";

interface NextQuestHeroProps {
  stages: Stage[];
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
  onStartStage: (stage: Stage) => void;
  onOpenProfile?: () => void;
}

export const NextQuestHero: React.FC<NextQuestHeroProps> = ({
  stages,
  selectedSubject,
  onSelectSubject,
  onStartStage,
}) => {
  const { grade, completedStages, subjectProgress } = useEduStore();
  const { getAllSubjects, getAllClasses } = useCurriculumStore();
  const allClasses = getAllClasses();
  
  // Filter subjects for the student's active class
  const classSubjects = getAllSubjects(grade);

  // If currently selected subject does not belong to active class, select first available
  useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some((s) => s.id === selectedSubject)) {
      onSelectSubject(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubject, onSelectSubject]);

  // Find the student's next recommended stage: first uncompleted stage in current class
  const nextStage = stages.find((s) => !completedStages.includes(s.id)) || stages[0];
  const nextSubMeta = classSubjects.find((s) => s.id === nextStage?.subject) || classSubjects[0];

  const handleStartNext = () => {
    if (!nextStage) return;
    sound.playClick();
    onStartStage(nextStage);
  };

  const activeClassObj = allClasses.find((c) => c.id === grade) || allClasses[0];

  return (
    <div className="space-y-6 mb-8">
      
      {/* 1. Hero Next Recommended Quest Card */}
      {nextStage && (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:via-[#1e304b] dark:to-[#182438] p-6 sm:p-8 shadow-lg dark:shadow-[0_12px_40px_rgba(16,24,39,0.5)] transition-all card-lift">
          
          {/* Atmospheric gradient glows */}
          <div 
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none transition-all"
            style={{ backgroundColor: nextSubMeta?.color || "#22D3EE" }}
          />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none bg-[#2563EB]" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 dark:border-cyan-400/30 bg-blue-50/80 dark:bg-[#223149]/80 text-[11px] font-mono text-[#2563EB] dark:text-[#22D3EE] shadow-2xs">
                <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: nextSubMeta?.color || "#22D3EE" }} />
                <span className="font-bold uppercase tracking-wider">{activeClassObj?.name || "Class"} Curriculum • Recommended Quest</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{nextSubMeta?.name}</span>
                <span>•</span>
                <span>Stage {nextStage.subjectStageNumber || 1}</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-[#F8FAFC] leading-tight">
                {nextStage.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] line-clamp-2 leading-relaxed">
                {nextStage.learningObjective || nextStage.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleStartNext}
                className="w-full sm:w-auto btn-educhain-primary px-8 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_8px_30px_rgba(34,211,238,0.5)] active:scale-[0.98] transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Continue Quest (5 min)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dead-Simple 1-Click Subject Switcher (Filtered by Student's Enrolled Class) */}
      <div className="pt-1">
        {classSubjects.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2.5">
            {classSubjects.map((sub) => {
              const isSelected = selectedSubject === sub.id;
              const subProg = subjectProgress[sub.id as SubjectType] || { completedStages: [] };
              const subStages = stages.filter((s) => s.subject === sub.id);
              const completedCount = subProg.completedStages.length;
              const totalCount = subStages.length || 1;

              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    sound.playClick();
                    onSelectSubject(sub.id);
                  }}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-medium transition-all flex items-center gap-2.5 card-lift ${
                    isSelected
                      ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-[0_4px_16px_rgba(37,99,235,0.4)] font-bold border-transparent"
                      : "bg-white dark:bg-[#182438] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-[#263B5B] hover:text-slate-900 dark:hover:text-white hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40"
                  }`}
                >
                  <SleekBadgeIcon name={sub.id} color={sub.color} size="sm" />
                  <span className="font-heading">{sub.name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? "bg-white/25 text-white backdrop-blur-xs"
                        : "bg-slate-100 dark:bg-[#223149] text-slate-600 dark:text-[#94A3B8]"
                    }`}
                  >
                    {completedCount}/{totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-slate-300 dark:border-[#263B5B] bg-slate-50/70 dark:bg-[#182438]/40 text-center">
            <p className="text-xs font-mono text-slate-500 dark:text-[#94A3B8] mb-1">
              No subjects registered yet for {activeClassObj?.name || "your enrolled class"}.
            </p>
            <p className="text-[11px] text-slate-400">
              You can update your enrolled class in your Profile settings or add subjects in the Admin Panel.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
