import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../lib/theme';
import { approveRequest, fetchReviewQueue, requestChanges, ReviewRequest } from '../lib/learnor';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS = '"Inter", -apple-system, system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const A = {
  bg: 'var(--a-bg)',
  paper: 'var(--a-paper)',
  ink: 'var(--a-ink)',
  mute: 'var(--a-mute)',
  faint: 'var(--a-faint)',
  softer: 'var(--a-softer)',
  red: 'var(--a-red)',
  amber: 'var(--a-amber)',
  green: 'var(--a-green)',
};

const TOKEN_KEY = 'learnor-admin-token';

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--a-mute)',
  building: 'var(--a-amber)',
  pending_review: 'var(--a-red)',
  changes_requested: 'var(--a-amber)',
  approved: 'var(--a-green)',
  published: 'var(--a-green)',
  failed: 'var(--a-red)',
  needs_clarification: 'var(--a-amber)',
};

export default function AdminReview() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '');
  const [tokenInput, setTokenInput] = useState('');
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [openPreview, setOpenPreview] = useState<string | null>(null);

  const vars = useMemo(() => ({
    '--a-bg': dark ? '#050505' : '#f4f0e8',
    '--a-paper': dark ? '#1c1a16' : '#faf7f0',
    '--a-ink': dark ? '#f6f0e7' : '#1a1510',
    '--a-mute': dark ? 'rgba(246,240,231,0.50)' : 'rgba(26,21,16,0.52)',
    '--a-faint': dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--a-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--a-red': dark ? '#ff5148' : '#c4221b',
    '--a-amber': dark ? '#d99b45' : '#b87822',
    '--a-green': dark ? '#72c089' : '#2d6a3f',
  }) as React.CSSProperties, [dark]);

  async function load(activeToken: string) {
    setLoading(true);
    setError('');
    try {
      const result = await fetchReviewQueue(activeToken);
      setRequests(result.requests);
    } catch (err) {
      setError((err as Error).message);
      if (/unauthorized/i.test((err as Error).message)) {
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(token); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, action: 'approve' | 'changes') {
    setActing(id);
    setError('');
    try {
      if (action === 'approve') await approveRequest(token, id);
      else await requestChanges(token, id, notes[id] ?? '');
      await load(token);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(null);
    }
  }

  const inReview = requests.filter((r) => r.status === 'pending_review');
  const attention = requests.filter((r) => ['failed', 'needs_clarification'].includes(r.status));
  const inFlight = requests.filter((r) => ['pending', 'building', 'changes_requested'].includes(r.status));
  const shipped = requests.filter((r) => ['approved', 'published'].includes(r.status));

  const pill = (label: string, color: string) => (
    <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color, border: `1px solid ${A.faint}`, borderRadius: 999, padding: '4px 10px' }}>
      {label}
    </span>
  );

  if (!token) {
    return (
      <main style={{ minHeight: '100vh', background: A.bg, color: A.ink, display: 'grid', placeItems: 'center', fontFamily: SANS, ...vars }}>
        <form
          onSubmit={(e) => { e.preventDefault(); localStorage.setItem(TOKEN_KEY, tokenInput.trim()); setToken(tokenInput.trim()); }}
          style={{ width: 'min(400px, 90vw)', border: `1px solid ${A.faint}`, borderRadius: 20, padding: '30px 28px', background: A.paper }}
        >
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: A.red, marginBottom: 10 }}>
            Learnor review
          </div>
          <h1 style={{ margin: '0 0 18px', fontFamily: SERIF, fontWeight: 400, fontSize: 32, letterSpacing: '-0.03em' }}>
            Itish only.
          </h1>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token (LEARNOR_ADMIN_TOKEN)"
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box', border: `1px solid ${A.faint}`, borderRadius: 10, background: 'transparent', color: A.ink, padding: '12px 14px', fontFamily: MONO, fontSize: 13, outline: 'none', marginBottom: 12 }}
          />
          <button type="submit" style={{ width: '100%', background: A.ink, color: A.bg, border: 'none', borderRadius: 10, padding: '13px 0', fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Open review queue →
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: A.bg, color: A.ink, fontFamily: SANS, ...vars }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px clamp(20px, 4vw, 48px) 96px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 40 }}>
          <button onClick={() => navigate('/dashboard')} style={{ border: `1px solid ${A.faint}`, borderRadius: 999, background: 'transparent', color: A.ink, cursor: 'pointer', padding: '10px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
            ← Dashboard
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => load(token)} style={{ border: `1px solid ${A.faint}`, borderRadius: 999, background: 'transparent', color: A.mute, cursor: 'pointer', padding: '10px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
              {loading ? 'Refreshing…' : 'Refresh ↻'}
            </button>
            <button onClick={() => { localStorage.removeItem(TOKEN_KEY); setToken(''); }} style={{ border: `1px solid ${A.faint}`, borderRadius: 999, background: 'transparent', color: A.mute, cursor: 'pointer', padding: '10px 16px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase' }}>
              Lock
            </button>
          </div>
        </div>

        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: A.red }}>
          Approval gate
        </div>
        <h1 style={{ margin: '12px 0 0', fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(40px, 5.5vw, 68px)', lineHeight: 0.92, letterSpacing: '-0.05em' }}>
          Review queue.
        </h1>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', margin: '20px 0 44px', fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.11em', textTransform: 'uppercase', color: A.mute }}>
          <span><b style={{ color: A.red }}>{inReview.length}</b> awaiting review</span>
          <span><b style={{ color: A.amber }}>{inFlight.length}</b> in the pipeline</span>
          <span><b style={{ color: A.amber }}>{attention.length}</b> need attention</span>
          <span><b style={{ color: A.green }}>{shipped.length}</b> shipped</span>
        </div>

        {error && <div style={{ color: A.red, fontSize: 13.5, marginBottom: 20 }}>{error}</div>}

        {/* Pending review — the main event */}
        {inReview.length === 0 && !loading && (
          <div style={{ border: `1px solid ${A.faint}`, borderRadius: 20, padding: '30px 28px', background: A.paper, marginBottom: 40 }}>
            <div style={{ fontFamily: SERIF, fontSize: 26, letterSpacing: '-0.03em', fontStyle: 'italic', color: A.mute }}>
              Nothing waiting on you. The shelf stocks itself — check back after the next worker pass.
            </div>
          </div>
        )}

        {inReview.map((request) => (
          <article key={request.id} style={{ border: `1px solid ${A.faint}`, borderRadius: 20, padding: '26px 26px 22px', background: A.paper, marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 30, letterSpacing: '-0.03em' }}>{request.topic}</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                {pill(request.built_by === 'itish' ? 'catalog' : 'requested', A.mute)}
                {pill(request.level || 'level ?', A.mute)}
                {pill('pending review', A.red)}
              </div>
            </div>
            <div style={{ margin: '10px 0 16px', fontSize: 13.5, lineHeight: 1.65, color: A.mute }}>
              <b style={{ color: A.ink }}>They wanted:</b> {request.expectations || '(see brief in DB)'}<br />
              <b style={{ color: A.ink }}>From:</b> {request.requester_email}
              {request.review_notes ? <><br /><b style={{ color: A.ink }}>Your last notes:</b> {request.review_notes}</> : null}
            </div>

            {request.preview_url && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <a href={request.preview_url} target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: A.ink, border: `1px solid ${A.faint}`, borderRadius: 999, padding: '9px 16px', textDecoration: 'none' }}>
                    Open preview ↗
                  </a>
                  <button onClick={() => setOpenPreview(openPreview === request.id ? null : request.id)} style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.13em', textTransform: 'uppercase', color: A.mute, border: `1px solid ${A.faint}`, borderRadius: 999, padding: '9px 16px', background: 'none', cursor: 'pointer' }}>
                    {openPreview === request.id ? 'Hide embed' : 'Embed here'}
                  </button>
                </div>
                {openPreview === request.id && (
                  <iframe
                    src={request.preview_url}
                    title={`Preview: ${request.topic}`}
                    style={{ width: '100%', height: 560, marginTop: 14, border: `1px solid ${A.faint}`, borderRadius: 14, background: A.bg }}
                  />
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch', borderTop: `1px solid ${A.faint}`, paddingTop: 16 }}>
              <button
                onClick={() => act(request.id, 'approve')}
                disabled={acting === request.id}
                style={{ background: A.ink, color: A.bg, border: 'none', borderRadius: 10, padding: '13px 22px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', opacity: acting === request.id ? 0.5 : 1 }}
              >
                {acting === request.id ? 'Working…' : 'Approve & publish ✓'}
              </button>
              <input
                value={notes[request.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [request.id]: e.target.value }))}
                placeholder="What should change?"
                style={{ flex: '1 1 220px', border: `1px solid ${A.faint}`, borderRadius: 10, background: 'transparent', color: A.ink, padding: '12px 14px', fontFamily: SANS, fontSize: 13.5, outline: 'none' }}
              />
              <button
                onClick={() => act(request.id, 'changes')}
                disabled={acting === request.id || !(notes[request.id] ?? '').trim()}
                style={{ background: 'none', color: A.ink, border: `1px solid ${A.ink}`, borderRadius: 10, padding: '13px 22px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer', opacity: acting === request.id || !(notes[request.id] ?? '').trim() ? 0.5 : 1 }}
              >
                Request changes ↩
              </button>
            </div>
          </article>
        ))}

        {/* Needs attention */}
        {attention.length > 0 && (
          <section style={{ marginTop: 44 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: A.amber, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${A.faint}` }}>
              Needs attention
            </div>
            {attention.map((request) => (
              <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', padding: '12px 2px', borderBottom: `1px solid ${A.faint}` }}>
                <span style={{ fontFamily: SERIF, fontSize: 19, letterSpacing: '-0.02em' }}>{request.topic}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: STATUS_COLOR[request.status] || A.mute }}>
                  {request.status.replace(/_/g, ' ')}{request.error ? ` — ${request.error.slice(0, 90)}` : ''}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Pipeline + shipped, compact */}
        {[{ label: 'In the pipeline', rows: inFlight }, { label: 'Shipped', rows: shipped }].map(({ label, rows }) => rows.length > 0 && (
          <section key={label} style={{ marginTop: 44 }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: A.mute, marginBottom: 14, paddingBottom: 10, borderBottom: `1px solid ${A.faint}` }}>
              {label}
            </div>
            {rows.map((request) => (
              <div key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'baseline', padding: '10px 2px', borderBottom: `1px solid ${A.faint}` }}>
                <span style={{ fontFamily: SERIF, fontSize: 18, letterSpacing: '-0.02em' }}>
                  {request.slug && ['approved', 'published'].includes(request.status)
                    ? <a href={`/course/${request.slug}`} style={{ color: A.ink }}>{request.topic}</a>
                    : request.topic}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: STATUS_COLOR[request.status] || A.mute }}>
                  {request.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
