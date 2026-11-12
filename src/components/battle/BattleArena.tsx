"use client";

import React, { useEffect } from "react";
import { 
  Clock, 
  Flame, 
  CheckCircle2, 
  XCircle,
  ChevronRight
} from "lucide-react";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";

export const BattleArena: React.FC = () => {
  const {
    currentRoom,
    players,
    localPlayerId,
    localPlayerName,
    localPlayerAvatar,
    currentQuestionIndex,
    selectedOptionIndex,
    isAnswerSubmitted,
    questionTimeRemaining,
    opponentEventNotification,
    myScore,
    myStreak,
    myHealth,
    submitAnswer,
    advanceQuestion,
    gameStatus,
    countdownSeconds,
  } = useMultiplayerStore();

  // Timer countdown hook (must run before any early returns to keep React hook order consistent)
  useEffect(() => {
    if (!currentRoom || gameStatus !== "playing") return;

    const timer = setInterval(() => {
      const state = useMultiplayerStore.getState();
      const remaining = state.questionTimeRemaining;
      if (remaining > 1) {
        const nextRemaining = remaining - 1;
        if (nextRemaining <= 3 && !state.isAnswerSubmitted) {
          sound.playTick();
        }
        useMultiplayerStore.setState({ questionTimeRemaining: nextRemaining });
      } else {
        // Time expired! Auto submit wrong answer if not submitted
        if (!state.isAnswerSubmitted) {
          sound.playTimeUp();
          state.submitAnswer(-1);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentRoom, gameStatus, currentQuestionIndex]);

  if (!currentRoom) return null;

  const currentQ = currentRoom.questions[currentQuestionIndex];
  const totalQuestions = currentRoom.questions.length;

  // Find opponent in 1v1 duel
  const opponent = Object.values(players).find((p) => p.id !== localPlayerId);

  // If countdown overlay is active
  if (gameStatus === "countdown") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
        <div className="text-center space-y-4">
          <div className="text-xs font-mono font-bold uppercase tracking-widest text-[#22D3EE] animate-pulse">
            Battle Starting In
          </div>
          <div className="font-heading text-8xl sm:text-9xl font-extrabold font-mono text-white animate-bounce drop-shadow-[0_0_30px_rgba(34,211,238,0.5)]">
            {countdownSeconds}
          </div>
          <div className="text-sm font-semibold text-slate-400">
            Get ready to answer fast!
          </div>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const progressPercent = Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Real-time Opponent Attack Notification */}
      {opponentEventNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 sm:px-5 py-2 sm:py-2.5 max-w-[90vw] rounded-2xl sm:rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs shadow-2xl animate-bounce flex items-center justify-center gap-2 text-center whitespace-normal">
          <span>{opponentEventNotification}</span>
        </div>
      )}

      {/* Top Combat HUD (Split Screen HP & Scores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] shadow-xl card-lift">
        
        {/* Left: You */}
        <div className="flex items-center gap-3.5">
          <ScholarAvatar name={localPlayerName} avatar={localPlayerAvatar || "🧠"} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="truncate text-slate-900 dark:text-white font-heading">
                {localPlayerName} (You)
              </span>
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                {myScore} pts
              </span>
            </div>
            
            {/* Health Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#101827] overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ width: `${myHealth}%` }}
              />
            </div>

            {/* Streak Counter */}
            {myStreak > 1 && (
              <div className="flex items-center gap-1 text-[11px] font-mono text-amber-500 font-bold mt-1">
                <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>{myStreak}x Streak Combo!</span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Round Timer & Progress */}
        <div className="flex flex-col items-center justify-center py-2 border-y md:border-y-0 md:border-x border-slate-100 dark:border-[#263B5B]/60 px-4 text-center">
          <div className="text-[10px] font-mono text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-1 font-bold">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>

          <div className={`text-2xl font-mono font-extrabold flex items-center gap-1.5 ${
            questionTimeRemaining <= 5 ? "text-rose-500 animate-pulse drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "text-slate-900 dark:text-white"
          }`}>
            <Clock className="w-4 h-4" />
            <span>{questionTimeRemaining}s</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-[#101827] h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#2563EB] to-[#22D3EE] h-full transition-all duration-300 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Right: Opponent */}
        <div className="flex items-center gap-3.5">
          {opponent ? (
            <>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <span className="font-mono text-[#2563EB] dark:text-[#22D3EE] font-bold">
                    {opponent.score} pts
                  </span>
                  <span className="truncate text-slate-900 dark:text-white font-heading">
                    {opponent.name}
                  </span>
                </div>

                {/* Opponent Health Bar */}
                <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-[#101827] overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300 ml-auto shadow-[0_0_8px_rgba(34,211,238,0.5)]"
                    style={{ width: `${opponent.health}%` }}
                  />
                </div>

                {opponent.streak > 1 && (
                  <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-cyan-500 font-bold mt-1">
                    <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
                    <span>{opponent.streak}x Combo</span>
                  </div>
                )}
              </div>
              <ScholarAvatar name={opponent.name} avatar={opponent.avatar || "🥷"} size="lg" />
            </>
          ) : (
            <div className="text-center w-full text-xs text-slate-400 font-mono">
              Solo Match
            </div>
          )}
        </div>

      </div>

      {/* Main Question Card */}
      <div className="p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] shadow-xl space-y-5 sm:space-y-6 card-lift">
        
        {/* Category tags */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-[#94A3B8]">
          <span className="font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 min-w-0 break-words">
            {currentRoom.subjectName} • {currentRoom.chapter || "Quick Battle"}
          </span>
          <span className="font-mono font-bold shrink-0 whitespace-nowrap">
            Time limit: {currentRoom.timePerQuestion}s
          </span>
        </div>

        {/* Question Text */}
        <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {currentQ.question}
        </h3>

        {/* 4 Answer Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {currentQ.options.map((option, optIdx) => {
            const letter = String.fromCharCode(65 + optIdx);
            const isSelected = selectedOptionIndex === optIdx;
            const isCorrectOption = optIdx === currentQ.correctIndex;

            let buttonStyle = "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/70 text-slate-800 dark:text-[#F8FAFC] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 hover:bg-slate-100 dark:hover:bg-[#1e2f47] card-lift";

            if (isAnswerSubmitted) {
              if (isCorrectOption) {
                buttonStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)] ring-2 ring-emerald-500/40";
              } else if (isSelected) {
                buttonStyle = "border-rose-500 bg-rose-500/15 text-rose-800 dark:text-rose-300 font-medium ring-2 ring-rose-500/40";
              } else {
                buttonStyle = "border-slate-200/50 dark:border-[#263B5B]/30 opacity-40 text-slate-400";
              }
            }

            return (
              <button
                key={optIdx}
                disabled={isAnswerSubmitted}
                onClick={() => submitAnswer(optIdx)}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all duration-200 disabled:cursor-not-allowed ${buttonStyle}`}
              >
                <span className="w-7 h-7 rounded-xl font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-slate-300 dark:border-[#263B5B] bg-white dark:bg-[#141f30] text-slate-700 dark:text-slate-200 shadow-2xs">
                  {letter}
                </span>
                <span className="text-xs sm:text-sm font-medium mt-0.5 leading-snug">
                  {option}
                </span>

                {isAnswerSubmitted && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto shrink-0 mt-0.5" />
                )}
                {isAnswerSubmitted && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-rose-500 ml-auto shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation & Next Question Button */}
        {isAnswerSubmitted && (
          <div className="pt-4 border-t border-slate-100 dark:border-[#263B5B]/70 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
            <div className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed max-w-lg">
              <strong className="text-slate-900 dark:text-white">Explanation: </strong>
              {currentQ.explanation || "Correct answer verified by curriculum."}
            </div>

            <button
              onClick={() => {
                sound.playClick();
                advanceQuestion();
              }}
              className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold btn-educhain-primary flex items-center justify-center gap-1.5 shadow-md"
            >
              <span>{currentQuestionIndex + 1 < totalQuestions ? "Next Question" : "View Final Results"}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
