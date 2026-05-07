import type { UserProfile } from '../types';

export type OnboardingOption = {
  id: string;
  label: string;
  description: string;
};

export const ROLE_OPTIONS: OnboardingOption[] = [
  { id: 'student', label: 'Student', description: 'You are studying, preparing for exams, or building career foundations.' },
  { id: 'software-engineer', label: 'Software engineer', description: 'You build software and want sharper technical leverage.' },
  { id: 'data-analyst', label: 'Data analyst', description: 'You work with numbers, dashboards, SQL, or business reporting.' },
  { id: 'designer', label: 'Designer', description: 'You care about product thinking, systems, visuals, and UX craft.' },
  { id: 'founder', label: 'Founder', description: 'You are building a company, shipping fast, and wearing many hats.' },
  { id: 'marketer', label: 'Marketer', description: 'You work on growth, campaigns, storytelling, or acquisition.' },
  { id: 'product-manager', label: 'Product manager', description: 'You shape product direction, priorities, research, and execution.' },
  { id: 'operator', label: 'Operator', description: 'You run teams, systems, processes, or business operations.' },
  { id: 'educator', label: 'Educator', description: 'You teach, explain, or design learning experiences for others.' },
  { id: 'career-switcher', label: 'Career switcher', description: 'You are moving into a new field and need practical ramp-up.' },
];

export const OCCUPATION_SUGGESTIONS = [
  'Computer science student',
  'Frontend engineer',
  'Backend engineer',
  'Data analyst',
  'Product manager',
  'Founder',
  'Growth marketer',
  'UX designer',
  'Teacher',
  'Consultant',
];

export const LEARNING_GOAL_OPTIONS: OnboardingOption[] = [
  { id: 'sql', label: 'SQL and data', description: 'Queries, analytics, reporting, data modeling, and dashboards.' },
  { id: 'python', label: 'Python', description: 'Automation, scripting, APIs, problem solving, and core programming.' },
  { id: 'javascript', label: 'JavaScript', description: 'Frontend, Node, browser logic, and application building.' },
  { id: 'react', label: 'React', description: 'Components, state, UI systems, and production-ready frontend work.' },
  { id: 'ai', label: 'AI and LLMs', description: 'Prompting, agents, APIs, evals, and AI product building.' },
  { id: 'system-design', label: 'System design', description: 'Architecture, scale, tradeoffs, and backend thinking.' },
  { id: 'product-sense', label: 'Product sense', description: 'Roadmaps, prioritization, user problems, and product strategy.' },
  { id: 'design', label: 'Design and UX', description: 'Interaction design, visual systems, research, and usability.' },
  { id: 'marketing', label: 'Marketing and growth', description: 'Positioning, funnels, campaigns, and customer acquisition.' },
  { id: 'interview-prep', label: 'Interview prep', description: 'Role-specific prep, fundamentals, and practical drills.' },
];

type RecommendationSeed = {
  title: string;
  reason: string;
};

const ROLE_RECOMMENDATIONS: Record<string, RecommendationSeed[]> = {
  student: [
    { title: 'SQL fundamentals for internship work', reason: 'A fast way to become useful on real data-heavy projects.' },
    { title: 'Python for assignments and automation', reason: 'Build practical coding confidence with scripts that save time.' },
    { title: 'System design basics for beginners', reason: 'A gentle introduction before full interview-level depth.' },
    { title: 'How APIs work from scratch', reason: 'Understand the web stack every modern product relies on.' },
    { title: 'Excel to SQL for business analysis', reason: 'A strong bridge from classroom spreadsheets to real analytics.' },
    { title: 'LLM app foundations', reason: 'Learn one of the fastest-moving skill stacks with practical scope.' },
  ],
  'software-engineer': [
    { title: 'Advanced React patterns for production apps', reason: 'Useful when components, state, and UX complexity scale up.' },
    { title: 'Build AI apps with structured outputs', reason: 'Practical AI implementation without hand-wavy demos.' },
    { title: 'System design for web products', reason: 'Good leverage for architecture thinking and interviews.' },
    { title: 'SQL for backend engineers', reason: 'Better data instincts make every product feature sharper.' },
    { title: 'Debugging Node and API failures', reason: 'A practical skill that pays off immediately at work.' },
    { title: 'Docker and deployment fundamentals', reason: 'A faster path from local project to real environment.' },
  ],
  'data-analyst': [
    { title: 'SQL joins, aggregations, and reporting', reason: 'The foundation of real analytics work.' },
    { title: 'Python for data cleaning', reason: 'Useful when spreadsheets stop scaling.' },
    { title: 'Statistics intuition for product teams', reason: 'Explain the numbers, not just compute them.' },
    { title: 'Dashboard design that tells a story', reason: 'Stronger communication makes analysis more valuable.' },
    { title: 'A/B testing basics', reason: 'A core skill for product and growth decisions.' },
    { title: 'Data modeling for analytics', reason: 'Cleaner tables lead to better answers and fewer mistakes.' },
  ],
  designer: [
    { title: 'Design systems from scratch', reason: 'Useful if you want stronger consistency and scale.' },
    { title: 'Product thinking for designers', reason: 'Helps connect interface choices to outcomes.' },
    { title: 'Frontend basics for product designers', reason: 'Makes handoff, constraints, and collaboration easier.' },
    { title: 'UX research synthesis', reason: 'Turn messy input into better decisions.' },
    { title: 'Accessibility for digital products', reason: 'High-leverage craft that improves every interface.' },
    { title: 'Microcopy and product writing', reason: 'Great for designers who want cleaner product language.' },
  ],
  founder: [
    { title: 'Product analytics for founders', reason: 'Know what is actually happening in your product.' },
    { title: 'AI workflow automation for lean teams', reason: 'High leverage when headcount is small.' },
    { title: 'Go-to-market fundamentals', reason: 'Useful when traction feels fuzzy or stalled.' },
    { title: 'SQL for startup operators', reason: 'Query your own business without waiting on a team.' },
    { title: 'Pricing strategy basics', reason: 'A critical skill with outsized impact on survival.' },
    { title: 'Customer interview mastery', reason: 'Sharper signal leads to better product bets.' },
  ],
  marketer: [
    { title: 'Performance marketing analytics', reason: 'Tie spend to outcomes with more confidence.' },
    { title: 'SQL for growth teams', reason: 'Pull answers directly instead of waiting on dashboards.' },
    { title: 'Positioning and messaging', reason: 'Great for cleaner campaigns and stronger product stories.' },
    { title: 'Lifecycle and retention fundamentals', reason: 'Growth is not just acquisition.' },
    { title: 'Marketing experiments and measurement', reason: 'A practical framework for better decisions.' },
    { title: 'AI tools for content workflows', reason: 'Useful for faster drafts and repeatable systems.' },
  ],
  'product-manager': [
    { title: 'SQL for product managers', reason: 'Better questions, faster answers, stronger decisions.' },
    { title: 'Product sense and metrics', reason: 'Great for prioritization and story clarity.' },
    { title: 'Experimentation for product teams', reason: 'A practical path to evidence-driven decisions.' },
    { title: 'Technical fluency for PMs', reason: 'Speak more clearly with engineers without pretending to be one.' },
    { title: 'Roadmapping and prioritization', reason: 'Useful when everything feels equally urgent.' },
    { title: 'AI product fundamentals', reason: 'Important if you are shaping modern product bets.' },
  ],
  operator: [
    { title: 'Spreadsheets to automation', reason: 'A practical way to remove recurring manual work.' },
    { title: 'SQL for business operations', reason: 'Pull reliable numbers without bottlenecks.' },
    { title: 'Process design for scaling teams', reason: 'Useful when workflows get messy as the org grows.' },
    { title: 'Metrics and reporting systems', reason: 'Create operating rhythm instead of reactive guessing.' },
    { title: 'AI for ops workflows', reason: 'Good leverage for documentation, triage, and repetitive tasks.' },
    { title: 'Financial modeling basics', reason: 'Useful when decisions need clearer business framing.' },
  ],
  educator: [
    { title: 'Curriculum design for modern learners', reason: 'Make learning paths more intentional and memorable.' },
    { title: 'AI tools for teaching', reason: 'Use AI to reinforce instruction without losing clarity.' },
    { title: 'Assessment design that actually measures learning', reason: 'Improve the signal you get from student work.' },
    { title: 'Presentation and explanation craft', reason: 'Sharpen how you break concepts down.' },
    { title: 'Research synthesis for teaching materials', reason: 'Turn source chaos into clean teaching assets.' },
    { title: 'Learning design with interactive practice', reason: 'Useful when passive content is not enough.' },
  ],
  'career-switcher': [
    { title: 'Break into product with practical fundamentals', reason: 'A structured ramp instead of scattered advice.' },
    { title: 'SQL for a first analytics role', reason: 'One of the most reusable career-switch skills.' },
    { title: 'Frontend basics for non-engineers', reason: 'A practical bridge into product and tech work.' },
    { title: 'Interview prep for tech-adjacent roles', reason: 'Build confidence around the exact skill shifts that matter.' },
    { title: 'AI fluency for career transitions', reason: 'Useful across many modern roles, not just engineering.' },
    { title: 'Business thinking for digital roles', reason: 'Helps connect new skills to actual business value.' },
  ],
};

const GOAL_RECOMMENDATION_OVERRIDES: Record<string, RecommendationSeed[]> = {
  sql: [
    { title: 'SQL joins from first principles', reason: 'A core topic that unlocks real query fluency.' },
    { title: 'SQL for dashboards and reporting', reason: 'Great if you want answers that map to business questions.' },
  ],
  python: [
    { title: 'Python scripting for real tasks', reason: 'A practical way to stop learning in toy examples.' },
    { title: 'Python APIs and JSON handling', reason: 'Useful for modern automation and app work.' },
  ],
  javascript: [
    { title: 'JavaScript for product builders', reason: 'Great for moving from syntax to shipping.' },
    { title: 'Modern async JavaScript', reason: 'Useful once basics click and real-world behavior matters.' },
  ],
  react: [
    { title: 'React state, props, and effects', reason: 'A reliable foundation before larger app patterns.' },
    { title: 'Build a polished React app', reason: 'Useful when you want something project-shaped, not just snippets.' },
  ],
  ai: [
    { title: 'Build with the OpenAI API', reason: 'A practical path into real AI product work.' },
    { title: 'Prompting, evals, and structured outputs', reason: 'Useful once basic chat demos stop being enough.' },
  ],
  'system-design': [
    { title: 'System design fundamentals', reason: 'Tradeoffs, components, and scaling without drowning in jargon.' },
    { title: 'Design a backend service', reason: 'A practical architecture exercise with real constraints.' },
  ],
  'product-sense': [
    { title: 'Product metrics that actually matter', reason: 'A better way to think about progress and risk.' },
    { title: 'Product strategy from user problems', reason: 'Useful when roadmaps feel detached from reality.' },
  ],
  design: [
    { title: 'Interaction design for product teams', reason: 'Useful when you want sharper decision-making in the UI.' },
    { title: 'Design systems and component thinking', reason: 'A strong next step once visual craft is in place.' },
  ],
  marketing: [
    { title: 'Growth loops and acquisition channels', reason: 'Great for understanding repeatable growth mechanics.' },
    { title: 'Marketing analytics fundamentals', reason: 'Useful for measuring what actually works.' },
  ],
  'interview-prep': [
    { title: 'Technical interview prep crash course', reason: 'Focused practice around the concepts interviewers actually test.' },
    { title: 'Behavioral stories with strong signal', reason: 'Useful when your experience is stronger than your storytelling.' },
  ],
};

function titleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
}

export function labelForOption(options: OnboardingOption[], id?: string) {
  return options.find((option) => option.id === id)?.label ?? '';
}

export function buildBrowseRecommendations(profile?: UserProfile): RecommendationSeed[] {
  const role = profile?.bestDescribesYou || '';
  const goals = Array.isArray(profile?.learningGoals) ? profile!.learningGoals! : [];
  const occupation = (profile?.occupation || '').trim();

  const suggestions: RecommendationSeed[] = [];
  const seen = new Set<string>();

  const pushUnique = (items: RecommendationSeed[]) => {
    items.forEach((item) => {
      if (seen.has(item.title)) return;
      seen.add(item.title);
      suggestions.push(item);
    });
  };

  goals.slice(0, 3).forEach((goal) => {
    pushUnique(GOAL_RECOMMENDATION_OVERRIDES[goal] ?? []);
  });

  pushUnique(ROLE_RECOMMENDATIONS[role] ?? []);

  if (occupation) {
    pushUnique([
      {
        title: `Core skills for ${occupation}`,
        reason: 'A practical starting point shaped around the work you already do.',
      },
      {
        title: `${occupation} workflows with AI`,
        reason: 'Useful if you want leverage, not just theory.',
      },
    ]);
  }

  if (!suggestions.length) {
    pushUnique([
      { title: 'SQL for real-world analysis', reason: 'A versatile skill that transfers across many roles.' },
      { title: 'Python for automation', reason: 'A good first practical programming track.' },
      { title: 'AI and LLM fundamentals', reason: 'Helpful if you want to understand the current tool shift.' },
      { title: 'System design basics', reason: 'A strong foundation for technical product thinking.' },
      { title: 'Product thinking and metrics', reason: 'Useful beyond product roles too.' },
      { title: 'React from scratch', reason: 'A clean frontend path when you want to build something visible.' },
    ]);
  }

  return suggestions.slice(0, 8);
}

export function buildOnboardingHeadline(profile?: UserProfile) {
  const roleLabel = labelForOption(ROLE_OPTIONS, profile?.bestDescribesYou);
  const firstGoal = labelForOption(LEARNING_GOAL_OPTIONS, profile?.learningGoals?.[0]);
  if (roleLabel && firstGoal) return `${roleLabel} · focused on ${firstGoal}`;
  if (roleLabel) return roleLabel;
  if (firstGoal) return firstGoal;
  return '';
}

export function buildGenericLearningSuggestions() {
  return LEARNING_GOAL_OPTIONS.map((option) => ({
    title: `${option.label} fundamentals`,
    reason: option.description,
  }));
}

export function buildLearningGoalSummary(ids: string[]) {
  return ids.map((id) => labelForOption(LEARNING_GOAL_OPTIONS, id) || titleCase(id));
}
