import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import type { AppState, Course, LeaderboardEntry, EnrolledCourse, UserProfile, QuizAttempt, StudySession } from './types';
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
    bestDescribesYou: '',
    occupation: '',
    learningGoals: [],
    onboardingCompleted: false,
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
    if (c.status === 'tombstone' || c.status === 'expired' || c.status === 'completed') return c;
    if (c.paused) return c;
    const deadline = new Date(c.deadline).getTime();
    const hoursLeft = (deadline - now) / 3600000;
    if (hoursLeft <= 0 && c.progress < 1) {
      const attempt = { deadline: c.deadline, missedAt: new Date().toISOString() };
      return {
        ...c,
        status: 'expired' as const,
        streak: 0,
        deadlineHistory: [...(c.deadlineHistory ?? []), attempt],
      };
    }
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

function studyTopicKey(topic?: string) {
  return (topic || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function dedupeStudySessions(studySessions: StudySession[]): StudySession[] {
  const sorted = [...(Array.isArray(studySessions) ? studySessions : [])].sort(
    (a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime(),
  );
  const seen = new Set<string>();
  const deduped: StudySession[] = [];

  for (const session of sorted) {
    if (!session?.id) continue;
    const key = studyTopicKey(session.topic) || `id:${session.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(session);
  }

  return deduped.slice(0, 50);
}

function normalizeState(state: Partial<AppState> | null | undefined): AppState {
  const username = state?.username ?? 'you';
  return {
    courses: migrateCourses(state?.courses ?? []),
    leaderboard: state?.leaderboard ?? SEED_LEADERBOARD,
    username,
    profile: { ...defaultProfile(username), ...(state?.profile ?? {}) },
    quizAttempts: state?.quizAttempts ?? [],
    studySessions: dedupeStudySessions(state?.studySessions ?? []),
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

type DbUserCoursesRow = {
  courses?: Course[] | null;
  username?: string | null;
  profile?: UserProfile;
  quiz_attempts?: QuizAttempt[] | null;
  study_sessions?: StudySession[] | null;
  updated_at?: string | null;
};

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
  | { type: 'RECOMMIT'; id: string; newDeadline: string }
  | { type: 'MARK_STUDIED'; id: string; dateKey: string }
  | { type: 'ADD_LEADERBOARD'; entry: LeaderboardEntry }
  | { type: 'ENROLL_COURSE'; course: EnrolledCourse }
  | { type: 'ADD_STUDY_SESSION'; session: StudySession }
  | { type: 'DELETE_STUDY_SESSION'; id: string }
  | { type: '_LOAD_FROM_DB'; courses: Course[]; username?: string; profile?: UserProfile; quizAttempts?: QuizAttempt[]; studySessions?: StudySession[] };

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
      const studySessions = action.studySessions
        ? dedupeStudySessions(action.studySessions)
        : state.studySessions;
      return checkDeadlines({
        ...state,
        // DB is the source of truth for course presence so deletions do not
        // get resurrected from stale localStorage in another client.
        courses,
        username: action.username && action.username !== 'you' ? action.username : state.username,
        profile: mergeProfileFromDb(state.profile, action.profile),
        quizAttempts: action.quizAttempts ? mergeQuizAttempts(action.quizAttempts, []) : state.quizAttempts,
        studySessions,
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

    case 'RECOMMIT': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;
        return { ...c, status: 'active' as const, deadline: action.newDeadline };
      });
      return checkDeadlines({ ...state, courses });
    }

    case 'MARK_STUDIED': {
      const courses = state.courses.map((c) => {
        if (c.id !== action.id) return c;
        const log = c.studyLog ?? [];
        if (log.includes(action.dateKey)) return c;
        return { ...c, studyLog: [...log, action.dateKey] };
      });
      return { ...state, courses };
    }

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

    case 'ADD_STUDY_SESSION':
      return { ...state, studySessions: dedupeStudySessions([action.session, ...(state.studySessions ?? [])]) };

    case 'DELETE_STUDY_SESSION':
      return { ...state, studySessions: (state.studySessions ?? []).filter(s => s.id !== action.id) };

    default:
      return state;
  }
}

interface StoreCtx {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  remoteLoaded: boolean;
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
  const [remoteLoaded, setRemoteLoaded] = useState(!userId);

  // Prevent initial save from clobbering DB before the async load resolves
  const dbLoadedRef = useRef(false);
  const lastUserIdRef = useRef<string | undefined>(userId);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const remoteUpdatedAtRef = useRef<string | null>(null);
  const saveScheduledRef = useRef(false);
  const skipNextRemoteSaveRef = useRef(false);

  if (lastUserIdRef.current !== userId) {
    clearTimeout(saveTimer.current);
    lastUserIdRef.current = userId;
    dbLoadedRef.current = !userId;
    remoteUpdatedAtRef.current = null;
    saveScheduledRef.current = false;
    skipNextRemoteSaveRef.current = false;
  }

  useEffect(() => {
    setRemoteLoaded(!userId);
  }, [userId]);

  const applyDbRow = useCallback((row: DbUserCoursesRow, options?: { includeProfile?: boolean; includeQuizAttempts?: boolean; includeStudySessions?: boolean }) => {
    const remoteUpdatedAt = typeof row.updated_at === 'string' ? row.updated_at : null;
    if (remoteUpdatedAt && remoteUpdatedAt === remoteUpdatedAtRef.current) return false;
    remoteUpdatedAtRef.current = remoteUpdatedAt;
    const incomingStudySessions = options?.includeStudySessions && Array.isArray(row.study_sessions)
      ? row.study_sessions
      : undefined;
    const normalizedStudySessions = incomingStudySessions
      ? dedupeStudySessions(incomingStudySessions)
      : undefined;
    const studySessionsWereCleaned = !!incomingStudySessions && (
      normalizedStudySessions!.length !== incomingStudySessions.length
      || normalizedStudySessions!.some((session, index) => session.id !== incomingStudySessions[index]?.id)
    );
    skipNextRemoteSaveRef.current = !studySessionsWereCleaned;
    dispatch({
      type: '_LOAD_FROM_DB',
      courses: Array.isArray(row.courses) ? row.courses : [],
      username: row.username ?? undefined,
      profile: options?.includeProfile ? row.profile : undefined,
      quizAttempts: options?.includeQuizAttempts && Array.isArray(row.quiz_attempts) ? row.quiz_attempts : undefined,
      studySessions: normalizedStudySessions,
    });
    return true;
  }, []);

  const syncFromDb = useCallback(async ({ markLoaded = false, force = false }: { markLoaded?: boolean; force?: boolean } = {}) => {
    if (!userId) return;
    if (!force && saveScheduledRef.current) return;

    try {
      const primary = await supabase
        .from('user_courses')
        .select('courses, username, profile, quiz_attempts, study_sessions, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!primary.error) {
        if (primary.data) applyDbRow(primary.data as DbUserCoursesRow, { includeProfile: true, includeQuizAttempts: true, includeStudySessions: true });
        return;
      }

      const fallback = await supabase
        .from('user_courses')
        .select('courses, username, profile, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!fallback.error) {
        if (fallback.data) applyDbRow(fallback.data as DbUserCoursesRow, { includeProfile: true });
        return;
      }

      const baseFallback = await supabase
        .from('user_courses')
        .select('courses, username, updated_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (baseFallback.data) {
        applyDbRow(baseFallback.data as DbUserCoursesRow);
      }
    } finally {
      if (markLoaded) {
        dbLoadedRef.current = true;
        setRemoteLoaded(true);
      }
    }
  }, [applyDbRow, userId]);

  // Load from Supabase on mount — DB is source of truth
  useEffect(() => {
    void syncFromDb({ markLoaded: true, force: true });
  }, [syncFromDb]);

  useEffect(() => {
    if (!userId) return;

    const handleWindowFocus = () => { void syncFromDb(); };
    const handleVisibilityChange = () => {
      if (!document.hidden) void syncFromDb();
    };

    const remoteChannel = supabase
      .channel(`user-courses-${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_courses',
        filter: `user_id=eq.${userId}`,
      }, () => {
        void syncFromDb();
      })
      .subscribe();

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = window.setInterval(() => {
      if (!document.hidden) void syncFromDb();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
      void supabase.removeChannel(remoteChannel);
    };
  }, [syncFromDb, userId]);

  // Save to localStorage immediately, debounce Supabase writes (2s)
  useEffect(() => {
    saveLocal(state, userId);
    if (!userId) return;
    if (skipNextRemoteSaveRef.current) {
      skipNextRemoteSaveRef.current = false;
      saveScheduledRef.current = false;
      return;
    }
    // Don't write to Supabase until the initial DB load has completed
    if (!dbLoadedRef.current) return;
    clearTimeout(saveTimer.current);
    saveScheduledRef.current = true;
    const updatedAt = new Date().toISOString();
    saveTimer.current = setTimeout(() => {
      supabase
        .from('user_courses')
        .upsert({
          user_id: userId,
          courses: state.courses,
          username: state.username,
          profile: state.profile,
          quiz_attempts: state.quizAttempts,
          study_sessions: state.studySessions,
          updated_at: updatedAt,
        }, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (!error) {
            remoteUpdatedAtRef.current = updatedAt;
            saveScheduledRef.current = false;
            return;
          }
          console.error('[store:supabase-save]', error.message);
          // Older Supabase tables may not have the profile column yet.
          // Still save courses/username instead of dropping all progress.
          supabase
            .from('user_courses')
            .upsert({
              user_id: userId,
              courses: state.courses,
              username: state.username,
              study_sessions: state.studySessions,
              updated_at: updatedAt,
            }, { onConflict: 'user_id' })
            .then(({ error: fallbackError }) => {
              if (!fallbackError) remoteUpdatedAtRef.current = updatedAt;
              saveScheduledRef.current = false;
              supabase
                .from('user_courses')
                .update({ profile: state.profile, updated_at: updatedAt })
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

  return <Ctx.Provider value={{ state, dispatch, remoteLoaded }}>{children}</Ctx.Provider>;
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
