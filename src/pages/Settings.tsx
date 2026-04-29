import { useState } from 'react';
import { HC } from '../theme';
import { Chrome } from '../components/Chrome';
import { useStore } from '../store';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export default function Settings() {
  const { state, dispatch } = useStore();
  const { user, signOut } = useAuth();

  const [username, setUsername] = useState(state.username ?? '');
  const [displayName, setDisplayName] = useState(state.profile?.displayName ?? '');
  const [bio, setBio] = useState(state.profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(state.profile?.avatarUrl ?? '');
  const [avatarError, setAvatarError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  function compressImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Could not read that image.'));
          return;
        }
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 320;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not process that image.'));
            return;
          }
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
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please upload an image file.');
      return;
    }
    if (file.size > 3_000_000) {
      setAvatarError('Image is too large. Use something under 3MB.');
      return;
    }
    try {
      setAvatarUrl(await compressImage(file));
      setSaved(false);
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
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
    };
    dispatch({ type: 'SET_USERNAME', username: trimmed });
    dispatch({
      type: 'SET_PROFILE',
      profile,
    });

    if (user?.id) {
      const { error } = await supabase
        .from('user_courses')
        .upsert({
          user_id: user.id,
          courses: state.courses,
          username: trimmed,
          profile,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        setSaving(false);
        setSaveError(error.message.includes('profile')
          ? 'Profile column is missing in Supabase. Run the profile migration SQL.'
          : error.message);
        return;
      }
    }

    setSaving(false);
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
              Display picture
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 110,
              border: `1.5px dashed ${HC.ruleFaint}`,
              borderRadius: 14,
              background: 'rgba(26,21,16,0.035)',
              cursor: 'pointer',
              overflow: 'hidden',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 18 }}>
                  <div style={{ fontFamily: HC.serif, fontSize: 28, color: HC.ink, letterSpacing: '-0.03em' }}>Upload image</div>
                  <div style={{ marginTop: 6, fontFamily: HC.mono, fontSize: 9, color: HC.mute, letterSpacing: '0.10em', textTransform: 'uppercase' }}>PNG, JPG, GIF · auto-compressed</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
                style={{ display: 'none' }}
              />
            </label>
            {avatarError && (
              <div style={{ marginTop: 8, fontFamily: HC.mono, fontSize: 10, color: HC.red, letterSpacing: '0.06em' }}>
                {avatarError}
              </div>
            )}
            {avatarUrl && (
              <button
                type="button"
                onClick={() => { setAvatarUrl(''); setSaved(false); }}
                style={{ marginTop: 10, border: 'none', background: 'transparent', color: HC.red, padding: 0, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Remove photo
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
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
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.65 : 1,
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
          </button>
          {saveError && (
            <div style={{ fontFamily: HC.mono, fontSize: 10, color: HC.red, letterSpacing: '0.06em', lineHeight: 1.5 }}>
              {saveError}
            </div>
          )}
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
