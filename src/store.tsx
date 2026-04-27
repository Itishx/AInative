import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { AppState, Course, LeaderboardEntry, EnrolledCourse } from './types';

const STORAGE_KEY = 'ainative_v3';
const LEGACY_STORAGE_KEY = 'ainative_v2';

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user: 'mira.k', course: 'Docker in anger', marginMs: (14 * 24 + 2) * 3600000, days: 21, streak: 21, certId: 'AIN-MK01' },
  { rank: 2, user: 'ojo_22', course: 'Intro to probability', marginMs: (11 * 24 + 19) * 3600000, days: 28, streak: 26, certId: 'AIN-OJ02' },
  { rank: 3, user: 'hansu', course: 'Conversational Japanese', marginMs: (8 * 24 + 11) * 3600000, days: 45, streak: 38, certId: 'AIN-HA03' },
  { rank: 5, user: 'yael', course: 'Linear algebra, honestly', marginMs: (4 * 24 + 22) * 3600000, days: 60, streak: 44, certId: 'AIN-YA05' },
  { rank: 6, user: 'priya.s', course: 'Rust ownership', marginMs: (3 * 24 + 9) * 3600000, days: 30, streak: 22, certId: 'AIN-PR06' },
];

function calcProgress(course: Course): number {
  const allLessons = course.curriculum.modules.flatMap((m) => m.lessons);
  if (!allLessons.length) return 0;
  return allLessons.filter((l) => l.completed).length / allLessons.length;
}

function checkDeadlines(state: AppState): AppState {
  const now = Date.now();
  const courses = state.courses.map((c) => {
    if (c.status === 'tombstone' || c.status === 'completed') return c;
    if (c.paused) return c;
    const deadline = new Date(c.deadline).getTime();
    const hoursLeft = (deadline - now) / 3600000;
    if (hoursLeft <= 0 && c.progress < 1) return { ...c, status: 'tombstone' as const, streak: 0 };
    if (hoursLeft <= 72 && hoursLeft > 0 && c.status !== 'active-urgent') return { ...c, status: 'active-urgent' as const };
    if (hoursLeft > 72 && c.status === 'active-urgent') return { ...c, status: 'active' as const };
    return c;
  });
  return { ...state, courses };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      // Migrate: add lessonChats/moduleNotes to existing courses
      parsed.courses = parsed.courses.map((c) => ({
        ...c,
        curriculum: {
          ...c.curriculum,
          modules: c.curriculum.modules.map((m) => ({
            ...m,
            lessons: m.lessons.map((l) => ({
              ...l,
              objective: l.objective ?? `Understand ${l.title.toLowerCase()}.`,
            })),
          })),
        },
        lessonChats: c.lessonChats ?? {},
        moduleChats: c.moduleChats ?? (c.chat ? { [c.currentModule ?? 0]: c.chat } : {}),
        moduleNotes: c.moduleNotes ?? {},
      }));
      return checkDeadlines(parsed);
    }
  } catch {}
  return { courses: [], leaderboard: SEED_LEADERBOARD, username: 'you' };
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type Action =
  | { type: 'SET_USERNAME'; username: string }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'DELETE_COURSE'; id: string }
  | { type: 'UPDATE_COURSE'; id: string; patch: Partial<Course> }
  | { type: 'PAUSE_COURSE'; id: string }
  | { type: 'RESUME_COURSE'; id: string }
  | { type: 'ADD_CHAT'; id: string; lessonKey: string; msg: import('./types').ChatMsg }
  | { type: 'SAVE_LESSON_NOTES'; id: string; moduleIndex: number; lessonIndex: number; notes: string }
  | { type: 'SAVE_MODULE_NOTES'; id: string; moduleIndex: number; notes: string }
  | { type: 'COMPLETE_LESSON'; id: string; moduleIndex: number; lessonIndex: number; preferredMet: boolean }
  | { type: 'CHECK_DEADLINES' }
  | { type: 'ADD_LEADERBOARD'; entry: LeaderboardEntry }
  | { type: 'ENROLL_COURSE'; course: EnrolledCourse };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USERNAME':
      return { ...state, username: action.username };

    case 'ADD_COURSE':
      return { ...state, courses: [action.course, ...state.courses] };

    case 'DELETE_COURSE':
      return { ...state, courses: state.courses.filter((c) => c.id !== action.id) };

    case 'UPDATE_COURSE': {
      const courses = state.courses.map((c) =>
        c.id === action.id ? { ...c, ...action.patch } : c
      );
      return { ...state, courses };
    }

    case 'PAUSE_COURSE': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id || c.pauseUsed) return c;
        return { ...c, paused: true, pausedAt: new Date().toISOString() };
      });
      return { ...state, courses };
    }

    case 'RESUME_COURSE': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id || !c.paused || !c.pausedAt) return c;
        const elapsed = Date.now() - new Date(c.pausedAt).getTime();
        const extension = Math.min(elapsed, 72 * 3600000);
        const newDeadline = new Date(new Date(c.deadline).getTime() + extension).toISOString();
        return { ...c, paused: false, pauseUsed: true, pausedAt: undefined, deadline: newDeadline };
      });
      return checkDeadlines({ ...state, courses });
    }

    case 'ADD_CHAT': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;
        const existing = c.lessonChats?.[action.lessonKey] ?? [];
        return { ...c, lessonChats: { ...c.lessonChats, [action.lessonKey]: [...existing, action.msg] } };
      });
      return { ...state, courses };
    }

    case 'SAVE_LESSON_NOTES': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;
        const modules = c.curriculum.modules.map((m, mi) =>
          mi !== action.moduleIndex ? m : {
            ...m,
            lessons: m.lessons.map((l, li) =>
              li !== action.lessonIndex ? l : { ...l, notes: action.notes }
            ),
          }
        );
        return { ...c, curriculum: { ...c.curriculum, modules } };
      });
      return { ...state, courses };
    }

    case 'SAVE_MODULE_NOTES': {
      const courses = state.courses.map((c) =>
        c.id !== action.id ? c : { ...c, moduleNotes: { ...c.moduleNotes, [action.moduleIndex]: action.notes } }
      );
      return { ...state, courses };
    }

    case 'COMPLETE_LESSON': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;

        // Mark lesson completed; preferred score is tracked separately.
        const modules = c.curriculum.modules.map((m, mi) => {
          if (mi !== action.moduleIndex) return m;
          const lessons = m.lessons.map((l, li) =>
            li !== action.lessonIndex
              ? l
              : { ...l, completed: true, quizPassed: action.preferredMet || l.quizPassed }
          );
          const modDone = lessons.every((l) => l.completed);
          return { ...m, lessons, quizPassed: modDone };
        });

        // Advance to next lesson or next module
        let nextMod = action.moduleIndex;
        let nextLesson = action.lessonIndex + 1;
        const curMod = modules[action.moduleIndex];

        if (nextLesson >= curMod.lessons.length) {
          // Done with module — move to next module
          nextMod = action.moduleIndex + 1;
          nextLesson = 0;
          // Unlock next module
          if (nextMod < modules.length) {
            modules[nextMod] = { ...modules[nextMod], unlocked: true };
          }
        }

        const shouldAdvancePosition = c.currentModule === action.moduleIndex && c.currentLesson === action.lessonIndex;
        const updated: Course = {
          ...c,
          curriculum: { ...c.curriculum, modules },
          currentModule: shouldAdvancePosition ? Math.min(nextMod, modules.length - 1) : c.currentModule,
          currentLesson: shouldAdvancePosition
            ? (nextMod < modules.length ? nextLesson : c.currentLesson)
            : c.currentLesson,
        };
        updated.progress = calcProgress(updated);
        if (updated.progress >= 1) updated.status = 'completed';

        return updated;
      });
      return { ...state, courses };
    }

    case 'CHECK_DEADLINES':
      return checkDeadlines(state);

    case 'ENROLL_COURSE':
      // Avoid duplicate enrolments
      if (state.courses.some((c) => c.id === action.course.id)) return state;
      return { ...state, courses: [action.course, ...state.courses] };

    case 'ADD_LEADERBOARD': {
      const existing = state.leaderboard.filter((e) => e.certId !== action.entry.certId);
      const merged = [...existing, action.entry].sort((a, b) => b.marginMs - a.marginMs);
      return { ...state, leaderboard: merged.map((e, i) => ({ ...e, rank: i + 1 })) };
    }

    default:
      return state;
  }
}

interface StoreCtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => { saveState(state); }, [state]);

  useEffect(() => {
    const interval = setInterval(() => dispatch({ type: 'CHECK_DEADLINES' }), 60000);
    return () => clearInterval(interval);
  }, []);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore outside provider');
  return ctx;
}

export function useAddCourse() {
  const { dispatch } = useStore();
  return useCallback((course: Course) => dispatch({ type: 'ADD_COURSE', course }), [dispatch]);
}

export function useEnrollCourse() {
  const { dispatch } = useStore();
  return useCallback((course: EnrolledCourse) => dispatch({ type: 'ENROLL_COURSE', course }), [dispatch]);
}
