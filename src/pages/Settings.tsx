import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { supabase } from '../lib/supabase';

type SettingsTab = 'profile' | 'billing';

const SERIF = '"Instrument Serif", "EB Garamond", Georgia, serif';
const SANS  = '"Inter", -apple-system, system-ui, sans-serif';
const MONO  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

const S = {
  bg:     'var(--s-bg)',
  paper:  'var(--s-paper)',
  ink:    'var(--s-ink)',
  mute:   'var(--s-mute)',
  faint:  'var(--s-faint)',
  softer: 'var(--s-softer)',
  red:    'var(--s-red)',
  amber:  'var(--s-amber)',
  green:  'var(--s-green)',
};

export default function Settings() {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();
  const { dark } = useTheme();

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState(state.username ?? '');
  const [displayName, setDisplayName] = useState(state.profile?.displayName ?? '');
  const [headline, setHeadline] = useState(state.profile?.headline ?? '');
  const [bio, setBio] = useState(state.profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(state.profile?.avatarUrl ?? '');
  const [avatarError, setAvatarError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  const profileLabel = displayName.trim() || username.trim() || user?.email?.split('@')[0] || 'me';

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return reject(new Error('Could not read that image.'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Could not process that image.'));
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = () => reject(new Error('Could not load that image.'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read that image.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarUpload(file?: File) {
    setAvatarError('');
    if (!file) return;
    if (!file.type.startsWith('image/')) return setAvatarError('Please upload an image file.');
    if (file.size > 3_000_000) return setAvatarError('Image is too large. Max 3MB.');
    try {
      setAvatarUrl(await compressImage(file));
      setSaveError('');
    } catch (err) {
      setAvatarError((err as Error).message || 'Could not process that image.');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaved(false);
    setSaveError('');
    const profile = {
      displayName: displayName.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
    };
    dispatch({ type: 'SET_USERNAME', username: trimmed });
    dispatch({ type: 'SET_PROFILE', profile });

    if (user?.id) {
      const { error } = await supabase
        .from('user_courses')
        .upsert({ user_id: user.id, courses: state.courses, username: trimmed, profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

      if (error) {
        setSaving(false);
        setSaveError(error.message.includes('profile') ? 'Profile column missing in Supabase. Run the profile migration SQL.' : error.message);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  }

  const tabs: { key: SettingsTab; n: string; label: string; sub: string }[] = [
    { key: 'profile', n: '01', label: 'Profile', sub: 'Name · bio · photo' },
    { key: 'billing', n: '02', label: 'Usage & billing', sub: 'Plans · invoices · limits' },
  ];

  const vars = {
    '--s-bg':     dark ? '#050505' : '#f4f0e8',
    '--s-paper':  dark ? '#1c1a16' : '#faf7f0',
    '--s-ink':    dark ? '#f6f0e7' : '#1a1510',
    '--s-mute':   dark ? 'rgba(246,240,231,0.48)' : 'rgba(26,21,16,0.52)',
    '--s-faint':  dark ? 'rgba(246,240,231,0.10)' : 'rgba(26,21,16,0.12)',
    '--s-softer': dark ? 'rgba(246,240,231,0.05)' : 'rgba(26,21,16,0.05)',
    '--s-red':    dark ? '#ff5148' : '#c4221b',
    '--s-amber':  dark ? '#d99b45' : '#b87822',
    '--s-green':  dark ? '#72c089' : '#2d6a3f',
  } as React.CSSProperties;

  return (
    <div style={{
      minHeight: '100vh', background: S.bg, color: S.ink, fontFamily: SANS,
      display: 'grid', gridTemplateColumns: '288px minmax(0, 1fr)',
      ...vars,
    }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
        borderRight: `1px solid ${S.faint}`,
        display: 'flex', flexDirection: 'column',
        padding: '32px 0',
      }}>
        {/* Wordmark */}
        <div style={{ padding: '0 28px 28px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 400, letterSpacing: '-0.055em', color: S.ink }}>Learnor</span>
          </button>
        </div>

        {/* User identity */}
        <div style={{ padding: '20px 28px', borderTop: `1px solid ${S.faint}`, borderBottom: `1px solid ${S.faint}` }}>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <div style={{ position: 'relative', width: 52, height: 52 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', overflow: 'hidden',
                display: 'grid', placeItems: 'center',
                background: S.ink, color: S.bg,
                fontFamily: MONO, fontSize: 13, fontWeight: 800,
                border: `1px solid ${S.faint}`,
              }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : profileLabel.slice(0, 2).toUpperCase()}
              </div>
            </div>
            <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} style={{ display: 'none' }} />
          </label>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontFamily: SANS, fontSize: 14, fontWeight: 700, color: S.ink, lineHeight: 1 }}>{profileLabel}</div>
            <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.1em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email ?? 'signed in'}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0' }}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{
                  width: '100%', border: 'none', background: 'none', cursor: 'pointer',
                  padding: '14px 28px', textAlign: 'left' as const,
                  display: 'flex', alignItems: 'center', gap: 16,
                  borderLeft: `2px solid ${active ? S.red : 'transparent'}`,
                  transition: 'border-color 0.15s',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 10, color: active ? S.red : S.mute, letterSpacing: '0.1em', flexShrink: 0, lineHeight: 1 }}>
                  {item.n}
                </span>
                <span>
                  <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: active ? 700 : 400, color: active ? S.ink : S.mute, lineHeight: 1 }}>
                    {item.label}
                  </div>
                  <div style={{ marginTop: 4, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                    {item.sub}
                  </div>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ padding: '20px 28px', borderTop: `1px solid ${S.faint}` }}>
          <button
            onClick={signOut}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: S.red }}
          >
            Sign out →
          </button>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main style={{ padding: '64px clamp(32px, 6vw, 96px) 96px', maxWidth: 760 }}>
        {tab === 'profile' ? (
          <ProfileTab
            profileLabel={profileLabel}
            avatarUrl={avatarUrl}
            username={username} setUsername={setUsername}
            displayName={displayName} setDisplayName={setDisplayName}
            headline={headline} setHeadline={setHeadline}
            bio={bio} setBio={setBio}
            email={user?.email ?? ''}
            avatarError={avatarError}
            saving={saving} saved={saved} saveError={saveError}
            onAvatarUpload={handleAvatarUpload}
            onRemoveAvatar={() => setAvatarUrl('')}
            onSave={handleSave}
            onCancel={() => navigate('/dashboard')}
          />
        ) : (
          <BillingTab />
        )}
      </main>
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────
function ProfileTab({
  profileLabel, avatarUrl, username, setUsername, displayName, setDisplayName,
  headline, setHeadline, bio, setBio, email,
  avatarError, saving, saved, saveError,
  onAvatarUpload, onRemoveAvatar, onSave, onCancel,
}: {
  profileLabel: string; avatarUrl: string;
  username: string; setUsername: (v: string) => void;
  displayName: string; setDisplayName: (v: string) => void;
  headline: string; setHeadline: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  email: string;
  avatarError: string; saving: boolean; saved: boolean; saveError: string;
  onAvatarUpload: (f?: File) => void;
  onRemoveAvatar: () => void;
  onSave: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.red }}>
        01 · Settings
      </div>
      <h1 style={{ margin: '10px 0 52px', fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(48px, 7vw, 86px)', lineHeight: 0.9, letterSpacing: '-0.065em', color: S.ink }}>
        Profile.
      </h1>

      {/* Avatar row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 40, borderBottom: `1px solid ${S.faint}`, marginBottom: 40 }}>
        <label style={{ cursor: 'pointer', flexShrink: 0 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            display: 'grid', placeItems: 'center',
            background: S.ink, color: S.bg,
            fontFamily: MONO, fontSize: 20, fontWeight: 800,
            border: `1px solid ${S.faint}`,
            position: 'relative',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : profileLabel.slice(0, 2).toUpperCase()}
          </div>
          <input type="file" accept="image/*" onChange={(e) => onAvatarUpload(e.target.files?.[0])} style={{ display: 'none' }} />
        </label>
        <div>
          <div style={{ fontFamily: SANS, fontSize: 15, fontWeight: 700, color: S.ink }}>Display picture</div>
          <div style={{ marginTop: 5, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.09em', textTransform: 'uppercase' }}>
            Click to upload · auto-compressed to 320px
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ cursor: 'pointer', fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: S.ink, borderBottom: `1px solid ${S.ink}`, paddingBottom: 1 }}>
              Upload photo
              <input type="file" accept="image/*" onChange={(e) => onAvatarUpload(e.target.files?.[0])} style={{ display: 'none' }} />
            </label>
            {avatarUrl && (
              <button type="button" onClick={onRemoveAvatar} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', textTransform: 'uppercase', color: S.red }}>
                Remove
              </button>
            )}
          </div>
          {avatarError && <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 9, color: S.red, letterSpacing: '0.06em' }}>{avatarError}</div>}
        </div>
      </div>

      <form onSubmit={onSave} style={{ display: 'grid', gap: 0 }}>
        <LineField label="Username / handle">
          <input
            value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="your_handle" maxLength={32}
            style={lineInput}
          />
        </LineField>
        <LineField label="Display name">
          <input
            value={displayName} onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your public name" maxLength={48}
            style={lineInput}
          />
        </LineField>
        <LineField label="Headline">
          <input
            value={headline} onChange={(e) => setHeadline(e.target.value)}
            placeholder="What you're building or chasing right now" maxLength={72}
            style={lineInput}
          />
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.08em' }}>{headline.length}/72</div>
        </LineField>
        <LineField label="Bio">
          <textarea
            value={bio} onChange={(e) => setBio(e.target.value)}
            placeholder="What are you learning, building, or racing against?" maxLength={160} rows={3}
            style={{ ...lineInput, resize: 'vertical', lineHeight: 1.6, paddingTop: 14, paddingBottom: 14 }}
          />
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.08em' }}>{bio.length}/160</div>
        </LineField>
        <LineField label="Email">
          <div style={{ ...lineInput, color: S.mute, cursor: 'default', opacity: 0.72 }}>{email || '—'}</div>
        </LineField>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 44, paddingTop: 32, borderTop: `1px solid ${S.faint}` }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              background: saved ? S.green : S.ink, color: S.bg,
              border: 'none', padding: '14px 28px',
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.65 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes →'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: S.mute }}
          >
            Cancel
          </button>
        </div>
        {saveError && (
          <div style={{ marginTop: 14, fontFamily: MONO, fontSize: 10, color: S.red, letterSpacing: '0.06em', lineHeight: 1.6 }}>
            {saveError}
          </div>
        )}
      </form>
    </>
  );
}

const lineInput: React.CSSProperties = {
  width: '100%',
  padding: '14px 0',
  background: 'transparent',
  border: 'none',
  borderBottom: `1px solid ${S.faint}`,
  color: S.ink,
  fontFamily: SANS,
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
  lineHeight: 1.4,
};

function LineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ paddingBottom: 28 }}>
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.mute, marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  );
}

// ── Billing Tab ────────────────────────────────────────────────────────────────
const API_BASE = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3001';

const FEATURE_ROWS = [
  { label: 'Messages',         free: '25 / day',   premium: 'Unlimited' },
  { label: 'Notes',            free: '—',          premium: '✓ Saved' },
  { label: 'Import content',   free: '—',          premium: '✓ Anywhere' },
  { label: 'PDF upload',       free: '—',          premium: '✓' },
  { label: 'Courses & Quizzes',free: 'Basic',      premium: '✓ Unlimited' },
  { label: 'Voice mode',       free: '—',          premium: '✓' },
];

function BillingTab() {
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isPremium = state.profile?.plan === 'premium';

  async function handleUpgrade() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userEmail: user.email,
          successUrl: `${window.location.origin}/settings?upgraded=1`,
        }),
      });
      const { checkoutUrl, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = checkoutUrl;
    } catch (err) {
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // On mount, if ?upgraded=1 in URL, refresh plan from server
  useState(() => {
    if (!window.location.search.includes('upgraded=1') || !user?.id) return;
    fetch(`${API_BASE}/api/plan?userId=${user.id}`)
      .then(r => r.json())
      .then(({ plan }) => {
        if (plan === 'premium') dispatch({ type: 'SET_PROFILE', profile: { ...state.profile, plan: 'premium' } });
      })
      .catch(() => {});
  });

  return (
    <>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: S.red }}>
        02 · Settings
      </div>
      <h1 style={{ margin: '10px 0 52px', fontFamily: SERIF, fontWeight: 400, fontSize: 'clamp(48px, 7vw, 86px)', lineHeight: 0.9, letterSpacing: '-0.065em', color: S.ink }}>
        Billing.
      </h1>

      {/* Current plan */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.mute, marginBottom: 16 }}>Current plan</div>
        <div style={{ padding: '24px 28px', border: `1px solid ${S.ink}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 30, letterSpacing: '-0.03em', color: S.ink, lineHeight: 1 }}>
              {isPremium ? 'Premium' : 'Free'}
            </div>
            <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 10, color: S.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {isPremium ? 'Unlimited access · billed monthly' : '25 messages/day · basic features'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.green, border: `1px solid ${S.green}`, padding: '6px 14px', flexShrink: 0 }}>
              Active
            </div>
            {isPremium && (
              <a href="https://polar.sh/purchases" target="_blank" rel="noreferrer" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: S.mute, textDecoration: 'none', borderBottom: `1px solid ${S.faint}`, paddingBottom: 1 }}>
                Manage →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Feature table */}
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: S.mute, marginBottom: 16 }}>What's included</div>
      <div style={{ border: `1px solid ${S.faint}`, marginBottom: 36 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: `1px solid ${S.ink}` }}>
          {['Feature', 'Free', 'Premium'].map((h) => (
            <div key={h} style={{ padding: '10px 16px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: S.mute, borderRight: h !== 'Premium' ? `1px solid ${S.faint}` : 'none' }}>{h}</div>
          ))}
        </div>
        {FEATURE_ROWS.map((row, i) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: i < FEATURE_ROWS.length - 1 ? `1px solid ${S.faint}` : 'none' }}>
            <div style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', color: S.mute, borderRight: `1px solid ${S.faint}`, textTransform: 'uppercase' }}>{row.label}</div>
            <div style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 10, color: S.mute, borderRight: `1px solid ${S.faint}` }}>{row.free}</div>
            <div style={{ padding: '12px 16px', fontFamily: MONO, fontSize: 10, color: S.green }}>{row.premium}</div>
          </div>
        ))}
      </div>

      {!isPremium && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            style={{ background: S.ink, color: S.bg, border: 'none', padding: '14px 28px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Redirecting…' : 'Upgrade to Premium →'}
          </button>
          <div style={{ fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.08em' }}>₹299 / month · $21 / month · cancel anytime</div>
        </div>
      )}

      <div style={{ marginTop: 36, fontFamily: MONO, fontSize: 9, color: S.mute, letterSpacing: '0.1em', lineHeight: 1.7 }}>
        Team plan? <a href="mailto:ask@learnor.ai" style={{ color: S.ink, textDecoration: 'none', borderBottom: `1px solid ${S.faint}` }}>Contact us →</a>
      </div>
    </>
  );
}
