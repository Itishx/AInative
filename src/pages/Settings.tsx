import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HC } from '../theme';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

type SettingsTab = 'profile' | 'billing';

export default function Settings() {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [username, setUsername] = useState(state.username ?? '');
  const [displayName, setDisplayName] = useState(state.profile?.displayName ?? '');
  const [headline, setHeadline] = useState(state.profile?.headline ?? '');
  const [bio, setBio] = useState(state.profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(state.profile?.avatarUrl ?? '');
  const [avatarError, setAvatarError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const profileLabel = displayName.trim() || username.trim() || user?.email || 'me';

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
          const width = img.width * scale;
          const height = img.height * scale;
          ctx.drawImage(img, (size - width) / 2, (size - height) / 2, width, height);
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
    if (file.size > 3_000_000) return setAvatarError('Image is too large. Use something under 3MB.');
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
        .upsert({
          user_id: user.id,
          courses: state.courses,
          username: trimmed,
          profile,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        setSaving(false);
        setSaveError(error.message.includes('profile')
          ? 'Profile column is missing in Supabase. Run the profile migration SQL.'
          : error.message);
        return;
      }
    }

    setSaving(false);
    navigate('/dashboard');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(26,21,16,0.04)',
    border: `1px solid rgba(26,21,16,0.14)`,
    borderRadius: 10,
    color: HC.ink,
    fontFamily: HC.sans,
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  };

  const tabs: { key: SettingsTab; label: string; helper: string }[] = [
    { key: 'profile', label: 'Profile settings', helper: 'Name, bio, display picture' },
    { key: 'billing', label: 'Usage and billing', helper: 'Plans, invoices, limits' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: HC.bg, color: HC.ink, display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)' }}>
      <aside style={{ borderRight: `1px solid ${HC.ruleFaint}`, padding: '34px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>
        <button onClick={() => navigate('/dashboard')} style={{ border: 'none', background: 'transparent', color: HC.ink, padding: 0, textAlign: 'left', fontFamily: HC.serif, fontSize: 30, letterSpacing: '-0.055em', cursor: 'pointer' }}>
          Learnor
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: HC.ink, color: HC.paper, fontFamily: HC.mono, fontWeight: 800, fontSize: 13 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileLabel.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: HC.sans, fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profileLabel}</div>
            <div style={{ marginTop: 3, fontFamily: HC.mono, fontSize: 9, color: HC.mute, letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? 'signed in'}</div>
          </div>
        </div>

        <nav style={{ display: 'grid', gap: 8 }}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setTab(item.key)}
                style={{ border: `1px solid ${active ? HC.ink : HC.ruleFaint}`, background: active ? 'rgba(26,21,16,0.04)' : 'transparent', borderRadius: 16, padding: '13px 14px', textAlign: 'left', cursor: 'pointer', color: HC.ink }}
              >
                <div style={{ fontFamily: HC.sans, fontSize: 14, fontWeight: 800 }}>{item.label}</div>
                <div style={{ marginTop: 4, fontFamily: HC.mono, fontSize: 9, color: HC.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{item.helper}</div>
              </button>
            );
          })}
        </nav>

        <button onClick={signOut} style={{ marginTop: 'auto', border: `1px solid ${HC.red}`, background: 'transparent', color: HC.red, borderRadius: 999, padding: '11px 16px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>
          Sign out
        </button>
      </aside>

      <main style={{ padding: '54px clamp(24px, 6vw, 92px)', maxWidth: 820 }}>
        {tab === 'profile' ? (
          <>
            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.red }}>Settings</div>
            <h1 style={{ margin: '8px 0 32px', fontFamily: HC.serif, fontSize: 'clamp(44px, 7vw, 82px)', lineHeight: 0.88, letterSpacing: '-0.065em', fontWeight: 400 }}>Profile settings.</h1>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 8 }}>
                <label style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: HC.ink, color: HC.paper, fontFamily: HC.mono, fontWeight: 800, fontSize: 18, cursor: 'pointer', border: `1px solid ${HC.ruleFaint}` }}>
                  {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : profileLabel.slice(0, 2).toUpperCase()}
                  <input type="file" accept="image/*" onChange={(e) => handleAvatarUpload(e.target.files?.[0])} style={{ display: 'none' }} />
                </label>
                <div>
                  <div style={{ fontFamily: HC.sans, fontSize: 16, fontWeight: 800 }}>Display picture</div>
                  <div style={{ marginTop: 5, fontFamily: HC.mono, fontSize: 9, color: HC.mute, letterSpacing: '0.10em', textTransform: 'uppercase' }}>Click circle to upload. Auto-compressed.</div>
                  {avatarUrl && <button type="button" onClick={() => setAvatarUrl('')} style={{ marginTop: 10, border: 'none', background: 'transparent', color: HC.red, padding: 0, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>Remove photo</button>}
                  {avatarError && <div style={{ marginTop: 8, fontFamily: HC.mono, fontSize: 10, color: HC.red }}>{avatarError}</div>}
                </div>
              </div>

              <Field label="Username / handle"><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_handle" maxLength={32} style={inputStyle} /></Field>
              <Field label="Display name"><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your public name" maxLength={48} style={inputStyle} /></Field>
              <Field label="Profile headline">
                <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Welcome back, learner." maxLength={72} style={inputStyle} />
                <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, marginTop: 6, letterSpacing: '0.08em' }}>{headline.length}/72 characters.</div>
              </Field>
              <Field label="Bio">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="What are you learning, building, or racing against?" maxLength={160} rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
                <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, marginTop: 6, letterSpacing: '0.08em' }}>{bio.length}/160 characters.</div>
              </Field>
              <Field label="Email"><div style={{ ...inputStyle, color: HC.mute }}>{user?.email ?? '-'}</div></Field>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
                <button type="submit" disabled={saving} style={{ padding: '13px 22px', background: HC.ink, color: HC.paper, border: 'none', borderRadius: 999, fontFamily: HC.mono, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.65 : 1 }}>
                  {saving ? 'Saving...' : 'Save and return'}
                </button>
                <button type="button" onClick={() => navigate('/dashboard')} style={{ border: 'none', background: 'transparent', color: HC.mute, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
              </div>
              {saveError && <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.red, letterSpacing: '0.06em', lineHeight: 1.5 }}>{saveError}</div>}
            </form>
          </>
        ) : (
          <section>
            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.red }}>Settings</div>
            <h1 style={{ margin: '8px 0 18px', fontFamily: HC.serif, fontSize: 'clamp(44px, 7vw, 82px)', lineHeight: 0.88, letterSpacing: '-0.065em', fontWeight: 400 }}>Usage and billing.</h1>
            <p style={{ maxWidth: 520, color: HC.mute, fontSize: 16, lineHeight: 1.6 }}>Coming soon. This area will hold plan, usage, invoices, and limits.</p>
          </section>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 8 }}>
      <span style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute }}>{label}</span>
      {children}
    </label>
  );
}
