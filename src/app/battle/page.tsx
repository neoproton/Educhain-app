"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { 
  Swords, 
  ArrowLeft, 
  Plus, 
  LogIn, 
  Globe, 
  ChevronRight, 
  RefreshCw 
} from "lucide-react";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { useEduStore } from "@/store/useEduStore";
import { CreateRoomModal } from "@/components/battle/CreateRoomModal";
import { WaitingRoomLobby } from "@/components/battle/WaitingRoomLobby";
import { BattleArena } from "@/components/battle/BattleArena";
import { BattlePodium } from "@/components/battle/BattlePodium";
import { MultiplayerRoom } from "@/types/multiplayer";
import { sound } from "@/lib/audio";

function BattleContent() {
  const searchParams = useSearchParams();
  const roomQueryCode = searchParams.get("room");

  const { 
    gameStatus, 
    joinRoom, 
    setLocalPlayer, 
    fetchPublicRooms,
    localPlayerId 
  } = useMultiplayerStore();

  const { name, avatar } = useEduStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<MultiplayerRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Sync user identity to multiplayer store
  useEffect(() => {
    const id = localPlayerId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setLocalPlayer(id, name || "Scholar", avatar || "🧠");
  }, [name, avatar, setLocalPlayer, localPlayerId]);

  // Leave room cleanly if navigating away from /battle
  useEffect(() => {
    return () => {
      useMultiplayerStore.getState().leaveRoom();
    };
  }, []);

  // Load public rooms
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    const rooms = await fetchPublicRooms();
    setPublicRooms(rooms);
    setLoadingRooms(false);
  }, [fetchPublicRooms]);

  const handleJoin = useCallback(async (codeToJoin?: string) => {
    const code = (codeToJoin ?? joinCodeInput).trim().toUpperCase();
    if (!code) {
      setErrorMessage("Please enter a 6-digit room code.");
      return;
    }

    setIsJoining(true);
    setErrorMessage(null);
    sound.playClick();

    const res = await joinRoom(code);
    setIsJoining(false);

    if (res.success) {
      sound.playUnlock();
    } else {
      setErrorMessage(res.error || "Failed to join room.");
    }
  }, [joinCodeInput, joinRoom]);

  useEffect(() => {
    if (gameStatus === "idle") {
      const timer = setTimeout(() => {
        void loadRooms();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [gameStatus, loadRooms]);

  // If URL has ?room=CODE, attempt auto-join
  useEffect(() => {
    if (roomQueryCode && gameStatus === "idle") {
      const timer = setTimeout(() => {
        setJoinCodeInput(roomQueryCode);
        void handleJoin(roomQueryCode);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [roomQueryCode, gameStatus, handleJoin]);

  // Render Game Views
  if (gameStatus === "lobby") {
    return <WaitingRoomLobby />;
  }

  if (gameStatus === "countdown" || gameStatus === "playing") {
    return <BattleArena />;
  }

  if (gameStatus === "podium") {
    return <BattlePodium />;
  }

  // Idle Home Screen (Hub)
  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* Hero Banner */}
      <div className="p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-gradient-to-br dark:from-[#182438] dark:via-[#1e3250] dark:to-[#182438] shadow-xl dark:shadow-[0_15px_45px_rgba(16,24,39,0.5)] relative overflow-hidden card-lift">
        <div className="absolute top-0 right-0 w-96 h-96 glow-orb-cyan pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 glow-orb-blue pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden border border-[#2563EB]/40 dark:border-[#22D3EE]/40 bg-[#101827] shadow-md shrink-0">
              <Image src="/logo.png" alt="EduChain Logo" fill sizes="44px" className="object-cover" priority />
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs">
              <Swords className="w-3.5 h-3.5 animate-pulse" />
              <span>Real-Time Multiplayer Arena</span>
            </div>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Challenge Your Friends in Live Quiz Showdowns
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            Create custom battle rooms configured for any subject and chapter, or join live lobbies to test your speed, combos, and knowledge in head-to-head multiplayer.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3.5">
            <button
              onClick={() => {
                sound.playClick();
                setIsCreateOpen(true);
              }}
              className="btn-educhain-primary px-7 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Room</span>
            </button>

            <Link
              href="/"
              className="btn-educhain-secondary px-6 py-3.5 rounded-2xl text-xs font-bold"
            >
              <span>Back to Solo Quests</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
          {errorMessage}
        </div>
      )}

      {/* Join Room Box */}
      <div className="p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] shadow-sm card-lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <LogIn className="w-4 h-4 text-[#22D3EE]" />
              <span>Have an Invite Code?</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
              Enter the 6-character room code shared by your friend (e.g. EDU-482)
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="EDU-XXX"
              maxLength={8}
              className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827] text-sm font-mono font-extrabold tracking-widest text-slate-900 dark:text-white uppercase placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
            />

            <button
              disabled={isJoining || !joinCodeInput.trim()}
              onClick={() => handleJoin()}
              className="btn-educhain-primary px-6 py-2.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <span>{isJoining ? "Joining..." : "Join Battle"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Open Public Rooms */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-500" />
            <h3 className="font-heading text-sm font-bold text-slate-900 dark:text-white">
              Open Public Rooms
            </h3>
          </div>

          <button
            onClick={loadRooms}
            disabled={loadingRooms}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-bold font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {publicRooms.length === 0 ? (
          <div className="p-8 sm:p-12 rounded-3xl border border-dashed border-slate-300 dark:border-[#263B5B] bg-white/60 dark:bg-[#182438]/40 text-center space-y-3">
            <div className="text-4xl mb-2">⚔️</div>
            <div className="font-heading text-sm font-bold text-slate-800 dark:text-slate-200">
              No public lobbies waiting right now
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8] max-w-sm mx-auto">
              Be the first! Click &ldquo;Create Custom Room&rdquo; above and set it to Public so other scholars can join your arena.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicRooms.map((room) => (
              <div
                key={room.id}
                className="p-6 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-all duration-300 shadow-sm card-lift space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                    {room.mode === "duel" ? "⚔️ 1v1" : "👥 Party"}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-[#94A3B8]">
                    {room.roomCode}
                  </span>
                </div>

                <div>
                  <h4 className="font-heading font-bold text-sm text-slate-900 dark:text-white truncate">
                    {room.roomName}
                  </h4>
                  <div className="text-xs text-slate-500 dark:text-[#94A3B8] truncate mt-0.5">
                    {room.subjectName} • {room.chapter || "All Chapters"}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-[#263B5B]/60 text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono">
                  <span>Host: {room.hostName}</span>
                  <span>{room.questionCount} Qs • {room.timePerQuestion}s</span>
                </div>

                <button
                  onClick={() => handleJoin(room.roomCode)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold btn-educhain-primary flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Join Room</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

    </div>
  );
}

export default function BattlePage() {
  return (
    <div className="min-h-screen educhain-bg vercel-grid text-slate-900 dark:text-[#F8FAFC] font-sans selection:bg-[#2563EB] selection:text-white dark:selection:bg-[#22D3EE] dark:selection:text-[#101827] transition-colors duration-300">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-[#223149]/70 bg-white/85 dark:bg-[#101827]/85 backdrop-blur-xl">
        <div className="h-[2px] w-full bg-gradient-to-r from-rose-500 via-[#22D3EE] to-[#2563EB]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/"
              className="p-2 rounded-xl border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-colors shadow-xs"
              title="Return to Solo Quests"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-base tracking-tight text-slate-900 dark:text-white">EduChain Arena</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold uppercase animate-pulse">
                  Multiplayer
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                Synchronized Peer-to-Peer Quiz Battles
              </p>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#223149] bg-white dark:bg-[#182438] hover:border-[#2563EB]/40 dark:hover:border-[#22D3EE]/40 transition-colors shadow-xs"
          >
            <span>Solo Quests</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-center py-20 text-xs text-slate-400 font-mono">Loading Battle Arena...</div>}>
          <BattleContent />
        </Suspense>
      </main>

    </div>
  );
}
