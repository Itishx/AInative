import { apiJson } from '../api';
import { getLocalCourse, localShelfCourses } from '../content';

export type LearnorSection = { heading: string; intent?: string; body: string };
export type LearnorQuizItem = { q: string; options: string[]; correct: number; why: string };
export type LearnorExercise = { title: string; task: string; solution: string };

export type LearnorContent = {
  title: string;
  summary?: string;
  subject?: string;
  category?: string;
  level?: string;
  sections: LearnorSection[];
  quiz: LearnorQuizItem[];
  exercises: LearnorExercise[];
};

export type LearnorCourse = {
  slug: string;
  title: string;
  category?: string;
  subject?: string;
  level?: string;
  published: boolean;
  publishedAt?: string | null;
  content: LearnorContent;
};

export type ShelfCourse = {
  slug: string;
  title: string;
  category?: string;
  subject?: string;
  level?: string;
  publishedAt?: string;
  summary?: string;
  stats: { sections: number; quiz: number; exercises: number };
};

export type IntakeMessage = { who: 'user' | 'ai'; text: string };

export type IntakeResult = {
  done: boolean;
  reply: string;
  request: {
    topic: string;
    brief: unknown;
    expectations: string;
    level: string;
    metadata: unknown;
  } | null;
};

export type ReviewRequest = {
  id: string;
  topic: string;
  expectations?: string;
  level?: string;
  requester_email: string;
  status: string;
  slug?: string;
  category?: string;
  preview_url?: string;
  review_notes?: string;
  attempts: number;
  error?: string;
  built_by?: string;
  created_at: string;
  updated_at: string;
};

export async function fetchShelf(): Promise<ShelfCourse[]> {
  const local = localShelfCourses();
  let remote: ShelfCourse[] = [];
  try {
    remote = await apiJson<ShelfCourse[]>('/api/learnor/shelf');
  } catch {
    remote = [];
  }
  // Bundled courses first, then DB courses, de-duped by slug.
  const seen = new Set(local.map((c) => c.slug));
  return [...local, ...remote.filter((c) => !seen.has(c.slug))];
}

export async function fetchCourse(slug: string, key?: string | null): Promise<LearnorCourse> {
  const bundled = getLocalCourse(slug);
  if (bundled) return bundled;
  const query = key ? `?key=${encodeURIComponent(key)}` : '';
  return apiJson<LearnorCourse>(`/api/learnor/course/${encodeURIComponent(slug)}${query}`);
}

// Is a slug served from the bundled repo (so the ask endpoint needs the
// client to supply the surrounding context)?
export function isLocalCourse(slug: string): boolean {
  return getLocalCourse(slug) !== null;
}

export function sendIntake(messages: IntakeMessage[]): Promise<IntakeResult> {
  return apiJson<IntakeResult>('/api/learnor/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
}

export function submitRequest(payload: {
  topic: string;
  brief: unknown;
  expectations: string;
  level: string;
  metadata: unknown;
  requesterEmail: string;
}): Promise<{ ok: boolean; id: string }> {
  return apiJson('/api/learnor/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function askInCourse(payload: {
  slug: string;
  key?: string | null;
  selection: string;
  question: string;
  title?: string;
  subject?: string;
  context?: string;
}): Promise<{ answer: string }> {
  return apiJson('/api/learnor/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function adminHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export function fetchReviewQueue(token: string): Promise<{ requests: ReviewRequest[] }> {
  return apiJson('/api/learnor/queue', { headers: adminHeaders(token) });
}

export function approveRequest(token: string, id: string): Promise<{ ok: boolean; liveUrl: string }> {
  return apiJson(`/api/learnor/review/${id}/approve`, { method: 'POST', headers: adminHeaders(token) });
}

export function requestChanges(token: string, id: string, notes: string): Promise<{ ok: boolean }> {
  return apiJson(`/api/learnor/review/${id}/request-changes`, {
    method: 'POST',
    headers: adminHeaders(token),
    body: JSON.stringify({ notes }),
  });
}
