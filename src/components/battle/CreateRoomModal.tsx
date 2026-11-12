"use client";

import React, { useState } from "react";
import { 
  X, 
  Swords, 
  Users, 
  Globe, 
  Lock,
  ChevronRight
} from "lucide-react";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { useMultiplayerStore } from "@/store/useMultiplayerStore";
import { useEduStore } from "@/store/useEduStore";
import { getIconGlyph } from "@/components/SleekIcon";
import { RoomMode } from "@/types/multiplayer";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

const createLocalHostId = () =>
  typeof window !== "undefined" && window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `player_${Date.now()}`;

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (roomCode: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Lock background webpage scrolling while modal is open
  useBodyScrollLock(isOpen);

  const { getAllSubjects, getAllStages } = useCurriculumStore();
  const { createRoom, localPlayerId, localPlayerName, localPlayerAvatar } = useMultiplayerStore();
  const { name, avatar } = useEduStore();

  const allSubjects = getAllSubjects();
  const allStages = getAllStages();

  const [roomName, setRoomName] = useState(`${name || "Scholar"}'s Battle Arena`);
  const [subjectId, setSubjectId] = useState(allSubjects[0]?.id || "computer_science");
  const [chapter, setChapter] = useState<string>("all");
  const [mode, setMode] = useState<RoomMode>("duel");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSubjectObj = allSubjects.find((s) => s.id === subjectId) || allSubjects[0];
  const subjectStages = allStages.filter((s) => s.subject === subjectId);
  const chaptersList = Array.from(new Set(subjectStages.map((s) => s.chapter).filter(Boolean)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const questionsPool = subjectStages
      .filter((s) => (chapter === "all" ? true : s.chapter === chapter))
      .flatMap((s) => s.questions);

    if (questionsPool.length < 3) {
      setErrorMessage("Not enough questions available for this subject/chapter filter. Try selecting 'All Chapters'.");
      sound.playIncorrect();
      return;
    }

    setIsSubmitting(true);
    sound.playClick();

    const hostId = localPlayerId || createLocalHostId();

    const res = await createRoom({
      roomName: roomName.trim() || "Multiplayer Showdown",
      hostId,
      hostName: name || localPlayerName || "Scholar",
      hostAvatar: avatar || localPlayerAvatar || "🧠",
      mode,
      subjectId,
      subjectName: currentSubjectObj?.name || "Subject",
      chapter: chapter === "all" ? null : chapter,
      questionCount,
      timePerQuestion,
      isPublic,
    });

    setIsSubmitting(false);

    if (res.success && res.roomCode) {
      sound.playUnlock();
      onClose();
      if (onSuccess) {
        onSuccess(res.roomCode);
      }
    } else {
      sound.playIncorrect();
      setErrorMessage(res.error || "Failed to create battle room.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.playClick();
          onClose();
        }
      }}
    >
      <div 
        className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] shadow-2xl flex flex-col min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 p-4 sm:p-6 sm:pb-4 border-b border-slate-100 dark:border-[#263B5B]/80 bg-slate-50/80 dark:bg-[#141f30]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shadow-md shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                Create Battle Room
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                Configure quiz scope, timers, and challenge your peers
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#223149] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Room Name */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              Room Title
            </label>
            <input
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g. Ahmed's CS Showdown"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#22D3EE] transition-all"
            />
          </div>

          {/* Room Mode (1v1 Duel vs Party) */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
              Game Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMode("duel");
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all card-lift cursor-pointer ${
                  mode === "duel"
                    ? "border-rose-500/50 bg-rose-500/15 text-slate-900 dark:text-white shadow-xs ring-1 ring-rose-500/50"
                    : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60 text-slate-600 dark:text-[#94A3B8]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Swords className="w-4 h-4 text-rose-500" />
                  <span className="font-heading font-bold text-xs">1v1 Duel</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  Head-to-head clash (2 players max)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setMode("party");
                }}
                className={`p-4 rounded-2xl border text-left flex flex-col gap-1 transition-all card-lift cursor-pointer ${
                  mode === "party"
                    ? "border-blue-500/50 bg-blue-500/15 text-slate-900 dark:text-white shadow-xs ring-1 ring-blue-500/50"
                    : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60 text-slate-600 dark:text-[#94A3B8]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-heading font-bold text-xs">Party Mode</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                  Battle royale for 3 to 10 scholars
                </span>
              </button>
            </div>
          </div>

          {/* Subject and Chapter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setChapter("all");
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
              >
                {allSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {getIconGlyph(sub.icon)} {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                Chapter Scope
              </label>
              <select
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#22D3EE]"
              >
                <option value="all">⚡ All Chapters Combined</option>
                {chaptersList.map((chap) => (
                  <option key={chap} value={chap}>
                    {chap}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Match Parameters: Question count & Time per question */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                Questions
              </label>
              <div className="flex items-center gap-1.5">
                {[5, 10, 15].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setQuestionCount(count);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      questionCount === count
                        ? "border-[#2563EB] bg-blue-500/15 text-[#2563EB] dark:text-[#22D3EE]"
                        : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60 text-slate-600 dark:text-[#94A3B8]"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase mb-1.5">
                Time / Question
              </label>
              <div className="flex items-center gap-1.5">
                {[10, 15, 30].map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setTimePerQuestion(seconds);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      timePerQuestion === seconds
                        ? "border-[#2563EB] bg-blue-500/15 text-[#2563EB] dark:text-[#22D3EE]"
                        : "border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60 text-slate-600 dark:text-[#94A3B8]"
                    }`}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-slate-50 dark:bg-[#101827]/60">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="w-4 h-4 text-emerald-500" />
              ) : (
                <Lock className="w-4 h-4 text-amber-500" />
              )}
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block font-heading">
                  {isPublic ? "Public Room" : "Private Room"}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] block">
                  {isPublic ? "Listed on open rooms board" : "Only accessible via code or direct link"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                sound.playClick();
                setIsPublic(!isPublic);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 cursor-pointer ${
                isPublic ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  isPublic ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-educhain-primary py-3.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>{isSubmitting ? "Generating Room..." : "Create Battle Room & Open Lobby"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
};
