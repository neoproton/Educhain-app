"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Zap, 
  Flame, 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  X,
  Save,
  GraduationCap
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ScholarAvatar } from "@/components/SleekIcon";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export interface StudentProfile {
  id: string;
  player_name: string;
  player_avatar: string;
  player_grade: string;
  xp: number;
  stages_completed: number;
  current_streak: number;
  longest_streak: number;
  accuracy: number;
  quizzes_attempted: number;
  questions_answered: number;
  questions_correct: number;
  created_at?: string;
  updated_at?: string;
}

interface UsersManagerProps {
  onNotify: (msg: string, type?: "success" | "error") => void;
}

export const UsersManager: React.FC<UsersManagerProps> = ({ onNotify }) => {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"xp" | "streak" | "accuracy" | "quizzes">("xp");

  // Editing state
  const [editingStudent, setEditingStudent] = useState<StudentProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch users from Supabase
  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("xp", { ascending: false });

      if (!error && data) {
        const mapped: StudentProfile[] = data.map((d: any) => ({
          id: d.id,
          player_name: d.player_name || "Scholar",
          player_avatar: d.player_avatar || "🧠",
          player_grade: d.player_grade || "grade_9",
          xp: d.xp || 0,
          stages_completed: Array.isArray(d.completed_stages_list) ? d.completed_stages_list.length : (d.stages_completed || 0),
          current_streak: d.current_streak || 0,
          longest_streak: d.longest_streak || 0,
          accuracy: d.accuracy || (d.questions_answered ? Math.round(((d.questions_correct || 0) / d.questions_answered) * 100) : 0),
          quizzes_attempted: d.quizzes_attempted || 0,
          questions_answered: d.questions_answered || 0,
          questions_correct: d.questions_correct || 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
        setStudents(mapped);
      } else if (error) {
        onNotify(`Notice: Supabase profiles: ${error.message}`, "error");
      }
    } catch (err: any) {
      console.warn("Profiles fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter & Sort
  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        const matchesSearch = s.player_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = gradeFilter === "all" || s.player_grade === gradeFilter;
        return matchesSearch && matchesGrade;
      })
      .sort((a, b) => {
        if (sortBy === "xp") return b.xp - a.xp;
        if (sortBy === "streak") return b.current_streak - a.current_streak;
        if (sortBy === "accuracy") return b.accuracy - a.accuracy;
        if (sortBy === "quizzes") return b.quizzes_attempted - a.quizzes_attempted;
        return 0;
      });
  }, [students, searchQuery, gradeFilter, sortBy]);

  // Aggregate stats
  const totalXP = students.reduce((acc, s) => acc + s.xp, 0);
  const avgAccuracy = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.accuracy, 0) / students.length)
    : 0;
  const maxStreak = students.reduce((acc, s) => Math.max(acc, s.current_streak), 0);

  // Export to CSV
  const handleExportCSV = () => {
    sound.playClick();
    if (students.length === 0) {
      onNotify("No student records to export.", "error");
      return;
    }

    const headers = [
      "User ID",
      "Player Name",
      "Avatar",
      "Grade",
      "XP",
      "Stages Completed",
      "Current Streak",
      "Longest Streak",
      "Accuracy (%)",
      "Quizzes Attempted",
      "Questions Answered",
      "Questions Correct",
      "Created At"
    ];

    const rows = students.map((s) => [
      `"${s.id}"`,
      `"${s.player_name.replace(/"/g, '""')}"`,
      `"${s.player_avatar}"`,
      `"${s.player_grade}"`,
      s.xp,
      s.stages_completed,
      s.current_streak,
      s.longest_streak,
      s.accuracy,
      s.quizzes_attempted,
      s.questions_answered,
      s.questions_correct,
      `"${s.created_at || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `educhain_students_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onNotify(`Exported ${students.length} student records to CSV!`);
  };

  // Reset Student Progress
  const handleResetStudent = async (student: StudentProfile) => {
    if (!confirm(`Are you sure you want to reset all quiz progress, streak, and XP for ${student.player_name}?`)) {
      return;
    }

    sound.playClick();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          xp: 0,
          current_streak: 0,
          stages_completed: 0,
          completed_stages_list: [],
          accuracy: 0,
          questions_answered: 0,
          questions_correct: 0,
          quizzes_attempted: 0,
        })
        .eq("id", student.id);

      if (!error) {
        sound.playUnlock();
        onNotify(`Reset progress for ${student.player_name}.`);
        fetchStudents();
      } else {
        onNotify(`Failed to reset: ${error.message}`, "error");
      }
    } catch (err: any) {
      onNotify(`Error: ${err.message}`, "error");
    }
  };

  // Delete Student
  const handleDeleteStudent = async (student: StudentProfile) => {
    if (!confirm(`DANGER: Permanently delete scholar profile for "${student.player_name}" (${student.id})? This cannot be undone.`)) {
      return;
    }

    sound.playClick();
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", student.id);

      if (!error) {
        sound.playUnlock();
        onNotify(`Deleted scholar profile for ${student.player_name}.`);
        fetchStudents();
      } else {
        onNotify(`Delete failed: ${error.message}`, "error");
      }
    } catch (err: any) {
      onNotify(`Error: ${err.message}`, "error");
    }
  };

  // Save Student Edit
  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    setIsUpdating(true);
    sound.playClick();

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          player_name: editingStudent.player_name,
          player_avatar: editingStudent.player_avatar,
          player_grade: editingStudent.player_grade,
          xp: Number(editingStudent.xp) || 0,
          current_streak: Number(editingStudent.current_streak) || 0,
        })
        .eq("id", editingStudent.id);

      if (!error) {
        sound.playUnlock();
        onNotify(`Successfully updated profile for ${editingStudent.player_name}!`);
        setEditingStudent(null);
        fetchStudents();
      } else {
        onNotify(`Update failed: ${error.message}`, "error");
      }
    } catch (err: any) {
      onNotify(`Update error: ${err.message}`, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono mb-1">
            <Users className="w-4 h-4 text-cyan-500" />
            <span>Total Scholars</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
            {students.length}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono mb-1">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Cumulative XP</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {totalXP.toLocaleString()}
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono mb-1">
            <Trophy className="w-4 h-4 text-emerald-500" />
            <span>Avg Accuracy</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {avgAccuracy}%
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono mb-1">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Top Streak</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {maxStreak} Days
          </div>
        </div>
      </div>

      {/* Control bar: Search, Filter, Sort, Export */}
      <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4">
        
        {/* Search */}
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or user ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Grade filter */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-medium text-neutral-700 dark:text-neutral-300"
          >
            <option value="all">All Grades</option>
            <option value="grade_9">Grade 9</option>
            <option value="grade_10">Grade 10</option>
            <option value="grade_11">Grade 11</option>
            <option value="grade_12">Grade 12</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-medium text-neutral-700 dark:text-neutral-300"
          >
            <option value="xp">Sort by Highest XP</option>
            <option value="streak">Sort by Longest Streak</option>
            <option value="accuracy">Sort by Accuracy</option>
            <option value="quizzes">Sort by Quizzes Attempted</option>
          </select>

          {/* Refresh */}
          <button
            onClick={fetchStudents}
            disabled={isLoading}
            className="p-2 rounded-xl border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="btn-educhain-secondary text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

      </div>

      {/* Students Data Table */}
      <div className="border border-neutral-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-[#182438] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.02] text-neutral-500 font-mono">
              <tr>
                <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Scholar</th>
                <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Grade</th>
                <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">XP Points</th>
                <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Streak</th>
                <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Quizzes &amp; Accuracy</th>
                <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">Stages</th>
                <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/[0.04]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-500" />
                    <span>Loading student records from Supabase...</span>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No scholars found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <ScholarAvatar name={s.player_name} avatar={s.player_avatar} size="md" />
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-white">
                            {s.player_name}
                          </div>
                          <div className="font-mono text-[10px] text-neutral-400 truncate max-w-[140px]" title={s.id}>
                            {s.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 text-neutral-700 dark:text-neutral-300">
                        {s.player_grade.replace("_", " ")}
                      </span>
                    </td>

                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {s.xp.toLocaleString()} XP
                    </td>

                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center font-mono font-medium whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 text-rose-500">
                        <Flame className="w-3.5 h-3.5 fill-current" />
                        <span>{s.current_streak}d</span>
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Max: {s.longest_streak}d
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center font-mono whitespace-nowrap">
                      <div className="font-bold text-neutral-900 dark:text-white">
                        {s.accuracy}%
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {s.quizzes_attempted} quizzes ({s.questions_correct}/{s.questions_answered})
                      </div>
                    </td>

                    <td className="py-3 px-3 sm:py-3.5 sm:px-4 text-center font-mono font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {s.stages_completed} completed
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            sound.playClick();
                            setEditingStudent({ ...s });
                          }}
                          className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                          title="Edit Scholar"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleResetStudent(s)}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                          title="Reset Progress"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Delete Scholar Profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) { sound.playClick(); setEditingStudent(null); } }}>
          <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-2xl flex flex-col min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            
            <div className="shrink-0 flex items-center justify-between p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    Edit Scholar Profile
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    ID: {editingStudent.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingStudent(null)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudentEdit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold uppercase mb-1">
                  Player Name
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.player_name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, player_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase mb-1">
                  Avatar Emoji
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.player_avatar}
                  onChange={(e) => setEditingStudent({ ...editingStudent, player_avatar: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-semibold uppercase mb-1">
                    Grade
                  </label>
                  <select
                    value={editingStudent.player_grade}
                    onChange={(e) => setEditingStudent({ ...editingStudent, player_grade: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs"
                  >
                    <option value="grade_9">Grade 9</option>
                    <option value="grade_10">Grade 10</option>
                    <option value="grade_11">Grade 11</option>
                    <option value="grade_12">Grade 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-semibold uppercase mb-1">
                    XP Points
                  </label>
                  <input
                    type="number"
                    value={editingStudent.xp}
                    onChange={(e) => setEditingStudent({ ...editingStudent, xp: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold uppercase mb-1">
                  Current Streak (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  value={editingStudent.current_streak}
                  onChange={(e) => setEditingStudent({ ...editingStudent, current_streak: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-mono"
                />
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-educhain-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isUpdating ? "Saving..." : "Save Scholar Profile"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
