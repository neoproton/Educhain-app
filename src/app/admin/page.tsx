"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCurriculumStore, CustomSubject } from "@/store/useCurriculumStore";
import { Question, Stage, SubjectType, SchoolClass } from "@/types/curriculum";
import { sound } from "@/lib/audio";
import { supabase } from "@/lib/supabase/client";
import { EditStageModal } from "@/components/admin/EditStageModal";
import { EditSubjectModal } from "@/components/admin/EditSubjectModal";
import { EditClassModal } from "@/components/admin/EditClassModal";
import { UsersManager } from "@/components/admin/UsersManager";
import { ProgressionLevelsEditor } from "@/components/admin/ProgressionLevelsEditor";
import { 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  ExternalLink, 
  Database, 
  BookOpen, 
  Layers, 
  Sparkles, 
  ArrowLeft,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  FileText,
  HelpCircle,
  Cloud,
  CloudOff,
  RefreshCw,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Edit3,
  Users,
  LogOut,
  Search,
  Filter,
  RotateCcw,
  GraduationCap,
  ListOrdered,
  ArrowUpDown,
  Sliders,
  Hash,
  KeyRound,
  X,
  Award
} from "lucide-react";
import { SleekIcon, SleekBadgeIcon } from "@/components/SleekIcon";

const NUMBER_WORDS: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Eleven",
  12: "Twelve",
  13: "Thirteen",
  14: "Fourteen",
  15: "Fifteen",
  16: "Sixteen",
  17: "Seventeen",
  18: "Eighteen",
  19: "Nineteen",
  20: "Twenty",
};

function formatChapterWord(num: number): string {
  return NUMBER_WORDS[num] || String(num);
}


const COLOR_PRESETS = [
  { label: "Sky Blue", value: "#38bdf8" },
  { label: "Emerald Green", value: "#34d399" },
  { label: "Amber Yellow", value: "#fbbf24" },
  { label: "Purple", value: "#a78bfa" },
  { label: "Rose Pink", value: "#f43f5e" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Orange", value: "#f97316" },
];

const SUPABASE_SQL_SCRIPT = `-- Run this in Supabase SQL Editor (supabase.com/dashboard/project/elpzdzevtwinoaspyngi/sql/new)
-- Non-destructive Centralized Curriculum Synchronization & Admin RLS Setup:

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Administrator Allow-List & RLS Helper (Security: Students CANNOT write curriculum rows)
CREATE TABLE IF NOT EXISTS public.curriculum_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read own curriculum_admins row" ON public.curriculum_admins;
CREATE POLICY "Admins can read own curriculum_admins row"
  ON public.curriculum_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_curriculum_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
    OR EXISTS (
      SELECT 1 FROM public.curriculum_admins ca WHERE ca.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_curriculum_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_curriculum_admin() TO anon, authenticated;

-- 2. Custom Classes / Standards
CREATE TABLE IF NOT EXISTS public.custom_classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎓',
  display_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE IF EXISTS public.custom_classes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3. Custom Subjects
CREATE TABLE IF NOT EXISTS public.custom_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📚',
  description TEXT,
  color TEXT DEFAULT '#38bdf8',
  badge_bg TEXT,
  border_color TEXT,
  grade TEXT DEFAULT 'grade_9',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE IF EXISTS public.custom_subjects
  ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'grade_9',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 4. Custom Stages & MCQs (with chapter_number)
CREATE TABLE IF NOT EXISTS public.custom_stages (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  subject_stage_number INTEGER DEFAULT 1,
  grade TEXT DEFAULT 'grade_9',
  chapter TEXT NOT NULL,
  chapter_number INTEGER,
  topic TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  learning_objective TEXT,
  difficulty TEXT DEFAULT 'Medium',
  xp_reward INTEGER DEFAULT 100,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE IF EXISTS public.custom_stages
  ADD COLUMN IF NOT EXISTS subject_stage_number INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'grade_9',
  ADD COLUMN IF NOT EXISTS chapter_number INTEGER,
  ADD COLUMN IF NOT EXISTS learning_objective TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'Medium',
  ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 5. Centralized Chapter Ordering (Built-in + Custom Chapters)
CREATE TABLE IF NOT EXISTS public.curriculum_chapter_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade TEXT NOT NULL DEFAULT 'grade_9',
  subject_id TEXT NOT NULL,
  chapter_name TEXT NOT NULL,
  chapter_number INTEGER NOT NULL CHECK (chapter_number >= 1 AND chapter_number <= 999),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_curriculum_chapter_order UNIQUE (grade, subject_id, chapter_name)
);

-- 6. Centralized Stage Ordering (Built-in + Custom Stages)
CREATE TABLE IF NOT EXISTS public.curriculum_stage_orders (
  stage_id TEXT PRIMARY KEY,
  grade TEXT NOT NULL DEFAULT 'grade_9',
  subject_id TEXT NOT NULL,
  chapter_name TEXT NOT NULL DEFAULT 'Core Curriculum',
  stage_order INTEGER NOT NULL CHECK (stage_order >= 1 AND stage_order <= 9999),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Centralized Built-in Curriculum Deletion Tombstones
CREATE TABLE IF NOT EXISTS public.deleted_curriculum_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL CHECK (item_type IN ('class', 'subject', 'stage')),
  item_id TEXT NOT NULL,
  item_label TEXT,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_deleted_curriculum_item UNIQUE (item_type, item_id)
);

-- 8. Multiplayer Rooms (Duels & Tournaments)
CREATE TABLE IF NOT EXISTS public.multiplayer_rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL,
  host_name TEXT NOT NULL,
  host_avatar TEXT DEFAULT '👑',
  room_name TEXT NOT NULL,
  mode TEXT DEFAULT 'duel',
  subject_id TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  chapter TEXT,
  question_count INTEGER DEFAULT 5,
  time_per_question INTEGER DEFAULT 15,
  is_public BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'waiting',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8B. Progression Level Settings (XP & Streak Tiers)
CREATE TABLE IF NOT EXISTS public.curriculum_progression_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  xp_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  streak_levels JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Strict Admin Write / Public Read RLS Policies
ALTER TABLE public.custom_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_chapter_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_stage_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_curriculum_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_progression_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read custom_classes" ON public.custom_classes;
DROP POLICY IF EXISTS "Allow public write custom_classes" ON public.custom_classes;
DROP POLICY IF EXISTS "Admin write custom_classes" ON public.custom_classes;
CREATE POLICY "Allow public read custom_classes" ON public.custom_classes FOR SELECT USING (true);
CREATE POLICY "Admin write custom_classes" ON public.custom_classes FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Allow public read custom_subjects" ON public.custom_subjects;
DROP POLICY IF EXISTS "Allow public write custom_subjects" ON public.custom_subjects;
DROP POLICY IF EXISTS "Admin write custom_subjects" ON public.custom_subjects;
CREATE POLICY "Allow public read custom_subjects" ON public.custom_subjects FOR SELECT USING (true);
CREATE POLICY "Admin write custom_subjects" ON public.custom_subjects FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Allow public read custom_stages" ON public.custom_stages;
DROP POLICY IF EXISTS "Allow public write custom_stages" ON public.custom_stages;
DROP POLICY IF EXISTS "Admin write custom_stages" ON public.custom_stages;
CREATE POLICY "Allow public read custom_stages" ON public.custom_stages FOR SELECT USING (true);
CREATE POLICY "Admin write custom_stages" ON public.custom_stages FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Public read curriculum_chapter_orders" ON public.curriculum_chapter_orders;
DROP POLICY IF EXISTS "Admin write curriculum_chapter_orders" ON public.curriculum_chapter_orders;
CREATE POLICY "Public read curriculum_chapter_orders" ON public.curriculum_chapter_orders FOR SELECT USING (true);
CREATE POLICY "Admin write curriculum_chapter_orders" ON public.curriculum_chapter_orders FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Public read curriculum_stage_orders" ON public.curriculum_stage_orders;
DROP POLICY IF EXISTS "Admin write curriculum_stage_orders" ON public.curriculum_stage_orders;
CREATE POLICY "Public read curriculum_stage_orders" ON public.curriculum_stage_orders FOR SELECT USING (true);
CREATE POLICY "Admin write curriculum_stage_orders" ON public.curriculum_stage_orders FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Public read deleted_curriculum_items" ON public.deleted_curriculum_items;
DROP POLICY IF EXISTS "Admin write deleted_curriculum_items" ON public.deleted_curriculum_items;
CREATE POLICY "Public read deleted_curriculum_items" ON public.deleted_curriculum_items FOR SELECT USING (true);
CREATE POLICY "Admin write deleted_curriculum_items" ON public.deleted_curriculum_items FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Public read curriculum_progression_settings" ON public.curriculum_progression_settings;
DROP POLICY IF EXISTS "Admin write curriculum_progression_settings" ON public.curriculum_progression_settings;
CREATE POLICY "Public read curriculum_progression_settings" ON public.curriculum_progression_settings FOR SELECT USING (true);
CREATE POLICY "Admin write curriculum_progression_settings" ON public.curriculum_progression_settings FOR ALL TO authenticated USING (public.is_curriculum_admin()) WITH CHECK (public.is_curriculum_admin());

DROP POLICY IF EXISTS "Allow public read multiplayer_rooms" ON public.multiplayer_rooms;
DROP POLICY IF EXISTS "Allow public write multiplayer_rooms" ON public.multiplayer_rooms;
CREATE POLICY "Allow public read multiplayer_rooms" ON public.multiplayer_rooms FOR SELECT USING (true);
CREATE POLICY "Allow public write multiplayer_rooms" ON public.multiplayer_rooms FOR ALL USING (true) WITH CHECK (true);

-- Refresh PostgREST schema cache immediately so newly added columns work right away:
NOTIFY pgrst, 'reload schema';

-- Grant your Supabase Auth user curriculum admin privileges (replace with your email):
-- INSERT INTO public.curriculum_admins (user_id, email)
-- SELECT id, email FROM auth.users WHERE email = 'your-admin@email.com'
-- ON CONFLICT (user_id) DO NOTHING;
`;

export default function AdminPage() {
  const { 
    customClasses,
    deletedClassIds,
    addClass,
    updateClass,
    deleteClass,
    restoreClass,
    restoreAllDefaultClasses,
    getAllClasses,
    customSubjects, 
    customStages, 
    getAllSubjects, 
    getAllStages, 
    addSubject, 
    addStage, 
    deleteStage, 
    deleteSubject,
    deletedSubjectIds,
    restoreAllDefaultSubjects,
    deletedStageIds,
    restoreAllDefaultStages,
    syncWithSupabase,
    checkSupabaseHealth,
    pushLocalToCloud,
    cloudSyncStatus,
    cloudSyncMessage,
    chapterOrders,
    stageOrders,
    setChapterNumber,
    batchSetChapterNumbers,
    resetChapterNumbers,
    setStageOrder,
    isCloudAdmin,
    checkCloudAdminStatus
  } = useCurriculumStore();

  type AdminTabId = "csv" | "upload" | "manage" | "chapters" | "subjects" | "classes" | "levels" | "users" | "sql";
  const [activeTab, setActiveTab] = useState<AdminTabId>("csv");
  
  // Chapter Ordering Management State
  const [orderGrade, setOrderGrade] = useState<string>("grade_9");
  const [orderSubject, setOrderSubject] = useState<string>("science");
  const [chapterEdits, setChapterEdits] = useState<Record<string, number>>({});
  const [chapterSearch, setChapterSearch] = useState<string>("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPushingCloud, setIsPushingCloud] = useState(false);

  // Supabase Cloud Admin Auth State
  const [isCloudAuthOpen, setIsCloudAuthOpen] = useState(false);
  const [cloudAdminEmail, setCloudAdminEmail] = useState("");
  const [cloudAdminPassword, setCloudAdminPassword] = useState("");
  const [cloudAuthBusy, setCloudAuthBusy] = useState(false);
  const [cloudAuthError, setCloudAuthError] = useState<string | null>(null);
  const [cloudUserEmail, setCloudUserEmail] = useState<string | null>(null);

  // Security Gate State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcodeInput, setPasscodeInput] = useState<string>("");
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Edit Modals State
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [isEditStageOpen, setIsEditStageOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<CustomSubject | null>(null);
  const [isEditSubjectOpen, setIsEditSubjectOpen] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [isEditClassOpen, setIsEditClassOpen] = useState<boolean>(false);

  // Filter in Stage Catalog
  const [stageFilterSubject, setStageFilterSubject] = useState<string>("all");
  const [stageFilterClass, setStageFilterClass] = useState<string>("all");
  const [stageSearch, setStageSearch] = useState<string>("");
  const [subjectClassFilter, setSubjectClassFilter] = useState<string>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAuth = sessionStorage.getItem("educhain_admin_auth") === "true";
      setIsAuthenticated(isAuth);
    }
  }, []);

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    const clean = passcodeInput.trim();
    if (clean === "admin123" || clean === "educhain@admin2026") {
      sound.playUnlock();
      setIsAuthenticated(true);
      setAuthError(null);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("educhain_admin_auth", "true");
      }
      showNotification("Admin authenticated. Welcome to EduChain Studio!");
    } else {
      sound.playIncorrect();
      setAuthError("Incorrect admin security passcode. Please try again.");
    }
  };

  const handleLockAdmin = () => {
    sound.playClick();
    setIsAuthenticated(false);
    setPasscodeInput("");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("educhain_admin_auth");
    }
    showNotification("Admin panel locked.");
  };

  const allClasses = getAllClasses();
  const allSubjects = getAllSubjects();
  const allStages = getAllStages();

  // Manual Form State
  const [subjectId, setSubjectId] = useState<string>(allSubjects[0]?.id || "computer_science");
  const [chapter, setChapter] = useState<string>("");
  const [manualChapterNumber, setManualChapterNumber] = useState<number | "">("");
  const [topic, setTopic] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [grade, setGrade] = useState<string>("grade_9");
  const [xpReward, setXpReward] = useState<number>(100);
  const [learningObjective, setLearningObjective] = useState<string>("");
  const [questions, setQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    tags: string;
  }>>([
    {
      question: "",
      options: ["", "", "", ""],
      correctIndex: 0,
      explanation: "",
      tags: "",
    },
  ]);

  // CSV Upload State (For specific stage of specific chapter of subject)
  const [csvSubjectId, setCsvSubjectId] = useState<string>(allSubjects[0]?.id || "computer_science");
  const [csvChapter, setCsvChapter] = useState<string>("");
  const [csvChapterNumber, setCsvChapterNumber] = useState<number | "">("");
  const [csvTopic, setCsvTopic] = useState<string>("");
  const [csvTitle, setCsvTitle] = useState<string>("");
  const [csvDifficulty, setCsvDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [csvGrade, setCsvGrade] = useState<string>("grade_9");
  const [csvXpReward, setCsvXpReward] = useState<number>(100);
  const [csvLearningObjective, setCsvLearningObjective] = useState<string>("");
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [csvParsedQuestions, setCsvParsedQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    tags: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for New Subject Modal/Section
  const [newSubId, setNewSubId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubGrade, setNewSubGrade] = useState("grade_9");
  const [newSubIcon, setNewSubIcon] = useState("📚");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [newSubColor, setNewSubColor] = useState("#38bdf8");

  // Form State for New Class / Standards
  const [newClassId, setNewClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassDesc, setNewClassDesc] = useState("");
  const [newClassIcon, setNewClassIcon] = useState("🎓");
  const [newClassOrder, setNewClassOrder] = useState<number>(1);

  useEffect(() => {
    checkSupabaseHealth();
    syncWithSupabase();
    checkCloudAdminStatus();

    supabase.auth.getSession().then(({ data }) => {
      setCloudUserEmail(data.session?.user?.email ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCloudUserEmail(session?.user?.email ?? null);
      checkCloudAdminStatus();
      syncWithSupabase({ force: true });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkSupabaseHealth, syncWithSupabase, checkCloudAdminStatus]);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const reportCloudAction = (
    res: { success: boolean; cloudSynced?: boolean; rlsBlocked?: boolean; error?: string },
    successMsg: string,
    localOnlyMsg?: string
  ): boolean => {
    if (!res.success) {
      sound.playIncorrect();
      if (res.rlsBlocked) {
        setIsCloudAuthOpen(true);
        showNotification(res.error || "Cloud Admin sign-in required by Supabase RLS.", "error");
      } else {
        showNotification(res.error || "Operation failed.", "error");
      }
      return false;
    }
    sound.playUnlock();
    if (res.cloudSynced === false) {
      showNotification(
        localOnlyMsg || `${successMsg} (Saved locally only — will sync when Supabase reconnects.)`,
        "error"
      );
    } else {
      showNotification(successMsg, "success");
    }
    return true;
  };

  const handleCloudAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudAuthError(null);
    if (!cloudAdminEmail.trim() || !cloudAdminPassword) {
      setCloudAuthError("Enter both your Supabase admin email and password.");
      return;
    }
    setCloudAuthBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cloudAdminEmail.trim(),
      password: cloudAdminPassword,
    });
    if (error) {
      setCloudAuthBusy(false);
      setCloudAuthError(error.message);
      sound.playIncorrect();
      return;
    }
    const adminAllowed = await checkCloudAdminStatus();
    setCloudAuthBusy(false);
    setCloudUserEmail(data.user?.email ?? cloudAdminEmail.trim());
    if (adminAllowed) {
      sound.playUnlock();
      setIsCloudAuthOpen(false);
      setCloudAdminPassword("");
      showNotification(`Signed in as Cloud Admin (${data.user?.email || cloudAdminEmail.trim()}).`);
      await syncWithSupabase({ force: true });
    } else {
      sound.playIncorrect();
      setCloudAuthError("Signed in, but this account is not listed in public.curriculum_admins yet.");
    }
  };

  const handleCloudAdminSignOut = async () => {
    await supabase.auth.signOut();
    setCloudUserEmail(null);
    await checkCloudAdminStatus();
    sound.playClick();
    showNotification("Signed out of Cloud Admin Supabase session.");
  };

  const handlePushToCloud = async () => {
    setIsPushingCloud(true);
    const res = await pushLocalToCloud();
    setIsPushingCloud(false);
    if (res.success) {
      sound.playUnlock();
      showNotification(
        `Cloud sync complete! Pushed ${res.classesSynced} classes, ${res.subjectsSynced} subjects, ${res.stagesSynced} stages, ${res.ordersSynced ?? 0} order rules, and ${res.deletionsSynced ?? 0} deletions.`
      );
      await checkSupabaseHealth();
      await syncWithSupabase({ force: true });
    } else if (res.rlsBlocked) {
      sound.playIncorrect();
      setIsCloudAuthOpen(true);
      showNotification(res.error || "Sign in as a Supabase Cloud Admin before pushing changes.", "error");
    } else {
      sound.playIncorrect();
      showNotification(`Cloud sync failed: ${res.error || "Please run the updated SQL setup in Supabase."}`, "error");
    }
  };

  // Robust CSV parser function
  const parseCSVContent = (text: string) => {
    const lines: string[] = [];
    let currentLine = "";
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        insideQuote = !insideQuote;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !insideQuote) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = "";
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim());
    }

    if (lines.length < 2) return [];

    const parseRow = (rowStr: string): string[] => {
      const cells: string[] = [];
      let cell = "";
      let inQuotes = false;
      for (let j = 0; j < rowStr.length; j++) {
        const c = rowStr[j];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          cells.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
          cell = "";
        } else {
          cell += c;
        }
      }
      cells.push(cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
      return cells;
    };

    const header = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));

    const qIdx = header.findIndex((h) => h.includes("question"));
    const aIdx = header.findIndex((h) => h === "option_a" || h === "optiona" || h === "a" || h === "option_1");
    const bIdx = header.findIndex((h) => h === "option_b" || h === "optionb" || h === "b" || h === "option_2");
    const cIdx = header.findIndex((h) => h === "option_c" || h === "optionc" || h === "c" || h === "option_3");
    const dIdx = header.findIndex((h) => h === "option_d" || h === "optiond" || h === "d" || h === "option_4");
    const ansIdx = header.findIndex((h) => h.includes("correct") || h.includes("answer"));
    const expIdx = header.findIndex((h) => h.includes("explanation"));
    const tagIdx = header.findIndex((h) => h.includes("tag"));

    const result = [];

    for (let k = 1; k < lines.length; k++) {
      const row = parseRow(lines[k]);
      if (row.length < 5) continue;

      const qText = qIdx >= 0 ? row[qIdx] : row[0];
      const optA = aIdx >= 0 ? row[aIdx] : row[1];
      const optB = bIdx >= 0 ? row[bIdx] : row[2];
      const optC = cIdx >= 0 ? row[cIdx] : row[3];
      const optD = dIdx >= 0 ? row[dIdx] : row[4];
      const ansVal = ansIdx >= 0 ? (row[ansIdx] || "").trim() : "";
      const explanation = expIdx >= 0 ? (row[expIdx] || "") : "";
      const tagsStr = tagIdx >= 0 ? (row[tagIdx] || "") : "";

      let correctIndex = 0;
      const cleanAns = ansVal.toUpperCase();
      if (cleanAns === "A" || cleanAns === "1" || cleanAns === "OPTION_A" || cleanAns === (optA || "").toUpperCase()) {
        correctIndex = 0;
      } else if (cleanAns === "B" || cleanAns === "2" || cleanAns === "OPTION_B" || cleanAns === (optB || "").toUpperCase()) {
        correctIndex = 1;
      } else if (cleanAns === "C" || cleanAns === "3" || cleanAns === "OPTION_C" || cleanAns === (optC || "").toUpperCase()) {
        correctIndex = 2;
      } else if (cleanAns === "D" || cleanAns === "4" || cleanAns === "OPTION_D" || cleanAns === (optD || "").toUpperCase()) {
        correctIndex = 3;
      }

      if (qText && optA && optB) {
        result.push({
          question: qText,
          options: [optA, optB, optC || "None of the above", optD || "All of the above"],
          correctIndex,
          explanation: explanation || "The chosen option is the correct answer according to curriculum standards.",
          tags: tagsStr.replace(/;/g, ","),
        });
      }
    }

    return result;
  };

  // Handle CSV file selection
  const handleCSVFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSVContent(content);
      if (parsed.length > 0) {
        setCsvParsedQuestions(parsed);
        sound.playUnlock();
        showNotification(`Successfully extracted ${parsed.length} MCQs from ${file.name}!`);
        // If title is empty, generate from file name
        if (!csvTitle) {
          const autoTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
          setCsvTitle(autoTitle.charAt(0).toUpperCase() + autoTitle.slice(1));
        }
      } else {
        sound.playIncorrect();
        showNotification("Could not parse MCQs. Please ensure CSV matches the required columns.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Download sample CSV template
  const handleDownloadSampleCSV = () => {
    const sampleData = `question,option_a,option_b,option_c,option_d,correct_answer,explanation,tags
"Which component of the CPU coordinates and directs all operations within the computer?","Arithmetic Logic Unit (ALU)","Control Unit (CU)","Cache Memory","Accumulator Register","B","The Control Unit generates timing and control signals to direct operations.","cpu;control-unit;hardware"
"What is the binary representation of decimal number 13?","1101","1011","1110","1001","A","13 = 8 + 4 + 1, which corresponds to binary 1101.","binary;number-systems"
"Which memory type is volatile and loses its contents when power is turned off?","ROM","RAM","Hard Disk Drive","Optical Flash Storage","B","RAM (Random Access Memory) requires constant power to maintain stored data.","memory;ram;volatile"
"What is the time complexity of binary search on a sorted array?","O(n)","O(log n)","O(n^2)","O(1)","B","Binary search divides the search space in half at each iteration, giving logarithmic time O(log n).","algorithms;binary-search"
"Which logic gate outputs 1 only when both of its inputs are 1?","OR Gate","AND Gate","XOR Gate","NOT Gate","B","An AND gate produces high output (1) exclusively when all inputs are high (1).","digital-logic;gates;boolean"`;

    const blob = new Blob([sampleData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `educhain_${csvSubjectId}_sample_mcqs.csv`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playClick();
  };

  // Save CSV Stage
  const handleSaveCSVStage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!csvChapter.trim()) {
      showNotification("Chapter name is required (e.g. Chapter One: Computer Systems).", "error");
      return;
    }
    if (csvParsedQuestions.length === 0) {
      showNotification("Please select a valid CSV file containing MCQs.", "error");
      return;
    }

    const finalTopic = csvTopic.trim() || csvChapter.trim() || "General Practice";
    const finalTitle = csvTitle.trim() || (csvTopic.trim() ? `${csvTopic.trim()} Quest` : `${csvChapter.trim()} Challenge`);

    const selectedSubjectObj = allSubjects.find((s) => s.id === csvSubjectId) || allSubjects[0];

    const formattedQuestions: Question[] = csvParsedQuestions.map((q, i) => ({
      id: `q_${csvSubjectId}_${Date.now()}_${i}`,
      question: q.question.trim(),
      options: q.options.map((opt) => opt.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation.trim() || "The chosen option is the correct answer according to curriculum standards.",
      tags: q.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    }));

    const newStage: Stage = {
      id: `custom_stage_${Date.now()}`,
      subject: csvSubjectId as SubjectType,
      subjectName: selectedSubjectObj.name,
      subjectStageNumber: customStages.filter((s) => s.subject === csvSubjectId).length + 1,
      grade: csvGrade as any,
      chapter: csvChapter.trim(),
      chapterNumber: csvChapterNumber !== "" ? Number(csvChapterNumber) : undefined,
      topic: finalTopic,
      title: finalTitle,
      description: csvLearningObjective.trim() || `Quiz stage covering ${finalTopic}`,
      learningObjective: csvLearningObjective.trim() || `Master core principles of ${finalTopic}`,
      difficulty: csvDifficulty,
      xpReward: Number(csvXpReward) || 100,
      questions: formattedQuestions,
    };

    const res = await addStage(newStage);
    if (reportCloudAction(
      res,
      `Published "${newStage.title}" with ${formattedQuestions.length} MCQs to Supabase Cloud!`,
      `Stage "${newStage.title}" saved locally only (${res.error || "Supabase offline"}).`
    )) {
      // Reset CSV form
      setCsvChapter("");
      setCsvChapterNumber("");
      setCsvTopic("");
      setCsvTitle("");
      setCsvLearningObjective("");
      setCsvFileName("");
      setCsvParsedQuestions([]);
      setActiveTab("manage");
    }
  };

  // Manual Form Handlers
  const handleAddQuestionRow = () => {
    sound.playClick();
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
        tags: "",
      },
    ]);
  };

  const handleRemoveQuestionRow = (idx: number) => {
    sound.playClick();
    if (questions.length <= 1) {
      showNotification("A stage must contain at least 1 MCQ question.", "error");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx: number, field: string, value: any) => {
    const updated = [...questions];
    if (field === "question") updated[idx].question = value;
    if (field === "correctIndex") updated[idx].correctIndex = Number(value);
    if (field === "explanation") updated[idx].explanation = value;
    if (field === "tags") updated[idx].tags = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, optIdx: number, value: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chapter.trim()) {
      showNotification("Chapter name is required (e.g. Chapter One: Computer Systems).", "error");
      return;
    }

    const finalTopic = topic.trim() || chapter.trim() || "General Practice";
    const finalTitle = title.trim() || (topic.trim() ? `${topic.trim()} Quest` : `${chapter.trim()} Challenge`);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        showNotification(`Question #${i + 1} text is empty.`, "error");
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j].trim()) {
          showNotification(`Option ${String.fromCharCode(65 + j)} for Question #${i + 1} is empty.`, "error");
          return;
        }
      }
    }

    const selectedSubjectObj = allSubjects.find((s) => s.id === subjectId) || allSubjects[0];

    const formattedQuestions: Question[] = questions.map((q, i) => ({
      id: `q_${subjectId}_${Date.now()}_${i}`,
      question: q.question.trim(),
      options: q.options.map((opt) => opt.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation.trim() || "The chosen option is the correct answer according to curriculum standards.",
      tags: q.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean),
    }));

    const newStage: Stage = {
      id: `custom_stage_${Date.now()}`,
      subject: subjectId as SubjectType,
      subjectName: selectedSubjectObj.name,
      subjectStageNumber: customStages.filter((s) => s.subject === subjectId).length + 1,
      grade: grade as any,
      chapter: chapter.trim(),
      chapterNumber: manualChapterNumber !== "" ? Number(manualChapterNumber) : undefined,
      topic: finalTopic,
      title: finalTitle,
      description: learningObjective.trim() || `Quiz stage covering ${finalTopic}`,
      learningObjective: learningObjective.trim() || `Master core principles of ${finalTopic}`,
      difficulty,
      xpReward: Number(xpReward) || 100,
      questions: formattedQuestions,
    };

    const res = await addStage(newStage);
    if (reportCloudAction(
      res,
      `Published "${newStage.title}" with ${formattedQuestions.length} MCQs to Supabase Cloud!`,
      `Stage "${newStage.title}" saved locally only (${res.error || "Supabase offline"}).`
    )) {
      setChapter("");
      setManualChapterNumber("");
      setTopic("");
      setTitle("");
      setLearningObjective("");
      setQuestions([
        {
          question: "",
          options: ["", "", "", ""],
          correctIndex: 0,
          explanation: "",
          tags: "",
        },
      ]);
      setActiveTab("manage");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) {
      showNotification("Subject name is required.", "error");
      return;
    }
    const slug = newSubId.trim() || newSubName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const newSubject: CustomSubject = {
      id: slug,
      name: newSubName.trim(),
      icon: newSubIcon.trim() || "📚",
      description: newSubDesc.trim() || `${newSubName.trim()} curriculum tracks`,
      color: newSubColor,
      grade: newSubGrade || "grade_9",
    };

    const res = await addSubject(newSubject);
    if (reportCloudAction(
      res,
      `Subject "${newSubject.name}" created and synced to Supabase Cloud!`,
      `Subject "${newSubject.name}" created locally (${res.error || "Supabase offline"}).`
    )) {
      setCsvSubjectId(newSubject.id);
      setSubjectId(newSubject.id);
      setNewSubName("");
      setNewSubId("");
      setNewSubDesc("");
      setActiveTab("csv");
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showNotification("Class name is required.", "error");
      return;
    }
    const cleanId = newClassId.trim() || newClassName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const res = await addClass({
      id: cleanId,
      name: newClassName.trim(),
      description: newClassDesc.trim(),
      icon: newClassIcon.trim() || "🎓",
      displayOrder: Number(newClassOrder) || 1,
    });

    if (reportCloudAction(
      res,
      `Class / Standard "${newClassName.trim()}" created and synced to Supabase Cloud!`,
      `Class "${newClassName.trim()}" saved locally (${res.error || "Supabase offline"}).`
    )) {
      setNewClassName("");
      setNewClassId("");
      setNewClassDesc("");
      setNewClassIcon("🎓");
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopiedSql(true);
    sound.playClick();
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // 1. SECURITY LOCK SCREEN GATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen educhain-bg relative flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 glow-orb-blue pointer-events-none -z-10" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 glow-orb-cyan pointer-events-none -z-10" />

        <div className="relative z-10 w-full max-w-md mx-auto p-8 rounded-3xl border border-neutral-200/80 dark:border-white/10 bg-white dark:bg-[#182438] shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          
          <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 font-bold">
              Restricted Area
            </span>
            <h2 className="text-2xl font-extrabold text-neutral-900 dark:text-white tracking-tight mt-2 font-space-grotesk">
              EduChain Admin Security
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xs mx-auto">
              Please enter your administrator security passcode to manage the curriculum and student database.
            </p>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockAdmin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1.5">
                Admin Master Passcode
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? "text" : "password"}
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter admin passcode"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-sm text-neutral-900 dark:text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-neutral-500">
                <span>Default: <code>admin123</code></span>
                <span className="font-mono text-neutral-500">Encrypted</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl text-xs font-bold btn-educhain-primary flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Unlock Admin Panel</span>
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-100 dark:border-white/5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Student App</span>
            </Link>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-clip educhain-bg text-neutral-900 dark:text-neutral-100 font-sans selection:bg-blue-600 selection:text-white relative">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 dark:border-white/10 bg-white/85 dark:bg-[#101827]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors shrink-0"
              title="Return to Student Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <img
                src="/logo.png"
                alt="EduChain"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-neutral-200 dark:border-white/10 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-heading font-bold text-sm sm:text-base tracking-tight text-neutral-900 dark:text-white truncate">
                    EduChain Studio
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-300 border border-blue-500/20 dark:border-cyan-500/25 shrink-0">
                    Admin
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  Curriculum &amp; Assessment Console
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Unified Cloud Status, Auth & Sync Control Bar */}
            <div className="inline-flex items-center h-8 sm:h-9 rounded-lg border border-neutral-200/90 dark:border-white/10 bg-neutral-50/90 dark:bg-[#182438] divide-x divide-neutral-200/80 dark:divide-white/10 shadow-xs overflow-hidden">
              {cloudSyncStatus === "connected" ? (
                <div
                  className="h-full px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-neutral-700 dark:text-neutral-200"
                  title="Supabase Cloud connected: changes synchronize with your Supabase database"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 hidden sm:block shrink-0" />
                  <span className="hidden lg:inline">Cloud Synced</span>
                  <span className="hidden sm:inline lg:hidden">Synced</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setActiveTab("sql");
                  }}
                  className="h-full px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors cursor-pointer"
                  title="Supabase table not detected. Click to set up."
                >
                  <CloudOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Local Only</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  if (isCloudAdmin) {
                    handleCloudAdminSignOut();
                  } else {
                    setCloudAuthError(null);
                    setIsCloudAuthOpen(true);
                  }
                }}
                className={`h-full px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isCloudAdmin
                    ? "text-emerald-700 dark:text-emerald-300 hover:bg-neutral-100 dark:hover:bg-white/5"
                    : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5"
                }`}
                title={isCloudAdmin ? `Authenticated as ${cloudUserEmail || "Cloud Admin"} (Click to sign out)` : "Sign in with Supabase Cloud Admin account to write changes"}
              >
                {isCloudAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span className="hidden md:inline">{isCloudAdmin ? "Cloud Admin" : "Cloud Sign In"}</span>
              </button>

              <button
                type="button"
                disabled={isPushingCloud}
                onClick={handlePushToCloud}
                className="h-full px-2.5 sm:px-3 flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
                title="Push all locally stored stages & MCQs to Supabase cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 ${isPushingCloud ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            </div>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 shadow-xs transition-colors"
            >
              <span>Student App</span>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>

            <button
              type="button"
              onClick={handleLockAdmin}
              className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium border border-neutral-200/90 dark:border-white/10 bg-white dark:bg-[#182438] text-neutral-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300 dark:hover:border-rose-500/30 hover:bg-rose-50/70 dark:hover:bg-rose-500/10 shadow-xs transition-colors cursor-pointer"
              title="Lock admin session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-4 left-3 right-3 sm:left-auto sm:bottom-6 sm:right-6 z-50 sm:max-w-md px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium border animate-in slide-in-from-bottom-3 ${
          notification.type === "success"
            ? "bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-500/30"
            : "bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-500/30"
        }`}>
          {notification.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Supabase Status Alert Banner (only shown when setup action is required) */}
        {cloudSyncStatus === "disconnected" && (
          <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>Supabase Database Tables Not Created Yet</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 font-bold">Action Required</span>
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                  Your custom stages and MCQs are currently saved <strong>locally in this browser</strong>. To make them live for all students across devices, create the <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono text-[11px]">custom_stages</code> table in Supabase.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setActiveTab("sql");
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-all cursor-pointer"
              >
                Open SQL Setup
              </button>
              <button
                type="button"
                disabled={isPushingCloud}
                onClick={handlePushToCloud}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold border border-amber-500/30 bg-white dark:bg-black/40 hover:bg-amber-500/10 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPushingCloud ? "animate-spin" : ""}`} />
                <span>Retry Sync</span>
              </button>
            </div>
          </div>
        )}

        {/* Uniform Segmented Navigation Bar */}
        <nav
          aria-label="Admin sections"
          className="mb-6 p-1 rounded-xl border border-neutral-200/90 dark:border-white/10 bg-neutral-100/85 dark:bg-[#141f31] shadow-xs"
        >
          <div className="grid grid-cols-3 lg:grid-cols-9 gap-1" role="tablist">
            {(
              [
                { id: "csv", label: "CSV Import", icon: FileSpreadsheet },
                { id: "upload", label: "Add MCQ", icon: Plus },
                { id: "manage", label: "Stages", count: allStages.length, icon: BookOpen },
                { id: "chapters", label: "Chapters", icon: ListOrdered },
                { id: "subjects", label: "Subjects", count: allSubjects.length, icon: Layers },
                { id: "classes", label: "Classes", count: allClasses.length, icon: GraduationCap },
                { id: "levels", label: "XP & Streak", icon: Award },
                { id: "users", label: "Scholars", icon: Users },
                { id: "sql", label: "Cloud SQL", icon: Database },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    sound.playClick();
                    setActiveTab(tab.id);
                  }}
                  className={`h-9 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                    tab.id === "sql" ? "col-span-2 sm:col-span-1" : ""
                  } ${
                    isActive
                      ? "bg-white dark:bg-[#223149] text-neutral-900 dark:text-white font-semibold shadow-sm ring-1 ring-neutral-900/5 dark:ring-white/10"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/[0.04]"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-blue-600 dark:text-cyan-400" : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {"count" in tab && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tabular-nums leading-none ${
                        isActive
                          ? "bg-blue-50 text-blue-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                          : "bg-neutral-200/70 dark:bg-white/10 text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* ======================================================== */}
        {/* TAB 0: UPLOAD VIA CSV FILE (FOR SPECIFIC STAGE OF SPECIFIC CHAPTER OF SUBJECT) */}
        {/* ======================================================== */}
        {activeTab === "csv" && (
          <form onSubmit={handleSaveCSVStage} className="space-y-8 animate-in fade-in duration-200">
            
            {/* Header info & Template download */}
            <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-neutral-100 dark:border-white/5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Upload MCQs via CSV to Specific Chapter</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Select the subject, enter the chapter and topic, then import your spreadsheet of questions.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSampleCSV}
                  className="btn-educhain-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>

              {/* Classification Fields: Class, Subject, Chapter & Topic (REQUIRED) */}
              {/* Classification & Chapter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4">
                
                {/* Class Selector */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                      Class / Grade <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("classes")}
                      className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline"
                    >
                      + New Class
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                      <SleekIcon name={allClasses.find((c) => c.id === csvGrade)?.icon || csvGrade} className="w-4 h-4" />
                    </div>
                    <select
                      value={csvGrade}
                      onChange={(e) => {
                        const newG = e.target.value;
                        setCsvGrade(newG);
                        const matchingSubs = allSubjects.filter((s) => (s.grade || "grade_9") === newG);
                        if (matchingSubs.length > 0) {
                          setCsvSubjectId(matchingSubs[0].id);
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-semibold focus:outline-none"
                    >
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Selector */}
                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                      Target Subject <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubGrade(csvGrade);
                        setActiveTab("subjects");
                      }}
                      className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline"
                    >
                      + New Subject
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                      <SleekIcon name={allSubjects.find((s) => s.id === csvSubjectId)?.icon || csvSubjectId} className="w-4 h-4" />
                    </div>
                    <select
                      value={csvSubjectId}
                      onChange={(e) => setCsvSubjectId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-semibold focus:outline-none"
                    >
                      {allSubjects.filter((s) => (s.grade || "grade_9") === csvGrade).length > 0 ? (
                        allSubjects
                          .filter((s) => (s.grade || "grade_9") === csvGrade)
                          .map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))
                      ) : (
                        allSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Specific Chapter Name */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Specific Chapter Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physical Quantities and Measurement"
                    value={csvChapter}
                    onChange={(e) => setCsvChapter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Classifies stage under this chapter header</p>
                </div>

                {/* Chapter Number Input */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Chapter # <span className="text-neutral-400 font-normal lowercase">(opt)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    placeholder="e.g. 1"
                    value={csvChapterNumber}
                    onChange={(e) => setCsvChapterNumber(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-mono text-center focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Numerical order</p>
                </div>

              </div>

              {/* Optional Topic & Stage Quest Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-white/5">
                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Specific Topic Name <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Von Neumann Architecture & CPU Registers (optional)"
                    value={csvTopic}
                    onChange={(e) => setCsvTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Defaults to chapter name if omitted</p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Stage Quest Title <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CPU Architecture Mastery Quest (optional)"
                    value={csvTitle}
                    onChange={(e) => setCsvTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Defaults to topic / chapter challenge if omitted</p>
                </div>
              </div>

              {/* Difficulty & XP */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-white/5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={csvDifficulty}
                    onChange={(e) => setCsvDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    value={csvXpReward}
                    onChange={(e) => setCsvXpReward(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                  Learning Objective (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Understand the difference between ALU, Control Unit and System Buses."
                  value={csvLearningObjective}
                  onChange={(e) => setCsvLearningObjective(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

            </div>

            {/* CSV File Upload Dropzone */}
            <div className="p-5 sm:p-8 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-white/15 bg-white dark:bg-[#182438] text-center shadow-sm">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCSVFileChange}
                accept=".csv"
                className="hidden"
              />

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
                {csvFileName ? `Selected: ${csvFileName}` : "Click or Drag & Drop your MCQs CSV file here"}
              </h4>
              <p className="text-xs text-neutral-500 mb-4 max-w-md mx-auto">
                CSV must include columns: <code>question, option_a, option_b, option_c, option_d, correct_answer</code>
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-educhain-secondary text-xs px-5 py-2.5 rounded-xl font-semibold"
              >
                {csvFileName ? "Choose a Different CSV File" : "Select CSV File"}
              </button>
            </div>

            {/* Live Preview of Parsed Questions */}
            {csvParsedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Extracted MCQs Preview ({csvParsedQuestions.length} Questions)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-neutral-500">
                    Ready to attach to {allSubjects.find(s => s.id === csvSubjectId)?.name}
                  </span>
                </div>

                <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#182438] divide-y divide-neutral-100 dark:divide-white/[0.04]">
                  {csvParsedQuestions.map((q, idx) => {
                    const letters = ["A", "B", "C", "D"];
                    return (
                      <div key={idx} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="font-semibold text-xs text-neutral-900 dark:text-white flex items-start gap-2">
                            <span className="font-mono text-neutral-400">Q{idx + 1}.</span>
                            <span>{q.question}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              sound.playClick();
                              setCsvParsedQuestions(csvParsedQuestions.filter((_, i) => i !== idx));
                            }}
                            className="text-neutral-400 hover:text-rose-500 p-1"
                            title="Remove question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* 4 Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctIndex === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                                  isCorrect
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-semibold"
                                    : "bg-neutral-50/50 dark:bg-white/[0.02] border-neutral-200/60 dark:border-white/5 text-neutral-600 dark:text-neutral-400"
                                }`}
                              >
                                <span>{letters[oIdx]}. {opt}</span>
                                {isCorrect && <Check className="w-3 h-3 text-emerald-500" />}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="text-[11px] text-neutral-500 italic pl-5">
                            💡 Explanation: {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Publish Action Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-[#182438] border border-neutral-200 dark:border-white/10">
                  <span className="text-xs text-neutral-500">
                    Will be created in <strong>{csvChapter || "Chapter"}</strong> as <strong>{csvTitle || "New Stage"}</strong>
                  </span>

                  <button
                    type="submit"
                    className="w-full sm:w-auto btn-educhain-primary text-xs px-5 sm:px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Publish Stage with {csvParsedQuestions.length} CSV MCQs</span>
                  </button>
                </div>
              </div>
            )}

          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 1: MANUAL FORM MCQ BUILDER */}
        {/* ======================================================== */}
        {activeTab === "upload" && (
          <form onSubmit={handleSaveStage} className="space-y-8 animate-in fade-in duration-200">
            
            {/* Step 1: Subject, Chapter & Topic (REQUIRED FIELDS) */}
            <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-neutral-100 dark:border-white/5">
                <span className="w-6 h-6 rounded-full bg-sky-500/10 text-sky-600 dark:text-cyan-400 font-bold text-xs flex items-center justify-center font-mono">
                  1
                </span>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Curriculum Hierarchy & Classification
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Class Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                      Class / Grade <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab("classes")}
                      className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline"
                    >
                      + New Class
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                      <SleekIcon name={allClasses.find((c) => c.id === grade)?.icon || grade} className="w-4 h-4" />
                    </div>
                    <select
                      value={grade}
                      onChange={(e) => {
                        const newG = e.target.value;
                        setGrade(newG);
                        const matchingSubs = allSubjects.filter((s) => (s.grade || "grade_9") === newG);
                        if (matchingSubs.length > 0) {
                          setSubjectId(matchingSubs[0].id);
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-semibold focus:outline-none"
                    >
                      {allClasses.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                      Subject <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSubGrade(grade);
                        setActiveTab("subjects");
                      }}
                      className="text-[11px] text-sky-600 dark:text-cyan-400 hover:underline"
                    >
                      + New Subject
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                      <SleekIcon name={allSubjects.find((s) => s.id === subjectId)?.icon || subjectId} className="w-4 h-4" />
                    </div>
                    <select
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-semibold focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                    >
                      {allSubjects.filter((s) => (s.grade || "grade_9") === grade).length > 0 ? (
                        allSubjects
                          .filter((s) => (s.grade || "grade_9") === grade)
                          .map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))
                      ) : (
                        allSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Chapter Name & Number Input */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                      Chapter Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Physical Quantities and Measurement"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">Groups stages under this chapter</p>
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                      Chapter # (Opt)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      placeholder="e.g. 1 or 6"
                      value={manualChapterNumber}
                      onChange={(e) => setManualChapterNumber(e.target.value ? parseInt(e.target.value, 10) : "")}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-mono text-center focus:outline-none"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">e.g. 6</p>
                  </div>
                </div>

                {/* Topic Name Input (REQUIRED) */}
                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Topic Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Von Neumann Architecture & CPU Buses"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">Specific syllabus subtopic</p>
                </div>

              </div>

              {/* Stage Details (Title, Difficulty, Grade, XP) */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-100 dark:border-white/5">
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Stage Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Internal Processor Architecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                    XP Reward
                  </label>
                  <input
                    type="number"
                    value={xpReward}
                    onChange={(e) => setXpReward(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  />
                </div>

              </div>

              <div className="mt-4">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1.5">
                  Learning Objective (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Understand how the Control Unit and ALU execute instructions."
                  value={learningObjective}
                  onChange={(e) => setLearningObjective(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>

            </div>

            {/* Step 2: Multiple Choice Questions (MCQs) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                    2
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Multiple Choice Questions ({questions.length})
                    </h3>
                    <p className="text-xs text-neutral-500">Provide 4 options and mark the correct answer radio button.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddQuestionRow}
                  className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Question</span>
                </button>
              </div>

              {/* Question Cards */}
              {questions.map((q, qIdx) => (
                <div 
                  key={qIdx}
                  className="p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-white/5">
                    <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200">
                      Question #{qIdx + 1}
                    </span>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestionRow(qIdx)}
                        className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Question</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-1.5">
                      Question Text <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="e.g. Which register holds the address of the next instruction to be fetched from memory?"
                      value={q.question}
                      onChange={(e) => handleQuestionChange(qIdx, "question", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* 4 Options Grid */}
                  <div>
                    <label className="block text-xs font-mono font-semibold text-neutral-600 dark:text-neutral-400 uppercase mb-2">
                      Options & Select Correct Answer <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctIndex === optIdx;
                        const letters = ["A", "B", "C", "D"];

                        return (
                          <div 
                            key={optIdx}
                            className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all ${
                              isCorrect 
                                ? "border-emerald-500/50 bg-emerald-500/[0.04] ring-1 ring-emerald-500/30"
                                : "border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02]"
                            }`}
                          >
                            <label className="cursor-pointer flex items-center gap-1.5 shrink-0">
                              <input
                                type="radio"
                                name={`correct_${qIdx}`}
                                checked={isCorrect}
                                onChange={() => handleQuestionChange(qIdx, "correctIndex", optIdx)}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className={`text-xs font-mono font-bold ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-neutral-500"}`}>
                                {letters[optIdx]}
                              </span>
                            </label>

                            <input
                              type="text"
                              required
                              placeholder={`Option ${letters[optIdx]}`}
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              className="w-full bg-transparent text-xs text-neutral-900 dark:text-white focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Explanation & Tags */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-mono text-neutral-500 uppercase mb-1">
                        Explanation (Shown after answering)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. The Program Counter (PC) stores the address of the next instruction."
                        value={q.explanation}
                        onChange={(e) => handleQuestionChange(qIdx, "explanation", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-neutral-500 uppercase mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. cpu, memory, registers"
                        value={q.tags}
                        onChange={(e) => handleQuestionChange(qIdx, "tags", e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs text-neutral-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-[#182438] border border-neutral-200 dark:border-white/10">
              <button
                type="button"
                onClick={handleAddQuestionRow}
                className="flex-1 sm:flex-initial btn-educhain-secondary text-xs px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>

              <button
                type="submit"
                className="flex-1 sm:flex-initial btn-educhain-primary text-xs px-5 sm:px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Publish Stage & MCQs</span>
              </button>
            </div>

          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CREATE / MANAGE SUBJECTS */}
        {/* ======================================================== */}
        {activeTab === "subjects" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Create Subject Form */}
            <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">
                Create New Academic Subject
              </h3>
              <p className="text-xs text-neutral-500 mb-6">
                Add new disciplines (e.g., Physics, Urdu, Islamic Studies, Pakistan Studies) to the learning platform.
              </p>

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Subject Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Physics"
                      value={newSubName}
                      onChange={(e) => {
                        setNewSubName(e.target.value);
                        if (!newSubId) {
                          setNewSubId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Target Class <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                        <SleekIcon name={allClasses.find((c) => c.id === newSubGrade)?.icon || newSubGrade} className="w-4 h-4" />
                      </div>
                      <select
                        value={newSubGrade}
                        onChange={(e) => setNewSubGrade(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-semibold focus:outline-none"
                      >
                        {allClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Subject ID (Slug)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. physics"
                      value={newSubId}
                      onChange={(e) => setNewSubId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Icon / Emoji
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ⚡ or 🔬 or 📖"
                      value={newSubIcon}
                      onChange={(e) => setNewSubIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                    />
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kinematics, Forces, Waves & Modern Physics"
                    value={newSubDesc}
                    onChange={(e) => setNewSubDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  />
                </div>

                {/* Color Preset Picker */}
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase mb-2">
                    Theme Color Accent
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setNewSubColor(color.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          newSubColor === color.value 
                            ? "border-black dark:border-white ring-2 ring-black/20 dark:ring-white/20 font-bold" 
                            : "border-neutral-200 dark:border-white/10"
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color.value }} />
                        <span>{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-educhain-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Subject</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Existing Subjects */}
            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Active Subjects ({allSubjects.length})
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Click Edit to customize icons &amp; colors, or Delete to remove any subject from the curriculum.
                  </p>
                </div>

                {deletedSubjectIds && deletedSubjectIds.length > 0 && (
                  <button
                    onClick={async () => {
                      sound.playClick();
                      const res = await restoreAllDefaultSubjects();
                      reportCloudAction(res, "Restored default subjects across cloud & local cache!");
                    }}
                    className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Restore Defaults ({deletedSubjectIds.length} hidden)</span>
                  </button>
                )}
              </div>

              {/* Filter by Class */}
              <div className="flex flex-wrap items-center gap-1.5 mb-6 pb-3 border-b border-neutral-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setSubjectClassFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    subjectClassFilter === "all"
                      ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs"
                      : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  All Classes ({allSubjects.length})
                </button>
                {allClasses.map((cls) => {
                  const count = allSubjects.filter((s) => (s.grade || "grade_9") === cls.id).length;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSubjectClassFilter(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                        subjectClassFilter === cls.id
                          ? "bg-black dark:bg-white text-white dark:text-black font-semibold shadow-xs"
                          : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <SleekIcon name={cls.icon || cls.id} className="w-3.5 h-3.5" />
                      <span>{cls.name}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {allSubjects
                  .filter((sub) => subjectClassFilter === "all" || (sub.grade || "grade_9") === subjectClassFilter)
                  .map((sub) => {
                  const isCustom = customSubjects.some((cs) => cs.id === sub.id);
                  const stageCount = getAllStages().filter((s) => s.subject === sub.id).length;
                  const classObj = allClasses.find((c) => c.id === (sub.grade || "grade_9"));

                  return (
                    <div 
                      key={sub.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <SleekBadgeIcon name={sub.id} color={sub.color} size="md" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                              <SleekIcon name={classObj?.id || "class_9"} className="w-3 h-3" />
                              <span>{classObj?.name || "Class 9"}</span>
                            </span>
                            <span 
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold"
                              style={{ backgroundColor: `${sub.color}20`, color: sub.color }}
                            >
                              {stageCount} Stages
                            </span>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          {sub.name}
                        </h4>
                        <p className="text-[11px] text-neutral-500 line-clamp-2 mt-1">
                          {sub.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setEditingSubject(sub);
                            setIsEditSubjectOpen(true);
                          }}
                          className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete subject "${sub.name}"? All ${stageCount} stages in this subject will be removed.`)) {
                              const res = await deleteSubject(sub.id);
                              reportCloudAction(res, `Subject "${sub.name}" deleted and synced across devices.`);
                            }
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-mono flex items-center gap-1 font-semibold"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB: MANAGE CLASSES / STANDARDS */}
        {/* ======================================================== */}
        {activeTab === "classes" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Create Class Form */}
            <div className="p-4 sm:p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-500" />
                <span>Create New Class / Standard</span>
              </h3>
              <p className="text-xs text-neutral-500 mb-6">
                Add standard educational tiers (e.g., Class 8, Matric Part II, FSc Pre-Engineering, O-Levels, A-Levels). Subjects and syllabus stages are classified under their respective classes.
              </p>

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  
                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Class Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Class 8"
                      value={newClassName}
                      onChange={(e) => {
                        setNewClassName(e.target.value);
                        if (!newClassId) {
                          setNewClassId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "_"));
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Class ID (Slug)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. class_8"
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Icon / Emoji
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🎒 or 🎓 or ⚡"
                      value={newClassIcon}
                      onChange={(e) => setNewClassIcon(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                      Display Order Priority
                    </label>
                    <input
                      type="number"
                      value={newClassOrder}
                      onChange={(e) => setNewClassOrder(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                    />
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
                    Description / Certificate Level
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Secondary School Certificate (SSC Part I) / Middle School"
                    value={newClassDesc}
                    onChange={(e) => setNewClassDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-[#101827] text-xs focus:outline-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn-educhain-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Class Standard</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Existing Classes */}
            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Active Educational Classes ({allClasses.length})
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Manage classes, assign subjects, or edit certificate labels.
                  </p>
                </div>

                {deletedClassIds && deletedClassIds.length > 0 && (
                  <button
                    onClick={async () => {
                      sound.playClick();
                      const res = await restoreAllDefaultClasses();
                      reportCloudAction(res, "Restored default classes across cloud & local cache!");
                    }}
                    className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                    <span>Restore Defaults ({deletedClassIds.length} hidden)</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {allClasses.map((cls) => {
                  const classSubjects = allSubjects.filter((s) => (s.grade || "grade_9") === cls.id);
                  const classStages = getAllStages().filter((s) => (s.grade || "grade_9") === cls.id);

                  return (
                    <div 
                      key={cls.id}
                      className="p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] flex flex-col justify-between hover:border-black/20 dark:hover:border-white/20 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <SleekBadgeIcon name={cls.id || cls.icon} color="#38bdf8" size="lg" />
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-cyan-400 font-bold border border-sky-500/20">
                            Order #{cls.displayOrder || 1}
                          </span>
                        </div>
                        
                        <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                          {cls.name}
                        </h4>
                        
                        <p className="text-xs text-neutral-500 line-clamp-2 mt-1 mb-4 leading-relaxed">
                          {cls.description || "Curriculum Standard Class"}
                        </p>

                        <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/50 dark:border-white/5 text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                          <span className="font-semibold text-neutral-900 dark:text-white">{classSubjects.length}</span> Subjects
                          <span>•</span>
                          <span className="font-semibold text-neutral-900 dark:text-white">{classStages.length}</span> Stages
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-neutral-200/60 dark:border-white/5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            sound.playClick();
                            setEditingClass(cls);
                            setIsEditClassOpen(true);
                          }}
                          className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        
                        <button
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete class "${cls.name}"?`)) {
                              const res = await deleteClass(cls.id);
                              reportCloudAction(res, `Class "${cls.name}" deleted and synced across devices.`);
                            }
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-mono flex items-center gap-1 font-semibold"
                          title="Delete Class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}


        {/* ======================================================== */}
        {/* TAB 3: CHAPTER ORDERING & NUMERICAL RE-SEQUENCING */}
        {/* ======================================================== */}
        {activeTab === "chapters" && (() => {
          // Aggregate all unique chapters for current orderSubject and orderGrade
          const allCurriculumStages = getAllStages();
          const targetStages = allCurriculumStages.filter(
            (s) => s.subject === orderSubject && (s.grade || "grade_9") === orderGrade
          );

          const chapMap = new Map<string, { stages: Stage[]; originalNumber: number }>();
          let naturalIndex = 1;

          targetStages.forEach((s) => {
            const chap = s.chapter || "Core Curriculum";
            if (!chapMap.has(chap)) {
              const key = `${orderGrade}::${orderSubject}::${chap}`;
              const assigned = chapterOrders[key] ?? s.chapterNumber ?? naturalIndex;
              chapMap.set(chap, {
                stages: [],
                originalNumber: assigned,
              });
              naturalIndex++;
            }
            chapMap.get(chap)!.stages.push(s);
          });

          const totalSubjectChapters = chapMap.size;
          const highestAssignedChapter = Array.from(chapMap.entries()).reduce(
            (maxNum, [name, info]) => Math.max(maxNum, chapterEdits[name] ?? info.originalNumber),
            6
          );
          const maxQuickNum = Math.min(12, Math.max(totalSubjectChapters, highestAssignedChapter, 6));
          const quickNumbers = Array.from({ length: maxQuickNum }, (_, i) => i + 1);

          // Build list
          let chaptersList = Array.from(chapMap.entries()).map(([chapterName, info]) => {
            const currentNum = chapterEdits[chapterName] ?? info.originalNumber;
            return {
              chapterName,
              chapterNumber: currentNum,
              stages: info.stages,
              topics: Array.from(new Set(info.stages.map((st) => st.topic).filter(Boolean))),
            };
          });

          // Filter by search if applied
          if (chapterSearch.trim()) {
            const q = chapterSearch.toLowerCase();
            chaptersList = chaptersList.filter(
              (c) => c.chapterName.toLowerCase().includes(q) || c.topics.some((t) => Boolean(t && t.toLowerCase().includes(q)))
            );
          }

          // Sort by assigned chapterNumber deterministically
          chaptersList.sort(
            (a, b) => a.chapterNumber - b.chapterNumber || a.chapterName.localeCompare(b.chapterName)
          );

          const handleUpdateChapterNumber = (chapName: string, newNum: number) => {
            const valid = Math.max(1, Math.min(99, newNum));
            setChapterEdits((prev) => ({
              ...prev,
              [chapName]: valid,
            }));
          };

          const handleCommitChapterOrders = async () => {
            const updates = chaptersList.map((c) => ({
              subject: orderSubject,
              grade: orderGrade,
              chapterName: c.chapterName,
              chapterNumber: c.chapterNumber,
            }));
            const res = await batchSetChapterNumbers(updates);
            if (reportCloudAction(
              res,
              `Saved chapter order to Supabase for ${allSubjects.find(s => s.id === orderSubject)?.name || "Subject"}!`,
              `Chapter order saved locally only (${res.error || "Supabase offline"}).`
            )) {
              setChapterEdits({});
            }
          };

          const handleAutoSequence = () => {
            sound.playClick();
            const newEdits: Record<string, number> = {};
            chaptersList.forEach((c, idx) => {
              newEdits[c.chapterName] = idx + 1;
            });
            setChapterEdits((prev) => ({ ...prev, ...newEdits }));
            showNotification("Chapters sequenced 1, 2, 3... Click 'Save Changes' to commit.");
          };

          const handleResetToDefaults = async () => {
            const res = await resetChapterNumbers(orderSubject, orderGrade);
            if (reportCloudAction(
              res,
              "Reset chapter order to default sequence in Supabase.",
              `Reset chapter order locally only (${res.error || "Supabase offline"}).`
            )) {
              setChapterEdits({});
            }
          };

          const selectedSubMeta = allSubjects.find((s) => s.id === orderSubject);
          const selectedClassMeta = allClasses.find((c) => c.id === orderGrade);

          return (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* Header Banner */}
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-[#263B5B] bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-[#182438] dark:via-[#1c2c44] dark:to-[#182438] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-cyan-400 border border-blue-500/20">
                      Curriculum Architecture
                    </span>
                    <span className="text-xs text-neutral-400">•</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 font-semibold">
                      Chapter Numbering Autonomy
                    </span>
                  </div>
                  <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1.5 tracking-tight">
                    Chapter Sequence &amp; Numbering
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Set chapter numbers to your own choice (e.g. renumber Chapter 3 to Chapter 6). 
                    EduChain automatically re-sequences chapters on the student map and updates badges like <span className="font-semibold text-blue-500">CHAPTER SIX</span>.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAutoSequence}
                    className="btn-educhain-secondary text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5"
                    title="Sequence 1, 2, 3... in current order"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Auto 1, 2, 3...</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetToDefaults}
                    className="btn-educhain-secondary text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-1.5 text-neutral-500 hover:text-rose-500"
                    title="Reset to initial un-ordered state"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitChapterOrders}
                    className="btn-educhain-primary text-xs px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-blue-500/25"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Chapter Order</span>
                  </button>
                </div>
              </div>

              {/* Subject & Class Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182438]">
                <div className="flex items-center gap-3 flex-wrap">
                  
                  {/* Class Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-mono font-semibold">Class:</span>
                    <div className="relative min-w-[140px]">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                        <SleekIcon name={selectedClassMeta?.icon || orderGrade} className="w-3.5 h-3.5" />
                      </div>
                      <select
                        value={orderGrade}
                        onChange={(e) => {
                          setOrderGrade(e.target.value);
                          setChapterEdits({});
                        }}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-semibold focus:outline-none"
                      >
                        {allClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 font-mono font-semibold">Subject:</span>
                    <div className="relative min-w-[160px]">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                        <SleekIcon name={selectedSubMeta?.icon || orderSubject} className="w-3.5 h-3.5" />
                      </div>
                      <select
                        value={orderSubject}
                        onChange={(e) => {
                          setOrderSubject(e.target.value);
                          setChapterEdits({});
                        }}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-semibold focus:outline-none"
                      >
                        {allSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                </div>

                {/* Search in Chapters */}
                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search chapter or topic..."
                    value={chapterSearch}
                    onChange={(e) => setChapterSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Chapters List */}
              {chaptersList.length === 0 ? (
                <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-[#182438]">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl mb-3">
                    📚
                  </div>
                  <h4 className="font-heading text-base font-bold text-slate-900 dark:text-white">
                    No chapters found in {selectedSubMeta?.name || "this subject"} for {selectedClassMeta?.name || "this class"}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
                    Create your first chapter by uploading MCQs through CSV or building a stage using the Manual Form.
                  </p>
                  <button
                    onClick={() => setActiveTab("csv")}
                    className="btn-educhain-primary text-xs px-4 py-2 rounded-xl font-bold"
                  >
                    Upload CSV to Create Chapters
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] sm:text-xs font-mono text-neutral-500">
                    <span>{chaptersList.length} Chapters Found in {selectedSubMeta?.name}</span>
                    <span>Sorted by Assigned Chapter Number</span>
                  </div>

                  {chaptersList.map((chap, idx) => {
                    const word = formatChapterWord(chap.chapterNumber);
                    return (
                      <div
                        key={chap.chapterName}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-[#263B5B] bg-white dark:bg-[#182438] hover:border-blue-500/40 dark:hover:border-cyan-400/40 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 card-lift"
                      >
                        {/* Chapter Left Info */}
                        <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                          {/* Live Chapter Badge (Fixed uniform width so titles align vertically) */}
                          <div className="w-[96px] sm:w-[120px] shrink-0 flex flex-col items-center">
                            <span
                              title={`Chapter ${word}`}
                              className="w-full text-center px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#2563EB] to-[#22D3EE] text-white shadow-xs whitespace-nowrap truncate"
                            >
                              Chapter {word}
                            </span>
                            <span className="text-[10px] font-mono tabular-nums text-neutral-400 mt-1">
                              Position #{idx + 1}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-heading text-base font-bold text-slate-900 dark:text-white tracking-tight">
                              {chap.chapterName}
                            </h4>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-mono font-semibold leading-tight px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-cyan-400 border border-blue-500/15 shrink-0">
                                {chap.stages.length} {chap.stages.length === 1 ? "Stage" : "Stages"}
                              </span>

                              {chap.topics.slice(0, 3).map((topic) => (
                                <span
                                  key={topic}
                                  className="text-[10px] font-medium leading-tight px-2.5 py-1 rounded-md border border-transparent bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 truncate max-w-[200px]"
                                >
                                  {topic}
                                </span>
                              ))}
                              {chap.topics.length > 3 && (
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  +{chap.topics.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Chapter Number Controller */}
                        <div className="flex items-center justify-between md:justify-start gap-3 shrink-0 w-full md:w-auto self-stretch md:self-center bg-slate-50 dark:bg-[#101827]/80 p-2.5 rounded-2xl border border-slate-200 dark:border-white/10">
                          <div className="flex flex-col text-left md:text-right pr-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-[#94A3B8]">
                              Chapter Number
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              (e.g. 1..99)
                            </span>
                          </div>

                          {/* Stepper Buttons and Direct Number Input */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                handleUpdateChapterNumber(chap.chapterName, chap.chapterNumber - 1);
                              }}
                              disabled={chap.chapterNumber <= 1}
                              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182438] text-slate-700 dark:text-white font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 text-sm"
                              title="Decrease Chapter Number"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min="1"
                              max="99"
                              aria-label={`Chapter number for ${chap.chapterName}`}
                              value={chap.chapterNumber}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) {
                                  handleUpdateChapterNumber(chap.chapterName, val);
                                }
                              }}
                              className="w-14 h-8 p-0 text-center tabular-nums font-heading font-extrabold text-sm rounded-lg border border-blue-500/30 dark:border-cyan-400/30 bg-white dark:bg-[#182438] text-blue-600 dark:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <button
                              type="button"
                              onClick={() => {
                                sound.playClick();
                                handleUpdateChapterNumber(chap.chapterName, chap.chapterNumber + 1);
                              }}
                              disabled={chap.chapterNumber >= 99}
                              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182438] text-slate-700 dark:text-white font-bold flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 text-sm"
                              title="Increase Chapter Number"
                            >
                              +
                            </button>
                          </div>

                          {/* Dynamic Quick Jump Buttons matching subject chapter range */}
                          <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-white/10">
                            {quickNumbers.map((quickNum) => (
                              <button
                                key={quickNum}
                                type="button"
                                onClick={() => {
                                  sound.playClick();
                                  handleUpdateChapterNumber(chap.chapterName, quickNum);
                                }}
                                title={`Set chapter number to ${quickNum}`}
                                className={`w-6 h-6 rounded-md text-[10px] font-mono tabular-nums font-bold cursor-pointer transition-all ${
                                  chap.chapterNumber === quickNum
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-neutral-400 hover:text-black dark:hover:text-white"
                                }`}
                              >
                                {quickNum}
                              </button>
                            ))}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })()}

        {/* ======================================================== */}
        {/* TAB 3: MANAGE STAGES */}
        {/* ======================================================== */}
        {activeTab === "manage" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  Curriculum Stage Catalog
                </h3>
                <p className="text-xs text-neutral-500">
                  {allStages.length} stages in curriculum. Edit or delete any stage across subjects and classes.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {deletedStageIds && deletedStageIds.length > 0 && (
                  <button
                    onClick={async () => {
                      const count = deletedStageIds.length;
                      const res = await restoreAllDefaultStages();
                      reportCloudAction(res, `Restored ${count} default stages across cloud & local cache.`);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono font-semibold flex items-center gap-1.5 hover:bg-amber-500/20 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Defaults ({deletedStageIds.length})</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("csv")}
                  className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Upload CSV</span>
                </button>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="btn-educhain-primary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Form</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438]">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={stageSearch}
                  onChange={(e) => setStageSearch(e.target.value)}
                  placeholder="Filter stages by title, chapter or topic..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-mono">Class:</span>
                  <select
                    value={stageFilterClass}
                    onChange={(e) => setStageFilterClass(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-medium"
                  >
                    <option value="all">All Classes</option>
                    {allClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-500 font-mono">Subject:</span>
                  <select
                    value={stageFilterSubject}
                    onChange={(e) => setStageFilterSubject(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-medium"
                  >
                    <option value="all">All Subjects</option>
                    {allSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Stages Table */}
            <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#182438]">
              <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] text-neutral-500 font-mono">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Class / Subject</th>
                    <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Chapter</th>
                    <th className="py-3 px-3 sm:px-4">Stage Title / Topic</th>
                    <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">MCQs</th>
                    <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Difficulty</th>
                    <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
                  {getAllStages()
                    .filter((stage) => {
                      const matchesClass = stageFilterClass === "all" || (stage.grade || "grade_9") === stageFilterClass;
                      const matchesSub = stageFilterSubject === "all" || stage.subject === stageFilterSubject;
                      const matchesSearch = stage.title.toLowerCase().includes(stageSearch.toLowerCase()) ||
                        (stage.chapter || "").toLowerCase().includes(stageSearch.toLowerCase()) ||
                        (stage.topic || "").toLowerCase().includes(stageSearch.toLowerCase());
                      return matchesClass && matchesSub && matchesSearch;
                    })
                    .map((stage) => {
                      const isCustom = customStages.some((cs) => String(cs.id) === String(stage.id));
                      const classObj = allClasses.find((c) => c.id === (stage.grade || "grade_9"));

                      return (
                        <tr key={String(stage.id)} className="hover:bg-neutral-50/60 dark:hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
                              <span>{stage.subjectName || stage.subject}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-mono text-neutral-400">
                                {classObj?.name || "Class 9"} • Stage #{stageOrders[String(stage.id)] ?? stage.subjectStageNumber ?? stage.id}
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const curr = Number(stageOrders[String(stage.id)] ?? stage.subjectStageNumber ?? 1) || 1;
                                  if (curr <= 1) return;
                                  const res = await setStageOrder(stage.id, curr - 1);
                                  reportCloudAction(res, `Updated Stage # to ${curr - 1}.`);
                                }}
                                className="px-1 py-0 rounded border border-neutral-200 dark:border-white/10 text-[10px] font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                title="Move stage earlier"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const curr = Number(stageOrders[String(stage.id)] ?? stage.subjectStageNumber ?? 1) || 1;
                                  const res = await setStageOrder(stage.id, curr + 1);
                                  reportCloudAction(res, `Updated Stage # to ${curr + 1}.`);
                                }}
                                className="px-1 py-0 rounded border border-neutral-200 dark:border-white/10 text-[10px] font-mono text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                title="Move stage later"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-neutral-600 dark:text-neutral-400">
                            {stage.chapter}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-neutral-900 dark:text-white">{stage.title}</div>
                            <div className="text-[11px] text-neutral-500">{stage.topic}</div>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                            {stage.questions.length} Qs
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-center font-mono whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              stage.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-600" :
                              stage.difficulty === "Medium" ? "bg-amber-500/10 text-amber-600" : "bg-rose-500/10 text-rose-600"
                            }`}>
                              {stage.difficulty}
                            </span>
                          </td>
                          <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => {
                                  sound.playClick();
                                  setEditingStage(stage);
                                  setIsEditStageOpen(true);
                                }}
                                className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                                title="Edit Stage and Questions"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={async () => {
                                  const stageLabel = stage.title || stage.chapter || `Stage #${stage.id}`;
                                  if (confirm(`Delete stage "${stageLabel}"?`)) {
                                    const res = await deleteStage(stage.id);
                                    reportCloudAction(res, `Stage "${stageLabel}" deleted across devices.`);
                                  }
                                }}
                                className="text-xs font-mono text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
                                title="Delete Stage"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: USERS & SCHOLARS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === "levels" && (
          <ProgressionLevelsEditor onCloudAction={reportCloudAction} />
        )}

        {activeTab === "users" && (
          <UsersManager onNotify={showNotification} />
        )}

        {/* ======================================================== */}
        {/* TAB 4: SUPABASE CLOUD SETUP SQL */}
        {/* ======================================================== */}
        {activeTab === "sql" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-white/5">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>Supabase Cloud Database Setup</span>
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Run this SQL script in Supabase once so all uploaded MCQs and custom chapters are saved to the cloud for all learners.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://supabase.com/dashboard/project/elpzdzevtwinoaspyngi/sql/new"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-educhain-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={copySql}
                    className="btn-educhain-primary text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? "Copied SQL!" : "Copy SQL Script"}</span>
                  </button>
                </div>
              </div>

              {/* 3 Step Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
                  <div className="font-mono text-xs font-bold text-neutral-400 mb-1">STEP 1</div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Copy Script</h4>
                  <p className="text-[11px] text-neutral-500">
                    Click the <strong>Copy SQL Script</strong> button above to copy the database tables and security policies to your clipboard.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
                  <div className="font-mono text-xs font-bold text-neutral-400 mb-1">STEP 2</div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Execute in Supabase</h4>
                  <p className="text-[11px] text-neutral-500">
                    Run the SQL migration in <strong>Supabase SQL Editor</strong>, add your admin user to <code>curriculum_admins</code>, and sign in via <strong>Cloud Sign In</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/[0.02]">
                  <div className="font-mono text-xs font-bold text-neutral-400 mb-1">STEP 3</div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-1">Sync Local Data</h4>
                  <p className="text-[11px] text-neutral-500">
                    Click <strong>Push Local Data to Supabase</strong> below. Any MCQs you already uploaded locally will immediately push to the cloud!
                  </p>
                </div>
              </div>

              {/* SQL Code Block */}
              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 rounded-t-xl border border-neutral-700 text-neutral-300 font-mono text-[11px]">
                  <span>schema.sql</span>
                  <button onClick={copySql} className="text-xs text-neutral-300 hover:text-white flex items-center gap-1">
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-b-xl bg-neutral-900 text-neutral-100 font-mono text-xs overflow-x-auto leading-relaxed border-x border-b border-neutral-700 max-h-80">
                  {SUPABASE_SQL_SCRIPT}
                </pre>
              </div>

              {/* Actions & Status */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${cloudSyncStatus === "connected" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Status: <strong>{cloudSyncStatus === "connected" ? "Cloud Connected" : "Local Mode (Supabase table not detected)"}</strong>
                  </span>
                </div>

                <button
                  disabled={isPushingCloud}
                  onClick={handlePushToCloud}
                  className="btn-educhain-primary text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isPushingCloud ? "animate-spin" : ""}`} />
                  <span>{isPushingCloud ? "Syncing with Supabase..." : `Push ${customStages.length} Local Stages to Supabase Cloud`}</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Edit Stage Modal */}
      <EditStageModal
        isOpen={isEditStageOpen}
        stage={editingStage}
        onClose={() => {
          setIsEditStageOpen(false);
          setEditingStage(null);
        }}
        onSaved={(title, warning) => {
          if (warning) {
            showNotification(`Stage "${title}" saved locally (${warning})`, "error");
          } else {
            showNotification(`Stage "${title}" updated and synced to Supabase!`);
          }
        }}
      />

      {/* Edit Subject Modal */}
      <EditSubjectModal
        isOpen={isEditSubjectOpen}
        subject={editingSubject}
        onClose={() => {
          setIsEditSubjectOpen(false);
          setEditingSubject(null);
        }}
        onSaved={(name) => {
          showNotification(`Subject "${name}" updated successfully!`);
        }}
      />

      {/* Cloud Admin Supabase Sign-In Modal */}
      {isCloudAuthOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#101827] shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-500" />
                  <span>Supabase Cloud Admin Sign-In</span>
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Required by Supabase Row-Level Security so only authorized admins can save shared curriculum changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCloudAuthOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cloudAuthError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-300">
                {cloudAuthError}
              </div>
            )}

            <form onSubmit={handleCloudAdminSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-600 dark:text-neutral-300 mb-1">
                  Supabase Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={cloudAdminEmail}
                  onChange={(e) => setCloudAdminEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-600 dark:text-neutral-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={cloudAdminPassword}
                  onChange={(e) => setCloudAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/40 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCloudAuthOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cloudAuthBusy}
                  className="btn-educhain-primary px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {cloudAuthBusy ? "Verifying..." : "Sign In Cloud Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      <EditClassModal
        isOpen={isEditClassOpen}
        schoolClass={editingClass}
        onClose={() => {
          setIsEditClassOpen(false);
          setEditingClass(null);
        }}
        onSaved={(name) => {
          showNotification(`Class "${name}" updated successfully!`);
        }}
      />

    </div>
  );
}
