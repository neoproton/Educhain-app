"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Stage, Question } from "@/types/curriculum";
import { useEduStore } from "@/store/useEduStore";
import { BENCHMARK_PLAYERS } from "@/data/constants";
import { supabase } from "@/lib/supabase/client";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import confetti from "canvas-confetti";
import { 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ChevronRight, 
  RotateCcw, 
  ArrowRight,
  Crown,
  Flame,
  Trophy
} from "lucide-react";

interface QuizModalProps {
  stage: Stage;
  onClose: () => void;
  onNextStage?: () => void;
  onOpenLeaderboard?: () => void;
}

const QUESTION_TIMER_SECONDS = 20;

export const QuizModal: React.FC<QuizModalProps> = ({ stage, onClose, onNextStage, onOpenLeaderboard }) => {
  // Lock background webpage scrolling while the quiz modal is open
  useBodyScrollLock(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const modalCardRef = useRef<HTMLDivElement>(null);

  const { recordQuizAttempt } = useEduStore();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIMER_SECONDS);
  const [score, setScore] = useState(0);
  const [fastAnswersCount, setFastAnswersCount] = useState(0);
  const [answerCombo, setAnswerCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [missedList, setMissedList] = useState<Question[]>([]);
  const [topLeaderboardsReached, setTopLeaderboardsReached] = useState<string[]>([]);

  // Reset all state when stage changes
  useEffect(() => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(QUESTION_TIMER_SECONDS);
    setScore(0);
    setFastAnswersCount(0);
    setAnswerCombo(0);
    setBestCombo(0);
    setIsFinished(false);
    setMissedList([]);
    setTopLeaderboardsReached([]);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [stage.id]);

  const questions = stage.questions || [];
  const hasQuestions = questions.length > 0;
  const currentQ = questions[currentIdx];

  const handleFinish = useCallback(async () => {
    if (!hasQuestions) return;
    setIsFinished(true);
    const finalAccuracy = Math.round((score / questions.length) * 100);
    const xpEarned = Math.round((score / questions.length) * stage.xpReward);

    if (finalAccuracy === 100) {
      sound.playAchievement();
      confetti({
        particleCount: 110,
        spread: 85,
        origin: { y: 0.55 },
        colors: ["#F59E0B", "#22D3EE", "#2563EB", "#A78BFA", "#10B981"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#F59E0B", "#22D3EE", "#A78BFA"],
        });
      }, 200);
    } else if (finalAccuracy >= 70) {
      sound.playUnlock();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#2563EB", "#22D3EE", "#A78BFA", "#F59E0B"],
      });
    } else {
      sound.playIncorrect();
    }

    recordQuizAttempt({
      stageId: stage.id,
      subject: stage.subject || "science",
      score,
      total: questions.length,
      accuracy: finalAccuracy,
      xpEarned,
      fastAnswersCount,
      missedQuestions: missedList,
    });

    // Check if the scholar just claimed #1 on any Global Leaderboard
    try {
      const store = useEduStore.getState();
      const myXp = store.xp;
      const myStages = store.completedStages.length;
      const myStreak = store.currentStreak;
      const myAccuracy = store.totalQuestionsAnswered > 0
        ? Math.round((store.totalQuestionsCorrect / store.totalQuestionsAnswered) * 100)
        : 0;
      const myQuizzes = store.totalQuizzesAttempted;

      const { data: sessionData } = await supabase.auth.getSession();
      const myId = sessionData?.session?.user?.id || store.id;

      let competitors = BENCHMARK_PLAYERS.map((b) => ({
        id: b.id,
        xp: b.xp,
        stages: b.stages,
        streak: b.streak,
        accuracy: b.accuracy,
        quizzes: b.quizzes,
      }));

      const { data: cloudProfiles, error } = await supabase
        .from("profiles")
        .select("id, xp, stages_completed, current_streak, accuracy, quizzes_attempted")
        .limit(100);

      if (!error && cloudProfiles && cloudProfiles.length > 0) {
        competitors = cloudProfiles
          .filter((p) => !myId || p.id !== myId)
          .map((p) => ({
            id: p.id,
            xp: p.xp || 0,
            stages: p.stages_completed || 0,
            streak: p.current_streak || 0,
            accuracy: p.accuracy || 0,
            quizzes: p.quizzes_attempted || 0,
          }));
      }

      if (competitors.length > 0 && myXp > 0) {
        const maxXp = Math.max(...competitors.map((c) => c.xp), 0);
        const maxStages = Math.max(...competitors.map((c) => c.stages), 0);
        const maxStreak = Math.max(...competitors.map((c) => c.streak), 0);
        const qualifiedAcc = competitors.filter((c) => c.quizzes >= 2);
        const maxAcc = qualifiedAcc.length > 0 ? Math.max(...qualifiedAcc.map((c) => c.accuracy), 0) : 0;

        const topped: string[] = [];
        if (myXp >= maxXp && myXp > 0) topped.push("XP Points");
        if (myStages >= maxStages && myStages > 0) topped.push("Stages Cleared");
        if (myStreak >= maxStreak && myStreak > 0) topped.push("Streak Chain");
        if (myQuizzes >= 2 && myAccuracy >= maxAcc && myAccuracy > 0) topped.push("Accuracy");

        if (topped.length > 0) {
          setTopLeaderboardsReached(topped);
          setTimeout(() => {
            sound.playChampion();
            confetti({
              particleCount: 120,
              spread: 95,
              origin: { y: 0.5 },
              colors: ["#F59E0B", "#FDE047", "#22D3EE", "#2563EB"],
            });
          }, 350);
        }
      }
    } catch {
      // Leaderboard crown check is progressive enhancement; ignore offline failures
    }
  }, [hasQuestions, score, questions.length, stage, fastAnswersCount, missedList, recordQuizAttempt]);

  const handleSelectAnswer = useCallback((idx: number) => {
    if (isAnswered || !currentQ) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;
    if (isCorrect) {
      sound.playCorrect();
      setScore((s) => s + 1);
      if (timeLeft >= 15) {
        setFastAnswersCount((c) => c + 1);
      }
      setAnswerCombo((prev) => {
        const next = prev + 1;
        setBestCombo((b) => Math.max(b, next));
        return next;
      });
    } else {
      sound.playIncorrect();
      setAnswerCombo(0);
      setMissedList((m) => [...m, currentQ]);
    }

    // Gentle auto-scroll down to show explanation & Next button if needed
    setTimeout(() => {
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }, 120);
  }, [isAnswered, currentQ, timeLeft]);

  // Countdown Timer
  useEffect(() => {
    if (!hasQuestions || isAnswered || isFinished || !currentQ) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          sound.playTimeUp();
          setIsAnswered(true);
          setSelectedOption(null); // Time out
          setAnswerCombo(0);
          setMissedList((m) => [...m, currentQ]);
          return 0;
        }
        if (prev <= 5) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasQuestions, isAnswered, isFinished, currentQ]);

  const handleNextQuestion = useCallback(() => {
    sound.playClick();
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(QUESTION_TIMER_SECONDS);
      
      // Scroll back to top for the new question
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      handleFinish();
    }
  }, [currentIdx, questions.length, handleFinish]);

  // Keyboard shortcut listener (1, 2, 3, 4, Enter/Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || !currentQ) return;
      if (!isAnswered) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const index = parseInt(e.key, 10) - 1;
          if (index < (currentQ.options?.length || 0)) {
            handleSelectAnswer(index);
          }
        }
      } else {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnswered, isFinished, currentQ, handleSelectAnswer, handleNextQuestion]);

  const handleRestart = () => {
    sound.playClick();
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(QUESTION_TIMER_SECONDS);
    setScore(0);
    setFastAnswersCount(0);
    setAnswerCombo(0);
    setBestCombo(0);
    setIsFinished(false);
    setMissedList([]);
    setTopLeaderboardsReached([]);
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!hasQuestions || !currentQ) {
    return (
      <div className="fixed inset-0 z-50 bg-black/65 dark:bg-[#101827]/85 backdrop-blur-md p-4 flex items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] p-8 text-center shadow-2xl space-y-4">
          <div className="text-4xl">📭</div>
          <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
            No Questions Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
            This stage doesn&apos;t have any MCQs yet. Add questions in Admin Studio to start playing.
          </p>
          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="btn-educhain-primary px-6 py-2.5 rounded-xl text-xs font-bold"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const finalAccuracy = Math.round((score / questions.length) * 100);
  const passed = finalAccuracy >= 70;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/65 dark:bg-[#101827]/85 backdrop-blur-md p-3 sm:p-4 md:p-6 flex items-start sm:items-center justify-center animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.playClick();
          onClose();
        }
      }}
    >
      <div 
        ref={modalCardRef}
        className="relative w-full max-w-2xl my-auto max-h-[88vh] sm:max-h-[85vh] bg-white dark:bg-[#182438] border border-slate-200 dark:border-[#263B5B] rounded-3xl shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top subtle gradient accent border */}
        <div className="h-[2px] w-full bg-gradient-to-r from-[#2563EB] via-[#22D3EE] to-[#A78BFA] shrink-0" />

        {/* Pinned Top Header Bar */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#263B5B]/80 bg-slate-50/95 dark:bg-[#141f30]/95 backdrop-blur-sm z-10">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE] font-bold">
                {stage.subjectName || "Challenge"}{stage.subjectStageNumber ? ` • Stage ${stage.subjectStageNumber}` : ""}
              </span>
              {stage.chapter && (
                <>
                  <span className="text-slate-300 dark:text-white/20">•</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate max-w-[200px] sm:max-w-none">
                    {stage.chapter}
                  </span>
                </>
              )}
            </div>
            <h2 className="font-heading text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {stage.title}
            </h2>
          </div>

          <button
            onClick={() => { sound.playClick(); onClose(); }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223149] transition-colors cursor-pointer shrink-0"
            title="Close quiz"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: ACTIVE QUIZ WITH SMOOTH VERTICAL SCROLL */}
        {/* ========================================================= */}
        {!isFinished ? (
          <div 
            ref={scrollAreaRef}
            className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-8 space-y-5 sm:space-y-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            
            {/* Progress & Timer Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-slate-500 dark:text-[#94A3B8] font-medium">
                <span>
                  Question <span className="text-slate-900 dark:text-white font-bold">{currentIdx + 1}</span> of {questions.length}
                </span>
                {answerCombo >= 2 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold animate-in zoom-in-95 duration-200">
                    <Flame className="w-3 h-3 fill-current" />
                    <span>{answerCombo}x Combo!</span>
                  </span>
                )}
              </div>

              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
                timeLeft <= 5 
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse font-bold shadow-[0_0_10px_rgba(244,63,94,0.3)]" 
                  : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 text-slate-700 dark:text-slate-200 font-bold"
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-[#101827] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2563EB] to-[#22D3EE] transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question Text */}
            <div>
              <h3 className="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-[#F8FAFC] leading-relaxed">
                {currentQ.question}
              </h3>
            </div>

            {/* 4 Answer Options */}
            <div className="grid grid-cols-1 gap-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === currentQ.correctIndex;
                const optionLetter = String.fromCharCode(65 + idx);

                let btnStyles = "border-slate-200 dark:border-[#263B5B] bg-slate-50/80 dark:bg-[#101827]/70 hover:bg-slate-100 dark:hover:bg-[#1e2e46] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 text-slate-800 dark:text-[#F8FAFC] card-lift";

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyles = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.25)]";
                  } else if (isSelected) {
                    btnStyles = "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-medium";
                  } else {
                    btnStyles = "border-slate-200/50 dark:border-[#263B5B]/30 bg-slate-100/40 dark:bg-[#101827]/40 text-slate-400 dark:text-slate-500 opacity-60";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full p-3 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all group cursor-pointer disabled:cursor-default ${btnStyles}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-xl bg-slate-200/80 dark:bg-[#223149] flex items-center justify-center text-xs font-mono font-bold text-slate-600 dark:text-slate-300 group-hover:text-[#2563EB] dark:group-hover:text-[#22D3EE] transition-colors shrink-0">
                        {optionLetter}
                      </span>
                      <span className="text-[13px] sm:text-sm font-medium break-words">{opt}</span>
                    </div>

                    {isAnswered && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation Box (Revealed on Answer) */}
            {isAnswered && (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-blue-500/20 dark:border-[#22D3EE]/30 bg-blue-50/70 dark:bg-[#223149]/60 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#2563EB] dark:text-[#22D3EE] font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Curriculum Insight</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Navigation Action Area directly below options & explanation */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#263B5B]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="hidden sm:block text-xs text-slate-400 dark:text-[#94A3B8] font-mono">
                {isAnswered ? "Press [Enter] or Click Next" : "Press [1-4] or Click Option"}
              </div>

              <button
                disabled={!isAnswered}
                onClick={handleNextQuestion}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                  isAnswered
                    ? "btn-educhain-primary hover:gap-2.5 cursor-pointer shadow-blue-500/25 ring-2 ring-cyan-400/30"
                    : "bg-slate-100 dark:bg-[#223149] text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
                }`}
              >
                <span>{currentIdx + 1 < questions.length ? "Next Question" : "View Results"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* ========================================================= */
          /* VIEW 2: RESULTS SCREEN WITH SCROLL */
          /* ========================================================= */
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-10 text-center flex flex-col items-center">
            <div className="my-auto w-full flex flex-col items-center">

            {topLeaderboardsReached.length > 0 && (
              <div className="w-full max-w-md mb-4 p-4 rounded-2xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-amber-500/15 shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-300 text-xs font-mono font-extrabold uppercase tracking-wider mb-1">
                  <Crown className="w-4 h-4 fill-current animate-bounce" />
                  <span>New #1 Leaderboard Crown Claimed!</span>
                  <Crown className="w-4 h-4 fill-current animate-bounce" />
                </div>
                <p className="text-xs text-slate-700 dark:text-amber-100/90 font-medium leading-relaxed">
                  You just climbed to the <strong className="font-extrabold">Rank #1 spot</strong> in{" "}
                  <span className="font-bold text-amber-700 dark:text-amber-300">
                    {topLeaderboardsReached.join(" • ")}
                  </span>!
                </p>
              </div>
            )}

            {finalAccuracy === 100 && (
              <div className="mb-4 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 text-xs font-mono font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-2 border border-amber-300 animate-bounce">
                <span>⭐</span>
                <span>Flawless 100% Score • Perfect Quest</span>
                <span>⭐</span>
              </div>
            )}

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#2563EB]/15 to-[#22D3EE]/20 border border-[#2563EB]/30 dark:border-[#22D3EE]/40 flex items-center justify-center text-4xl mb-4 shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-bounce shrink-0">
              {passed ? "👑" : "📚"}
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              {passed ? "Stage Conquered!" : "Keep Striving!"}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] max-w-sm mb-6 leading-relaxed">
              {passed 
                ? `Outstanding performance. You have mastered ${stage.title} and unlocked the next link in the chain.`
                : "You scored under 70%. Review the questions, master your missed concepts in the Mistake Forge, and try again!"}
            </p>

            {/* Metric Cards Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5 w-full max-w-md mb-6">
              <div className="p-2.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 card-lift">
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Score</div>
                <div className="font-heading text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{score}/{questions.length}</div>
              </div>

              <div className="p-2.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 card-lift">
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">Accuracy</div>
                <div className={`font-heading text-lg sm:text-2xl font-extrabold mt-1 ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {finalAccuracy}%
                </div>
              </div>

              <div className="p-2.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 card-lift">
                <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] uppercase font-bold">XP Earned</div>
                <div className="font-heading text-lg sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                  +{Math.round((score / questions.length) * stage.xpReward)}
                </div>
              </div>
            </div>

            {(bestCombo >= 3 || fastAnswersCount > 0) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                {bestCombo >= 3 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-mono font-bold">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>Best Combo: {bestCombo}x</span>
                  </span>
                )}
                {fastAnswersCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 dark:text-cyan-300 text-[11px] font-mono font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{fastAnswersCount} Fast-Thinker {fastAnswersCount === 1 ? "Reply" : "Replies"}</span>
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <button
                onClick={handleRestart}
                className="btn-educhain-secondary flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Challenge</span>
              </button>

              {topLeaderboardsReached.length > 0 && onOpenLeaderboard && (
                <button
                  onClick={() => {
                    sound.playChampion();
                    confetti({
                      particleCount: 90,
                      spread: 80,
                      origin: { y: 0.6 },
                      colors: ["#F59E0B", "#FDE047", "#22D3EE", "#2563EB"],
                    });
                    onClose();
                    onOpenLeaderboard();
                  }}
                  className="flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:brightness-105 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>View #1 Crown</span>
                </button>
              )}

              {passed && onNextStage ? (
                <button
                  onClick={() => { sound.playClick(); onNextStage(); }}
                  className="btn-educhain-primary flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => { sound.playClick(); onClose(); }}
                  className="btn-educhain-primary flex-1 min-w-[130px] py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Return to Map</span>
                </button>
              )}
            </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
