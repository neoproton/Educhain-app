"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Swords,
  Search,
  RefreshCw,
  Scissors,
  Trash2,
  Globe,
  Lock,
  Clock,
  Users,
  AlertCircle,
  CheckCircle2,
  EyeOff,
  Eye,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";

export interface AdminMultiplayerRoom {
  id: string;
  room_code: string;
  host_id: string;
  host_name: string;
  host_avatar: string;
  room_name: string;
  mode: string;
  subject_id: string;
  subject_name: string;
  chapter: string | null;
  question_count: number;
  time_per_question: number;
  is_public: boolean;
  status: string;
  created_at: string;
}

interface RoomsManagerProps {
  onNotify: (msg: string, type?: "success" | "error") => void;
}

function formatRoomAge(iso?: string): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export const RoomsManager: React.FC<RoomsManagerProps> = ({ onNotify }) => {
  const [rooms, setRooms] = useState<AdminMultiplayerRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [confirmCutAll, setConfirmCutAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open_public" | "playing" | "closed">("all");
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("multiplayer_rooms")
        .select(
          "id, room_code, host_id, host_name, host_avatar, room_name, mode, subject_id, subject_name, chapter, question_count, time_per_question, is_public, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setLoadError(error.message);
        setRooms([]);
      } else {
        setRooms((data as AdminMultiplayerRoom[]) || []);
      }
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Could not load rooms.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchRooms(); }, 0);

    const channel = supabase
      .channel("admin-multiplayer-rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "multiplayer_rooms" },
        () => {
          fetchRooms(true);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchRooms]);

  const counts = useMemo(() => {
    const openPublic = rooms.filter((r) => r.status === "waiting" && r.is_public).length;
    const playing = rooms.filter((r) => r.status === "playing").length;
    const closedOrPrivate = rooms.filter((r) => r.status === "closed" || r.status === "finished" || !r.is_public).length;
    return { total: rooms.length, openPublic, playing, closedOrPrivate };
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rooms.filter((r) => {
      if (statusFilter === "open_public" && !(r.status === "waiting" && r.is_public)) return false;
      if (statusFilter === "playing" && r.status !== "playing") return false;
      if (statusFilter === "closed" && r.status === "waiting" && r.is_public) return false;
      if (!q) return true;
      return (
        r.room_name.toLowerCase().includes(q) ||
        r.room_code.toLowerCase().includes(q) ||
        r.host_name.toLowerCase().includes(q) ||
        r.subject_name.toLowerCase().includes(q)
      );
    });
  }, [rooms, searchQuery, statusFilter]);

  const handleCutRoom = async (room: AdminMultiplayerRoom) => {
    sound.playClick();
    setBusyId(room.id);
    try {
      const { error } = await supabase
        .from("multiplayer_rooms")
        .delete()
        .eq("id", room.id);

      if (error) {
        onNotify(`Could not cut room ${room.room_code}: ${error.message}`, "error");
        return;
      }
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
      sound.playUnlock();
      onNotify(`Cut room "${room.room_name}" (${room.room_code}) from public lobby.`);
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : "Failed to cut room.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePublic = async (room: AdminMultiplayerRoom) => {
    sound.playClick();
    setBusyId(room.id);
    const nextPublic = !room.is_public;
    try {
      const { error } = await supabase
        .from("multiplayer_rooms")
        .update({ is_public: nextPublic })
        .eq("id", room.id);

      if (error) {
        onNotify(`Failed to update visibility: ${error.message}`, "error");
        return;
      }
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, is_public: nextPublic } : r))
      );
      onNotify(
        nextPublic
          ? `Room ${room.room_code} is now visible in Open Public Rooms.`
          : `Room ${room.room_code} hidden from Open Public Rooms (invite code only).`
      );
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : "Failed to update visibility.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = async (room: AdminMultiplayerRoom) => {
    sound.playClick();
    setBusyId(room.id);
    const nextStatus = room.status === "closed" ? "waiting" : "closed";
    try {
      const { error } = await supabase
        .from("multiplayer_rooms")
        .update({ status: nextStatus })
        .eq("id", room.id);

      if (error) {
        onNotify(`Failed to update room status: ${error.message}`, "error");
        return;
      }
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, status: nextStatus } : r))
      );
      onNotify(
        nextStatus === "closed"
          ? `Room ${room.room_code} closed (removed from public lobby & joins blocked).`
          : `Room ${room.room_code} reopened to waiting status.`
      );
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : "Failed to update room status.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCutAllPublicWaiting = async () => {
    sound.playClick();
    setIsBulkBusy(true);
    try {
      const { error } = await supabase
        .from("multiplayer_rooms")
        .delete()
        .eq("status", "waiting")
        .eq("is_public", true);

      if (error) {
        onNotify(`Bulk cut failed: ${error.message}`, "error");
        return;
      }
      setRooms((prev) => prev.filter((r) => !(r.status === "waiting" && r.is_public)));
      setConfirmCutAll(false);
      sound.playUnlock();
      onNotify("Cleared all open public waiting rooms from the Arena lobby.");
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : "Bulk cut failed.", "error");
    } finally {
      setIsBulkBusy(false);
    }
  };

  const handleClearStaleRooms = async () => {
    sound.playClick();
    setIsBulkBusy(true);
    try {
      const cutoffIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from("multiplayer_rooms")
        .delete()
        .lt("created_at", cutoffIso);

      if (error) {
        onNotify(`Stale cleanup failed: ${error.message}`, "error");
        return;
      }
      setRooms((prev) => prev.filter((r) => new Date(r.created_at).getTime() >= Date.now() - 2 * 60 * 60 * 1000));
      sound.playUnlock();
      onNotify("Removed all rooms older than 2 hours.");
    } catch (e: unknown) {
      onNotify(e instanceof Error ? e.message : "Stale cleanup failed.", "error");
    } finally {
      setIsBulkBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs">
          <div className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400">Open Public</div>
          <div className="text-2xl font-heading font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
            {counts.openPublic}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Visible in /battle lobby</div>
        </div>
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs">
          <div className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400">In Progress</div>
          <div className="text-2xl font-heading font-extrabold text-blue-600 dark:text-cyan-400 mt-1">
            {counts.playing}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Active duel/party matches</div>
        </div>
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs">
          <div className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400">Closed / Private</div>
          <div className="text-2xl font-heading font-extrabold text-neutral-700 dark:text-neutral-200 mt-1">
            {counts.closedOrPrivate}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Hidden from public board</div>
        </div>
        <div className="p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-xs">
          <div className="text-[11px] font-mono uppercase text-neutral-500 dark:text-neutral-400">Total Logged</div>
          <div className="text-2xl font-heading font-extrabold text-neutral-900 dark:text-white mt-1">
            {counts.total}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">Rows in multiplayer_rooms</div>
        </div>
      </div>

      {/* Main Controls & Room List */}
      <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-white/10">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-rose-500" />
              <span>Public Battle Rooms Control</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Cut stale public arenas, hide rooms from the open lobby, or close active invite codes in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                void fetchRooms();
              }}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 hover:bg-neutral-100 dark:hover:bg-white/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-cyan-500" : ""}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleClearStaleRooms}
              disabled={isBulkBusy || rooms.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Delete rooms created more than 2 hours ago"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Clear &gt;2h Stale</span>
            </button>

            {confirmCutAll ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCutAllPublicWaiting}
                  disabled={isBulkBusy}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Confirm Cut All ({counts.openPublic})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCutAll(false)}
                  className="px-2.5 py-2 rounded-xl text-xs font-medium border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setConfirmCutAll(true);
                }}
                disabled={isBulkBusy || counts.openPublic === 0}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Cut All Public ({counts.openPublic})</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by room name, code (EDU-...), host, or subject..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 text-xs focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100/80 dark:bg-black/30">
            {(
              [
                { id: "all", label: "All" },
                { id: "open_public", label: "Open Public" },
                { id: "playing", label: "Playing" },
                { id: "closed", label: "Closed / Private" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  sound.playClick();
                  setStatusFilter(f.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? "bg-white dark:bg-[#223149] text-neutral-900 dark:text-white shadow-xs"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Supabase error: {loadError}</span>
          </div>
        )}

        {/* Rooms List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs font-mono text-neutral-400">
            Loading multiplayer rooms...
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              No rooms match this filter
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              The public Battle Arena lobby is clean.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRooms.map((room) => {
              const isOpenPublic = room.status === "waiting" && room.is_public;
              const isBusy = busyId === room.id;

              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isOpenPublic
                      ? "border-emerald-500/30 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]"
                      : room.status === "closed"
                      ? "border-neutral-200/70 dark:border-white/5 bg-neutral-50/70 dark:bg-black/20 opacity-80"
                      : "border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-[#101827]/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ScholarAvatar name={room.host_name} avatar={room.host_avatar} size="md" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                            {room.room_name}
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase">
                            {room.mode === "duel" ? "1v1" : "Party"}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          Host: <strong className="text-neutral-700 dark:text-neutral-200">{room.host_name}</strong> • {room.subject_name}
                          {room.chapter ? ` • ${room.chapter}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-extrabold text-blue-600 dark:text-cyan-400">
                        {room.room_code}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {formatRoomAge(room.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Status Pills + Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200/70 dark:border-white/10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          room.status === "waiting"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : room.status === "playing"
                            ? "bg-blue-500/15 text-blue-700 dark:text-cyan-300 border-blue-500/30"
                            : "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        <span className="uppercase">{room.status}</span>
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          room.is_public
                            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25"
                            : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-300 border-neutral-400/25"
                        }`}
                      >
                        {room.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span>{room.is_public ? "Public" : "Private"}</span>
                      </span>

                      <span className="text-[10px] font-mono text-neutral-400">
                        {room.question_count} Qs • {room.time_per_question}s
                      </span>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTogglePublic(room)}
                        title={room.is_public ? "Hide from Open Public Rooms" : "Show in Open Public Rooms"}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] hover:border-blue-500/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {room.is_public ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{room.is_public ? "Hide" : "Show"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleStatus(room)}
                        title={room.status === "closed" ? "Reopen room" : "Close room (blocks joins)"}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] hover:border-amber-500/40 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {room.status === "closed" ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-emerald-500" />
                            <span>Reopen</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-amber-500" />
                            <span>Close</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleCutRoom(room)}
                        title="Cut (delete) this room permanently"
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-rose-500/35 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Cut</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
