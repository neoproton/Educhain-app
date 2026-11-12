"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Stage, SubjectType, SchoolClass } from "@/types/curriculum";
import { STAGES_DATA } from "@/data/curriculum";
import { DEFAULT_CLASSES, DEFAULT_XP_LEVELS, DEFAULT_STREAK_LEVELS } from "@/data/constants";
import { supabase } from "@/lib/supabase/client";
import { XpLevelRule, StreakLevelRule } from "@/types/user";
import { normalizeXpLevels, normalizeStreakLevels } from "@/lib/progression";

export interface CustomSubject {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  badgeBg?: string;
  borderColor?: string;
  grade?: string;
  created_at?: string;
}

export interface CloudActionResult {
  success: boolean;
  cloudSynced?: boolean;
  rlsBlocked?: boolean;
  error?: string;
}

export interface CloudPushResult {
  success: boolean;
  stagesSynced: number;
  subjectsSynced: number;
  classesSynced: number;
  ordersSynced: number;
  deletionsSynced: number;
  rlsBlocked?: boolean;
  error?: string;
}

interface SupabaseErrLike {
  code?: string;
  message?: string;
}

function isRlsError(err?: SupabaseErrLike | null): boolean {
  if (!err) return false;
  if (err.code === "42501") return true;
  return /row-level security|permission denied|insufficient_privilege|not allowed/i.test(
    err.message || ""
  );
}

function toCloudResult(err?: SupabaseErrLike | null): CloudActionResult {
  if (!err) return { success: true, cloudSynced: true };
  if (isRlsError(err)) {
    return {
      success: false,
      cloudSynced: false,
      rlsBlocked: true,
      error: err.message || "Cloud Admin sign-in required by Supabase RLS.",
    };
  }
  return {
    success: true,
    cloudSynced: false,
    error: err.message || "Supabase unreachable; saved locally.",
  };
}

/**
 * Extracts the missing column name from PostgREST schema-cache (PGRST204)
 * or Postgres undefined_column (42703) errors so optional newer columns
 * do not block syncing rows against an older table schema.
 */
function extractMissingColumnName(err?: SupabaseErrLike | null): string | null {
  if (!err) return null;
  const msg = err.message || "";
  const postgrestMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (postgrestMatch) return postgrestMatch[1];
  const pgMatch = msg.match(/column "([^"]+)"(?: of relation "[^"]+")? does not exist/i);
  if (pgMatch) return pgMatch[1];
  return null;
}

async function upsertWithMissingColumnFallback(
  table: string,
  row: Record<string, unknown>,
  onConflict?: string
): Promise<{ error: SupabaseErrLike | null; strippedColumns: string[] }> {
  const payload: Record<string, unknown> = { ...row };
  const strippedColumns: string[] = [];
  const maxAttempts = Object.keys(payload).length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { error } = await supabase
      .from(table)
      .upsert(payload, onConflict ? { onConflict } : undefined);

    if (!error) return { error: null, strippedColumns };
    if (isRlsError(error)) return { error, strippedColumns };

    const missingCol = extractMissingColumnName(error);
    if (!missingCol || missingCol === "id" || !(missingCol in payload)) {
      return { error, strippedColumns };
    }

    delete payload[missingCol];
    strippedColumns.push(missingCol);
  }

  return { error: { message: `Failed to upsert into ${table}` }, strippedColumns };
}

function classToDbRow(cls: SchoolClass): Record<string, unknown> {
  return {
    id: cls.id,
    name: cls.name,
    description: cls.description,
    icon: cls.icon,
    display_order: cls.displayOrder,
  };
}

function subjectToDbRow(sub: CustomSubject): Record<string, unknown> {
  return {
    id: sub.id,
    name: sub.name,
    icon: sub.icon,
    description: sub.description,
    color: sub.color,
    badge_bg: sub.badgeBg,
    border_color: sub.borderColor,
    grade: sub.grade || "grade_9",
  };
}

function stageToDbRow(stg: Stage): Record<string, unknown> {
  return {
    id: String(stg.id),
    subject_id: stg.subject,
    subject_name: stg.subjectName,
    subject_stage_number: stg.subjectStageNumber || 1,
    grade: stg.grade || "grade_9",
    chapter: stg.chapter,
    chapter_number: typeof stg.chapterNumber === "number" ? stg.chapterNumber : null,
    topic: stg.topic,
    title: stg.title,
    description: stg.description,
    learning_objective: stg.learningObjective,
    difficulty: stg.difficulty || "Medium",
    xp_reward: stg.xpReward || 100,
    questions: stg.questions,
  };
}

export const DEFAULT_SUBJECTS: CustomSubject[] = [
  {
    id: "computer_science",
    name: "Computer Science",
    icon: "terminal",
    description: "Hardware Architecture, Binary Logic, Algorithms & Programming",
    color: "#fbbf24",
    badgeBg: "rgba(251, 191, 36, 0.1)",
    borderColor: "rgba(251, 191, 36, 0.3)",
    grade: "grade_9",
  },
  {
    id: "science",
    name: "Science",
    icon: "atom",
    description: "Physics, Chemistry, Atomic Structure & Cell Biology",
    color: "#34d399",
    badgeBg: "rgba(52, 211, 153, 0.1)",
    borderColor: "rgba(52, 211, 153, 0.3)",
    grade: "grade_9",
  },
  {
    id: "mathematics",
    name: "Mathematics",
    icon: "calculator",
    description: "Arithmetic, Matrices, Real Numbers, Algebra & Geometry",
    color: "#38bdf8",
    badgeBg: "rgba(56, 189, 248, 0.1)",
    borderColor: "rgba(56, 189, 248, 0.3)",
    grade: "grade_9",
  },
  {
    id: "english",
    name: "English",
    icon: "languages",
    description: "Grammar, Tenses, Voice, Narration & Literary Rhetoric",
    color: "#a78bfa",
    badgeBg: "rgba(167, 139, 250, 0.1)",
    borderColor: "rgba(167, 139, 250, 0.3)",
    grade: "grade_9",
  },
];

interface CurriculumStoreState {
  customClasses: SchoolClass[];
  deletedClassIds: string[];
  customSubjects: CustomSubject[];
  customStages: Stage[];
  deletedSubjectIds: string[];
  deletedStageIds: string[];
  chapterOrders: Record<string, number>;
  stageOrders: Record<string, number>;
  xpLevels: XpLevelRule[];
  streakLevels: StreakLevelRule[];
  isLoading: boolean;
  isCloudAdmin: boolean;
  cloudSyncStatus: "checking" | "connected" | "disconnected";
  cloudSyncMessage?: string;

  // Actions
  checkSupabaseHealth: () => Promise<boolean>;
  checkCloudAdminStatus: () => Promise<boolean>;
  pushLocalToCloud: () => Promise<CloudPushResult>;
  addClass: (cls: SchoolClass) => Promise<CloudActionResult>;
  updateClass: (classId: string, updatedData: Partial<SchoolClass>) => Promise<CloudActionResult>;
  deleteClass: (classId: string) => Promise<CloudActionResult>;
  restoreClass: (classId: string) => Promise<CloudActionResult>;
  restoreAllDefaultClasses: () => Promise<CloudActionResult>;
  getAllClasses: () => SchoolClass[];
  addSubject: (subject: CustomSubject) => Promise<CloudActionResult>;
  updateSubject: (subjectId: string, updatedData: Partial<CustomSubject>) => Promise<CloudActionResult>;
  deleteSubject: (subjectId: string) => Promise<CloudActionResult>;
  restoreSubject: (subjectId: string) => Promise<CloudActionResult>;
  restoreAllDefaultSubjects: () => Promise<CloudActionResult>;
  addStage: (stage: Stage) => Promise<CloudActionResult>;
  updateStage: (stageId: string | number, updatedData: Partial<Stage>) => Promise<CloudActionResult>;
  deleteStage: (stageId: string | number) => Promise<CloudActionResult>;
  restoreStage: (stageId: string | number) => Promise<CloudActionResult>;
  restoreAllDefaultStages: () => Promise<CloudActionResult>;
  syncWithSupabase: (options?: { force?: boolean }) => Promise<void>;
  getAllSubjects: (grade?: string) => CustomSubject[];
  getAllStages: () => Stage[];
  setChapterNumber: (
    subject: string,
    grade: string,
    chapterName: string,
    chapterNumber: number
  ) => Promise<CloudActionResult>;
  batchSetChapterNumbers: (
    updates: { subject: string; grade: string; chapterName: string; chapterNumber: number }[]
  ) => Promise<CloudActionResult>;
  resetChapterNumbers: (subject?: string, grade?: string) => Promise<CloudActionResult>;
  setStageOrder: (stageId: string | number, stageOrder: number) => Promise<CloudActionResult>;
  getXpLevels: () => XpLevelRule[];
  getStreakLevels: () => StreakLevelRule[];
  saveProgressionLevels: (
    xpLevels: XpLevelRule[],
    streakLevels: StreakLevelRule[]
  ) => Promise<CloudActionResult>;
  resetProgressionLevels: () => Promise<CloudActionResult>;
}

export const useCurriculumStore = create<CurriculumStoreState>()(
  persist(
    (set, get) => ({
      customClasses: [],
      deletedClassIds: [],
      customSubjects: [],
      customStages: [],
      deletedSubjectIds: [],
      deletedStageIds: [],
      chapterOrders: {},
      stageOrders: {},
      xpLevels: DEFAULT_XP_LEVELS,
      streakLevels: DEFAULT_STREAK_LEVELS,
      isLoading: false,
      isCloudAdmin: false,
      cloudSyncStatus: "checking",
      cloudSyncMessage: undefined,

      checkSupabaseHealth: async () => {
        try {
          const { error } = await supabase.from("custom_stages").select("id").limit(1);
          if (error) {
            set({
              cloudSyncStatus: "disconnected",
              cloudSyncMessage: error.message || "Table 'custom_stages' not found in Supabase",
            });
            return false;
          }
          set({
            cloudSyncStatus: "connected",
            cloudSyncMessage: "Connected to Supabase cloud database",
          });
          return true;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Failed to connect to Supabase";
          set({
            cloudSyncStatus: "disconnected",
            cloudSyncMessage: msg,
          });
          return false;
        }
      },

      checkCloudAdminStatus: async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const user = sessionData?.session?.user;
          if (!user) {
            set({ isCloudAdmin: false });
            return false;
          }

          if (user.app_metadata?.role === "admin") {
            set({ isCloudAdmin: true });
            return true;
          }

          const { data: rpcData, error: rpcErr } = await supabase.rpc("is_curriculum_admin");
          if (!rpcErr && typeof rpcData === "boolean") {
            set({ isCloudAdmin: rpcData });
            return rpcData;
          }

          const { data: adminRow, error: tableErr } = await supabase
            .from("curriculum_admins")
            .select("user_id")
            .eq("user_id", user.id)
            .maybeSingle();

          const allowed = !tableErr && Boolean(adminRow);
          set({ isCloudAdmin: allowed });
          return allowed;
        } catch {
          set({ isCloudAdmin: false });
          return false;
        }
      },

      getAllClasses: () => {
        const { customClasses, deletedClassIds = [] } = get();
        const deletedSet = new Set(deletedClassIds);
        const customIds = new Set(customClasses.map((c) => c.id));
        const filteredDefaults = DEFAULT_CLASSES.filter(
          (c) => !customIds.has(c.id) && !deletedSet.has(c.id)
        );
        const activeCustom = customClasses.filter((c) => !deletedSet.has(c.id));
        const all = [...filteredDefaults, ...activeCustom];
        return all.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
      },

      addClass: async (cls: SchoolClass) => {
        const cleanId = cls.id.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const formatted: SchoolClass = {
          ...cls,
          id: cleanId,
          displayOrder: cls.displayOrder ?? 99,
          icon: cls.icon || "🎓",
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          deletedClassIds: (state.deletedClassIds || []).filter((id) => id !== formatted.id),
          customClasses: [
            ...state.customClasses.filter((c) => c.id !== formatted.id),
            formatted,
          ],
        }));

        try {
          const { error } = await upsertWithMissingColumnFallback(
            "custom_classes",
            classToDbRow(formatted)
          );
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      updateClass: async (classId: string, updatedData: Partial<SchoolClass>) => {
        const allClasses = get().getAllClasses();
        const existing = allClasses.find((c) => c.id === classId);
        if (!existing) return { success: false, cloudSynced: false, error: "Class not found" };

        const merged: SchoolClass = {
          ...existing,
          ...updatedData,
          id: classId,
        };

        set((state) => ({
          customClasses: [
            ...state.customClasses.filter((c) => c.id !== classId),
            merged,
          ],
        }));

        try {
          const { error } = await upsertWithMissingColumnFallback(
            "custom_classes",
            classToDbRow(merged)
          );
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      deleteClass: async (classId: string) => {
        set((state) => ({
          deletedClassIds: Array.from(new Set([...(state.deletedClassIds || []), classId])),
          customClasses: state.customClasses.filter((c) => c.id !== classId),
        }));

        try {
          const { error: delErr } = await supabase
            .from("custom_classes")
            .delete()
            .eq("id", classId);
          if (delErr && isRlsError(delErr)) {
            return toCloudResult(delErr);
          }

          const { error: tombErr } = await supabase
            .from("deleted_curriculum_items")
            .upsert(
              { item_type: "class", item_id: classId, item_label: classId },
              { onConflict: "item_type,item_id" }
            );
          return toCloudResult(tombErr || delErr);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreClass: async (classId: string) => {
        set((state) => ({
          deletedClassIds: (state.deletedClassIds || []).filter((id) => id !== classId),
        }));

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "class")
            .eq("item_id", classId);
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreAllDefaultClasses: async () => {
        set({ deletedClassIds: [] });

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "class");
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      pushLocalToCloud: async () => {
        const {
          customClasses,
          customSubjects,
          customStages,
          chapterOrders = {},
          stageOrders = {},
          deletedClassIds = [],
          deletedSubjectIds = [],
          deletedStageIds = [],
        } = get();

        let classesCount = 0;
        let subjectsCount = 0;
        let stagesCount = 0;
        let ordersCount = 0;
        let deletionsCount = 0;

        const allStages = get().getAllStages();

        try {
          for (const cls of customClasses) {
            const { error } = await upsertWithMissingColumnFallback(
              "custom_classes",
              classToDbRow(cls)
            );
            if (error) {
              if (isRlsError(error)) {
                return {
                  success: false,
                  stagesSynced: stagesCount,
                  subjectsSynced: subjectsCount,
                  classesSynced: classesCount,
                  ordersSynced: ordersCount,
                  deletionsSynced: deletionsCount,
                  rlsBlocked: true,
                  error: error.message,
                };
              }
            } else {
              classesCount++;
            }
          }

          for (const sub of customSubjects) {
            const { error } = await upsertWithMissingColumnFallback(
              "custom_subjects",
              subjectToDbRow(sub)
            );
            if (error) {
              if (isRlsError(error)) {
                return {
                  success: false,
                  stagesSynced: stagesCount,
                  subjectsSynced: subjectsCount,
                  classesSynced: classesCount,
                  ordersSynced: ordersCount,
                  deletionsSynced: deletionsCount,
                  rlsBlocked: true,
                  error: error.message,
                };
              }
            } else {
              subjectsCount++;
            }
          }

          for (const stg of customStages) {
            const { error } = await upsertWithMissingColumnFallback(
              "custom_stages",
              stageToDbRow(stg)
            );
            if (error) {
              if (isRlsError(error)) {
                return {
                  success: false,
                  stagesSynced: stagesCount,
                  subjectsSynced: subjectsCount,
                  classesSynced: classesCount,
                  ordersSynced: ordersCount,
                  deletionsSynced: deletionsCount,
                  rlsBlocked: true,
                  error: error.message,
                };
              }
            } else {
              stagesCount++;
            }
          }

          const chapterOrderRows = Object.entries(chapterOrders)
            .map(([key, chapterNumber]) => {
              const parts = key.split("::");
              if (parts.length !== 3) return null;
              return {
                grade: parts[0] || "grade_9",
                subject_id: parts[1],
                chapter_name: parts[2],
                chapter_number: chapterNumber,
              };
            })
            .filter((row): row is NonNullable<typeof row> => Boolean(row));

          if (chapterOrderRows.length > 0) {
            const { error } = await supabase
              .from("curriculum_chapter_orders")
              .upsert(chapterOrderRows, { onConflict: "grade,subject_id,chapter_name" });
            if (error && isRlsError(error)) {
              return {
                success: false,
                stagesSynced: stagesCount,
                subjectsSynced: subjectsCount,
                classesSynced: classesCount,
                ordersSynced: ordersCount,
                deletionsSynced: deletionsCount,
                rlsBlocked: true,
                error: error.message,
              };
            }
            if (!error) ordersCount += chapterOrderRows.length;
          }

          const stageOrderRows = Object.entries(stageOrders).map(([stageId, order]) => {
            const matched = allStages.find((s) => String(s.id) === String(stageId));
            return {
              stage_id: String(stageId),
              grade: matched?.grade || "grade_9",
              subject_id: matched?.subject || "science",
              chapter_name: matched?.chapter || "Core Curriculum",
              stage_order: order,
            };
          });

          if (stageOrderRows.length > 0) {
            const { error } = await supabase
              .from("curriculum_stage_orders")
              .upsert(stageOrderRows, { onConflict: "stage_id" });
            if (error && isRlsError(error)) {
              return {
                success: false,
                stagesSynced: stagesCount,
                subjectsSynced: subjectsCount,
                classesSynced: classesCount,
                ordersSynced: ordersCount,
                deletionsSynced: deletionsCount,
                rlsBlocked: true,
                error: error.message,
              };
            }
            if (!error) ordersCount += stageOrderRows.length;
          }

          const tombstones = [
            ...deletedClassIds.map((id) => ({ item_type: "class", item_id: id, item_label: id })),
            ...deletedSubjectIds.map((id) => ({ item_type: "subject", item_id: id, item_label: id })),
            ...deletedStageIds.map((id) => ({ item_type: "stage", item_id: String(id), item_label: String(id) })),
          ];

          if (tombstones.length > 0) {
            const { error } = await supabase
              .from("deleted_curriculum_items")
              .upsert(tombstones, { onConflict: "item_type,item_id" });
            if (error && isRlsError(error)) {
              return {
                success: false,
                stagesSynced: stagesCount,
                subjectsSynced: subjectsCount,
                classesSynced: classesCount,
                ordersSynced: ordersCount,
                deletionsSynced: deletionsCount,
                rlsBlocked: true,
                error: error.message,
              };
            }
            if (!error) deletionsCount += tombstones.length;
          }

          // Push progression level definitions (if migration table is present)
          try {
            const { error: progErr } = await supabase
              .from("curriculum_progression_settings")
              .upsert(
                {
                  id: "global",
                  xp_levels: normalizeXpLevels(get().xpLevels),
                  streak_levels: normalizeStreakLevels(get().streakLevels),
                },
                { onConflict: "id" }
              );
            if (progErr && isRlsError(progErr)) {
              return {
                success: false,
                stagesSynced: stagesCount,
                subjectsSynced: subjectsCount,
                classesSynced: classesCount,
                ordersSynced: ordersCount,
                deletionsSynced: deletionsCount,
                rlsBlocked: true,
                error: progErr.message,
              };
            }
          } catch {
            // Optional table may not be initialized yet
          }

          set({
            cloudSyncStatus: "connected",
            cloudSyncMessage: "All local data synced to Supabase",
          });
          return {
            success: true,
            stagesSynced: stagesCount,
            subjectsSynced: subjectsCount,
            classesSynced: classesCount,
            ordersSynced: ordersCount,
            deletionsSynced: deletionsCount,
          };
        } catch (err: unknown) {
          return {
            success: false,
            stagesSynced: stagesCount,
            subjectsSynced: subjectsCount,
            classesSynced: classesCount,
            ordersSynced: ordersCount,
            deletionsSynced: deletionsCount,
            error: err instanceof Error ? err.message : "Cloud push failed",
          };
        }
      },

      getAllSubjects: (grade?: string) => {
        const { customSubjects, deletedSubjectIds = [] } = get();
        const deletedSet = new Set(deletedSubjectIds);
        const customIds = new Set(customSubjects.map((s) => s.id));
        const filteredDefaults = DEFAULT_SUBJECTS.filter(
          (s) => !customIds.has(s.id) && !deletedSet.has(s.id)
        );
        const activeCustom = customSubjects.filter((s) => !deletedSet.has(s.id));
        const all = [...filteredDefaults, ...activeCustom].map((s) => ({
          ...s,
          grade: s.grade || "grade_9",
        }));
        if (grade) {
          return all.filter((s) => s.grade === grade);
        }
        return all;
      },

      getAllStages: () => {
        const {
          customStages,
          deletedSubjectIds = [],
          deletedStageIds = [],
          chapterOrders = {},
          stageOrders = {},
        } = get();
        const deletedSet = new Set(deletedSubjectIds);
        const deletedStageSet = new Set((deletedStageIds || []).map(String));
        const customIds = new Set(customStages.map((s) => String(s.id)));
        const filteredDefaults = STAGES_DATA.filter(
          (s) =>
            !customIds.has(String(s.id)) &&
            (!s.subject || !deletedSet.has(s.subject)) &&
            !deletedStageSet.has(String(s.id))
        );
        const activeCustom = customStages.filter(
          (s) =>
            (!s.subject || !deletedSet.has(s.subject)) &&
            !deletedStageSet.has(String(s.id))
        );
        return [...filteredDefaults, ...activeCustom]
          .map((stg) => {
            const stgGrade = stg.grade || "grade_9";
            const sub = stg.subject || "science";
            const chap = stg.chapter || "Core Curriculum";
            const key = `${stgGrade}::${sub}::${chap}`;
            const customNum =
              chapterOrders[key] ?? chapterOrders[`${sub}::${chap}`] ?? stg.chapterNumber;
            const customStageNum = stageOrders[String(stg.id)] ?? stg.subjectStageNumber;
            return {
              ...stg,
              grade: stgGrade,
              chapterNumber: customNum,
              subjectStageNumber: customStageNum,
            };
          })
          .sort((a, b) => (a.subjectStageNumber ?? 9999) - (b.subjectStageNumber ?? 9999));
      },

      addSubject: async (subject: CustomSubject) => {
        const cleanId = subject.id.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const formatted: CustomSubject = {
          ...subject,
          id: cleanId,
          grade: subject.grade || "grade_9",
          badgeBg: subject.badgeBg || `${subject.color}1a`,
          borderColor: subject.borderColor || `${subject.color}4d`,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          deletedSubjectIds: (state.deletedSubjectIds || []).filter((id) => id !== formatted.id),
          customSubjects: [
            ...state.customSubjects.filter((s) => s.id !== formatted.id),
            formatted,
          ],
        }));

        try {
          const { error } = await upsertWithMissingColumnFallback(
            "custom_subjects",
            subjectToDbRow(formatted)
          );

          if (error) {
            if (!isRlsError(error)) {
              set({ cloudSyncStatus: "disconnected", cloudSyncMessage: error.message });
            }
          } else {
            set({ cloudSyncStatus: "connected" });
          }

          return toCloudResult(error);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Network error";
          set({ cloudSyncStatus: "disconnected", cloudSyncMessage: msg });
          return toCloudResult({ message: msg });
        }
      },

      updateSubject: async (subjectId: string, updatedData: Partial<CustomSubject>) => {
        const allSubs = get().getAllSubjects();
        const existing = allSubs.find((s) => s.id === subjectId);
        if (!existing) return { success: false, cloudSynced: false, error: "Subject not found" };

        const merged: CustomSubject = {
          ...existing,
          ...updatedData,
          id: subjectId,
          grade: updatedData.grade || existing.grade || "grade_9",
        };

        set((state) => ({
          customSubjects: [
            ...state.customSubjects.filter((s) => s.id !== subjectId),
            merged,
          ],
        }));

        try {
          const { error } = await upsertWithMissingColumnFallback(
            "custom_subjects",
            subjectToDbRow(merged)
          );
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      addStage: async (stage: Stage) => {
        const stageId = stage.id || `custom_${Date.now()}`;
        const formatted: Stage = {
          ...stage,
          id: stageId,
        };

        set((state) => {
          const nextOrders = { ...(state.chapterOrders || {}) };
          if (formatted.chapterNumber !== undefined && formatted.chapter) {
            const key = `${formatted.grade || "grade_9"}::${formatted.subject || "science"}::${formatted.chapter}`;
            nextOrders[key] = formatted.chapterNumber;
          }
          return {
            chapterOrders: nextOrders,
            deletedStageIds: (state.deletedStageIds || []).filter((id) => id !== String(stageId)),
            customStages: [
              ...state.customStages.filter((s) => String(s.id) !== String(stageId)),
              formatted,
            ],
          };
        });

        try {
          const { error, strippedColumns } = await upsertWithMissingColumnFallback(
            "custom_stages",
            stageToDbRow(formatted)
          );

          if (!error && typeof formatted.chapterNumber === "number" && formatted.chapter) {
            await supabase
              .from("curriculum_chapter_orders")
              .upsert(
                {
                  grade: formatted.grade || "grade_9",
                  subject_id: formatted.subject,
                  chapter_name: formatted.chapter,
                  chapter_number: formatted.chapterNumber,
                },
                { onConflict: "grade,subject_id,chapter_name" }
              )
              .then(() => undefined, () => undefined);
          }

          if (error) {
            if (!isRlsError(error)) {
              set({
                cloudSyncStatus: "disconnected",
                cloudSyncMessage: error.message || "Failed to sync stage to Supabase",
              });
            }
          } else {
            set({
              cloudSyncStatus: "connected",
              ...(strippedColumns.length > 0
                ? {
                    cloudSyncMessage: `Synced stage (run SQL schema update to add: ${strippedColumns.join(", ")})`,
                  }
                : {}),
            });
          }
          return toCloudResult(error);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Network error";
          set({ cloudSyncStatus: "disconnected", cloudSyncMessage: msg });
          return toCloudResult({ message: msg });
        }
      },

      updateStage: async (stageId: string | number, updatedData: Partial<Stage>) => {
        const currentStages = get().getAllStages();
        const existing = currentStages.find((s) => String(s.id) === String(stageId));
        if (!existing) return { success: false, cloudSynced: false, error: "Stage not found" };

        const merged: Stage = {
          ...existing,
          ...updatedData,
          id: stageId,
        };

        set((state) => {
          const nextOrders = { ...(state.chapterOrders || {}) };
          if ("chapterNumber" in updatedData && merged.chapter) {
            const key = `${merged.grade || "grade_9"}::${merged.subject || "science"}::${merged.chapter}`;
            if (typeof updatedData.chapterNumber === "number" && !Number.isNaN(updatedData.chapterNumber)) {
              nextOrders[key] = updatedData.chapterNumber;
            } else {
              delete nextOrders[key];
            }
          }
          return {
            chapterOrders: nextOrders,
            customStages: [
              ...state.customStages.filter((s) => String(s.id) !== String(stageId)),
              merged,
            ],
          };
        });

        try {
          const { error } = await upsertWithMissingColumnFallback(
            "custom_stages",
            stageToDbRow(merged)
          );

          if (!error && typeof merged.chapterNumber === "number" && merged.chapter) {
            await supabase
              .from("curriculum_chapter_orders")
              .upsert(
                {
                  grade: merged.grade || "grade_9",
                  subject_id: merged.subject,
                  chapter_name: merged.chapter,
                  chapter_number: merged.chapterNumber,
                },
                { onConflict: "grade,subject_id,chapter_name" }
              )
              .then(() => undefined, () => undefined);
          }

          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      deleteStage: async (stageId: string | number) => {
        const idStr = String(stageId);
        set((state) => ({
          deletedStageIds: Array.from(new Set([...(state.deletedStageIds || []), idStr])),
          customStages: state.customStages.filter((s) => String(s.id) !== idStr),
        }));

        try {
          const { error: delErr } = await supabase
            .from("custom_stages")
            .delete()
            .eq("id", idStr);
          if (delErr && isRlsError(delErr)) {
            return toCloudResult(delErr);
          }

          const { error: tombErr } = await supabase
            .from("deleted_curriculum_items")
            .upsert(
              { item_type: "stage", item_id: idStr, item_label: idStr },
              { onConflict: "item_type,item_id" }
            );
          return toCloudResult(tombErr || delErr);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreStage: async (stageId: string | number) => {
        const idStr = String(stageId);
        set((state) => ({
          deletedStageIds: (state.deletedStageIds || []).filter((id) => id !== idStr),
        }));

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "stage")
            .eq("item_id", idStr);
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreAllDefaultStages: async () => {
        set({ deletedStageIds: [] });

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "stage");
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      deleteSubject: async (subjectId: string) => {
        set((state) => ({
          deletedSubjectIds: Array.from(new Set([...(state.deletedSubjectIds || []), subjectId])),
          customSubjects: state.customSubjects.filter((s) => s.id !== subjectId),
          customStages: state.customStages.filter((s) => s.subject !== subjectId),
        }));

        try {
          const { error: subErr } = await supabase
            .from("custom_subjects")
            .delete()
            .eq("id", subjectId);
          if (subErr && isRlsError(subErr)) {
            return toCloudResult(subErr);
          }
          await supabase.from("custom_stages").delete().eq("subject_id", subjectId);

          const { error: tombErr } = await supabase
            .from("deleted_curriculum_items")
            .upsert(
              { item_type: "subject", item_id: subjectId, item_label: subjectId },
              { onConflict: "item_type,item_id" }
            );
          return toCloudResult(tombErr || subErr);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreSubject: async (subjectId: string) => {
        set((state) => ({
          deletedSubjectIds: (state.deletedSubjectIds || []).filter((id) => id !== subjectId),
        }));

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "subject")
            .eq("item_id", subjectId);
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      restoreAllDefaultSubjects: async () => {
        set({ deletedSubjectIds: [] });

        try {
          const { error } = await supabase
            .from("deleted_curriculum_items")
            .delete()
            .eq("item_type", "subject");
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      setChapterNumber: async (
        subject: string,
        grade: string,
        chapterName: string,
        chapterNumber: number
      ) => {
        const cleanGrade = grade || "grade_9";
        const key = `${cleanGrade}::${subject}::${chapterName}`;
        set((state) => ({
          chapterOrders: {
            ...state.chapterOrders,
            [key]: chapterNumber,
          },
          customStages: state.customStages.map((stg) => {
            const stgGrade = stg.grade || "grade_9";
            if (stg.subject === subject && stgGrade === cleanGrade && stg.chapter === chapterName) {
              return { ...stg, chapterNumber };
            }
            return stg;
          }),
        }));

        try {
          const { error } = await supabase
            .from("curriculum_chapter_orders")
            .upsert(
              {
                grade: cleanGrade,
                subject_id: subject,
                chapter_name: chapterName,
                chapter_number: chapterNumber,
              },
              { onConflict: "grade,subject_id,chapter_name" }
            );
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      batchSetChapterNumbers: async (
        updates: { subject: string; grade: string; chapterName: string; chapterNumber: number }[]
      ) => {
        set((state) => {
          const newOrders = { ...(state.chapterOrders || {}) };
          updates.forEach((u) => {
            const key = `${u.grade || "grade_9"}::${u.subject}::${u.chapterName}`;
            newOrders[key] = u.chapterNumber;
          });
          return {
            chapterOrders: newOrders,
            customStages: state.customStages.map((stg) => {
              const stgGrade = stg.grade || "grade_9";
              const match = updates.find(
                (u) =>
                  u.subject === stg.subject &&
                  (u.grade || "grade_9") === stgGrade &&
                  u.chapterName === stg.chapter
              );
              if (match) {
                return { ...stg, chapterNumber: match.chapterNumber };
              }
              return stg;
            }),
          };
        });

        try {
          if (updates.length === 0) return { success: true, cloudSynced: true };
          const rows = updates.map((u) => ({
            grade: u.grade || "grade_9",
            subject_id: u.subject,
            chapter_name: u.chapterName,
            chapter_number: u.chapterNumber,
          }));
          const { error } = await supabase
            .from("curriculum_chapter_orders")
            .upsert(rows, { onConflict: "grade,subject_id,chapter_name" });
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      resetChapterNumbers: async (subject?: string, grade?: string) => {
        set((state) => {
          if (!subject && !grade) {
            return { chapterOrders: {} };
          }
          const filteredOrders = { ...(state.chapterOrders || {}) };
          const prefix = grade ? `${grade}::${subject || ""}` : `grade_9::${subject || ""}`;
          Object.keys(filteredOrders).forEach((k) => {
            if (k.startsWith(prefix) || (subject && k.includes(`::${subject}::`))) {
              delete filteredOrders[k];
            }
          });
          return { chapterOrders: filteredOrders };
        });

        try {
          let query = supabase.from("curriculum_chapter_orders").delete();
          if (subject) query = query.eq("subject_id", subject);
          if (grade) query = query.eq("grade", grade);
          if (!subject && !grade) query = query.neq("subject_id", "");
          const { error } = await query;
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      setStageOrder: async (stageId: string | number, stageOrder: number) => {
        const cleanOrder = Math.max(1, Math.min(9999, Math.round(stageOrder)));
        const idStr = String(stageId);
        const existingStage = get()
          .getAllStages()
          .find((s) => String(s.id) === idStr);

        set((state) => ({
          stageOrders: {
            ...(state.stageOrders || {}),
            [idStr]: cleanOrder,
          },
          customStages: state.customStages.map((stg) =>
            String(stg.id) === idStr ? { ...stg, subjectStageNumber: cleanOrder } : stg
          ),
        }));

        try {
          const { error } = await supabase
            .from("curriculum_stage_orders")
            .upsert(
              {
                stage_id: idStr,
                grade: existingStage?.grade || "grade_9",
                subject_id: existingStage?.subject || "science",
                chapter_name: existingStage?.chapter || "Core Curriculum",
                stage_order: cleanOrder,
              },
              { onConflict: "stage_id" }
            );

          if (!error && get().customStages.some((s) => String(s.id) === idStr)) {
            await supabase
              .from("custom_stages")
              .update({ subject_stage_number: cleanOrder })
              .eq("id", idStr);
          }

          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      getXpLevels: () => normalizeXpLevels(get().xpLevels),

      getStreakLevels: () => normalizeStreakLevels(get().streakLevels),

      saveProgressionLevels: async (xpLevelsInput, streakLevelsInput) => {
        const nextXp = normalizeXpLevels(xpLevelsInput);
        const nextStreak = normalizeStreakLevels(streakLevelsInput);
        set({ xpLevels: nextXp, streakLevels: nextStreak });

        try {
          const { error } = await supabase
            .from("curriculum_progression_settings")
            .upsert(
              {
                id: "global",
                xp_levels: nextXp,
                streak_levels: nextStreak,
              },
              { onConflict: "id" }
            );
          return toCloudResult(error);
        } catch (e: unknown) {
          return toCloudResult({ message: e instanceof Error ? e.message : "Network error" });
        }
      },

      resetProgressionLevels: async () => {
        return get().saveProgressionLevels(DEFAULT_XP_LEVELS, DEFAULT_STREAK_LEVELS);
      },

      syncWithSupabase: async (options?: { force?: boolean }) => {
        const { isLoading } = get();
        if (isLoading && !options?.force) return;
        set({ isLoading: true });
        try {
          // 1. Sync tombstones first if table exists
          try {
            const { data: tombRows, error: tombErr } = await supabase
              .from("deleted_curriculum_items")
              .select("item_type, item_id");
            if (!tombErr && tombRows) {
              const delClasses = new Set(get().deletedClassIds || []);
              const delSubs = new Set(get().deletedSubjectIds || []);
              const delStgs = new Set((get().deletedStageIds || []).map(String));
              for (const row of tombRows as { item_type: string; item_id: string }[]) {
                if (row.item_type === "class") delClasses.add(row.item_id);
                else if (row.item_type === "subject") delSubs.add(row.item_id);
                else if (row.item_type === "stage") delStgs.add(String(row.item_id));
              }
              set({
                deletedClassIds: Array.from(delClasses),
                deletedSubjectIds: Array.from(delSubs),
                deletedStageIds: Array.from(delStgs),
              });
            }
          } catch {
            // Optional migration table may not be initialized yet
          }

          // 2. Fetch custom classes
          try {
            const { data: cloudClasses, error: classErr } = await supabase
              .from("custom_classes")
              .select("*")
              .order("display_order", { ascending: true });

            if (!classErr && cloudClasses) {
              const { deletedClassIds = [], customClasses: localClasses = [] } = get();
              const deletedSet = new Set(deletedClassIds);
              const mappedClasses: SchoolClass[] = (cloudClasses as Array<Record<string, unknown>>)
                .filter((c) => !deletedSet.has(String(c.id)))
                .map((c) => ({
                  id: String(c.id),
                  name: String(c.name || ""),
                  description: String(c.description || ""),
                  icon: String(c.icon || "🎓"),
                  displayOrder: typeof c.display_order === "number" ? c.display_order : 1,
                  created_at: typeof c.created_at === "string" ? c.created_at : undefined,
                }));
              const cloudIds = new Set(mappedClasses.map((c) => c.id));
              const localOnly = localClasses.filter(
                (c) => !cloudIds.has(c.id) && !deletedSet.has(c.id)
              );
              set({ customClasses: [...mappedClasses, ...localOnly] });
            }
          } catch (e) {
            console.warn("custom_classes sync check:", e);
          }

          // 3. Fetch custom subjects
          const { data: cloudSubjects, error: subErr } = await supabase
            .from("custom_subjects")
            .select("*");

          if (!subErr && cloudSubjects) {
            const { deletedSubjectIds = [], customSubjects: localSubjects = [] } = get();
            const deletedSubSet = new Set(deletedSubjectIds);
            const mappedSubs: CustomSubject[] = (cloudSubjects as Array<Record<string, unknown>>)
              .filter((s) => !deletedSubSet.has(String(s.id)))
              .map((s) => ({
                id: String(s.id),
                name: String(s.name || ""),
                icon: String(s.icon || "📚"),
                description: String(s.description || ""),
                color: String(s.color || "#38bdf8"),
                badgeBg: typeof s.badge_bg === "string" ? s.badge_bg : undefined,
                borderColor: typeof s.border_color === "string" ? s.border_color : undefined,
                grade: typeof s.grade === "string" ? s.grade : "grade_9",
              }));
            const cloudSubIds = new Set(mappedSubs.map((s) => s.id));
            const localOnlySubs = localSubjects.filter(
              (s) => !cloudSubIds.has(s.id) && !deletedSubSet.has(s.id)
            );
            set({ customSubjects: [...mappedSubs, ...localOnlySubs] });
          }

          // 4. Fetch custom stages
          const { data: cloudStages, error: stageErr } = await supabase
            .from("custom_stages")
            .select("*");

          if (!stageErr && cloudStages) {
            const { deletedStageIds = [], customStages: localStages = [] } = get();
            const deletedStgSet = new Set((deletedStageIds || []).map(String));
            const mappedStages: Stage[] = (cloudStages as Array<Record<string, unknown>>)
              .filter((s) => !deletedStgSet.has(String(s.id)))
              .map((s) => ({
                id: String(s.id),
                subject: s.subject_id as SubjectType,
                subjectName: String(s.subject_name || ""),
                subjectStageNumber:
                  typeof s.subject_stage_number === "number" ? s.subject_stage_number : undefined,
                grade: (typeof s.grade === "string" ? s.grade : "grade_9") as Stage["grade"],
                chapter: String(s.chapter || ""),
                chapterNumber: typeof s.chapter_number === "number" ? s.chapter_number : undefined,
                topic: String(s.topic || ""),
                title: String(s.title || ""),
                description: String(s.description || ""),
                learningObjective:
                  typeof s.learning_objective === "string" ? s.learning_objective : undefined,
                difficulty: (typeof s.difficulty === "string"
                  ? s.difficulty
                  : "Medium") as Stage["difficulty"],
                xpReward: typeof s.xp_reward === "number" ? s.xp_reward : 100,
                questions: Array.isArray(s.questions) ? s.questions : [],
              }));
            const cloudStgIds = new Set(mappedStages.map((s) => String(s.id)));
            const localOnlyStages = localStages.filter(
              (s) => !cloudStgIds.has(String(s.id)) && !deletedStgSet.has(String(s.id))
            );
            set({ customStages: [...mappedStages, ...localOnlyStages] });
          }

          // 5. Fetch centralized chapter & stage orders if tables exist
          try {
            const { data: chapOrderRows, error: coErr } = await supabase
              .from("curriculum_chapter_orders")
              .select("grade, subject_id, chapter_name, chapter_number");
            if (!coErr && chapOrderRows) {
              const mergedOrders = { ...(get().chapterOrders || {}) };
              for (const row of chapOrderRows as Array<{
                grade: string;
                subject_id: string;
                chapter_name: string;
                chapter_number: number;
              }>) {
                mergedOrders[`${row.grade || "grade_9"}::${row.subject_id}::${row.chapter_name}`] =
                  row.chapter_number;
              }
              set({ chapterOrders: mergedOrders });
            }
          } catch {
            // Optional migration table may not exist yet
          }

          try {
            const { data: stageOrderRows, error: soErr } = await supabase
              .from("curriculum_stage_orders")
              .select("stage_id, stage_order");
            if (!soErr && stageOrderRows) {
              const mergedStageOrders = { ...(get().stageOrders || {}) };
              for (const row of stageOrderRows as Array<{
                stage_id: string;
                stage_order: number;
              }>) {
                mergedStageOrders[String(row.stage_id)] = row.stage_order;
              }
              set({ stageOrders: mergedStageOrders });
            }
          } catch {
            // Optional migration table may not exist yet
          }

          // 6. Fetch admin-configured XP & Streak progression tiers if table exists
          try {
            const { data: progRow, error: progErr } = await supabase
              .from("curriculum_progression_settings")
              .select("xp_levels, streak_levels")
              .eq("id", "global")
              .maybeSingle();
            if (!progErr && progRow) {
              const rawXp = progRow.xp_levels as XpLevelRule[] | null;
              const rawStreak = progRow.streak_levels as StreakLevelRule[] | null;
              if (Array.isArray(rawXp) && rawXp.length > 0) {
                set({ xpLevels: normalizeXpLevels(rawXp) });
              }
              if (Array.isArray(rawStreak) && rawStreak.length > 0) {
                set({ streakLevels: normalizeStreakLevels(rawStreak) });
              }
            }
          } catch {
            // Optional migration table may not exist yet
          }
        } catch (e) {
          console.warn("Cloud sync error:", e);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: "educhain-custom-curriculum-storage",
    }
  )
);
