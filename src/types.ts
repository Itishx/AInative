export interface Lesson {
  title: string;
  objective: string;
  description?: string;   // 2-sentence concept description for tutor grounding
  facts?: string[];        // 3-5 verifiable facts for anti-hallucination grounding
  minutes: number;
  completed: boolean;
  quizPassed: boolean;
  notes?: string;
}

export interface Module {
  title: string;
  lessons: Lesson[];
  unlocked: boolean;
  quizPassed: boolean; // true when all lessons quizPassed
}

export interface ChatMsg {
  who: 'tutor' | 'user';
  text: string;
  ts: number;
  readyToMoveOn?: boolean;
  visual?: string;
}

export interface Curriculum {
  title: string;
  level: string;
  estimatedHours: number;
  modules: Module[];
}

export interface Course {
  id: string;
  subject: string;
  createdAt: string;
  deadline: string;
  progress: number;
  streak: number;
  lastStudiedDate?: string;
  status: 'active' | 'active-urgent' | 'tombstone' | 'completed';
  paused: boolean;
  pauseUsed: boolean;
  pausedAt?: string;
  curriculum: Curriculum;
  chat?: ChatMsg[];            // deprecated — kept for migration only
  moduleChats?: Record<number, ChatMsg[]>;  // deprecated — old one thread per module shape
  lessonChats: Record<string, ChatMsg[]>;   // one chat thread per lesson: "module:lesson"
  moduleNotes: Record<number, string>;      // notes generated after each module
  currentModule: number;
  currentLesson: number;
  certId?: string;
}

export interface MCQQuestion {
  type: 'mcq';
  q: string;
  options: string[];
  correct: number;
}

export interface TypedQuestion {
  type: 'typed';
  q: string;
  sampleAnswer: string;
}

export type QuizQuestion = MCQQuestion | TypedQuestion;

export interface LeaderboardEntry {
  rank: number;
  user: string;
  course: string;
  marginMs: number;
  days: number;
  streak: number;
  certId: string;
}

export interface AppState {
  courses: Course[];
  leaderboard: LeaderboardEntry[];
  username: string;
}

// ── Instructor / Marketplace types ──────────────────────────────────────────

export interface InstructorCurriculum {
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  modules: { title: string; lessons: { title: string; objective: string; minutes: number }[] }[];
  materialsContext: string;
}

export interface PublishedCourse {
  id: string;
  curriculum: InstructorCurriculum;
  price: number;
  enrollCount: number;
  createdAt: string;
}

export interface EnrolledCourse extends Course {
  instructorCourseId: string;
  materialsContext: string;
}
