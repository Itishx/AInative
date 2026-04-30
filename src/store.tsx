import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { AppState, Course, LeaderboardEntry, EnrolledCourse, UserProfile, QuizAttempt } from './types';
import { supabase } from './lib/supabase';

const BASE_KEY = 'ainative_v3';
const LEGACY_STORAGE_KEY = 'ainative_v2';

function storageKey(userId?: string) {
  return userId ? `${BASE_KEY}_${userId}` : BASE_KEY;
}

const SEED_LEADERBOARD: LeaderboardEntry[] = [];

function defaultProfile(username = 'you'): UserProfile {
  return {
    displayName: username && username !== 'you' ? username : '',
    headline: '',
    bio: '',
    avatarUrl: '',
  };
}

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

function migrateCourses(courses: Course[]): Course[] {
  return courses.map((c) => ({
    ...c,
    curriculum: {
      ...c.curriculum,
      modules: c.curriculum.modules.map((m) => ({
        ...m,
        unlocked: true,
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
}

function mergeCourses(primary: Course[], secondary: Course[]): Course[] {
  const seen = new Set<string>();
  const merged: Course[] = [];
  for (const course of [...primary, ...secondary]) {
    if (!course?.id || seen.has(course.id)) continue;
    seen.add(course.id);
    merged.push(course);
  }
  return merged;
}

function mergeQuizAttempts(primary: QuizAttempt[], secondary: QuizAttempt[]): QuizAttempt[] {
  const seen = new Set<string>();
  const merged: QuizAttempt[] = [];
  for (const attempt of [...primary, ...secondary]) {
    if (!attempt?.id || seen.has(attempt.id)) continue;
    seen.add(attempt.id);
    merged.push(attempt);
  }
  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
}

function mergeProfileFromDb(current: UserProfile, incoming?: UserProfile): UserProfile {
  if (!incoming) return current;
  // DB should win on load. Empty local defaults must not erase saved profile fields.
  return { ...current, ...incoming };
}

function normalizeState(state: Partial<AppState> | null | undefined): AppState {
  const username = state?.username ?? 'you';
  return {
    courses: migrateCourses(state?.courses ?? []),
    leaderboard: state?.leaderboard ?? SEED_LEADERBOARD,
    username,
    profile: { ...defaultProfile(username), ...(state?.profile ?? {}) },
    quizAttempts: state?.quizAttempts ?? [],
  };
}

function loadState(userId?: string): AppState {
  try {
    const userRaw = localStorage.getItem(storageKey(userId));
    let userState: AppState | null = null;
    if (userRaw) {
      const parsed = normalizeState(JSON.parse(userRaw) as Partial<AppState>);
      userState = checkDeadlines(parsed);
      // If already has courses, use it
      if (userState.courses.length > 0) return userState;
    }

    // Migration: check legacy non-namespaced key (even if user key exists but was empty)
    const legacyRaw = localStorage.getItem(BASE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw && userId) {
      const parsed = normalizeState(JSON.parse(legacyRaw) as Partial<AppState>);
      const migrated = checkDeadlines(parsed);
      if (migrated.courses.length > 0) {
        localStorage.setItem(storageKey(userId), JSON.stringify(migrated));
        return migrated;
      }
    }

    if (userState) return userState;
  } catch {}
  return normalizeState(null);
}

function saveLocal(state: AppState, userId?: string) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch (err) {
    console.error('[store:local-save]', err);
  }
}

type Action =
  | { type: 'SET_USERNAME'; username: string }
  | { type: 'SET_PROFILE'; profile: UserProfile }
  | { type: 'ADD_COURSE'; course: Course }
  | { type: 'DELETE_COURSE'; id: string }
  | { type: 'UPDATE_COURSE'; id: string; patch: Partial<Course> }
  | { type: 'PAUSE_COURSE'; id: string }
  | { type: 'RESUME_COURSE'; id: string }
  | { type: 'SELECT_LESSON'; id: string; moduleIndex: number; lessonIndex: number }
  | { type: 'ADD_CHAT'; id: string; lessonKey: string; msg: import('./types').ChatMsg }
  | { type: 'SAVE_LESSON_NOTES'; id: string; moduleIndex: number; lessonIndex: number; notes: string }
  | { type: 'SAVE_MODULE_NOTES'; id: string; moduleIndex: number; notes: string }
  | { type: 'COMPLETE_LESSON'; id: string; moduleIndex: number; lessonIndex: number; preferredMet: boolean }
  | { type: 'RECORD_QUIZ_ATTEMPT'; attempt: QuizAttempt }
  | { type: 'CHECK_DEADLINES' }
  | { type: 'ADD_LEADERBOARD'; entry: LeaderboardEntry }
  | { type: 'ENROLL_COURSE'; course: EnrolledCourse }
  | { type: '_LOAD_FROM_DB'; courses: Course[]; username?: string; profile?: UserProfile; quizAttempts?: QuizAttempt[] };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USERNAME':
      return {
        ...state,
        username: action.username,
        profile: {
          ...state.profile,
          displayName: state.profile.displayName || action.username,
        },
      };

    case 'SET_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.profile } };

    case '_LOAD_FROM_DB': {
      const courses = migrateCourses(action.courses ?? []);
      return checkDeadlines({
        ...state,
        // Local state may contain newer chat/progress than a stale DB row.
        // Keep local versions first, then backfill anything only found in DB.
        courses: mergeCourses(state.courses, courses),
        username: action.username && action.username !== 'you' ? action.username : state.username,
        profile: mergeProfileFromDb(state.profile, action.profile),
        quizAttempts: mergeQuizAttempts(state.quizAttempts, action.quizAttempts ?? []),
      });
    }

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

    case 'SELECT_LESSON': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;
        const module = c.curriculum.modules[action.moduleIndex];
        if (!module?.lessons[action.lessonIndex]) return c;
        return {
          ...c,
          currentModule: action.moduleIndex,
          currentLesson: action.lessonIndex,
          curriculum: {
            ...c.curriculum,
            modules: c.curriculum.modules.map((m) => ({ ...m, unlocked: true })),
          },
        };
      });
      return { ...state, courses };
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

        let nextMod = action.moduleIndex;
        let nextLesson = action.lessonIndex + 1;
        const curMod = modules[action.moduleIndex];

        if (nextLesson >= curMod.lessons.length) {
          nextMod = action.moduleIndex + 1;
          nextLesson = 0;
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

    case 'RECORD_QUIZ_ATTEMPT':
      return { ...state, quizAttempts: [action.attempt, ...state.quizAttempts].slice(0, 100) };

    case 'CHECK_DEADLINES':
      return checkDeadlines(state);

    case 'ENROLL_COURSE':
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

export function StoreProvider({
  children,
  userId,
  userEmail,
}: {
  children: React.ReactNode;
  userId?: string;
  userEmail?: string;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const s = loadState(userId);
    if (userEmail && (!s.username || s.username === 'you')) {
      s.username = userEmail.split('@')[0];
      if (!s.profile.displayName) s.profile.displayName = s.username;
    }
    return s;
  });

  // Prevent initial save from clobbering DB before the async load resolves
  const dbLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>(userId);

  if (lastUserIdRef.current !== userId) {
    lastUserIdRef.current = userId;
    dbLoadedRef.current = !userId;
  }

  // Load from Supabase on mount — DB is source of truth
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_courses')
      .select('courses, username, profile, quiz_attempts')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          supabase
            .from('user_courses')
            .select('courses, username, profile')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data: fallback, error: fallbackError }) => {
              if (fallback) {
                dispatch({ type: '_LOAD_FROM_DB', courses: Array.isArray(fallback.courses) ? fallback.courses : [], username: fallback.username ?? undefined, profile: (fallback as { profile?: UserProfile }).profile });
                setTimeout(() => { dbLoadedRef.current = true; }, 0);
                return;
              }
              if (!fallbackError) {
                dbLoadedRef.current = true;
                return;
              }
              supabase
                .from('user_courses')
                .select('courses, username')
                .eq('user_id', userId)
                .maybeSingle()
                .then(({ data: baseFallback }) => {
                  if (baseFallback) {
                    dispatch({ type: '_LOAD_FROM_DB', courses: Array.isArray(baseFallback.courses) ? baseFallback.courses : [], username: baseFallback.username ?? undefined });
                  }
                  setTimeout(() => { dbLoadedRef.current = true; }, 0);
                });
            });
          return;
        }
        if (!data) {
          dbLoadedRef.current = true;
          return;
        }
        const row = data as { profile?: UserProfile; quiz_attempts?: QuizAttempt[] };
        dispatch({
          type: '_LOAD_FROM_DB',
          courses: Array.isArray(data.courses) ? data.courses : [],
          username: data.username ?? undefined,
          profile: row.profile,
          quizAttempts: Array.isArray(row.quiz_attempts) ? row.quiz_attempts : [],
        });
        setTimeout(() => { dbLoadedRef.current = true; }, 0);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Save to localStorage immediately, debounce Supabase writes (2s)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    saveLocal(state, userId);
    if (!userId) return;
    // Don't write to Supabase until the initial DB load has completed
    if (!dbLoadedRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from('user_courses')
        .upsert({
          user_id: userId,
          courses: state.courses,
          username: state.username,
          profile: state.profile,
          quiz_attempts: state.quizAttempts,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (!error) return;
          console.error('[store:supabase-save]', error.message);
          // Older Supabase tables may not have the profile column yet.
          // Still save courses/username instead of dropping all progress.
          supabase
            .from('user_courses')
            .upsert({
              user_id: userId,
              courses: state.courses,
              username: state.username,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })
            .then(() => {
              supabase
                .from('user_courses')
                .update({ profile: state.profile, updated_at: new Date().toISOString() })
                .eq('user_id', userId)
                .then(({ error: profileError }) => {
                  if (profileError) console.error('[store:profile-save]', profileError.message);
                });
            });
        });
    }, 2000);
  }, [state, userId]);

  // Leaderboard sync to Supabase
  useEffect(() => {
    if (!userId) return;
    const myEntries = state.leaderboard;
    myEntries.forEach((e) => {
      supabase.from('leaderboard').upsert({
        cert_id: e.certId,
        user_id: userId,
        username: e.user,
        course: e.course,
        margin_ms: e.marginMs,
        days: e.days,
        streak: e.streak,
      }).then();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.leaderboard, userId]);

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
