"use client";

import React, { useState } from "react";
import { SleekIcon } from "@/components/SleekIcon";
import { X, Save, Layers } from "lucide-react";
import { CustomSubject, useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

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

interface EditSubjectModalProps {
  subject: CustomSubject | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
}

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  subject,
  isOpen,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(isOpen && Boolean(subject));
  const { updateSubject } = useCurriculumStore();

  if (!isOpen || !subject) return null;

  return <EditSubjectForm subject={subject} onClose={onClose} onSaved={onSaved} updateSubject={updateSubject} />;
};

function EditSubjectForm({
  subject,
  onClose,
  onSaved,
  updateSubject,
}: {
  subject: CustomSubject;
  onClose: () => void;
  onSaved: (name: string) => void;
  updateSubject: (id: string, updates: Partial<CustomSubject>) => Promise<{ success: boolean; error?: string }>;
}) {
  const { getAllClasses } = useCurriculumStore();
  const classes = getAllClasses();
  const [name, setName] = useState(subject.name || "");
  const [grade, setGrade] = useState(subject.grade || "grade_9");
  const [icon, setIcon] = useState(subject.icon || "📚");
  const [description, setDescription] = useState(subject.description || "");
  const [color, setColor] = useState(subject.color || "#38bdf8");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    sound.playClick();

    const res = await updateSubject(subject.id, {
      name: name.trim(),
      icon: icon.trim() || "📚",
      description: description.trim(),
      color,
      grade,
      badgeBg: `${color}1a`,
      borderColor: `${color}4d`,
    });

    setIsSaving(false);

    if (res.success) {
      sound.playUnlock();
      onSaved(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden" onClick={(e) => { if (e.target === e.currentTarget) { sound.playClick(); onClose(); } }}>
      <div className="relative w-full max-w-md max-h-[92dvh] sm:max-h-[90dvh] rounded-3xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-[#182438] shadow-2xl flex flex-col min-h-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 p-4 sm:p-6 border-b border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                Edit Subject: {subject.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Update display name, icon emoji, and color theme
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

        {/* Form */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Target Class / Grade
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-cyan-400">
                <SleekIcon name={classes.find((c) => c.id === grade)?.icon || grade} className="w-4 h-4" />
              </div>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-semibold"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} {cls.description ? `— ${cls.description}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Subject Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-sm font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Icon Emoji
            </label>
            <input
              type="text"
              required
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Description / Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs"
            />
          </div>

          {/* Color theme */}
          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1.5">
              Theme Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === preset.value ? "scale-110 border-black dark:border-white ring-2 ring-neutral-400" : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-white/10"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="btn-educhain-primary px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? "Saving..." : "Update Subject"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
