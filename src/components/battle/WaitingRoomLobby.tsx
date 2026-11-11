"use client";

import React, { useState } from "react";
import { 
  Swords, 
  Users, 
  Copy, 
  Check, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Circle,
  Crown,
  Play
} from "lucide-react";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";

export const WaitingRoomLobby: React.FC = () => {
  const { 
    currentRoom, 
    players, 
    localPlayerId, 
    isHost, 
    isReady, 
    toggleReady, 
    startMatch, 
    leaveRoom 
  } = useMultiplayerStore();

  const [copiedLink, setCopiedLink] = useState(false);

  if (!currentRoom) return null;

  const playerList = Object.values(players);
  const totalPlayers = playerList.length;
  const readyCount = playerList.filter((p) => p.isReady).length;
  const canStart = isHost && totalPlayers >= 2 && readyCount === totalPlayers;

  const copyInvite = () => {
    sound.playClick();
    const url = typeof window !== "undefined" 
      ? `${window.location.origin}/battle?room=${currentRoom.roomCode}`
      : `https://educhain-app.vercel.app/battle?room=${currentRoom.roomCode}`;

    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Top Bar with Leave */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            sound.playClick();
            leaveRoom();
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-[#182438]/80 hover:bg-neutral-100 dark:hover:bg-[#223149] text-neutral-700 dark:text-neutral-200 transition-all shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Leave Room</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            Realtime Lobby Active
          </span>
        </div>
      </div>

      {/* Main Room Card */}
      <div className="relative rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#182438] shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden">
        {/* Subtle decorative gradient overlay */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Room Header & Code Banner */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-bold shadow-xs">
                {currentRoom.mode === "duel" ? "⚔️ 1v1 Duel" : "👥 Party Mode"}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                Host: <strong className="text-neutral-900 dark:text-neutral-200">{currentRoom.hostName}</strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight font-space-grotesk">
              {currentRoom.roomName}
            </h2>
          </div>

          {/* Big Room Code Box */}
          <div className="flex items-center gap-3 bg-neutral-100 dark:bg-[#101827]/80 p-3 pl-4 rounded-2xl border border-neutral-200 dark:border-white/10 shadow-inner">
            <div>
              <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-semibold">Room Code</div>
              <div className="text-xl sm:text-2xl font-mono font-extrabold tracking-widest bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400 bg-clip-text text-transparent">
                {currentRoom.roomCode}
              </div>
            </div>

            <button
              onClick={copyInvite}
              className="ml-2 px-3.5 py-2.5 rounded-xl text-xs font-bold btn-educhain-primary flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
              <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
            </button>
          </div>
        </div>

        {/* Configuration Pills */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-[#101827]/60 text-neutral-700 dark:text-neutral-300 font-medium">
            📚 Subject: <strong className="text-blue-600 dark:text-cyan-400">{currentRoom.subjectName}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-[#101827]/60 text-neutral-700 dark:text-neutral-300 font-medium">
            🎯 Scope: <strong className="text-neutral-900 dark:text-white">{currentRoom.chapter || "All Chapters"}</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-[#101827]/60 text-neutral-700 dark:text-neutral-300 font-medium">
            ⚡ <strong>{currentRoom.questionCount} Questions</strong>
          </div>
          <div className="px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-[#101827]/60 text-neutral-700 dark:text-neutral-300 font-medium">
            ⏱️ <strong>{currentRoom.timePerQuestion}s / Question</strong>
          </div>
        </div>

        {/* Players in Room */}
        <div className="relative z-10 space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Players Joined ({totalPlayers} {currentRoom.mode === "duel" ? "/ 2" : ""})
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
              {readyCount} of {totalPlayers} Ready
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {playerList.map((player) => {
              const isSelf = player.id === localPlayerId;

              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between card-lift ${
                    player.isReady
                      ? "border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                      : "border-neutral-200 dark:border-white/10 bg-neutral-50/70 dark:bg-[#223149]/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ScholarAvatar name={player.name} avatar={player.avatar || "🧠"} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-neutral-900 dark:text-white">
                          {player.name} {isSelf && <span className="text-cyan-600 dark:text-cyan-400 font-normal text-xs">(You)</span>}
                        </span>
                        {player.isHost && (
                          <span title="Host">
                            <Crown className="w-4 h-4 text-amber-500 drop-shadow-sm" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block font-mono">
                        {player.isHost ? "Room Creator" : "Challenger"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                    {player.isReady ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-200/50 dark:bg-white/5 border border-neutral-300/60 dark:border-white/10 text-neutral-500 dark:text-neutral-400">
                        <Circle className="w-3.5 h-3.5" />
                        <span>Waiting</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty challenger slot for 1v1 */}
            {currentRoom.mode === "duel" && totalPlayers < 2 && (
              <div className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-white/15 bg-neutral-50/40 dark:bg-[#223149]/30 flex items-center justify-center gap-2 text-neutral-400 text-xs">
                <span className="animate-pulse">Waiting for opponent to join...</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="relative z-10 pt-6 border-t border-neutral-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Ready Toggle for Non-Hosts */}
          {!isHost && (
            <button
              onClick={toggleReady}
              className={`w-full sm:w-auto px-7 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                isReady
                  ? "bg-neutral-200 dark:bg-[#223149] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-[#2e4262]"
                  : "btn-educhain-primary"
              }`}
            >
              {isReady ? <Circle className="w-4 h-4 text-emerald-500" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isReady ? "Cancel Ready" : "I'm Ready!"}</span>
            </button>
          )}

          {/* Host Start Battle Button */}
          {isHost && (
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {totalPlayers < 2 
                  ? "Share the room code or invite link with a friend to begin."
                  : !canStart
                  ? "Waiting for all players to click Ready..."
                  : "All players are ready for battle!"}
              </span>

              <button
                disabled={!canStart}
                onClick={startMatch}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl text-xs font-extrabold btn-educhain-primary flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:hover:scale-100 cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Battle!</span>
              </button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
