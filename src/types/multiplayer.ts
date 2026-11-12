import { Question } from "./curriculum";

export type RoomMode = "duel" | "party";
export type RoomStatus = "waiting" | "starting" | "playing" | "finished" | "closed";

export interface MultiplayerRoom {
  id: string;                         // Unique room code e.g. "EDU-784"
  roomCode: string;
  roomName: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  mode: RoomMode;                     // 'duel' (max 2) or 'party' (group)
  subjectId: string;
  subjectName: string;
  chapter: string | null;             // null = all chapters
  questionCount: number;              // 5, 7, 10
  timePerQuestion: number;            // seconds (10, 15, 20)
  isPublic: boolean;
  status: RoomStatus;
  questions: Question[];
  createdAt: string;
}

export interface PlayerPresence {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  streak: number;
  health: number;                    // 100 max
  currentQuestionIndex: number;
  lastAnswerCorrect?: boolean;
}

export interface PlayerAnswerPayload {
  playerId: string;
  playerName: string;
  questionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  totalScore: number;
  streak: number;
  health: number;
}

export interface FinalPodiumEntry {
  playerId: string;
  name: string;
  avatar: string;
  score: number;
  accuracy: number;
  rank: number;
  xpEarned: number;
}
