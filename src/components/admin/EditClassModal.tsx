"use client";

import React, { useState } from "react";
import { X, Save, GraduationCap } from "lucide-react";
import { SchoolClass } from "@/types/curriculum";
import { useCurriculumStore } from "@/store/useCurriculumStore";
import { sound } from "@/lib/audio";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface EditClassModalProps {
  schoolClass: SchoolClass | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
}

export const EditClassModal: React.FC<EditClassModalProps> = ({
  schoolClass,
  isOpen,
  onClose,
  onSaved,
}) => {
  useBodyScrollLock(isOpen && Boolean(schoolClass));
  const { updateClass } = useCurriculumStore();

  if (!isOpen || !schoolClass) return null;

  return (
    <EditClassForm
      schoolClass={schoolClass}
      onClose={onClose}
      onSaved={onSaved}
      updateClass={updateClass}
    />
  );
};

function EditClassForm({
  schoolClass,
  onClose,
  onSaved,
  updateClass,
}: {
  schoolClass: SchoolClass;
  onClose: () => void;
  onSaved: (name: string) => void;
  updateClass: (id: string, updates: Partial<SchoolClass>) => Promise<{ success: boolean; error?: string }>;
}) {
  const [name, setName] = useState(schoolClass.name || "");
  const [icon, setIcon] = useState(schoolClass.icon || "🎓");
  const [description, setDescription] = useState(schoolClass.description || "");
  const [displayOrder, setDisplayOrder] = useState<number>(schoolClass.displayOrder ?? 1);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    sound.playClick();

    const res = await updateClass(schoolClass.id, {
      name: name.trim(),
      icon: icon.trim() || "🎓",
      description: description.trim(),
      displayOrder: Number(displayOrder) || 1,
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
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-cyan-400 border border-sky-500/20 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white truncate">
                Edit Class: {schoolClass.name}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 truncate">
                Update name, icon emoji, description and order priority
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
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-mono font-semibold uppercase mb-1">
                Class Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs font-semibold"
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs text-center"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Description / Board Standard
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Secondary School Certificate (SSC Part I)"
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold uppercase mb-1">
              Display Sequence Order (1, 2, 3...)
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] text-xs"
            />
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
              <span>{isSaving ? "Saving..." : "Update Class"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}