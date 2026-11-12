"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { 
  Trophy, 
  Crown, 
  Zap, 
  ArrowLeft, 
  Sparkles,
  PartyPopper
} from "lucide-react";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { useEduStore } from "@/store/useEduStore";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";

export const BattlePodium: React.FC = () => {
  const { podiumResults, localPlayerId, currentRoom, leaveRoom } = useMultiplayerStore();
  const { addXp } = useEduStore();
  const xpAwardedRef = useRef(false);
  const cheeredRef = useRef(false);

  const winner = podiumResults[0];
  const myResult = podiumResults.find((p) => p.playerId === localPlayerId);
  const isMeWinner = winner?.playerId === localPlayerId;

  const fireChampionConfetti = () => {
    sound.playChampion();
    try {
      confetti({
        particleCount: 95,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#F59E0B", "#22D3EE", "#2563EB", "#A78BFA", "#34D399"],
      });
      setTimeout(() => {
        confetti({
          particleCount: 55,
          angle: 60,
          spread: 60,
          origin: { x: 0.08, y: 0.65 },
        });
        confetti({
          particleCount: 55,
          angle: 120,
          spread: 60,
          origin: { x: 0.92, y: 0.65 },
        });
      }, 220);
    } catch {
      // Ignore if reduced-motion or confetti fails
    }
  };

  // Automatically credit earned XP and cheer #1 winner
  useEffect(() => {
    if (!xpAwardedRef.current && myResult && myResult.xpEarned > 0) {
      xpAwardedRef.current = true;
      addXp(myResult.xpEarned);
    }
  }, [myResult, addXp]);

  useEffect(() => {
    if (!cheeredRef.current && podiumResults.length > 0 && isMeWinner) {
      cheeredRef.current = true;
      fireChampionConfetti();
    }
  }, [podiumResults.length, isMeWinner]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇 #1 Champion";
    if (rank === 2) return "🥈 Rank #2";
    if (rank === 3) return "🥉 Rank #3";
    return `🏅 Rank #${rank}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Top Card */}
      <div className={`p-5 sm:p-10 rounded-3xl border bg-white dark:bg-[#182438] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] text-center space-y-5 sm:space-y-6 card-lift ${
        isMeWinner
          ? "border-amber-400/50 dark:border-amber-400/40 ring-1 ring-amber-400/30"
          : "border-slate-200 dark:border-[#263B5B]"
      }`}>
        
        {/* Fanfare icon */}
        <div className={`inline-flex p-5 rounded-3xl border ${
          isMeWinner
            ? "bg-gradient-to-br from-amber-500/20 via-yellow-400/15 to-cyan-500/15 text-amber-500 border-amber-400/40 shadow-[0_0_32px_rgba(245,158,11,0.3)]"
            : "bg-amber-500/15 text-amber-500 border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.2)]"
        }`}>
          {isMeWinner ? <Crown className="w-12 h-12 animate-bounce fill-amber-400/30" /> : <Trophy className="w-12 h-12 animate-bounce" />}
        </div>

        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {isMeWinner ? "👑 Arena Champion — #1 Ranked!" : "Battle Completed"}
          </span>
          <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            {isMeWinner ? "🎉 Victory is Yours!" : "⚔️ Great Effort, Keep Rising!"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1">
            {currentRoom?.subjectName} • {currentRoom?.roomName}
          </p>
        </div>

        {isMeWinner && (
          <div className="p-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-cyan-500/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <PartyPopper className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Standing Ovation for {myResult?.name || "Champion"}!
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  You topped this match podium with {myResult?.score ?? 0} points.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fireChampionConfetti}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Encore Cheer</span>
            </button>
          </div>
        )}

        {/* Podium Standings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {podiumResults.map((player, idx) => {
            const isWinner = idx === 0;
            const isSelf = player.playerId === localPlayerId;

            return (
              <div
                key={player.playerId}
                className={`p-4 sm:p-5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all card-lift ${
                  isWinner
                    ? "border-amber-400/60 bg-gradient-to-br from-amber-500/15 to-transparent shadow-md ring-1 ring-amber-400/40"
                    : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <ScholarAvatar name={player.name} avatar={player.avatar} size="lg" />
                    {isWinner && (
                      <Crown className="w-4 h-4 text-amber-400 absolute -top-2 -right-1 fill-amber-400 animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-heading font-bold text-sm text-slate-900 dark:text-white truncate">
                        {player.name}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] font-mono font-bold text-[#22D3EE]">(You)</span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-[#94A3B8] block">
                      {getRankBadge(player.rank)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono font-extrabold text-slate-900 dark:text-white">
                    {player.score} pts
                  </div>
                  <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 justify-end">
                    <Zap className="w-3 h-3 fill-current" />
                    <span>+{player.xpEarned} XP</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* XP Bonus Notice */}
        {myResult && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              You earned <strong>+{myResult.xpEarned} XP</strong> added to your total Scholar profile!
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              leaveRoom();
            }}
            className="w-full sm:w-auto px-7 py-3 rounded-xl text-xs font-bold btn-educhain-primary flex items-center justify-center gap-2 shadow-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Battle Arena</span>
          </button>
        </div>

      </div>

    </div>
  );
};
