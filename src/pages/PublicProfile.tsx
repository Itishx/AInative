import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { HC, HCDark } from '../theme';
import { useTheme } from '../lib/theme';
import { AppNav } from '../components/Chrome';

interface ProfileData {
  username: string;
  displayName: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  plan: string;
  totalCourses: number;
  finishedCourses: number;
  quizAttempts: number;
  finishedTitles: { subject: string; certId?: string }[];
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const theme = dark ? HCDark : HC;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const bg = dark ? '#050505' : '#f4f0e8';
  const ink = dark ? '#f6f0e7' : '#1a1510';
  const mute = dark ? 'rgba(246,240,231,0.52)' : 'rgba(26,21,16,0.52)';
  const faint = dark ? 'rgba(246,240,231,0.12)' : 'rgba(26,21,16,0.12)';
  const green = dark ? '#72c089' : '#2d6a3f';
  const red = dark ? '#ff5148' : '#c4221b';

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setError('');
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(res => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Learner not found.' : 'Failed to load profile.');
        return res.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [username]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const mono: React.CSSProperties = { fontFamily: HC.mono };
  const serif: React.CSSProperties = { fontFamily: HC.serif };

  return (
    <main style={{ minHeight: '100vh', background: bg, color: ink, fontFamily: HC.sans }}>
      <AppNav />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '100px clamp(20px, 4vw, 48px) 96px' }}>

        {loading && (
          <div style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: mute, paddingTop: 60 }}>
            Loading…
          </div>
        )}

        {error && !loading && (
          <div style={{ paddingTop: 60 }}>
            <div style={{ ...mono, fontSize: 13, color: red, marginBottom: 20 }}>{error}</div>
            <button
              onClick={() => navigate('/learners')}
              style={{ ...mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: ink, background: 'none', border: `1px solid ${faint}`, padding: '11px 20px', cursor: 'pointer' }}
            >
              ← Browse learners
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Identity */}
            <div style={{ paddingBottom: 40, borderBottom: `1px solid ${faint}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  border: `1px solid ${faint}`, background: ink, color: bg,
                  overflow: 'hidden', display: 'grid', placeItems: 'center',
                  ...serif, fontSize: 32, letterSpacing: '-0.06em', flexShrink: 0,
                }}>
                  {data.avatarUrl
                    ? <img src={data.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : data.displayName[0]?.toUpperCase() ?? 'L'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                    <h1 style={{ margin: '0 0 6px', ...serif, fontWeight: 400, fontSize: 'clamp(32px, 5vw, 60px)', lineHeight: 0.9, letterSpacing: '-0.055em', color: ink }}>
                      {data.displayName}
                    </h1>
                    {data.plan === 'premium' && (
                      <span style={{ ...mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: red, border: `1px solid ${red}20`, background: `${red}10`, padding: '3px 8px', borderRadius: 999 }}>
                        Premium
                      </span>
                    )}
                  </div>
                  <div style={{ ...mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: mute, marginBottom: 10 }}>
                    @{data.username}
                  </div>
                  {data.headline && (
                    <div style={{ ...serif, fontSize: 17, color: ink, lineHeight: 1.35, marginBottom: 8 }}>
                      {data.headline}
                    </div>
                  )}
                  {data.bio && (
                    <p style={{ margin: '0 0 14px', fontFamily: HC.sans, fontSize: 14, lineHeight: 1.65, color: mute, maxWidth: 520 }}>
                      {data.bio}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link
                  to="/learners"
                  style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: mute, textDecoration: 'none', border: `1px solid ${faint}`, padding: '9px 16px' }}
                >
                  ← All learners
                </Link>
                <button
                  onClick={copyLink}
                  style={{ ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: copied ? green : mute, background: 'none', border: `1px solid ${faint}`, padding: '9px 16px', cursor: 'pointer' }}
                >
                  {copied ? 'Copied ✓' : 'Share profile'}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${faint}` }}>
              {[
                { label: 'Courses', value: data.totalCourses, color: ink },
                { label: 'Finished', value: data.finishedCourses, color: green },
                { label: 'Quiz attempts', value: data.quizAttempts, color: ink },
              ].map((stat, i) => (
                <div key={stat.label} style={{ flex: 1, padding: '24px 0', paddingRight: 24, borderRight: i < 2 ? `1px solid ${faint}` : 'none', marginRight: i < 2 ? 24 : 0 }}>
                  <div style={{ ...serif, fontSize: 'clamp(28px, 4vw, 52px)', lineHeight: 0.9, letterSpacing: '-0.04em', color: stat.color }}>
                    {stat.value}
                  </div>
                  <div style={{ marginTop: 8, ...mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: mute }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Finished courses */}
            {data.finishedTitles.length > 0 && (
              <div style={{ marginTop: 44 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: `2px solid ${ink}`, paddingBottom: 10, marginBottom: 0 }}>
                  <span style={{ ...mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ink }}>Finished</span>
                  <span style={{ ...mono, fontSize: 9, color: mute }}>{data.finishedTitles.length}</span>
                </div>
                <div>
                  {data.finishedTitles.map((c, i, arr) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 0', borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{ ...mono, fontSize: 9, color: green, flexShrink: 0 }}>✓</span>
                        <span style={{ ...serif, fontSize: 19, color: ink, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.subject}
                        </span>
                      </div>
                      {c.certId && (
                        <Link
                          to={`/certificate/${c.certId}`}
                          style={{ flexShrink: 0, ...mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: green, textDecoration: 'none', border: `1px solid ${green}`, borderRadius: 999, padding: '6px 12px' }}
                        >
                          Cert →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.finishedTitles.length === 0 && (
              <div style={{ marginTop: 44, ...serif, fontStyle: 'italic', fontSize: 18, color: mute }}>
                No finished courses yet — still learning.
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
