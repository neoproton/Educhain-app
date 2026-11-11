export type SubjectType = "mathematics" | "science" | "english" | "computer_science" | (string & {});

export type GradeType = "grade_9" | "grade_10" | "grade_11" | "grade_12" | (string & {});

export interface SchoolClass {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  displayOrder?: number;
  created_at?: string;
}

export type StreamDomainId = "stem_science" | "mathematics_stream" | "humanities_languages";

export interface SubCategoryMetadata {
  subjectId: SubjectType;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  primaryTopics: string[];
}

export interface StreamDomain {
  id: StreamDomainId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  subCategories: SubCategoryMetadata[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tags: string[];
}

export interface Stage {
  id: number | string;
  streamId?: StreamDomainId;
  streamName?: string;
  subject?: SubjectType;
  subjectName?: string;
  subjectStageNumber?: number;
  grade?: GradeType;
  gradeLabel?: string;
  level?: number;
  levelName?: string;
  chapter?: string;
  chapterNumber?: number;
  topic?: string;
  learningObjective?: string;
  title: string;
  description: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  xpReward: number;
  questions: Question[];
}

export interface MistakeRecord {
  id: string;
  questionId: string;
  subject: SubjectType;
  stageId: number | string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  missedAt: string;
  mastered: boolean;
  timesMissed: number;
}

export interface QuizAttemptRecord {
  stageId: number | string;
  subject: SubjectType;
  score: number;
  total: number;
  accuracy: number;
  xpEarned: number;
  completedAt: string;
}
