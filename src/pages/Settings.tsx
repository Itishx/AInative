import { useState } from 'react';
import { HC } from '../theme';
import { Chrome } from '../components/Chrome';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';

export default function Settings() {
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();

  const [username, setUsername] = useState(state.username ?? '');
  const [displayName, setDisplayName] = useState(state.profile?.displayName ?? '');
  const [bio, setBio] = useState(state.profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(state.profile?.avatarUrl ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    dispatch({ type: 'SET_USERNAME', username: trimmed });
    dispatch({
      type: 'SET_PROFILE',
      profile: {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  return (
    <div style={{ minHeight: '100vh', background: HC.bg, display: 'flex', flexDirection: 'column' }}>
      <Chrome label="settings" />

      <div style={{ flex: 1, padding: '48px 24px', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <div style={{ fontFamily: HC.serif, fontSize: 40, letterSpacing: '-0.03em', color: HC.ink, marginBottom: 40, fontWeight: 400 }}>
          Your account.
        </div>

        {/* Account info (read-only) */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 8 }}>
            Email
          </div>
          <div style={{ fontFamily: HC.sans, fontSize: 15, color: HC.ink, padding: '12px 14px', background: 'rgba(26,21,16,0.03)', border: `1px solid rgba(26,21,16,0.08)`, borderRadius: 10 }}>
            {user?.email ?? '—'}
          </div>
        </div>

        {/* Editable profile */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
          <div>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 8 }}>
              Username / handle
            </div>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setSaved(false); }}
              placeholder="your_handle"
              maxLength={32}
              style={inputStyle}
            />
            <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, marginTop: 6, letterSpacing: '0.08em' }}>
              Shows on leaderboard and certificates.
            </div>
          </div>

          <div>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 8 }}>
              Display name
            </div>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setSaved(false); }}
              placeholder="Your public name"
              maxLength={48}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 8 }}>
              Bio
            </div>
            <textarea
              value={bio}
              onChange={(e) => { setBio(e.target.value); setSaved(false); }}
              placeholder="What are you learning, building, or racing against?"
              maxLength={160}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
            />
            <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, marginTop: 6, letterSpacing: '0.08em' }}>
              {bio.length}/160 characters.
            </div>
          </div>

          <div>
            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 8 }}>
              Display picture URL
            </div>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => { setAvatarUrl(e.target.value); setSaved(false); }}
              placeholder="https://..."
              style={inputStyle}
            />
            {avatarUrl && (
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                <img src={avatarUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${HC.ruleFaint}` }} />
                <div style={{ fontFamily: HC.mono, fontSize: 9, color: HC.mute, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Preview</div>
              </div>
            )}
          </div>

          <button
            type="submit"
            style={{
              alignSelf: 'flex-start',
              padding: '12px 22px',
              background: saved ? HC.green : HC.ink,
              color: HC.paper,
              border: 'none',
              borderRadius: 10,
              fontFamily: HC.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saved ? 'Saved ✓' : 'Save'}
          </button>
        </form>

        {/* Sign out */}
        <div style={{ borderTop: `1px solid rgba(26,21,16,0.1)`, paddingTop: 32 }}>
          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: HC.mute, marginBottom: 16 }}>
            Danger zone
          </div>
          <button
            onClick={signOut}
            style={{
              padding: '12px 22px',
              background: 'transparent',
              color: HC.red,
              border: `1px solid ${HC.red}`,
              borderRadius: 10,
              fontFamily: HC.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
