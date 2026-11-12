"use client";

import { create } from "zustand";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { Question } from "@/types/curriculum";
import { 
  MultiplayerRoom, 
  PlayerPresence, 
  PlayerAnswerPayload, 
  FinalPodiumEntry, 
  RoomMode 
} from "@/types/multiplayer";
import { useCurriculumStore } from "./useCurriculumStore";
import { sound } from "@/lib/audio";

let countdownIntervalRef: ReturnType<typeof setInterval> | null = null;

interface CreateRoomParams {
  roomName: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  mode: RoomMode;
  subjectId: string;
  subjectName: string;
  chapter: string | null;
  questionCount: number;
  timePerQuestion: number;
  isPublic: boolean;
}

interface MultiplayerStoreState {
  currentRoom: MultiplayerRoom | null;
  players: Record<string, PlayerPresence>;
  activeChannel: RealtimeChannel | null;
  
  // Game Play State
  gameStatus: "idle" | "lobby" | "countdown" | "playing" | "podium";
  countdownSeconds: number;
  currentQuestionIndex: number;
  selectedOptionIndex: number | null;
  isAnswerSubmitted: boolean;
  questionTimeRemaining: number;
  opponentEventNotification: string | null;
  podiumResults: FinalPodiumEntry[];
  
  // Local Player
  localPlayerId: string;
  localPlayerName: string;
  localPlayerAvatar: string;
  isHost: boolean;
  isReady: boolean;
  myScore: number;
  myStreak: number;
  myHealth: number;

  // Actions
  setLocalPlayer: (id: string, name: string, avatar: string) => void;
  createRoom: (params: CreateRoomParams) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinRoom: (roomCode: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  toggleReady: () => Promise<void>;
  startMatch: () => void;
  submitAnswer: (optionIndex: number) => void;
  advanceQuestion: () => void;
  clearNotification: () => void;
  fetchPublicRooms: () => Promise<MultiplayerRoom[]>;
  _setupRealtimeChannel: (room: MultiplayerRoom, isCreator: boolean) => void;
  _runCountdown: () => void;
  _computeFinalPodium: () => void;
}

// Generate unique 6-character room code (e.g. "EDU-482")
const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 3; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `EDU-${random}`;
};

export const useMultiplayerStore = create<MultiplayerStoreState>((set, get) => ({
  currentRoom: null,
  players: {},
  activeChannel: null,

  gameStatus: "idle",
  countdownSeconds: 3,
  currentQuestionIndex: 0,
  selectedOptionIndex: null,
  isAnswerSubmitted: false,
  questionTimeRemaining: 15,
  opponentEventNotification: null,
  podiumResults: [],

  localPlayerId: "",
  localPlayerName: "Scholar",
  localPlayerAvatar: "🧠",
  isHost: false,
  isReady: false,
  myScore: 0,
  myStreak: 0,
  myHealth: 100,

  setLocalPlayer: (id, name, avatar) => {
    set({
      localPlayerId: id,
      localPlayerName: name,
      localPlayerAvatar: avatar,
    });
  },

  clearNotification: () => {
    set({ opponentEventNotification: null });
  },

  // Pick random questions from curriculum store
  createRoom: async (params: CreateRoomParams) => {
    const { getAllStages } = useCurriculumStore.getState();
    const allStages = getAllStages();

    // Filter stages by subject and chapter
    const matchingStages = allStages.filter((s) => {
      const matchSub = s.subject === params.subjectId;
      if (!matchSub) return false;
      if (params.chapter && params.chapter !== "all") {
        return (s.chapter || "").toLowerCase().includes(params.chapter.toLowerCase());
      }
      return true;
    });

    // Collect questions
    const poolOfQuestions: Question[] = [];
    matchingStages.forEach((stg) => {
      if (Array.isArray(stg.questions)) {
        poolOfQuestions.push(...stg.questions);
      }
    });

    if (poolOfQuestions.length === 0) {
      // Fallback: pick any questions from this subject or curriculum
      const anySubjectStages = allStages.filter((s) => s.subject === params.subjectId);
      anySubjectStages.forEach((stg) => poolOfQuestions.push(...(stg.questions || [])));
    }

    // Shuffle and pick questionCount
    const shuffled = [...poolOfQuestions].sort(() => Math.random() - 0.5);
    const chosenQuestions = shuffled.slice(0, Math.min(params.questionCount, shuffled.length));

    if (chosenQuestions.length === 0) {
      return { success: false, error: "No MCQs found for this subject/chapter." };
    }

    const roomCode = generateRoomCode();
    const newRoom: MultiplayerRoom = {
      id: roomCode,
      roomCode,
      roomName: params.roomName || `${params.hostName}'s Battle`,
      hostId: params.hostId,
      hostName: params.hostName,
      hostAvatar: params.hostAvatar,
      mode: params.mode,
      subjectId: params.subjectId,
      subjectName: params.subjectName,
      chapter: params.chapter === "all" ? null : params.chapter,
      questionCount: chosenQuestions.length,
      timePerQuestion: params.timePerQuestion || 15,
      isPublic: params.isPublic,
      status: "waiting",
      questions: chosenQuestions,
      createdAt: new Date().toISOString(),
    };

    // Save to Supabase multiplayer_rooms table if available
    try {
      await supabase.from("multiplayer_rooms").upsert({
        id: newRoom.id,
        room_code: newRoom.roomCode,
        host_id: newRoom.hostId,
        host_name: newRoom.hostName,
        host_avatar: newRoom.hostAvatar,
        room_name: newRoom.roomName,
        mode: newRoom.mode,
        subject_id: newRoom.subjectId,
        subject_name: newRoom.subjectName,
        chapter: newRoom.chapter,
        question_count: newRoom.questionCount,
        time_per_question: newRoom.timePerQuestion,
        is_public: newRoom.isPublic,
        status: newRoom.status,
        questions: newRoom.questions,
      });
    } catch (e) {
      console.warn("Notice: Saved room locally, Supabase table not created yet:", e);
    }

    set({
      currentRoom: newRoom,
      isHost: true,
      isReady: true,
      myScore: 0,
      myStreak: 0,
      myHealth: 100,
      gameStatus: "lobby",
      questionTimeRemaining: newRoom.timePerQuestion,
    });

    // Subscribe to realtime channel
    get()._setupRealtimeChannel(newRoom, true);

    return { success: true, roomCode };
  },

  joinRoom: async (roomCode: string) => {
    const cleanCode = roomCode.trim().toUpperCase();
    let roomData: MultiplayerRoom | null = null;

    // 1. Fetch from Supabase
    try {
      const { data, error } = await supabase
        .from("multiplayer_rooms")
        .select("*")
        .eq("room_code", cleanCode)
        .single();

      if (data && !error) {
        roomData = {
          id: data.id,
          roomCode: data.room_code,
          roomName: data.room_name,
          hostId: data.host_id,
          hostName: data.host_name,
          hostAvatar: data.host_avatar || "👑",
          mode: data.mode as RoomMode,
          subjectId: data.subject_id,
          subjectName: data.subject_name,
          chapter: data.chapter,
          questionCount: data.question_count,
          timePerQuestion: data.time_per_question || 15,
          isPublic: data.is_public,
          status: data.status,
          questions: Array.isArray(data.questions) ? data.questions : [],
          createdAt: data.created_at,
        };
      }
    } catch (err) {
      console.warn("Could not fetch room from Supabase:", err);
    }

    // 2. Fallback check current active room in state (if in same session/tab)
    if (!roomData) {
      const existing = get().currentRoom;
      if (existing && existing.roomCode === cleanCode) {
        roomData = existing;
      }
    }

    if (!roomData) {
      return { success: false, error: `Room ${cleanCode} not found. Verify the code and try again!` };
    }

    if (roomData.status === "playing") {
      return { success: false, error: "This battle is already in progress!" };
    }

    if (roomData.status === "closed" || roomData.status === "finished") {
      return { success: false, error: "This room has been closed by the host or admin." };
    }

    set({
      currentRoom: roomData,
      isHost: roomData.hostId === get().localPlayerId,
      isReady: false,
      myScore: 0,
      myStreak: 0,
      myHealth: 100,
      gameStatus: "lobby",
      questionTimeRemaining: roomData.timePerQuestion,
    });

    get()._setupRealtimeChannel(roomData, false);
    return { success: true };
  },

  toggleReady: async () => {
    const { isReady, activeChannel, localPlayerId, localPlayerName, localPlayerAvatar, isHost, myScore, myStreak, myHealth } = get();
    const newReady = !isReady;
    set({ isReady: newReady });
    sound.playClick();

    if (activeChannel) {
      await activeChannel.track({
        id: localPlayerId,
        name: localPlayerName,
        avatar: localPlayerAvatar,
        isHost,
        isReady: newReady,
        score: myScore,
        streak: myStreak,
        health: myHealth,
        currentQuestionIndex: 0,
      });
    }
  },

  startMatch: () => {
    const { activeChannel, isHost } = get();
    if (!isHost || !activeChannel) return;

    const currentRoom = get().currentRoom;
    if (currentRoom?.id) {
      supabase.from("multiplayer_rooms").update({ status: "playing" }).eq("id", currentRoom.id).then();
    }

    sound.playUnlock();
    // Broadcast countdown start to all players in the room
    activeChannel.send({
      type: "broadcast",
      event: "START_COUNTDOWN",
      payload: { countdownSeconds: 3 },
    });

    set({ gameStatus: "countdown", countdownSeconds: 3 });
    get()._runCountdown();
  },

  submitAnswer: (optionIndex: number) => {
    const { 
      currentRoom, 
      currentQuestionIndex, 
      isAnswerSubmitted, 
      questionTimeRemaining, 
      myScore, 
      myStreak, 
      myHealth,
      localPlayerId,
      localPlayerName,
      activeChannel 
    } = get();

    if (isAnswerSubmitted || !currentRoom) return;

    const currentQ = currentRoom.questions[currentQuestionIndex];
    if (!currentQ) return;

    const isCorrect = optionIndex === currentQ.correctIndex;
    let earnedPoints = 0;
    const newStreak = isCorrect ? myStreak + 1 : 0;
    const newHealth = isCorrect ? myHealth : Math.max(0, myHealth - 25);

    if (isCorrect) {
      sound.playCorrect();
      // Base 100 + speed bonus + combo streak bonus
      const speedBonus = questionTimeRemaining * 10;
      const streakBonus = newStreak * 25;
      earnedPoints = 100 + speedBonus + streakBonus;
    } else {
      sound.playIncorrect();
    }

    const updatedScore = myScore + earnedPoints;

    set({
      selectedOptionIndex: optionIndex,
      isAnswerSubmitted: true,
      myScore: updatedScore,
      myStreak: newStreak,
      myHealth: newHealth,
    });

    // Broadcast answer to opponents in room
    if (activeChannel) {
      const payload: PlayerAnswerPayload = {
        playerId: localPlayerId,
        playerName: localPlayerName,
        questionIndex: currentQuestionIndex,
        isCorrect,
        pointsEarned: earnedPoints,
        totalScore: updatedScore,
        streak: newStreak,
        health: newHealth,
      };

      activeChannel.send({
        type: "broadcast",
        event: "PLAYER_ANSWER",
        payload,
      });
    }
  },

  advanceQuestion: () => {
    const { currentRoom, currentQuestionIndex, isHost, activeChannel } = get();
    if (!currentRoom) return;

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < currentRoom.questions.length) {
      if (isHost && activeChannel) {
        activeChannel.send({
          type: "broadcast",
          event: "NEXT_QUESTION",
          payload: { questionIndex: nextIndex },
        });
      }

      set({
        currentQuestionIndex: nextIndex,
        selectedOptionIndex: null,
        isAnswerSubmitted: false,
        questionTimeRemaining: currentRoom.timePerQuestion,
      });
    } else {
      // Game finished!
      if (isHost && currentRoom.id) {
        supabase.from("multiplayer_rooms").update({ status: "finished" }).eq("id", currentRoom.id).then();
      }
      if (isHost && activeChannel) {
        activeChannel.send({
          type: "broadcast",
          event: "MATCH_FINISHED",
          payload: {},
        });
      }
      get()._computeFinalPodium();
    }
  },

  leaveRoom: () => {
    if (countdownIntervalRef) {
      clearInterval(countdownIntervalRef);
      countdownIntervalRef = null;
    }
    const { activeChannel, isHost, currentRoom, gameStatus } = get();
    if (isHost && currentRoom?.id && gameStatus === "lobby") {
      supabase.from("multiplayer_rooms").update({ status: "closed" }).eq("id", currentRoom.id).then();
    }
    if (activeChannel) {
      activeChannel.untrack();
      supabase.removeChannel(activeChannel);
    }

    set({
      currentRoom: null,
      players: {},
      activeChannel: null,
      gameStatus: "idle",
      isHost: false,
      isReady: false,
      myScore: 0,
      myStreak: 0,
      myHealth: 100,
      currentQuestionIndex: 0,
      selectedOptionIndex: null,
      isAnswerSubmitted: false,
      podiumResults: [],
    });
  },

  fetchPublicRooms: async () => {
    try {
      const { data, error } = await supabase
        .from("multiplayer_rooms")
        .select("*")
        .eq("status", "waiting")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) {
        return data.map((d: Record<string, unknown>) => ({
          id: String(d.id),
          roomCode: String(d.room_code),
          roomName: String(d.room_name),
          hostId: String(d.host_id),
          hostName: String(d.host_name),
          hostAvatar: String(d.host_avatar || "👑"),
          mode: d.mode as RoomMode,
          subjectId: String(d.subject_id),
          subjectName: String(d.subject_name),
          chapter: d.chapter ? String(d.chapter) : null,
          questionCount: Number(d.question_count),
          timePerQuestion: Number(d.time_per_question),
          isPublic: Boolean(d.is_public),
          status: d.status as MultiplayerRoom["status"],
          questions: (Array.isArray(d.questions) ? d.questions : []) as MultiplayerRoom["questions"],
          createdAt: String(d.created_at),
        }));
      }
    } catch (e) {
      console.warn("Public rooms query exception:", e);
    }
    return [];
  },

  // Internal helper: Setup Supabase Realtime Channel
  _setupRealtimeChannel: (room: MultiplayerRoom, isCreator: boolean) => {
    const existing = get().activeChannel;
    if (existing) {
      supabase.removeChannel(existing);
    }

    const { localPlayerId, localPlayerName, localPlayerAvatar } = get();
    const channelName = `room:${room.roomCode}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: localPlayerId },
        broadcast: { ack: false, self: false },
      },
    });

    // 1. PRESENCE TRACKING
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const updatedPlayers: Record<string, PlayerPresence> = {};

      Object.keys(state).forEach((key) => {
        const presences = state[key] as unknown as PlayerPresence[];
        if (presences && presences.length > 0) {
          const p = presences[0];
          updatedPlayers[p.id] = {
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            isHost: p.isHost,
            isReady: p.isReady,
            score: p.score || 0,
            streak: p.streak || 0,
            health: p.health ?? 100,
            currentQuestionIndex: p.currentQuestionIndex || 0,
            lastAnswerCorrect: p.lastAnswerCorrect,
          };
        }
      });

      set({ players: updatedPlayers });
    });

    // 2. BROADCAST EVENTS
    channel.on("broadcast", { event: "START_COUNTDOWN" }, () => {
      sound.playUnlock();
      set({ gameStatus: "countdown", countdownSeconds: 3 });
      get()._runCountdown();
    });

    channel.on("broadcast", { event: "PLAYER_ANSWER" }, ({ payload }) => {
      const p = payload as PlayerAnswerPayload;
      // Show attack alert
      if (p.isCorrect) {
        set({
          opponentEventNotification: `⚡ ${p.playerName} struck! (+${p.pointsEarned} pts)`,
        });
      }

      // Update opponent presence in local state
      set((state) => {
        const existingP = state.players[p.playerId];
        if (!existingP) return state;
        return {
          players: {
            ...state.players,
            [p.playerId]: {
              ...existingP,
              score: p.totalScore,
              streak: p.streak,
              health: p.health,
              lastAnswerCorrect: p.isCorrect,
            },
          },
        };
      });

      // Clear notification after 2 seconds
      setTimeout(() => {
        get().clearNotification();
      }, 2000);
    });

    channel.on("broadcast", { event: "NEXT_QUESTION" }, ({ payload }) => {
      const nextIdx = payload.questionIndex;
      if (typeof nextIdx !== "number" || nextIdx <= get().currentQuestionIndex) return;
      const room = get().currentRoom;
      set({
        currentQuestionIndex: nextIdx,
        selectedOptionIndex: null,
        isAnswerSubmitted: false,
        questionTimeRemaining: room?.timePerQuestion || 15,
      });
    });

    channel.on("broadcast", { event: "MATCH_FINISHED" }, () => {
      get()._computeFinalPodium();
    });

    // Subscribe and track self
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          id: localPlayerId,
          name: localPlayerName,
          avatar: localPlayerAvatar,
          isHost: isCreator,
          isReady: isCreator, // host is ready by default
          score: 0,
          streak: 0,
          health: 100,
          currentQuestionIndex: 0,
        });
      }
    });

    set({ activeChannel: channel });
  },

  // Internal helper: Run 3-2-1 Countdown
  _runCountdown: () => {
    if (countdownIntervalRef) {
      clearInterval(countdownIntervalRef);
      countdownIntervalRef = null;
    }
    let count = 3;
    countdownIntervalRef = setInterval(() => {
      count -= 1;
      if (count > 0) {
        sound.playClick();
        set({ countdownSeconds: count });
      } else {
        if (countdownIntervalRef) {
          clearInterval(countdownIntervalRef);
          countdownIntervalRef = null;
        }
        sound.playAchievement();
        set({
          gameStatus: "playing",
          currentQuestionIndex: 0,
          selectedOptionIndex: null,
          isAnswerSubmitted: false,
          questionTimeRemaining: get().currentRoom?.timePerQuestion || 15,
        });
      }
    }, 1000);
  },

  // Internal helper: Calculate podium rankings
  _computeFinalPodium: () => {
    sound.playUnlock();
    const { players, localPlayerId, myScore, localPlayerName, localPlayerAvatar } = get();

    // Ensure self is in player list
    const all = { ...players };
    if (!all[localPlayerId]) {
      all[localPlayerId] = {
        id: localPlayerId,
        name: localPlayerName,
        avatar: localPlayerAvatar,
        isHost: false,
        isReady: true,
        score: myScore,
        streak: 0,
        health: 100,
        currentQuestionIndex: 0,
      };
    } else {
      all[localPlayerId].score = myScore;
    }

    const sorted = Object.values(all).sort((a, b) => b.score - a.score);
    const podium: FinalPodiumEntry[] = sorted.map((p, idx) => ({
      playerId: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      accuracy: 100,
      rank: idx + 1,
      xpEarned: idx === 0 ? 200 : idx === 1 ? 120 : 60,
    }));

    set({ gameStatus: "podium", podiumResults: podium });
  },
}));
