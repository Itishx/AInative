import { HC, type Colors } from '../theme';
import { handleCodeEditorKeyDown } from '../lib/codeEditor';

export type CodingPracticeResult = {
  score: number;
  correct: boolean;
  whatWasRight: string;
  whatWasMissing: string;
  betterAnswer: string;
} | null;

type CodingPracticeListProps = {
  questions: string[];
  answers: string[];
  results: CodingPracticeResult[];
  hints: Array<string | null | undefined>;
  hintErrors: Array<string | null | undefined>;
  checkingIndex: number | null;
  hintLoadingIndex: number | null;
  theme: Colors;
  dark: boolean;
  panelFill: string;
  contextHint?: string;
  onAnswerChange: (idx: number, value: string) => void;
  onCheck: (idx: number) => void;
  onHint: (idx: number) => void;
  onRetry: (idx: number) => void;
};

function inferLanguage(question: string, contextHint?: string) {
  const text = `${question} ${contextHint ?? ''}`.toLowerCase();
  if (/\b(sql|query|select|from|where|join|group by|order by|having|database)\b/.test(text)) return 'sql';
  if (/\b(python|pandas|django|flask)\b/.test(text)) return 'python';
  if (/\b(typescript|tsx)\b/.test(text)) return 'typescript';
  if (/\b(javascript|node|express|react|next\.?js|component|hook)\b/.test(text)) return 'javascript';
  if (/\b(html|markup)\b/.test(text)) return 'html';
  if (/\b(css|tailwind|style|stylesheet)\b/.test(text)) return 'css';
  if (/\b(bash|shell|terminal|command line|cli)\b/.test(text)) return 'bash';
  return 'txt';
}

function extensionForLanguage(language: string) {
  switch (language) {
    case 'python':
      return 'py';
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'bash':
      return 'sh';
    default:
      return language;
  }
}

function placeholderForLanguage(language: string, question: string) {
  const prompt = question.trim() || 'Write your answer here.';
  if (language === 'sql') return `-- ${prompt}\n`;
  if (language === 'html') return `<!-- ${prompt} -->\n`;
  if (language === 'css') return `/* ${prompt} */\n`;
  if (language === 'javascript' || language === 'typescript') return `// ${prompt}\n`;
  if (language === 'bash') return `# ${prompt}\n`;
  return `# ${prompt}\n`;
}

export function CodingPracticeList({
  questions,
  answers,
  results,
  hints,
  hintErrors,
  checkingIndex,
  hintLoadingIndex,
  theme,
  dark,
  panelFill,
  contextHint,
  onAnswerChange,
  onCheck,
  onHint,
  onRetry,
}: CodingPracticeListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30, borderTop: `1px solid ${theme.ruleFaint}`, paddingTop: 22 }}>
      {questions.map((question, idx) => {
        const result = results[idx];
        const answer = answers[idx] || '';
        const language = inferLanguage(question, contextHint);
        const extension = extensionForLanguage(language);
        const lineCount = Math.max(8, answer.split('\n').length);
        const isChecking = checkingIndex === idx;
        const isHinting = hintLoadingIndex === idx;
        const hint = hints[idx];
        const hintError = hintErrors[idx];

        return (
          <div key={`${question}-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontFamily: HC.mono, fontSize: 11, color: theme.red, flexShrink: 0, marginTop: 3 }}>
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.mute, marginBottom: 8 }}>
                  Coding prompt
                </div>
                <div style={{ fontFamily: HC.serif, fontSize: 20, letterSpacing: '-0.01em', lineHeight: 1.4, color: theme.ink }}>
                  {question}
                </div>
              </div>
            </div>

            <div style={{ paddingLeft: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 320, borderRadius: 22, background: '#120f0d', border: '1px solid rgba(250,247,240,0.10)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.20)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7b65' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f1bd57' }} />
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#78c26a' }} />
                  <span style={{ marginLeft: 10, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)' }}>
                    hands-on-{idx + 1}.{extension}
                  </span>
                </div>

                <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)' }}>
                  <div style={{ padding: '18px 10px 18px 0', background: 'rgba(250,247,240,0.04)', borderRight: '1px solid rgba(250,247,240,0.06)', textAlign: 'right', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.7, color: 'rgba(250,247,240,0.34)', userSelect: 'none', overflow: 'hidden' }}>
                    {Array.from({ length: lineCount }).map((_, lineIdx) => (
                      <div key={lineIdx}>{lineIdx + 1}</div>
                    ))}
                  </div>
                  <textarea
                    value={answer}
                    onChange={(event) => { if (!result) onAnswerChange(idx, event.target.value); }}
                    onKeyDown={(event) => {
                      if (!result) handleCodeEditorKeyDown(event, answer, (nextValue) => onAnswerChange(idx, nextValue));
                    }}
                    placeholder={placeholderForLanguage(language, question)}
                    disabled={isChecking || !!result}
                    spellCheck={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      minHeight: 0,
                      resize: 'none',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: HC.paper,
                      padding: '18px 18px 18px 16px',
                      fontFamily: HC.mono,
                      fontSize: 14,
                      lineHeight: 1.7,
                      tabSize: 2,
                      opacity: result ? 0.76 : 1,
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid rgba(250,247,240,0.08)' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.54)' }}>
                    {isChecking ? 'checking your answer…' : isHinting ? 'generating a useful hint…' : result ? 'feedback rendered below' : 'write the answer here'}
                  </div>
                  {!result && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => onHint(idx)}
                        disabled={isHinting}
                        style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.10)', background: 'rgba(250,247,240,0.05)', color: isHinting ? 'rgba(250,247,240,0.34)' : 'rgba(250,247,240,0.72)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: isHinting ? 'not-allowed' : 'pointer', opacity: isHinting ? 0.55 : 1 }}
                      >
                        {isHinting ? 'Hinting…' : hint ? 'Hint again' : 'Show hint'}
                      </button>
                      <button
                        onClick={() => onCheck(idx)}
                        disabled={isChecking || !answer.trim()}
                        style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.10)', background: isChecking || !answer.trim() ? 'rgba(250,247,240,0.05)' : 'rgba(250,247,240,0.12)', color: isChecking || !answer.trim() ? 'rgba(250,247,240,0.34)' : HC.paper, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: isChecking || !answer.trim() ? 'not-allowed' : 'pointer', opacity: isChecking || !answer.trim() ? 0.55 : 1 }}
                      >
                        {isChecking ? 'Checking…' : 'Check answer'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {hintError && !result && (
                <div style={{ padding: '11px 14px', borderRadius: 16, border: '1px solid rgba(196,34,27,0.24)', background: dark ? 'rgba(232,81,74,0.09)' : 'rgba(196,34,27,0.05)', color: theme.ink, fontSize: 13, lineHeight: 1.55 }}>
                  {hintError}
                </div>
              )}

              {hint && !result && (
                <div style={{ padding: '12px 16px', borderRadius: 18, border: `1px solid ${dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.10)'}`, background: dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.03)' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.amber, marginBottom: 6 }}>
                    Hint
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.65, color: theme.ink }}>
                    {hint}
                  </div>
                </div>
              )}

              {result && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: result.correct ? theme.green : theme.red }}>
                      {result.correct ? '✓ Correct' : '✗ Needs work'} · {result.score}/100
                    </span>
                    <button
                      onClick={() => onRetry(idx)}
                      style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.mute, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      retry
                    </button>
                  </div>

                  {result.whatWasRight && (
                    <div style={{ padding: '12px 16px', border: `1px solid ${dark ? 'rgba(106,174,127,0.25)' : 'rgba(45,106,63,0.18)'}`, background: dark ? 'rgba(106,174,127,0.08)' : 'rgba(45,106,63,0.05)' }}>
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.green, marginBottom: 6 }}>What you got right</div>
                      <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink }}>{result.whatWasRight}</div>
                    </div>
                  )}

                  {result.whatWasMissing && (
                    <div style={{ padding: '12px 16px', border: '1px solid rgba(196,34,27,0.22)', background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)' }}>
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.red, marginBottom: 6 }}>What to fix</div>
                      <div style={{ fontSize: 15, lineHeight: 1.65, color: theme.ink }}>{result.whatWasMissing}</div>
                    </div>
                  )}

                  {result.betterAnswer && (
                    <div style={{ padding: '12px 16px', border: `1px solid ${theme.ruleFaint}`, background: panelFill }}>
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.mute, marginBottom: 6 }}>Learnor says</div>
                      <div style={{ whiteSpace: 'pre-wrap', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.7, color: theme.ink }}>{result.betterAnswer}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
