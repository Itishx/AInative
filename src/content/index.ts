import type { LearnorContent, LearnorCourse, ShelfCourse } from '../lib/learnor';
import { databricks } from './databricks';

// Bundled launch courses — hand-authored, ship in the repo, render without
// the database. The pipeline (Supabase-backed) still handles everything
// requested through /request; these are the seed shelf so the site is never
// empty. Keyed by slug.
const LOCAL: Record<string, LearnorContent> = {
  'databricks-end-to-end': databricks,
};

const PUBLISHED_AT = '2026-01-01T00:00:00.000Z';

export function getLocalCourse(slug: string): LearnorCourse | null {
  const content = LOCAL[slug];
  if (!content) return null;
  return {
    slug,
    title: content.title,
    category: content.category,
    subject: content.subject,
    level: content.level,
    published: true,
    publishedAt: PUBLISHED_AT,
    content,
  };
}

export function localShelfCourses(): ShelfCourse[] {
  return Object.entries(LOCAL).map(([slug, content]) => ({
    slug,
    title: content.title,
    category: content.category,
    subject: content.subject,
    level: content.level,
    publishedAt: PUBLISHED_AT,
    summary: content.summary,
    stats: {
      sections: content.sections.length,
      quiz: content.quiz.length,
      exercises: content.exercises.length,
    },
  }));
}
