"use client";

import React, { useRef, useState } from "react";
import { useEduStore } from "@/store/useEduStore";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { getSubjectMeta } from "@/data/constants";
import { MistakeForge } from "@/components/MistakeForge";
import { sound } from "@/lib/audio";
import { 
  BarChart3, 
  Download, 
  Upload, 
  Hammer, 
  ArrowRight
} from "lucide-react";

export const AnalyticsView: React.FC = () => {
  const { getAllSubjects, getAllStages } = useCurriculumStore();
  const {
    name,
    grade,
    xp,
    totalQuizzesAttempted,
    totalQuestionsAnswered,
    totalQuestionsCorrect,
    subjectProgress,
    quizHistory,
    mistakes,
    exportData,
    importData,
  } = useEduStore();

  const [activeSection, setActiveSection] = useState<"overview" | "mistakes">("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const pendingMistakes = mistakes.filter((m) => !m.mastered);
  const masteredMistakes = mistakes.filter((m) => m.mastered);

  const overallAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100)
    : 0;

  const allSubjects = getAllSubjects(grade);
  const allStages = getAllStages();
  const stageTitleMap = new Map(allStages.map((s) => [String(s.id), s.title]));

  // Include current grade subjects plus any subjects attempted historically
  const subjectIds = Array.from(
    new Set([
      ...allSubjects.map((s) => s.id),
      ...quizHistory.map((q) => q.subject),
    ])
  );

  // Compute subject accuracy
  const subjectStats = subjectIds.map((subId) => {
    const customSub = allSubjects.find((s) => s.id === subId);
    const meta = getSubjectMeta(subId);
    const attempts = quizHistory.filter((q) => q.subject === subId);
    const totalScore = attempts.reduce((acc, curr) => acc + curr.score, 0);
    const totalQs = attempts.reduce((acc, curr) => acc + curr.total, 0);
    const accuracy = totalQs > 0 ? Math.round((totalScore / totalQs) * 100) : 0;
    const completedCount = subjectProgress[subId]?.completedStages?.length || 0;

    return {
      key: subId,
      name: customSub?.name || meta?.name || subId,
      color: customSub?.color || meta?.color || "#38bdf8",
      accuracy,
      quizzes: attempts.length,
      completedStages: completedCount,
    };
  });

  const handleExport = () => {
    sound.playClick();
    const dataStr = exportData();
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `educhain-backup-${(name || "scholar").toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        sound.playUnlock();
        setImportStatus("Progress restored successfully!");
      } else {
        sound.playIncorrect();
        setImportStatus("Invalid file format. Please check JSON.");
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Sub-Navigation: Overview vs Review Errors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 pb-4 border-b border-slate-200/90 dark:border-[#263B5B]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-[#2563EB] dark:text-[#22D3EE] shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-[#2563EB] dark:text-[#22D3EE] font-bold">
              Scholar Progress Hub
            </span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            My Learning Progress
          </h1>
        </div>

        {/* Section Switcher Tabs */}
        <div className="flex items-center gap-1 border border-slate-200 dark:border-[#263B5B] rounded-2xl p-1 bg-white dark:bg-[#182438] shadow-xs">
          <button
            onClick={() => {
              setActiveSection("overview");
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === "overview"
                ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics & Stats</span>
          </button>

          <button
            onClick={() => {
              setActiveSection("mistakes");
              sound.playClick();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeSection === "mistakes"
                ? "bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs"
                : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            <span>Review Errors</span>
            {pendingMistakes.length > 0 && (
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                activeSection === "mistakes"
                  ? "bg-white/25 text-white"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
              }`}>
                {pendingMistakes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW A: MISTAKE FORGE (Review Errors embedded directly inside My Progress) */}
      {activeSection === "mistakes" ? (
        <MistakeForge />
      ) : (
        /* VIEW B: PERFORMANCE ANALYTICS & STATS */
        <>
          {/* Data Portability Controls Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8]">
              Track mastery trends across subjects, error distribution, and historical accuracy trajectories.
            </p>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleExport}
                className="btn-educhain-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                <span>Export Backup</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-educhain-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#2563EB] dark:text-[#22D3EE]" />
                <span>Import Backup</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />
            </div>
          </div>

          {importStatus && (
            <div className="mb-6 p-3.5 rounded-2xl border border-blue-500/30 bg-blue-500/10 text-[#2563EB] dark:text-[#22D3EE] text-xs font-mono font-bold text-center animate-in fade-in">
              {importStatus}
            </div>
          )}

          {/* Top Level Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-sm">
              <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Overall Accuracy</div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{overallAccuracy}%</div>
              <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 font-mono">{totalQuestionsCorrect} / {totalQuestionsAnswered} correct</div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-sm">
              <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Quizzes Done</div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{totalQuizzesAttempted}</div>
              <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 font-mono">across all subjects</div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-sm">
              <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Errors Mastered</div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {masteredMistakes.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 font-mono">{pendingMistakes.length} pending review</div>
            </div>

            <div className="p-5 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] card-lift shadow-sm">
              <div className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Total XP</div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{xp.toLocaleString()}</div>
              <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-1 font-mono">scholar points</div>
            </div>
          </div>

          {/* Quick Review Errors Banner if pending mistakes exist */}
          {pendingMistakes.length > 0 && (
            <div className="mb-8 p-5 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-[#182438] flex flex-col sm:flex-row sm:items-center justify-between gap-4 card-lift shadow-sm">
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-xs">
                  <Hammer className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    You have {pendingMistakes.length} missed question{pendingMistakes.length > 1 ? "s" : ""} waiting for mastery
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
                    Review and retry your mistakes in the Forge to gain back mastery and earn bonus XP.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSection("mistakes");
                  sound.playClick();
                }}
                className="btn-educhain-primary text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shrink-0 shadow-md font-bold"
              >
                <span>Review Errors Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Subject Performance Bars */}
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] mb-8 shadow-sm card-lift">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-6">
              Subject Mastery Comparison
            </h3>

            <div className="space-y-5">
              {subjectStats.map((sub) => (
                <div key={sub.key}>
                  <div className="flex items-center justify-between text-xs mb-2 font-mono">
                    <span className="text-slate-800 dark:text-[#F8FAFC] font-bold">{sub.name}</span>
                    <span className="text-slate-900 dark:text-white font-bold">
                      {sub.accuracy}% <span className="text-slate-400 dark:text-[#94A3B8] font-normal">({sub.quizzes} quizzes)</span>
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-[#101827] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-xs"
                      style={{
                        width: sub.quizzes === 0 ? "0%" : `${Math.max(4, sub.accuracy)}%`,
                        backgroundColor: sub.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Quiz Attempts Log */}
          <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] shadow-sm card-lift">
            <h3 className="font-heading text-base font-bold text-slate-900 dark:text-white mb-5">
              Recent Quiz Attempts Trajectory
            </h3>

            {quizHistory.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-[#94A3B8] text-xs font-mono">
                No quiz attempts recorded yet. Take a challenge in the Curriculum Chain to start plotting your trajectory!
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-[#263B5B]/50">
                {quizHistory.slice(-5).reverse().map((attempt, idx) => {
                  const stageLabel =
                    stageTitleMap.get(String(attempt.stageId)) ||
                    (typeof attempt.stageId === "number" ? `Stage ${attempt.stageId}` : "Custom Challenge");
                  const subName =
                    allSubjects.find((s) => s.id === attempt.subject)?.name ||
                    getSubjectMeta(attempt.subject)?.name ||
                    attempt.subject.replace(/_/g, " ");
                  return (
                    <div key={idx} className="py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] font-mono text-slate-400 dark:text-[#94A3B8] shrink-0">
                          {new Date(attempt.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {subName} • {stageLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 font-mono shrink-0">
                        <span className={attempt.accuracy >= 70 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-amber-600 dark:text-amber-400 font-bold"}>
                          {attempt.score}/{attempt.total} ({attempt.accuracy}%)
                        </span>
                        <span className="text-amber-600 dark:text-amber-400 font-bold">
                          +{attempt.xpEarned} XP
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};
