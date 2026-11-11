"use client";

import React, { useState } from "react";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { MistakeRecord } from "@/types/curriculum";
import { getSubjectMeta } from "@/data/constants";
import { sound } from "@/lib/audio";
import { 
  Hammer, 
  CheckCircle2, 
  RotateCcw, 
  AlertCircle,
  Sparkles,
  X
} from "lucide-react";

export const MistakeForge: React.FC = () => {
  const { mistakes, masterMistake, grade } = useEduStore();
  const { getAllSubjects, getAllStages } = useCurriculumStore();
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "mastered">("all");
  const [activePracticingId, setActivePracticingId] = useState<string | null>(null);
  const [practiceSelectedOption, setPracticeSelectedOption] = useState<number | null>(null);
  const [practiceAnswered, setPracticeAnswered] = useState(false);

  const allSubjects = getAllSubjects(grade);
  const allStages = getAllStages();
  const stageTitleMap = new Map(allStages.map((s) => [String(s.id), s.title]));
  const subjectTabs = [
    { id: "all", label: "All Subjects" },
    ...Array.from(
      new Set([...allSubjects.map((s) => s.id), ...mistakes.map((m) => m.subject)])
    ).map((id) => {
      const sub = allSubjects.find((s) => s.id === id);
      const meta = getSubjectMeta(id);
      return { id, label: sub?.name || meta?.name || id };
    }),
  ];

  // Filter mistakes
  const filteredMistakes = mistakes.filter((m) => {
    const matchesSubject = selectedSubject === "all" || m.subject === selectedSubject;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !m.mastered) ||
      (statusFilter === "mastered" && m.mastered);
    return matchesSubject && matchesStatus;
  });

  const handleStartPractice = (item: MistakeRecord) => {
    sound.playClick();
    setActivePracticingId(item.id);
    setPracticeSelectedOption(null);
    setPracticeAnswered(false);
  };

  const handleAnswerPractice = (item: MistakeRecord, optionIndex: number) => {
    if (practiceAnswered) return;
    setPracticeSelectedOption(optionIndex);
    setPracticeAnswered(true);

    if (optionIndex === item.correctIndex) {
      sound.playCorrect();
      masterMistake(item.id);
    } else {
      sound.playIncorrect();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200/90 dark:border-[#263B5B]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-xs">
              <Hammer className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
              Active Recall & Recovery
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            The Mistake Forge
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] mt-1 max-w-xl leading-relaxed">
            Every question you miss in regular quizzes automatically gets cataloged here. Master your past errors to turn weaknesses into permanent knowledge.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3.5">
          <div className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-xs">
            <div className="text-[10px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Pending</div>
            <div className="font-heading text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {mistakes.filter((m) => !m.mastered).length}
            </div>
          </div>
          <div className="px-5 py-3 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-xs">
            <div className="text-[10px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Mastered</div>
            <div className="font-heading text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {mistakes.filter((m) => m.mastered).length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3.5 mb-6">
        
        {/* Subject Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {subjectTabs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setSelectedSubject(sub.id);
                sound.playClick();
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 card-lift ${
                selectedSubject === sub.id
                  ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs font-bold"
                  : "bg-white dark:bg-[#182438] text-slate-700 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#263B5B]"
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-[#263B5B] rounded-2xl p-1 bg-white dark:bg-[#182438] shadow-xs">
          {(["all", "pending", "mastered"] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                sound.playClick();
              }}
              className={`px-3 py-1 rounded-xl text-xs capitalize transition-all font-semibold ${
                statusFilter === status
                  ? "bg-slate-100 dark:bg-[#223149] text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

      </div>

      {/* Empty State */}
      {filteredMistakes.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white/70 dark:bg-[#182438]/50 card-lift">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563EB]/15 to-[#22D3EE]/20 border border-[#2563EB]/30 dark:border-[#22D3EE]/30 flex items-center justify-center text-2xl mx-auto mb-3 shadow-xs">
            ✨
          </div>
          <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-1">
            {mistakes.length === 0 ? "The Forge is Clean" : "No Matching Mistakes"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            {mistakes.length === 0
              ? "When you miss a question in any curriculum quiz, it will be added here automatically for deliberate practice."
              : "Try switching filters to view other subjects or mastered questions."}
          </p>
        </div>
      ) : (
        /* Mistake Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMistakes.map((item) => {
            const meta = getSubjectMeta(item.subject);
            const isPracticing = activePracticingId === item.id;

            return (
              <div
                key={item.id}
                className={`p-6 rounded-3xl border transition-all duration-300 card-lift ${
                  item.mastered
                    ? "bg-emerald-50/50 dark:bg-[#142323] border-emerald-500/30"
                    : "bg-white dark:bg-[#182438] border-slate-200 dark:border-[#263B5B] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 shadow-sm"
                }`}
              >
                {/* Meta Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-4 ring-slate-100 dark:ring-[#223149]"
                      style={{ backgroundColor: meta?.color || "#22D3EE" }}
                    />
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-[#94A3B8]">
                      {allSubjects.find((s) => s.id === item.subject)?.name || meta?.name || "Track"} • {stageTitleMap.get(String(item.stageId)) || (typeof item.stageId === "number" ? `Stage ${item.stageId}` : "Practice")}
                    </span>
                  </div>

                  {item.mastered ? (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mastered</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-amber-700 dark:text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Needs Practice ({item.timesMissed}x)</span>
                    </span>
                  )}
                </div>

                {/* Question Text */}
                <h4 className="font-heading text-sm font-bold text-slate-900 dark:text-[#F8FAFC] mb-3 leading-snug">
                  {item.question}
                </h4>

                {/* Practice Mode or Static View */}
                {isPracticing ? (
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-200 dark:border-[#263B5B]">
                    <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] font-semibold mb-2">
                      Select the correct answer to master:
                    </div>
                    {item.options.map((opt, optIdx) => {
                      const isSelected = practiceSelectedOption === optIdx;
                      const isCorrect = optIdx === item.correctIndex;

                      let btnStyle = "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 hover:bg-slate-100 dark:hover:bg-[#1e2f47] text-slate-800 dark:text-[#F8FAFC]";
                      if (practiceAnswered) {
                        if (isCorrect) btnStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]";
                        else if (isSelected) btnStyle = "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300";
                      }

                      return (
                        <button
                          key={optIdx}
                          disabled={practiceAnswered}
                          onClick={() => handleAnswerPractice(item, optIdx)}
                          className={`w-full p-3 rounded-xl border text-left text-xs font-medium transition-all ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}

                    {practiceAnswered && (
                      <div className="mt-3 p-3.5 rounded-xl border border-blue-500/20 dark:border-[#22D3EE]/30 bg-blue-50/70 dark:bg-[#223149]/70 animate-in fade-in duration-200 space-y-3">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {practiceSelectedOption === item.correctIndex ? "✅ Nailed it! " : "💡 Tip: "}
                          {item.explanation}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          {practiceSelectedOption !== item.correctIndex && (
                            <button
                              type="button"
                              onClick={() => handleStartPractice(item)}
                              className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Try Again</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setActivePracticingId(null);
                              setPracticeSelectedOption(null);
                              setPracticeAnswered(false);
                            }}
                            className="btn-educhain-primary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold cursor-pointer"
                          >
                            {practiceSelectedOption === item.correctIndex ? (
                              <>
                                <Sparkles className="w-3 h-3" />
                                <span>Done</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3" />
                                <span>Close</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#263B5B]/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-[#94A3B8] font-mono">
                      Missed {new Date(item.missedAt).toLocaleDateString()}
                    </span>

                    <button
                      onClick={() => handleStartPractice(item)}
                      className="btn-educhain-secondary text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 font-bold"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{item.mastered ? "Practice Again" : "Practice Now"}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
