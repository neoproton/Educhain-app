"use client";

import React, { useState } from "react";
import { SleekIcon } from "@/components/SleekIcon";
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  BookOpen, 



  AlertCircle 
} from "lucide-react";
import { Stage, Question, SubjectType, GradeType, SchoolClass } from "@/types/curriculum";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface EditStageModalProps {
  stage: Stage | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (title: string, warning?: string) => void;
}

export const EditStageModal: React.FC<EditStageModalProps> = ({
  stage,
  isOpen,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(isOpen && Boolean(stage));
  const { updateStage, getAllSubjects, getAllClasses } = useCurriculumStore();
  const allSubjects = getAllSubjects();
  const allClasses = getAllClasses();

  if (!isOpen || !stage) return null;

  return (
    <EditStageForm
      key={stage.id}
      stage={stage}
      onClose={onClose}
      onSaved={onSaved}
      allSubjects={allSubjects}
      allClasses={allClasses}
      updateStage={updateStage}
    />
  );
};

function EditStageForm({
  stage,
  onClose,
  onSaved,
  allSubjects,
  allClasses,
  updateStage,
}: {
  stage: Stage;
  onClose: () => void;
  onSaved: (title: string, warning?: string) => void;
  allSubjects: Array<{ id: string; name: string; grade?: string; icon?: string }>;
  allClasses: SchoolClass[];
  updateStage: (id: string | number, updates: Partial<Stage>) => Promise<{ success: boolean; cloudSynced?: boolean; error?: string }>;
}) {
  const [title, setTitle] = useState(stage.title || "");
  const [chapter, setChapter] = useState(stage.chapter || "");
  const [chapterNumber, setChapterNumberInput] = useState<number | "">(stage.chapterNumber || "");
  const [topic, setTopic] = useState(stage.topic || "");
  const [subject, setSubject] = useState<string>(stage.subject || "computer_science");
  const [grade, setGrade] = useState<string>(stage.grade || "grade_9");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(stage.difficulty || "Medium");
  const [xpReward, setXpReward] = useState<number>(stage.xpReward || 100);
  const [learningObjective] = useState(stage.learningObjective || "");
  const [questions, setQuestions] = useState<Question[]>(
    Array.isArray(stage.questions) ? JSON.parse(JSON.stringify(stage.questions)) : []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddQuestion = () => {
    sound.playClick();
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}_${questions.length}`,
        question: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
        tags: [],
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    sound.playClick();
    if (questions.length <= 1) {
      setErrorMessage("A stage must contain at least 1 question.");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionTextChange = (idx: number, val: string) => {
    const updated = [...questions];
    updated[idx].question = val;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx: number, optIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = val;
    setQuestions(updated);
  };

  const handleCorrectIndexChange = (qIdx: number, correctIdx: number) => {
    sound.playClick();
    const updated = [...questions];
    updated[qIdx].correctIndex = correctIdx;
    setQuestions(updated);
  };

  const handleExplanationChange = (qIdx: number, val: string) => {
    const updated = [...questions];
    updated[qIdx].explanation = val;
    setQuestions(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!chapter.trim()) {
      setErrorMessage("Chapter name is required.");
      return;
    }

    const finalTopic = topic.trim() || chapter.trim() || "General Practice";
    const finalTitle = title.trim() || (topic.trim() ? `${topic.trim()} Quest` : `${chapter.trim()} Challenge`);

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setErrorMessage(`Question #${i + 1} is empty.`);
        return;
      }
      for (let j = 0; j < 4; j++) {
        if (!q.options[j]?.trim()) {
          setErrorMessage(`Option ${String.fromCharCode(65 + j)} for Question #${i + 1} is empty.`);
          return;
        }
      }
    }

    setIsSaving(true);
    sound.playClick();

    const selectedSub = allSubjects.find((s) => s.id === subject) || allSubjects[0];

    const updatedData: Partial<Stage> = {
      title: finalTitle,
      chapter: chapter.trim(),
      chapterNumber: chapterNumber !== "" ? Number(chapterNumber) : undefined,
      topic: finalTopic,
      subject: subject as SubjectType,
      subjectName: selectedSub?.name || subject,
      grade: grade as GradeType,
      difficulty,
      xpReward: Number(xpReward) || 100,
      learningObjective: learningObjective.trim(),
      description: learningObjective.trim() || `Quiz covering ${finalTopic}`,
      questions,
    };

    const res = await updateStage(stage.id, updatedData);

    if (chapterNumber !== "") {
      const chapRes = await useCurriculumStore.getState().setChapterNumber(subject, grade, chapter.trim(), Number(chapterNumber));
      if (!chapRes.success && chapRes.error) {
        setIsSaving(false);
        setErrorMessage(chapRes.error);
        return;
      }
    }

    setIsSaving(false);

    if (res.success) {
      sound.playUnlock();
      onSaved(
        updatedData.title || stage.title,
        res.cloudSynced === false ? res.error || "Saved locally only" : undefined
      );
      onClose();
    } else {
      setErrorMessage(res.error || "Failed to update stage.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) { sound.playClick(); onClose(); } }}>
      <div className="relative w-full max-w-4xl max-h-[92dvh] sm:max-h-[90dvh] flex flex-col min-h-0 rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <span className="shrink-0">Edit Stage:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 truncate">{stage.title}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Modify stage metadata, question prompts, options, and explanations
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Metadata Grid */}
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-white/[0.02] space-y-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
              Stage Classification
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Class / Grade
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                    <SleekIcon name={allClasses.find((c) => c.id === grade)?.icon || grade} className="w-4 h-4" />
                  </div>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs font-medium"
                  >
                    {allClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Subject
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                    <SleekIcon name={allSubjects.find((s) => s.id === subject)?.icon || subject} className="w-4 h-4" />
                  </div>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs font-medium"
                  >
                    {allSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Chapter #
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  placeholder="Auto (1..)"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumberInput(e.target.value ? parseInt(e.target.value, 10) : "")}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs font-mono text-center"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Chapter Name
                </label>
                <input
                  type="text"
                  required
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs"
                />
              </div>

              <div className="sm:col-span-12">
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Topic Name <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Specific Topic (optional - defaults to Chapter if omitted)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Stage Title <span className="text-neutral-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stage Title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300 uppercase mb-1">
                  XP Reward
                </label>
                <input
                  type="number"
                  min={10}
                  max={500}
                  value={xpReward}
                  onChange={(e) => setXpReward(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Questions Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                MCQ Questions ({questions.length})
              </h4>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="btn-educhain-secondary text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Question</span>
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="p-5 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/30 dark:bg-white/[0.01] space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-white/5">
                    <span className="font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      Question #{qIdx + 1}
                    </span>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-xs font-mono text-rose-500 hover:text-rose-700 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Q</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 uppercase mb-1">
                      Prompt Text
                    </label>
                    <input
                      type="text"
                      required
                      value={q.question}
                      onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                      placeholder="e.g. What is the clock speed measured in?"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs"
                    />
                  </div>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = q.correctIndex === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                            isCorrect
                              ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30"
                              : "border-neutral-200 dark:border-white/10 bg-white dark:bg-black"
                          }`}
                        >
                          <label className="cursor-pointer flex items-center gap-1.5 shrink-0 pl-1">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleCorrectIndexChange(qIdx, optIdx)}
                              className="text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="font-mono text-xs font-bold">{letter}</span>
                          </label>

                          <input
                            type="text"
                            required
                            value={opt}
                            onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                            placeholder={`Option ${letter}`}
                            className="w-full px-2 py-1 bg-transparent text-xs focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-[11px] font-mono text-neutral-500 uppercase mb-1">
                      Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      value={q.explanation || ""}
                      onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                      placeholder="Brief explanation shown after answering"
                      className="w-full px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-black text-xs text-neutral-600 dark:text-neutral-400"
                    />
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Sticky Submit Footer */}
          <div className="pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end gap-3 sticky bottom-0 bg-white dark:bg-[#182438] py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10 hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-educhain-primary px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving Changes..." : "Save Stage Changes"}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
