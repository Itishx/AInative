import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HC } from '../theme';
import { useTheme } from '../lib/theme';

const TABS = [
  { id: 'udemy', label: 'Udemy', available: true },
  { id: 'youtube', label: 'YouTube', available: false },
  { id: 'pdf', label: 'PDF / Doc', available: false },
];

export default function Import() {
  const { dark } = useTheme();
  const nav = useNavigate();

  const theme = {
    bg: dark ? '#0f0e0c' : '#faf7f0',
    paper: dark ? '#1a1815' : '#ffffff',
    ink: dark ? '#faf7f0' : '#1a1510',
    mute: dark ? '#6b6458' : '#9e9488',
    faint: dark ? 'rgba(250,247,240,0.05)' : 'rgba(26,21,16,0.04)',
    rule: dark ? 'rgba(250,247,240,0.08)' : 'rgba(26,21,16,0.09)',
    ruleStrong: dark ? 'rgba(250,247,240,0.14)' : 'rgba(26,21,16,0.16)',
    green: '#7ad08b',
    red: '#d2221a',
  };

  const [activeTab, setActiveTab] = useState('udemy');
  const [status, setStatus] = useState<'idle' | 'importing' | 'parsing' | 'done' | 'error'>('idle');
  const [importedUrl, setImportedUrl] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const bookmarkletSrc = `javascript:(function(){var btns=Array.from(document.querySelectorAll('button'));var exp=btns.find(function(b){return /expand all/i.test(b.textContent);});function grab(){var all=document.body.innerText;var ci=all.indexOf('Course content');var pre=ci>0?all.slice(Math.max(0,ci-600),ci):'';var body=ci>-1?all.slice(ci,ci+300000):all.slice(0,300000);var t=pre+body;var u=location.href;var h1=document.querySelector('h1');var title=h1?h1.textContent.trim():'';var w=window.open('${origin}/import','_blank');var sent=false;function send(){if(sent)return;sent=true;w.postMessage({type:'UDEMY_IMPORT',text:t,url:u,title:title},'${origin}');}window.addEventListener('message',function(e){if(e.data==='UDEMY_READY')send();});setTimeout(send,3000);}if(exp){exp.click();setTimeout(grab,2500);}else{grab();}})();`;

  async function parseCurriculum(text: string, sourceUrl: string, courseTitle?: string) {
    setStatus('parsing');
    setParsedData(null);
    try {
      const res = await fetch('/api/curriculum-from-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: courseTitle || sourceUrl || 'Udemy course', materialsContext: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Parse failed');
      setParsedData(data);
      const init: Record<number, boolean> = {};
      (data.modules || []).slice(0, 3).forEach((_: any, i: number) => { init[i] = true; });
      setExpanded(init);
      setStatus('done');
    } catch (err: any) {
      setError(err?.message || 'Failed to parse curriculum');
      setStatus('error');
    }
  }

  useEffect(() => {
    if (window.opener) window.opener.postMessage('UDEMY_READY', '*');
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== 'UDEMY_IMPORT') return;
      const { text, url, title } = e.data;
      if (!text) return;
      setImportedUrl(url || '');
      setCharCount(text.length);
      setStatus('importing');
      parseCurriculum(text, url, title);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartTeaching() {
    if (!parsedData) return;
    nav(`/new?topic=${encodeURIComponent(parsedData.title || 'Udemy Course')}`, {
      state: { udemyCurriculum: parsedData },
    });
  }

  const modules: any[] = parsedData?.modules || [];
  const totalLessons = modules.reduce((s: number, m: any) => s + (m.lessons?.length || 0), 0);

  const statusDot = status === 'done' ? theme.green : status === 'error' ? theme.red : theme.mute;
  const statusText: Record<string, string> = {
    idle: 'Waiting for import…',
    importing: 'Page received — extracting course outline…',
    parsing: 'Parsing sections and lectures…',
    done: `Done — ${modules.length} sections, ${totalLessons} lectures`,
    error,
  };

  return (
    <div style={{ minHeight: '100vh', background: theme.bg, color: theme.ink, fontFamily: HC.mono }}>
      {/* Minimal top-right nav */}
      <div style={{ position: 'fixed', top: 20, right: 28, zIndex: 30, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link
          to="/dashboard"
          style={{
            fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: theme.mute, textDecoration: 'none', padding: '8px 14px',
            border: `1px solid ${theme.rule}`, borderRadius: 999,
            background: dark ? 'rgba(26,22,18,0.7)' : 'rgba(250,247,240,0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            transition: 'color 0.15s',
          }}
        >
          Dashboard
        </Link>
        <Link
          to="/new"
          style={{
            fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: theme.mute, textDecoration: 'none', padding: '8px 14px',
            border: `1px solid ${theme.rule}`, borderRadius: 999,
            background: dark ? 'rgba(26,22,18,0.7)' : 'rgba(250,247,240,0.8)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          New course
        </Link>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '52px 40px 100px' }}>

        {/* Hero */}
        <div style={{ marginBottom: 52 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.26em', textTransform: 'uppercase', color: theme.mute, marginBottom: 12 }}>
            New feature
          </div>
          <div style={{ fontFamily: HC.serif, fontSize: 52, letterSpacing: '-0.035em', color: theme.ink, lineHeight: 1.0, marginBottom: 16 }}>
            Import a course
          </div>
          <div style={{ fontSize: 14, color: theme.mute, lineHeight: 1.75, fontFamily: HC.sans, maxWidth: 520 }}>
            Already enrolled somewhere else? Bring the course here. Learnor's AI tutor will teach you through every section and lecture — interactively, with a visual canvas and quizzes — at your pace.
          </div>
        </div>

        {/* How it works */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 52 }}>
          {[
            { n: '01', title: 'Drag the bookmark', body: 'Add the Learnor bookmark to your browser bar once.' },
            { n: '02', title: 'Click it on any course', body: 'Go to a course page and click the bookmark. It auto-expands and captures everything.' },
            { n: '03', title: 'Start learning', body: 'Hit Start Teaching and Learnor guides you through the real curriculum.' },
          ].map(({ n, title, body }) => (
            <div key={n} style={{ padding: '20px 22px', background: theme.paper, border: `1px solid ${theme.rule}`, borderRadius: 12 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', color: theme.mute, marginBottom: 10 }}>{n}</div>
              <div style={{ fontSize: 13, fontFamily: HC.sans, fontWeight: 600, color: theme.ink, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 12, fontFamily: HC.sans, color: theme.mute, lineHeight: 1.6 }}>{body}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: `1px solid ${theme.rule}`, marginBottom: 40 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.available && setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                fontFamily: HC.mono,
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: activeTab === tab.id ? theme.ink : theme.mute,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? theme.ink : 'transparent'}`,
                cursor: tab.available ? 'pointer' : 'default',
                opacity: tab.available ? 1 : 0.38,
                marginBottom: -1,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {tab.label}
              {!tab.available && (
                <span style={{ fontSize: 8, letterSpacing: '0.1em', padding: '2px 6px', background: theme.faint, borderRadius: 4, color: theme.mute }}>
                  soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Udemy tab content */}
        {activeTab === 'udemy' && (
          <>
            {/* Step 1 */}
            <div style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.mute, marginBottom: 16 }}>
                Step 1 — drag this to your bookmarks bar
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
                <a
                  href={bookmarkletSrc}
                  onClick={e => e.preventDefault()}
                  draggable
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '13px 20px',
                    background: theme.paper,
                    border: `1.5px dashed ${theme.ruleStrong}`,
                    borderRadius: 12,
                    color: theme.ink,
                    textDecoration: 'none',
                    cursor: 'grab',
                    userSelect: 'none',
                    flexShrink: 0,
                  }}
                >
                  {/* Learnor logo mark */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    fontFamily: HC.mono, fontSize: 13, fontWeight: 800, letterSpacing: '0.22em',
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 999,
                      background: HC.red, display: 'inline-block', flexShrink: 0,
                    }} />
                    LEARNOR
                  </span>
                  <span style={{ color: theme.mute, fontSize: 10, letterSpacing: '0.08em' }}>drag →</span>
                </a>
                <div style={{ fontSize: 13, color: theme.mute, fontFamily: HC.sans, lineHeight: 1.7, paddingTop: 2, maxWidth: 380 }}>
                  Drag the button into your browser's bookmarks bar. It auto-clicks "Expand all sections" and captures the entire course — no copying needed.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom: 44 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.mute, marginBottom: 12 }}>
                Step 2 — go to any Udemy course page and click the bookmark
              </div>
              <div style={{ fontSize: 13, color: theme.mute, fontFamily: HC.sans, lineHeight: 1.7, maxWidth: 560 }}>
                Navigate to{' '}
                <span style={{ color: theme.ink, fontFamily: HC.mono, fontSize: 12 }}>udemy.com/course/…</span>,
                then click{' '}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.18em', color: theme.ink }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: HC.red, display: 'inline-block' }} />
                  LEARNOR
                </span>{' '}
                in your bookmarks bar. This page will automatically receive the full curriculum.
              </div>
            </div>

            {/* Status bar */}
            <div style={{
              marginBottom: status !== 'idle' ? 32 : 0,
              padding: '14px 18px',
              background: theme.paper,
              border: `1px solid ${theme.ruleStrong}`,
              borderRadius: 10,
              display: status === 'idle' ? 'none' : 'block',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: statusDot,
                  animation: (status === 'parsing' || status === 'importing') ? 'pulse 1s infinite' : 'none',
                }} />
                <span style={{ fontSize: 11, color: statusDot, letterSpacing: '0.08em' }}>
                  {statusText[status]}
                </span>
              </div>
              {importedUrl && (
                <div style={{ marginTop: 7, fontSize: 10, color: theme.mute, fontFamily: HC.sans, wordBreak: 'break-all' }}>
                  {importedUrl}
                </div>
              )}
              {charCount > 0 && (
                <div style={{ marginTop: 3, fontSize: 10, color: theme.mute }}>
                  {charCount.toLocaleString()} characters captured
                </div>
              )}
            </div>

            {/* Waiting idle state */}
            {status === 'idle' && (
              <div style={{
                padding: '40px 28px',
                border: `1px dashed ${theme.rule}`,
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                textAlign: 'center',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: theme.rule }} />
                <div style={{ fontSize: 11, color: theme.mute, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Waiting for import
                </div>
                <div style={{ fontSize: 12, color: theme.mute, fontFamily: HC.sans, maxWidth: 300, lineHeight: 1.6 }}>
                  Drag the bookmark above to your bar, then click it on a Udemy course page.
                </div>
              </div>
            )}

            {/* Curriculum result */}
            {parsedData && status === 'done' && (
              <div>
                {/* Course card */}
                <div style={{
                  padding: '28px 32px',
                  background: theme.paper,
                  border: `1px solid ${theme.ruleStrong}`,
                  borderRadius: 14,
                  marginBottom: 24,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 24,
                  flexWrap: 'wrap',
                }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: theme.green, marginBottom: 10 }}>
                      ✓ Curriculum extracted
                    </div>
                    <div style={{ fontFamily: HC.serif, fontSize: 28, letterSpacing: '-0.03em', color: theme.ink, lineHeight: 1.15, marginBottom: 14 }}>
                      {parsedData.title}
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.mute, flexWrap: 'wrap' }}>
                      <span>{modules.length} sections</span>
                      <span style={{ color: theme.rule }}>·</span>
                      <span>{totalLessons} lectures</span>
                      <span style={{ color: theme.rule }}>·</span>
                      <span>{parsedData.estimatedHours}h</span>
                      <span style={{ color: theme.rule }}>·</span>
                      <span style={{ textTransform: 'capitalize' }}>{parsedData.level}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleStartTeaching}
                    style={{
                      background: theme.ink,
                      color: dark ? theme.bg : '#faf7f0',
                      border: 'none',
                      borderRadius: 8,
                      padding: '13px 28px',
                      fontFamily: HC.mono,
                      fontSize: 11,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      flexShrink: 0,
                      alignSelf: 'flex-end',
                    }}
                  >
                    Start Teaching →
                  </button>
                </div>

                {/* Accordion sections */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {modules.map((mod: any, i: number) => {
                    const open = !!expanded[i];
                    const lessons: any[] = mod.lessons || [];
                    const sectionMins = lessons.reduce((s: number, l: any) => s + (l.minutes || 0), 0);
                    return (
                      <div key={i} style={{
                        border: `1px solid ${open ? theme.ruleStrong : theme.rule}`,
                        borderRadius: 10,
                        overflow: 'hidden',
                        transition: 'border-color 0.15s',
                      }}>
                        <button
                          onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '13px 18px',
                            background: open ? theme.paper : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: theme.ink,
                            textAlign: 'left',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <span style={{ fontSize: 9, color: theme.mute, letterSpacing: '0.14em', fontFamily: HC.mono, flexShrink: 0 }}>
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: 12, fontFamily: HC.sans, color: theme.ink, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {mod.title}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: theme.mute, fontFamily: HC.mono, letterSpacing: '0.06em' }}>
                              {lessons.length} lec{lessons.length !== 1 ? 's' : ''}{sectionMins > 0 ? ` · ${sectionMins}m` : ''}
                            </span>
                            <span style={{
                              fontSize: 16, color: theme.mute, fontFamily: HC.serif,
                              display: 'inline-block',
                              transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.15s',
                            }}>›</span>
                          </div>
                        </button>

                        {open && (
                          <div style={{ borderTop: `1px solid ${theme.rule}` }}>
                            {lessons.map((l: any, li: number) => (
                              <div
                                key={li}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '9px 18px 9px 44px',
                                  borderBottom: li < lessons.length - 1 ? `1px solid ${dark ? 'rgba(250,247,240,0.04)' : 'rgba(26,21,16,0.04)'}` : 'none',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                  <span style={{ width: 4, height: 4, borderRadius: 999, background: theme.mute, flexShrink: 0 }} />
                                  <span style={{ fontSize: 12, color: theme.ink, fontFamily: HC.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {l.title}
                                  </span>
                                </div>
                                {l.minutes > 0 && (
                                  <span style={{ fontSize: 10, color: theme.mute, fontFamily: HC.mono, flexShrink: 0, marginLeft: 12 }}>
                                    {l.minutes}m
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleStartTeaching}
                    style={{
                      background: theme.ink,
                      color: dark ? theme.bg : '#faf7f0',
                      border: 'none',
                      borderRadius: 8,
                      padding: '14px 36px',
                      fontFamily: HC.mono,
                      fontSize: 12,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Start Teaching →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}
