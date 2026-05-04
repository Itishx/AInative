import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HC, HCDark } from '../theme';
import { useTheme } from '../lib/theme';
import { AppNav } from '../components/Chrome';

interface LearnerCard {
  username: string;
  displayName: string;
  headline: string;
  avatarUrl: string;
  plan: string;
}

export default function Learners() {
  const { dark } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LearnerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const bg = dark ? '#050505' : '#f4f0e8';
  const ink = dark ? '#f6f0e7' : '#1a1510';
  const mute = dark ? 'rgba(246,240,231,0.52)' : 'rgba(26,21,16,0.52)';
  const faint = dark ? 'rgba(246,240,231,0.12)' : 'rgba(26,21,16,0.12)';
  const red = dark ? '#ff5148' : '#c4221b';
  const green = dark ? '#72c089' : '#2d6a3f';
  const paper = dark ? '#1c1a16' : '#faf7f0';

  function doSearch(q: string) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-learners?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 280);
  }

  useEffect(() => { doSearch(''); }, []);

  return (
    <main style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: HC.sans }}>
      <AppNav />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '100px clamp(20px, 4vw, 48px) 96px' }}>

        {/* Header */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: red, marginBottom: 14 }}>
            Community
          </div>
          <h1 style={{ fontFamily: HC.serif, fontSize: 'clamp(44px, 7vw, 96px)', fontWeight: 400, letterSpacing: '-0.04em', color: ink, lineHeight: 0.9, margin: '0 0 28px' }}>
            Find who's<br /><i>learning.</i>
          </h1>
          <input
            type="text"
            placeholder="Search by username…"
            value={query}
            onChange={e => { setQuery(e.target.value); doSearch(e.target.value); }}
            autoFocus
            style={{
              width: '100%', maxWidth: 420,
              padding: '14px 18px',
              border: `1px solid ${faint}`,
              background: 'transparent',
              color: ink,
              fontFamily: HC.mono,
              fontSize: 13,
              letterSpacing: '0.04em',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status line */}
        {loading && (
          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: mute, marginBottom: 24 }}>
            {query ? 'Searching…' : 'Loading…'}
          </div>
        )}

        {!loading && results.length === 0 && (
          <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20, color: mute }}>
            {query ? `No learners found for "${query}"` : 'No learners yet.'}
          </div>
        )}

        {/* Grid */}
        {!loading && results.length > 0 && (
          <>
            {!query && (
              <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: mute, marginBottom: 16 }}>
                Recent · {results.length} learners
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 0, border: `1px solid ${faint}` }}>
              {results.map((l, idx) => (
                <Link
                  key={l.username}
                  to={`/profile/${l.username}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    padding: '22px 20px',
                    background: bg,
                    textDecoration: 'none',
                    borderRight: `1px solid ${faint}`,
                    borderBottom: `1px solid ${faint}`,
                    transition: 'background 100ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = paper)}
                  onMouseLeave={e => (e.currentTarget.style.background = bg)}
                >
                  {/* Avatar + name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      border: `1px solid ${faint}`,
                      background: ink, color: bg,
                      display: 'grid', placeItems: 'center',
                      fontFamily: HC.serif, fontSize: 17, letterSpacing: '-0.04em',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      {l.avatarUrl
                        ? <img src={l.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : (l.displayName[0]?.toUpperCase() ?? 'L')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: HC.serif, fontSize: 16, letterSpacing: '-0.02em', color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.displayName}
                      </div>
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: mute }}>
                        @{l.username}
                      </div>
                    </div>
                  </div>

                  {/* Headline */}
                  {l.headline && (
                    <div style={{
                      fontFamily: HC.sans, fontSize: 12, lineHeight: 1.5, color: mute,
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                    }}>
                      {l.headline}
                    </div>
                  )}

                  {/* Plan badge */}
                  {l.plan === 'premium' && (
                    <span style={{ alignSelf: 'flex-start', fontFamily: HC.mono, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: red, border: `1px solid ${red}20`, background: `${red}10`, padding: '2px 7px', borderRadius: 999 }}>
                      Premium
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
