export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const envBase = import.meta.env.VITE_API_URL?.trim();
  if (envBase) return `${envBase.replace(/\/$/, '')}${normalizedPath}`;
  if (typeof window === 'undefined') return normalizedPath;

  const { origin } = window.location;
  return `${origin}${normalizedPath}`;
}

function apiCandidates(path: string): string[] {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const envBase = import.meta.env.VITE_API_URL?.trim();
  if (envBase) return [`${envBase.replace(/\/$/, '')}${normalizedPath}`];
  if (typeof window === 'undefined') return [normalizedPath];

  const { origin, hostname, protocol, port } = window.location;
  const hostVariants = new Set<string>([hostname]);

  if (hostname === 'localhost') hostVariants.add('127.0.0.1');
  if (hostname === '127.0.0.1') hostVariants.add('localhost');

  const candidates = [`${origin}${normalizedPath}`];

  if (port !== '3001') {
    for (const host of hostVariants) {
      candidates.push(`${protocol}//${host}:3001${normalizedPath}`);
    }
  }

  return [...new Set(candidates)];
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;

  for (const candidate of apiCandidates(path)) {
    try {
      const res = await fetch(candidate, init);
      const text = await res.text();

      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`API returned invalid JSON (${res.status})`);
        }
      }

      if (!res.ok) {
        const message =
          typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Request failed (${res.status})`;
        throw new Error(message);
      }

      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Request failed');
    }
  }

  throw lastError ?? new Error('Request failed');
}
