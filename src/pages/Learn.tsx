import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HC, HCDark, btn, type Colors } from '../theme';
import { Countdown } from '../components/Countdown';
import { useStore } from '../store';
import { apiJson, apiUrl, normalizeApiErrorMessage } from '../api';
import type { Course, ChatMsg, EnrolledCourse } from '../types';
import { useTheme } from '../lib/theme';
import { useAuth } from '../lib/auth';
import { handleCodeEditorKeyDown } from '../lib/codeEditor';

function renderInlineFormatting(text: string) {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(<strong key={`${match.index}-bold`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<em key={`${match.index}-italic`}>{token.slice(1, -1)}</em>);
    } else {
      nodes.push(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : text;
}

function countWords(text: string) {
  return String(text || '').split(/\s+/).filter(Boolean).length;
}

function isMarkdownTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

function isMarkdownTableDivider(line: string) {
  const trimmed = line.trim();
  return /^\|(?:\s*:?-+:?\s*\|)+$/.test(trimmed);
}

function parseMarkdownTableRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function expandInlineChoiceOptions(line: string) {
  if (isMarkdownTableLine(line)) return [line];
  const matches = [...line.matchAll(/\b([A-D])[\).:]\s+/g)];
  if (matches.length < 2) return [line];

  const expanded: string[] = [];
  const firstIndex = matches[0].index ?? 0;
  const intro = line.slice(0, firstIndex).trim();
  if (intro) expanded.push(intro);

  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? line.length;
    const label = match[1];
    const optionText = line.slice(start + match[0].length, end).trim();
    if (optionText) expanded.push(`${label}) ${optionText}`);
  });

  return expanded.length ? expanded : [line];
}

function normalizePythonCodeForDisplay(code: string) {
  return code
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith('#') &&
        !/^(import|from|class|def|for|while|if|elif|else|try|except|finally|with|return|print|[A-Za-z_]\w*\s*=|[A-Za-z_][\w.]*\(|\)|\]|\})\b/.test(trimmed) &&
        /^[A-Za-z][A-Za-z0-9 ,.'-]*$/.test(trimmed)
      ) {
        return `${line.match(/^\s*/)?.[0] ?? ''}# ${trimmed}`;
      }
      return line;
    })
    .join('\n')
    .trim();
}

function normalizeChatCodeFences(text: string) {
  return String(text || '')
    .replace(/`(python|py|javascript|js|typescript|ts|sql|bash|sh|html|css)\s*\n([\s\S]*?)`/gi, (_, lang, code) => {
      const normalizedCode = /^python|py$/i.test(lang) ? normalizePythonCodeForDisplay(code) : String(code).trim();
      return `\`\`\`${lang.toLowerCase()}\n${normalizedCode}\n\`\`\``;
    });
}

function stripSpeechText(text: string) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\|[^|\n]+\|/g, ' ')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function renderSpokenMessage(text: string, visibleWords: number) {
  const words = stripSpeechText(text).split(/\s+/).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4px' }}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          style={{
            opacity: index < visibleWords ? 1 : 0.2,
            transform: index < visibleWords ? 'translateY(0)' : 'translateY(4px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
          }}
        >
          {word}
        </span>
      ))}
    </div>
  );
}

function renderChatMessage(text: string, theme: Colors, dark: boolean) {
  const blocks = normalizeChatCodeFences(text).split(/```/);
  const softRule = dark ? 'rgba(250,247,240,0.12)' : 'rgba(26,21,16,0.12)';
  const softerRule = dark ? 'rgba(250,247,240,0.10)' : 'rgba(26,21,16,0.10)';
  const muted = dark ? 'rgba(250,247,240,0.62)' : 'rgba(26,21,16,0.52)';
  const softFill = dark ? 'rgba(250,247,240,0.055)' : 'rgba(26,21,16,0.045)';
  const accent = dark ? '#ff8c73' : theme.red;

  return blocks.map((block, blockIndex) => {
    if (blockIndex % 2 === 1) {
      const lines = block.split('\n');
      const firstLine = lines[0]?.trim() ?? '';
      const looksLikeLanguage = firstLine.length > 0 && !/\s/.test(firstLine);
      const code = looksLikeLanguage ? lines.slice(1).join('\n') : block;

      return (
        <pre
          key={`code-${blockIndex}`}
          style={{
            margin: '10px 0',
            padding: '12px 14px',
            background: dark ? '#16120f' : theme.paper,
            color: dark ? HC.paper : theme.ink,
            border: `1px solid ${softRule}`,
            overflowX: 'auto',
            fontFamily: HC.mono,
            fontSize: 13,
            lineHeight: 1.55,
            whiteSpace: 'pre',
          }}
        >
          <code>{code.trim()}</code>
        </pre>
      );
    }

    const lines = block.split('\n').flatMap(expandInlineChoiceOptions);
    const rendered: React.ReactNode[] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const line = lines[lineIndex];
      const key = `text-${blockIndex}-${lineIndex}`;
      const trimmed = line.trim();

      if (!trimmed) {
        rendered.push(<div key={key} style={{ height: 10 }} />);
        continue;
      }

      if (
        isMarkdownTableLine(line) &&
        lineIndex + 1 < lines.length &&
        isMarkdownTableDivider(lines[lineIndex + 1])
      ) {
        const header = parseMarkdownTableRow(line);
        const rows: string[][] = [];
        lineIndex += 2;

        while (lineIndex < lines.length && isMarkdownTableLine(lines[lineIndex])) {
          rows.push(parseMarkdownTableRow(lines[lineIndex]));
          lineIndex += 1;
        }

        lineIndex -= 1;
        rendered.push(
          <div key={key} style={{ overflowX: 'auto', margin: '12px 0 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 14, lineHeight: 1.45, color: 'inherit' }}>
              <thead>
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={`${key}-head-${cellIndex}`}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderBottom: `1px solid ${softRule}`,
                        fontFamily: HC.mono,
                        fontSize: 10,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: muted,
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        verticalAlign: 'top',
                      }}
                    >
                      {renderInlineFormatting(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={`${key}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${key}-cell-${rowIndex}-${cellIndex}`}
                        style={{
                          padding: '10px',
                          borderBottom: `1px solid ${softerRule}`,
                          whiteSpace: 'normal',
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word',
                          verticalAlign: 'top',
                        }}
                    >
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }

      if (/^---+$/.test(trimmed)) {
        rendered.push(<div key={key} style={{ height: 1, background: softRule, margin: '14px 0' }} />);
        continue;
      }

      if (trimmed.startsWith('## ')) {
        rendered.push(<div key={key} style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: accent, margin: '10px 0 4px' }}>{trimmed.slice(3)}</div>);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        rendered.push(
          <div key={key} style={{ fontFamily: HC.sans, fontSize: 22, fontWeight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', margin: '6px 0 10px' }}>
            {renderInlineFormatting(trimmed.slice(2))}
          </div>
        );
        continue;
      }

      if (trimmed.startsWith('- ')) {
        rendered.push(
          <div key={key} style={{ display: 'flex', gap: 8, margin: '4px 0' }}>
            <span style={{ color: accent, fontFamily: HC.mono, fontSize: 10, flexShrink: 0, marginTop: 4 }}>•</span>
            <span>{renderInlineFormatting(trimmed.slice(2))}</span>
          </div>
        );
        continue;
      }

      const optionMatch = trimmed.match(/^([A-D])[\).:]\s+(.+)$/);
      if (optionMatch) {
        rendered.push(
          <div
            key={key}
            style={{
              display: 'grid',
              gridTemplateColumns: '28px minmax(0, 1fr)',
              gap: 10,
              alignItems: 'start',
              margin: '7px 0',
              padding: '9px 10px',
              borderRadius: 12,
              background: softFill,
              border: `1px solid ${softerRule}`,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: dark ? 'rgba(255,140,115,0.14)' : 'rgba(196,34,27,0.10)',
                color: accent,
                fontFamily: HC.mono,
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {optionMatch[1]}
            </span>
            <span style={{ minWidth: 0, lineHeight: 1.5 }}>{renderInlineFormatting(optionMatch[2])}</span>
          </div>
        );
        continue;
      }

      if (trimmed === '•') {
        rendered.push(<div key={key} style={{ height: 2 }} />);
        continue;
      }

      rendered.push(<div key={key} style={{ margin: '4px 0' }}>{renderInlineFormatting(line)}</div>);
    }

    return rendered;
  });
}

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i += 1;
      }

      rendered.push(
        <pre
          key={`code-${i}`}
          style={{
            margin: '10px 0 12px',
            padding: '10px 12px',
            background: '#16120f',
            color: HC.paper,
            overflowX: 'auto',
            fontFamily: HC.mono,
            fontSize: 11,
            lineHeight: 1.5,
            whiteSpace: 'pre',
          }}
        >
          <code>{codeLines.join('\n').trim()}</code>
        </pre>,
      );
      continue;
    }

    if (!trimmed) {
      rendered.push(<div key={`space-${i}`} style={{ height: 4 }} />);
      continue;
    }

    if (isMarkdownTableLine(line) && i + 1 < lines.length && isMarkdownTableDivider(lines[i + 1])) {
      const header = parseMarkdownTableRow(line);
      const rows: string[][] = [];
      i += 2;

      while (i < lines.length && isMarkdownTableLine(lines[i])) {
        rows.push(parseMarkdownTableRow(lines[i]));
        i += 1;
      }

      i -= 1;
      rendered.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '10px 0 12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 11, lineHeight: 1.45 }}>
            <thead>
              <tr>
                {header.map((cell, cellIndex) => (
                  <th
                    key={`head-${i}-${cellIndex}`}
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      borderBottom: `1px solid ${HC.ruleFaint}`,
                      fontFamily: HC.mono,
                      fontSize: 9,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: HC.mute,
                      whiteSpace: 'normal',
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      verticalAlign: 'top',
                    }}
                  >
                    {renderInlineFormatting(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${i}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`cell-${i}-${rowIndex}-${cellIndex}`}
                      style={{
                        padding: '7px 8px',
                        borderBottom: `1px solid ${HC.ruleFaint}`,
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        verticalAlign: 'top',
                      }}
                    >
                      {renderInlineFormatting(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      rendered.push(<div key={`rule-${i}`} style={{ height: 1, background: HC.ruleFaint, margin: '10px 0' }} />);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      rendered.push(<div key={`h2-${i}`} style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: HC.red, margin: '12px 0 4px' }}>{renderInlineFormatting(trimmed.slice(3))}</div>);
      continue;
    }

    if (trimmed.startsWith('# ')) {
      rendered.push(<div key={`h1-${i}`} style={{ fontFamily: HC.serif, fontSize: 18, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '8px 0 6px' }}>{renderInlineFormatting(trimmed.slice(2))}</div>);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      rendered.push(<div key={`bullet-${i}`} style={{ display: 'flex', gap: 6, marginBottom: 3 }}><span style={{ color: HC.red, fontFamily: HC.mono, fontSize: 10, flexShrink: 0 }}>·</span><span style={{ fontSize: 12, lineHeight: 1.5 }}>{renderInlineFormatting(trimmed.slice(2))}</span></div>);
      continue;
    }

    rendered.push(<div key={`text-${i}`} style={{ fontSize: 12, lineHeight: 1.5 }}>{renderInlineFormatting(line)}</div>);
  }

  return rendered;
}

type Phase = 'ASSESS' | 'HOOK' | 'EXPLAIN' | 'CHECK' | 'REINFORCE';
type WorkspaceTab = 'visual' | 'code' | 'output';
type WorkspaceEvaluation = {
  score: number;
  correct: boolean;
  whatWasRight: string;
  whatWasMissing: string;
  betterAnswer: string;
};

const CODING_WORKSPACE_TOPICS = /\b(sql|query|queries|join|select|where|group by|order by|python|javascript|typescript|react|html|css|bash|shell|regex|database|schema|orm|api|function|code|coding|programming|algorithm|docker|git)\b/i;

function normalizeLessonObjective(objective: string | undefined, lessonTitle: string) {
  const value = String(objective ?? '').trim();
  if (!value || /^(undefined|null|n\/a)$/i.test(value)) {
    return `Understand ${lessonTitle.toLowerCase()}.`;
  }
  return value;
}

function shouldAskTutorQuestion(latestUserMessage: string, isOpening: boolean, tutorTurnCount: number) {
  if (isOpening) return false;
  if (tutorTurnCount < 1) return false;
  const text = String(latestUserMessage || '').trim();
  if (!text) return true;
  if (/ask me (?:one )?(?:a )?(?:quick )?question|check me|quiz me|test me/i.test(text)) return true;
  if (/^(continue|next|go on|keep going|proceed|move on|ok|okay|k|got it|cool|nice)$/i.test(text)) return false;
  if (/\b(?:idk|i don't know|dont know|not sure|no idea|tf would i know|huh|what\?)\b/i.test(text)) return false;
  return true;
}

function isContinueOnly(text: string) {
  return /^(continue|next|go on|keep going|proceed|move on|ok|okay|k|got it|cool|nice)$/i.test(String(text || '').trim());
}

function isCanvasExampleRequest(text: string) {
  const value = String(text || '').toLowerCase();
  return (
    /\bshow\s+(?:me\s+)?(?:an?\s+)?example\b/.test(value) ||
    /\bconcrete\s+example\b/.test(value) ||
    /\bcanvas\b|\banvas\b/.test(value) ||
    /\bvisual\b/.test(value)
  );
}

function buildCanvasExampleVisual(lessonTitle: string, userText: string, tutorText: string) {
  const lesson = String(lessonTitle || '').toLowerCase();
  const context = `${lesson} ${userText} ${tutorText}`.toLowerCase();

  if (/\bprimary\s+key\b|\bunique\s+(?:id|identifier)\b|\border_id\b/.test(lesson)) {
    return [
      '| order_id | customer_id | order_date | total_amount |',
      '|---|---|---|---|',
      '| 1001 | 42 | 2024-01-15 | $59.99 |',
      '| 1002 | 87 | 2024-01-16 | $120.00 |',
      '| 1003 | 42 | 2024-01-18 | $34.50 |',
    ].join('\n');
  }

  if (/\bwhere\b|\bfilter(?:ing)?\b/.test(lesson)) {
    return [
      '```sql',
      'SELECT customer_name, state',
      'FROM customers',
      "WHERE state = 'Texas';",
      '```',
    ].join('\n');
  }

  if (/\bselect\b|\bquery\b|\bstatement\b/.test(lesson)) {
    return [
      '```sql',
      'SELECT customer_id, total_amount',
      'FROM orders',
      'LIMIT 3;',
      '```',
    ].join('\n');
  }

  if (/\btable\b|\bdatabase\b|\brow\b|\bcolumn\b|\brecord\b|\bsql\b/.test(lesson)) {
    return [
      '| customer_id | customer_name | state |',
      '|---|---|---|',
      '| 42 | Sarah Chen | Texas |',
      '| 87 | Marcus Webb | New York |',
      '| 91 | Aisha Khan | Texas |',
    ].join('\n');
  }

  if (/\bpython\b|\bprint\b|\bvariable\b|\bcode\b|\bfunction\b/.test(lesson)) {
    return [
      '```python',
      'message = "Hello, world!"',
      'print(message)',
      '```',
    ].join('\n');
  }

  if (/\bdata\b|\barray\b|\bnumpy\b|\blist\b/.test(lesson)) {
    return [
      '| index | value | meaning |',
      '|---|---|---|',
      '| 0 | 45 | first score |',
      '| 1 | 50 | second score |',
      '| 2 | 55 | third score |',
    ].join('\n');
  }

  return [
    '```txt',
    `${lessonTitle}`,
    'Concept -> concrete example -> why it matters',
    '```',
  ].join('\n');
}

function trimParagraphs(text: string, maxWords: number) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (!paragraphs.length) return '';

  let used = 0;
  const out: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    if (used + words.length <= maxWords) {
      out.push(paragraph);
      used += words.length;
      continue;
    }
    const remaining = maxWords - used;
    if (remaining > 0) {
      out.push(`${words.slice(0, remaining).join(' ')}...`);
    }
    break;
  }

  return out.join('\n\n').trim();
}

function trimAtClauseBoundary(text: string, maxWords: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return String(text || '').trim();

  const candidate = words.slice(0, maxWords).join(' ').trim();
  const clauseSafe = candidate.replace(/(?:,|;|:)\s+[^,;:]*$/, '').trim();
  const trimmed = countWords(clauseSafe) >= Math.max(8, maxWords - 18) ? clauseSafe : candidate;
  return `${trimmed.replace(/[,:;]+$/, '').trim()}.`;
}

function fitTextToSentenceBoundary(text: string, preferredMaxWords: number, absoluteMaxWords = preferredMaxWords + 28) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (countWords(normalized) <= preferredMaxWords) return normalized;

  const sentences = normalized
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];

  if (!sentences.length) {
    return trimAtClauseBoundary(normalized, absoluteMaxWords);
  }

  const chosen: string[] = [];
  let used = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    if (!chosen.length) {
      if (sentenceWords > absoluteMaxWords) {
        return trimAtClauseBoundary(sentence, absoluteMaxWords);
      }
      chosen.push(sentence);
      used = sentenceWords;
      if (used >= preferredMaxWords) break;
      continue;
    }

    const next = used + sentenceWords;
    if (next <= preferredMaxWords || (used < Math.min(72, preferredMaxWords) && next <= absoluteMaxWords)) {
      chosen.push(sentence);
      used = next;
      continue;
    }
    break;
  }

  return chosen.join(' ').trim() || trimAtClauseBoundary(normalized, absoluteMaxWords);
}

function firstStatement(text: string) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .find((sentence) => sentence && !sentence.endsWith('?')) ?? '';
}

function formatInteractiveParagraphs(explainers: string[], question: string, maxWords: number, absoluteMaxWords = maxWords + 28) {
  const paragraphs: string[] = [];
  if (explainers.length > 0) {
    paragraphs.push(explainers.slice(0, 2).join(' ').trim());
  }
  if (explainers.length > 2) {
    paragraphs.push(explainers.slice(2).join(' ').trim());
  }
  if (question) {
    paragraphs.push(question.trim());
  }
  return fitTextToSentenceBoundary(paragraphs.filter(Boolean).join('\n\n'), maxWords, absoluteMaxWords);
}

function compactTutorDump(text: string, lessonTitle: string, isOpening: boolean, allowQuestion: boolean) {
  const raw = String(text || '');
  const rawWordCount = countWords(raw);
  const hasStructuredExample = /```|^\s*\|.+\|\s*$/m.test(raw);
  const looksDumped =
    /[①②③④⑤⑥⑦⑧⑨⑩]|WHAT IT IS|WHY IT MATTERS|THE ANALOGY|WORKED EXAMPLE|CHECK-IN QUESTION/i.test(raw) ||
    rawWordCount > 210 ||
    raw.split(/\n/).length > 10;

  if (!looksDumped && rawWordCount <= 160 && /[.!?]["')\]]?\s*$/.test(raw.trim())) {
    return raw.trim();
  }

  if (!isOpening && hasStructuredExample && raw.split(/\s+/).filter(Boolean).length < 180) {
    return raw;
  }
  if (!looksDumped) return raw;

  const cleaned = raw
    .replace(/It looks like the lesson objective came through as ["']?undefined["']?.*?(?:[.?!]\s+|$)/i, '')
    .replace(/^\s*---+\s*$/gm, ' ')
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/gm, '')
    .replace(/^\s*(?:#{1,6}\s+|\*\*|\* |- |\d+[.)]\s+)/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const sentences = cleaned.match(/[^.!?]+[.!?]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const explainers = sentences.filter((sentence) => !sentence.endsWith('?')).slice(0, isOpening ? 3 : 4);
  const question = sentences.find((sentence) => sentence.endsWith('?'));
  const preferredWords = isOpening ? 90 : 135;
  const absoluteWords = isOpening ? 120 : 170;
  if (allowQuestion && question && explainers.length > 0) {
    return formatInteractiveParagraphs(explainers, question, preferredWords, absoluteWords) || cleaned;
  }
  return (
    formatInteractiveParagraphs(explainers, '', preferredWords, absoluteWords) ||
    fitTextToSentenceBoundary(cleaned.replace(/\?+/g, '.'), preferredWords, absoluteWords)
  );
}

function isApiErrorMessage(text: string) {
  return String(text || '').startsWith('[API error:');
}

function buildClientFallbackTutorMessage({
  lessonTitle,
  objective,
  description,
  facts,
  currentPhase,
  isOpening,
  allowQuestion,
}: {
  lessonTitle: string;
  objective: string;
  description: string;
  facts: string[];
  currentPhase: Phase;
  isOpening: boolean;
  allowQuestion: boolean;
}) {
  if (isOpening || currentPhase === 'HOOK') {
    const first = firstStatement(description) || firstStatement(objective) || `${lessonTitle} is the next concept in this lesson.`;
    const second = firstStatement(facts[0]) || `For now, focus on the main idea behind ${lessonTitle}; we will build from there one step at a time.`;
    return fitTextToSentenceBoundary(`${first} ${second}`, 65, 90);
  }

  const base = [description.trim(), facts[0]?.trim() || objective.trim()]
    .filter(Boolean)
    .join(' ')
    .trim() || `Let's focus on ${lessonTitle}.`;

  if (currentPhase === 'CHECK') {
    return `Quick check: in one short sentence, what is the main job of ${lessonTitle}?`;
  }

  if (currentPhase === 'REINFORCE') {
    return fitTextToSentenceBoundary(base, 55, 80);
  }

  if (!isOpening && allowQuestion) {
    return compactTutorDump(`${base}\n\nWhat part of that feels clear already?`, lessonTitle, isOpening, true);
  }

  return compactTutorDump(base, lessonTitle, isOpening, false);
}

function extractFirstCodeBlock(text: string) {
  const blocks = text.split(/```/);
  for (let i = 1; i < blocks.length; i += 2) {
    const lines = blocks[i].split('\n');
    const firstLine = lines[0]?.trim() ?? '';
    const looksLikeLanguage = firstLine.length > 0 && !/\s/.test(firstLine);
    const code = (looksLikeLanguage ? lines.slice(1) : lines).join('\n').trim();
    if (code) return code;
  }
  return null;
}

function extractFirstCodeLanguage(text: string) {
  const blocks = text.split(/```/);
  for (let i = 1; i < blocks.length; i += 2) {
    const lines = blocks[i].split('\n');
    const firstLine = lines[0]?.trim() ?? '';
    const looksLikeLanguage = firstLine.length > 0 && !/\s/.test(firstLine);
    const code = (looksLikeLanguage ? lines.slice(1) : lines).join('\n').trim();
    if (!code) continue;
    return looksLikeLanguage ? firstLine.toLowerCase() : 'txt';
  }
  return null;
}

function getCodeExtension(language: string) {
  switch (language) {
    case 'python':
      return 'py';
    case 'javascript':
      return 'js';
    case 'typescript':
      return 'ts';
    case 'markdown':
      return 'md';
    case 'shell':
    case 'bash':
    case 'zsh':
      return 'sh';
    default:
      return language || 'txt';
  }
}

function isCodingWorkspaceLesson(...parts: string[]) {
  const joined = parts.filter(Boolean).join(' ');
  return /```(?:sql|python|py|javascript|js|typescript|ts|html|css|bash|sh)\b/i.test(joined) || CODING_WORKSPACE_TOPICS.test(joined);
}

function inferWorkspaceLanguage(...parts: string[]) {
  const joined = parts.filter(Boolean).join(' ');
  if (/```sql\b|\b(sql|select|from|where|join|group by|order by|having)\b/i.test(joined)) return 'sql';
  if (/```python\b|```py\b|\bpython\b/i.test(joined)) return 'python';
  if (/```typescript\b|```ts\b|\btypescript\b/i.test(joined)) return 'typescript';
  if (/```javascript\b|```js\b|\bjavascript\b/i.test(joined)) return 'javascript';
  if (/```html\b|\bhtml\b/i.test(joined)) return 'html';
  if (/```css\b|\bcss\b/i.test(joined)) return 'css';
  if (/```bash\b|```sh\b|```shell\b|\b(bash|shell|terminal|command line)\b/i.test(joined)) return 'bash';
  return 'txt';
}

function looksLikeCodePracticeQuestion(question: string) {
  return /\b(write|build|implement|create|code|query|select|return|render|style|fix|complete|update|sort|filter|loop|function|component|command)\b/i.test(question);
}

function getCodeEditorPlaceholder(language: string, question: string) {
  const prompt = question.trim() || 'Write your answer here.';
  if (language === 'sql') return `-- ${prompt}\n`;
  if (language === 'html') return `<!-- ${prompt} -->\n`;
  if (language === 'css') return `/* ${prompt} */\n`;
  if (language === 'javascript' || language === 'typescript') return `// ${prompt}\n`;
  return `# ${prompt}\n`;
}

function buildWorkspaceTutorContext(messages: ChatMsg[]) {
  return messages
    .filter((message) => message.who === 'tutor')
    .map((message) => {
      const visual = typeof message.visual === 'string' && message.visual.trim() ? `\n\nVisual:\n${message.visual.trim()}` : '';
      return `${message.text}${visual}`;
    })
    .join('\n\n');
}

function extractFirstMarkdownTable(text: string) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i += 1) {
    if (isMarkdownTableLine(lines[i]) && isMarkdownTableDivider(lines[i + 1])) {
      const header = parseMarkdownTableRow(lines[i]);
      const rows: string[][] = [];
      let cursor = i + 2;
      while (cursor < lines.length && isMarkdownTableLine(lines[cursor])) {
        rows.push(parseMarkdownTableRow(lines[cursor]));
        cursor += 1;
      }
      return { header, rows };
    }
  }
  return null;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getAmbientPalette(seed: string) {
  const palettes = [
    {
      base: '#171512',
      mid: '#4a2f22',
      glowA: 'rgba(226, 115, 77, 0.34)',
      glowB: 'rgba(224, 179, 92, 0.22)',
      glowC: 'rgba(246, 239, 225, 0.18)',
      line: 'rgba(246, 239, 225, 0.13)',
    },
    {
      base: '#13171c',
      mid: '#2a4452',
      glowA: 'rgba(115, 152, 255, 0.28)',
      glowB: 'rgba(106, 194, 178, 0.22)',
      glowC: 'rgba(241, 237, 226, 0.16)',
      line: 'rgba(241, 237, 226, 0.12)',
    },
    {
      base: '#181317',
      mid: '#4a3348',
      glowA: 'rgba(201, 112, 147, 0.26)',
      glowB: 'rgba(131, 144, 235, 0.22)',
      glowC: 'rgba(245, 239, 228, 0.16)',
      line: 'rgba(245, 239, 228, 0.12)',
    },
    {
      base: '#111714',
      mid: '#2f493f',
      glowA: 'rgba(112, 183, 146, 0.26)',
      glowB: 'rgba(204, 169, 88, 0.18)',
      glowC: 'rgba(244, 239, 227, 0.16)',
      line: 'rgba(244, 239, 227, 0.12)',
    },
  ];
  return palettes[hashString(seed) % palettes.length];
}

function tutorTextUnlocksQuiz(text: string) {
  return /ready to move on|ready for the next concept|you can quiz now|take the lesson quiz|take quiz to advance/i.test(String(text || ''));
}

function LessonCanvas({
  course,
  mod,
  lesson,
  latestTutorText,
  latestVisual,
  readyToMoveOn,
  narrow,
  chatMessages,
}: {
  course: Course;
  mod: Course['curriculum']['modules'][number];
  lesson: Course['curriculum']['modules'][number]['lessons'][number];
  latestTutorText: string;
  latestVisual: string;
  readyToMoveOn: boolean;
  narrow: boolean;
  chatMessages: ChatMsg[];
}) {
  const { t, dark } = useTheme();
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncedVisual, setSyncedVisual] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('visual');
  const [draftCode, setDraftCode] = useState('');
  const [workspaceQuestions, setWorkspaceQuestions] = useState<string[]>([]);
  const [workspaceQuestionIndex, setWorkspaceQuestionIndex] = useState(0);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceChecking, setWorkspaceChecking] = useState(false);
  const [workspaceHintLoading, setWorkspaceHintLoading] = useState(false);
  const [workspaceHintError, setWorkspaceHintError] = useState('');
  const [workspaceHint, setWorkspaceHint] = useState('');
  const [workspaceResult, setWorkspaceResult] = useState<WorkspaceEvaluation | null>(null);
  const workspaceAutoloadedRef = useRef(false);

  async function handleSyncCanvas() {
    if (syncLoading) return;
    setSyncLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages.slice(-5),
          courseTitle: course.subject,
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          lessonObjective: lesson.objective,
          phase: 'EXPLAIN',
          wantsVisualExample: true,
          isOpening: false,
          allowQuestion: false,
        }),
      });
      const data = await res.json();
      if (data.visual) setSyncedVisual(data.visual);
    } catch {
      // silent fail
    } finally {
      setSyncLoading(false);
    }
  }

  const visualSource = syncedVisual || latestVisual || latestTutorText;
  const code = extractFirstCodeBlock(visualSource);
  const codeLanguage = extractFirstCodeLanguage(visualSource) || 'txt';
  const codeExtension = getCodeExtension(codeLanguage);
  const table = extractFirstMarkdownTable(visualSource);
  const chartMode = !code && !table && /(trend|chart|graph|growth|volume|increase|decrease|over time)/i.test(latestTutorText);
  const ambientMode = !table && !code && !chartMode;
  const accent = readyToMoveOn ? t.green : t.red;
  const objective = normalizeLessonObjective(lesson.objective, lesson.title);
  const ambientPalette = getAmbientPalette(`${course.subject}:${lesson.title}`);
  const workspaceContext = buildWorkspaceTutorContext(chatMessages);
  const workspaceLanguage = code && codeLanguage !== 'txt'
    ? codeLanguage
    : inferWorkspaceLanguage(course.subject, mod.title, lesson.title, objective, latestTutorText, latestVisual, visualSource);
  const workspaceExtension = getCodeExtension(workspaceLanguage);
  const isCodingLesson = isCodingWorkspaceLesson(course.subject, mod.title, lesson.title, objective, latestTutorText, latestVisual, visualSource);
  const showCodingTabs = isCodingLesson;
  const workspaceQuestion = workspaceQuestions[workspaceQuestionIndex] ?? '';
  const hasWorkspacePractice = isCodingLesson || workspaceQuestions.length > 0 || workspaceLoading || !!workspaceError || !!workspaceHint || !!workspaceResult;
  const codeLineCount = Math.max(1, draftCode.split('\n').length);
  const workspaceTabs: { id: WorkspaceTab; label: string; sub: string }[] = showCodingTabs
    ? [
        { id: 'visual', label: 'Visual', sub: table ? 'table' : code ? 'example' : chartMode ? 'chart' : 'context' },
        { id: 'code', label: 'Code', sub: hasWorkspacePractice ? workspaceExtension : code ? codeLanguage : 'ide' },
        { id: 'output', label: 'Output', sub: workspaceResult ? 'feedback' : workspaceHint ? 'hint' : hasWorkspacePractice ? 'check' : 'tests' },
      ]
    : [
        { id: 'visual', label: 'Visual', sub: table ? 'table' : code ? 'example' : chartMode ? 'chart' : 'context' },
      ];
  const workspaceCanvasMinHeight =
    activeTab === 'code'
      ? (hasWorkspacePractice ? (narrow ? 520 : 640) : (narrow ? 420 : 520))
      : activeTab === 'output'
        ? (narrow ? 320 : 380)
        : ambientMode
          ? (narrow ? 360 : 430)
          : chartMode
            ? (narrow ? 380 : 460)
            : table
              ? (narrow ? 400 : 500)
              : code
                ? (narrow ? 380 : 460)
                : (narrow ? 360 : 430);

  function resetWorkspaceFeedback() {
    setWorkspaceError('');
    setWorkspaceHint('');
    setWorkspaceHintError('');
    setWorkspaceResult(null);
  }

  function handleResetWorkspaceDraft() {
    setDraftCode(workspaceQuestion ? '' : code ?? '');
  }

  async function handleGenerateWorkspacePrompts() {
    if (workspaceLoading) return;
    setWorkspaceLoading(true);
    resetWorkspaceFeedback();
    try {
      const data = await apiJson<{ questions?: unknown[]; isCoding?: boolean; error?: string }>('/api/handson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: course.subject,
          moduleTitle: mod.title,
          lessonTitle: lesson.title,
          chatHistory: chatMessages,
          forceCoding: isCodingLesson,
        }),
      });
      if (data.error) throw new Error(data.error || 'Could not generate coding practice right now.');
      const questions = Array.isArray(data.questions)
        ? data.questions.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 5)
        : [];
      if (questions.length === 0) throw new Error('No coding prompts came back for this lesson.');
      const preferredIndex = questions.findIndex(looksLikeCodePracticeQuestion);
      setWorkspaceQuestions(questions);
      setWorkspaceQuestionIndex(preferredIndex >= 0 ? preferredIndex : 0);
      setDraftCode('');
    } catch (err) {
      setWorkspaceError(normalizeApiErrorMessage(err instanceof Error ? err.message : 'Could not generate coding practice right now.', 'Could not generate coding practice right now.'));
    } finally {
      setWorkspaceLoading(false);
    }
  }

  async function handleCheckWorkspaceAnswer() {
    if (!workspaceQuestion || !draftCode.trim() || workspaceChecking) return;
    setWorkspaceChecking(true);
    setWorkspaceError('');
    setWorkspaceHintError('');
    try {
      const data = await apiJson<{ score: number; correct: boolean; whatWasRight: string; whatWasMissing: string; betterAnswer: string; error?: string }>('/api/handson-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: workspaceQuestion,
          userAnswer: draftCode,
          courseTitle: course.subject,
          lessonTitle: lesson.title,
          isCoding: true,
        }),
      });
      if (data.error) throw new Error(data.error || 'Could not check your answer right now.');
      setWorkspaceResult(data);
      setWorkspaceHint('');
      setActiveTab('output');
    } catch (err) {
      setWorkspaceError(normalizeApiErrorMessage(err instanceof Error ? err.message : 'Could not check your answer right now.', 'Could not check your answer right now.'));
      setActiveTab('output');
    } finally {
      setWorkspaceChecking(false);
    }
  }

  async function handleGetWorkspaceHint() {
    if (!workspaceQuestion || workspaceHintLoading) return;
    setWorkspaceHintLoading(true);
    setWorkspaceError('');
    setWorkspaceHintError('');
    try {
      const data = await apiJson<{ hint?: string; error?: string }>('/api/handson-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: workspaceQuestion,
          courseTitle: course.subject,
          lessonTitle: lesson.title,
          isCoding: true,
          notesContext: workspaceContext,
        }),
      });
      if (data.error) throw new Error(data.error || 'Could not generate a hint right now.');
      setWorkspaceHint(String(data.hint || '').trim());
      setActiveTab('output');
    } catch (err) {
      setWorkspaceHintError(normalizeApiErrorMessage(err instanceof Error ? err.message : 'Could not generate a hint right now.', 'Could not generate a hint right now.'));
      setActiveTab('output');
    } finally {
      setWorkspaceHintLoading(false);
    }
  }

  function handleNextWorkspacePrompt() {
    resetWorkspaceFeedback();
    if (workspaceQuestions.length > 1) {
      setWorkspaceQuestionIndex((prev) => (prev + 1) % workspaceQuestions.length);
      setDraftCode('');
      return;
    }
    void handleGenerateWorkspacePrompts();
  }

  useEffect(() => {
    if (workspaceQuestion) return;
    setDraftCode(code ?? '');
  }, [code, workspaceQuestion]);

  useEffect(() => {
    if (activeTab !== 'code' || !isCodingLesson || workspaceQuestions.length > 0 || workspaceLoading || workspaceAutoloadedRef.current) return;
    workspaceAutoloadedRef.current = true;
    void handleGenerateWorkspacePrompts();
  }, [activeTab, isCodingLesson, workspaceQuestions.length, workspaceLoading]);

  useEffect(() => {
    if (!showCodingTabs && activeTab !== 'visual') {
      setActiveTab('visual');
    }
  }, [activeTab, showCodingTabs]);

  return (
    <div style={{ position: narrow ? 'relative' : 'sticky', top: 20 }}>
      <style>{`
        @keyframes learnCanvasBlobA {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(42px, -28px, 0) scale(1.08); }
        }

        @keyframes learnCanvasBlobB {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-36px, 34px, 0) scale(1.12); }
        }

        @keyframes learnCanvasBlobC {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(18px, 22px, 0) scale(0.96); }
        }

        @keyframes learnCanvasSheen {
          0%, 100% { opacity: 0.32; transform: translateX(-4%); }
          50% { opacity: 0.5; transform: translateX(4%); }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.mute }}>
            Workspace
          </span>
          {readyToMoveOn && (
            <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.green }}>
              objective complete
            </span>
          )}
        </div>
        <button
          onClick={handleSyncCanvas}
          disabled={syncLoading || chatMessages.filter(m => m.who === 'tutor').length === 0}
          style={{
            padding: '6px 12px',
            background: syncLoading ? 'transparent' : (dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.06)'),
            border: `1px solid ${t.ruleFaint}`,
            borderRadius: 999,
            color: t.mute,
            fontFamily: HC.mono,
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: syncLoading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {syncLoading ? '⟳ syncing…' : '⟳ refresh visual'}
        </button>
      </div>

      {workspaceTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {workspaceTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${active ? t.ink : t.ruleFaint}`,
                  background: active ? t.ink : (dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.035)'),
                  color: active ? t.paper : t.mute,
                  fontFamily: HC.mono,
                  fontSize: 9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                <span>{tab.label}</span>
                <span style={{ opacity: active ? 0.72 : 0.56, fontSize: 8 }}>{tab.sub}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          minHeight: workspaceCanvasMinHeight,
          borderRadius: 28,
          overflow: 'hidden',
          background: dark
            ? (ambientMode
              ? `linear-gradient(145deg, ${ambientPalette.base}, ${ambientPalette.mid} 48%, rgba(19, 17, 15, 0.98) 100%)`
              : `linear-gradient(145deg, rgba(26,21,16,0.98), rgba(66,43,28,0.96) 38%, rgba(199,93,62,0.78) 100%)`)
            : 'linear-gradient(145deg, #faf7f0, #f4f0e8 52%, rgba(196,34,27,0.08) 100%)',
          boxShadow: dark ? '0 24px 80px rgba(0,0,0,0.24)' : '0 24px 80px rgba(26,21,16,0.10)',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: dark
            ? (ambientMode
              ? `radial-gradient(circle at 76% 22%, ${ambientPalette.glowC}, transparent 24%), radial-gradient(circle at 70% 70%, ${ambientPalette.glowB}, transparent 28%), radial-gradient(circle at 28% 86%, ${ambientPalette.glowA}, transparent 24%)`
              : 'radial-gradient(circle at 76% 22%, rgba(244,240,232,0.22), transparent 22%), radial-gradient(circle at 70% 70%, rgba(216,148,48,0.24), transparent 26%), radial-gradient(circle at 28% 86%, rgba(196,34,27,0.26), transparent 22%)')
            : 'radial-gradient(circle at 76% 22%, rgba(196,34,27,0.10), transparent 24%), radial-gradient(circle at 18% 84%, rgba(26,21,16,0.06), transparent 28%)',
        }} />
        <svg viewBox="0 0 1200 900" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: ambientMode ? 0.24 : 0.38 }}>
          {Array.from({ length: 18 }).map((_, idx) => (
            <path
              key={idx}
              d={`M-40 ${640 + idx * 22} C 220 ${560 - idx * 10}, 420 ${860 - idx * 8}, 760 ${610 + idx * 8} S 1120 ${320 + idx * 10}, 1260 ${460 + idx * 6}`}
              fill="none"
              stroke={dark ? (ambientMode ? ambientPalette.line : 'rgba(244,240,232,0.12)') : 'rgba(26,21,16,0.08)'}
              strokeWidth={2}
            />
          ))}
        </svg>

        <div style={{ position: 'relative', zIndex: 1, height: '100%', padding: narrow ? '24px 24px 28px' : '28px 30px 32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 0 }}>
            {activeTab === 'visual' ? (
              table ? (
                <div style={{ width: '100%', maxWidth: 920, borderRadius: 22, background: 'rgba(16,13,10,0.42)', border: '1px solid rgba(250,247,240,0.12)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 18px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.68)', borderBottom: '1px solid rgba(250,247,240,0.10)' }}>
                    live structure preview
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', color: HC.paper, tableLayout: 'fixed' }}>
                      <thead>
                        <tr>
                          {table.header.map((cell, idx) => (
                            <th key={idx} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)', borderBottom: '1px solid rgba(250,247,240,0.08)', whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', verticalAlign: 'top' }}>
                              {renderInlineFormatting(cell)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.slice(0, 5).map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            {row.map((cell, cellIdx) => (
                              <td key={cellIdx} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)', fontSize: 15, lineHeight: 1.5, whiteSpace: 'normal', overflowWrap: 'anywhere', wordBreak: 'break-word', verticalAlign: 'top' }}>
                                {renderInlineFormatting(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : code ? (
                <div style={{ width: '100%', maxWidth: 760, borderRadius: 22, background: '#120f0d', border: '1px solid rgba(250,247,240,0.10)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7b65' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f1bd57' }} />
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#78c26a' }} />
                    <span style={{ marginLeft: 10, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)' }}>
                      working example
                    </span>
                  </div>
                  <pre style={{ margin: 0, padding: '22px 22px 24px', color: HC.paper, fontFamily: HC.mono, fontSize: 15, lineHeight: 1.6, overflowX: 'auto' }}>
                    <code>{code}</code>
                  </pre>
                </div>
              ) : chartMode ? (
                <div style={{ width: '100%', maxWidth: 760, borderRadius: 22, background: 'rgba(16,13,10,0.42)', border: '1px solid rgba(250,247,240,0.12)', padding: '26px 26px 18px', backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)', marginBottom: 16 }}>
                    concept trend
                  </div>
                  <svg viewBox="0 0 720 340" style={{ width: '100%', height: 'auto' }}>
                    {[0, 1, 2, 3, 4].map((row) => (
                      <line key={row} x1="0" y1={40 + row * 58} x2="720" y2={40 + row * 58} stroke="rgba(250,247,240,0.08)" strokeWidth="1" />
                    ))}
                    <polyline
                      fill="none"
                      stroke={accent}
                      strokeWidth="6"
                      points="20,286 110,250 190,258 270,220 360,226 450,180 540,154 620,96 700,54"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: 1080, position: 'relative', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(250,247,240,0.10)', background: `linear-gradient(145deg, ${ambientPalette.base}, ${ambientPalette.mid} 60%, rgba(245,238,225,0.04) 100%)`, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
                  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 82% 14%, ${ambientPalette.glowC}, transparent 28%), radial-gradient(circle at 10% 80%, ${ambientPalette.glowA}, transparent 30%)` }} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(250,247,240,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,247,240,0.2) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
                  <div style={{ position: 'relative', zIndex: 1, padding: narrow ? '24px 22px 26px' : '28px 28px 30px' }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.50)', marginBottom: 16 }}>
                      Key facts
                    </div>
                    {Array.isArray((lesson as any).facts) && (lesson as any).facts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {((lesson as any).facts as string[]).map((fact: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'start' }}>
                            <span style={{ fontFamily: HC.mono, fontSize: 11, color: accent, flexShrink: 0, marginTop: 2, opacity: 0.9 }}>
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span style={{ fontSize: narrow ? 14 : 15, lineHeight: 1.55, color: 'rgba(250,247,240,0.88)', letterSpacing: '-0.01em' }}>
                              {fact}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(250,247,240,0.72)', fontStyle: 'italic' }}>
                        {objective}
                      </div>
                    )}
                    <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(250,247,240,0.10)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        mod.title,
                        readyToMoveOn ? '✓ objective covered' : 'lesson grounded',
                      ].map((item) => (
                        <div key={item} style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(250,247,240,0.08)', color: 'rgba(250,247,240,0.70)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(250,247,240,0.08)' }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            ) : activeTab === 'code' ? (
              <div style={{ width: '100%', maxWidth: 920, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.68)' : t.mute }}>
                    {hasWorkspacePractice ? 'coding workspace' : 'mini ide'}
                  </div>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.54)' : t.mute }}>
                    {hasWorkspacePractice ? `${workspaceExtension} practice · ${codeLineCount} lines` : code ? `${codeLanguage} example · ${codeLineCount} lines` : 'opens for coding exercises'}
                  </div>
                </div>

                {hasWorkspacePractice ? (
                  <>
                    <div style={{ width: '100%', borderRadius: 22, background: dark ? 'rgba(16,13,10,0.46)' : 'rgba(255,255,255,0.45)', border: '1px solid rgba(250,247,240,0.10)', backdropFilter: 'blur(8px)', padding: narrow ? '22px 20px' : '24px 24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 14, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.56)' : t.mute, marginBottom: 8 }}>
                            Practice prompt
                          </div>
                          <div style={{ fontFamily: HC.serif, fontSize: narrow ? 24 : 30, lineHeight: 1.12, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, maxWidth: 680 }}>
                            {workspaceLoading && !workspaceQuestion
                              ? 'Generating a coding task grounded in this lesson…'
                              : workspaceQuestion || 'Open this tab on a coding lesson and Learnor will load a prompt here.'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {code && (
                            <button
                              onClick={() => setActiveTab('visual')}
                              style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(250,247,240,0.12)' : t.ruleFaint}`, background: 'transparent', color: dark ? 'rgba(250,247,240,0.72)' : t.ink, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                            >
                              View reference visual
                            </button>
                          )}
                          <button
                            onClick={() => void handleGenerateWorkspacePrompts()}
                            disabled={workspaceLoading}
                            style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(250,247,240,0.12)' : t.ruleFaint}`, background: workspaceLoading ? 'transparent' : (dark ? 'rgba(250,247,240,0.06)' : 'rgba(26,21,16,0.05)'), color: dark ? 'rgba(250,247,240,0.72)' : t.ink, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: workspaceLoading ? 'not-allowed' : 'pointer', opacity: workspaceLoading ? 0.5 : 1 }}
                          >
                            {workspaceQuestions.length > 0 ? 'Regenerate prompts' : 'Generate prompt'}
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {['lesson-grounded', workspaceExtension, code ? 'reference available' : 'scratchpad'].map((item) => (
                          <div key={item} style={{ padding: '7px 12px', borderRadius: 999, background: dark ? 'rgba(250,247,240,0.06)' : 'rgba(26,21,16,0.06)', color: dark ? 'rgba(250,247,240,0.72)' : t.ink, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            {item}
                          </div>
                        ))}
                      </div>

                      {workspaceError && !workspaceQuestion && (
                        <div style={{ marginTop: 16, padding: '11px 14px', borderRadius: 16, border: '1px solid rgba(196,34,27,0.24)', background: dark ? 'rgba(232,81,74,0.09)' : 'rgba(196,34,27,0.05)', color: dark ? HC.paper : t.ink, fontSize: 13, lineHeight: 1.55 }}>
                          {workspaceError}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: narrow ? 320 : 520, borderRadius: 22, background: '#120f0d', border: '1px solid rgba(250,247,240,0.10)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7b65' }} />
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f1bd57' }} />
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#78c26a' }} />
                        <span style={{ marginLeft: 10, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)' }}>
                          {lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson-workspace'}.{workspaceExtension}
                        </span>
                      </div>
                      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)' }}>
                        <div style={{ padding: '18px 10px 18px 0', background: 'rgba(250,247,240,0.04)', borderRight: '1px solid rgba(250,247,240,0.06)', textAlign: 'right', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.7, color: 'rgba(250,247,240,0.34)', userSelect: 'none', overflow: 'hidden' }}>
                          {Array.from({ length: codeLineCount }).map((_, idx) => (
                            <div key={idx}>{idx + 1}</div>
                          ))}
                        </div>
                        <textarea
                          value={draftCode}
                          onChange={(e) => setDraftCode(e.target.value)}
                          onKeyDown={(event) => handleCodeEditorKeyDown(event, draftCode, setDraftCode)}
                          spellCheck={false}
                          placeholder={getCodeEditorPlaceholder(workspaceLanguage, workspaceQuestion || 'Write your answer here.')}
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
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid rgba(250,247,240,0.08)' }}>
                        <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.54)' }}>
                          {workspaceChecking
                            ? 'checking your answer…'
                            : workspaceHintLoading
                            ? 'generating a useful hint…'
                            : workspaceResult
                            ? 'feedback is waiting in output'
                            : 'write the answer here, then check the logic'}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={handleResetWorkspaceDraft}
                            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.14)', background: 'transparent', color: 'rgba(250,247,240,0.72)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => void handleGetWorkspaceHint()}
                            disabled={!workspaceQuestion || workspaceHintLoading || workspaceLoading}
                            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.10)', background: 'rgba(250,247,240,0.05)', color: !workspaceQuestion || workspaceHintLoading || workspaceLoading ? 'rgba(250,247,240,0.34)' : 'rgba(250,247,240,0.72)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: !workspaceQuestion || workspaceHintLoading || workspaceLoading ? 'not-allowed' : 'pointer', opacity: !workspaceQuestion || workspaceHintLoading || workspaceLoading ? 0.55 : 1 }}
                          >
                            {workspaceHintLoading ? 'Hinting…' : 'Show hint'}
                          </button>
                          <button
                            onClick={() => void handleCheckWorkspaceAnswer()}
                            disabled={!workspaceQuestion || !draftCode.trim() || workspaceChecking || workspaceLoading}
                            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.10)', background: !workspaceQuestion || !draftCode.trim() || workspaceChecking || workspaceLoading ? 'rgba(250,247,240,0.05)' : 'rgba(250,247,240,0.12)', color: !workspaceQuestion || !draftCode.trim() || workspaceChecking || workspaceLoading ? 'rgba(250,247,240,0.34)' : HC.paper, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: !workspaceQuestion || !draftCode.trim() || workspaceChecking || workspaceLoading ? 'not-allowed' : 'pointer', opacity: !workspaceQuestion || !draftCode.trim() || workspaceChecking || workspaceLoading ? 0.55 : 1 }}
                          >
                            {workspaceChecking ? 'Checking…' : 'Check answer'}
                          </button>
                          <button
                            onClick={handleNextWorkspacePrompt}
                            disabled={workspaceLoading}
                            style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.10)', background: 'rgba(250,247,240,0.05)', color: workspaceLoading ? 'rgba(250,247,240,0.34)' : 'rgba(250,247,240,0.72)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: workspaceLoading ? 'not-allowed' : 'pointer', opacity: workspaceLoading ? 0.55 : 1 }}
                          >
                            {workspaceQuestions.length > 1 ? 'Next prompt' : 'New prompt'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {(workspaceError && workspaceQuestion) || workspaceHintError ? (
                      <div style={{ padding: '11px 14px', borderRadius: 16, border: '1px solid rgba(196,34,27,0.24)', background: dark ? 'rgba(232,81,74,0.09)' : 'rgba(196,34,27,0.05)', color: dark ? HC.paper : t.ink, fontSize: 13, lineHeight: 1.55 }}>
                        {workspaceHintError || workspaceError}
                      </div>
                    ) : null}
                  </>
                ) : code ? (
                  <div style={{ display: 'flex', flexDirection: 'column', minHeight: narrow ? 320 : 520, borderRadius: 22, background: '#120f0d', border: '1px solid rgba(250,247,240,0.10)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff7b65' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#f1bd57' }} />
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#78c26a' }} />
                      <span style={{ marginLeft: 10, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)' }}>
                        {lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lesson-example'}.{codeExtension}
                      </span>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)' }}>
                      <div style={{ padding: '18px 10px 18px 0', background: 'rgba(250,247,240,0.04)', borderRight: '1px solid rgba(250,247,240,0.06)', textAlign: 'right', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.7, color: 'rgba(250,247,240,0.34)', userSelect: 'none', overflow: 'hidden' }}>
                        {draftCode.split('\n').map((_, idx) => (
                          <div key={idx}>{idx + 1}</div>
                        ))}
                      </div>
                      <textarea
                        value={draftCode}
                        onChange={(e) => setDraftCode(e.target.value)}
                        onKeyDown={(event) => handleCodeEditorKeyDown(event, draftCode, setDraftCode)}
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
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderTop: '1px solid rgba(250,247,240,0.08)' }}>
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.54)' }}>
                        Tutor can teach against a real editor here.
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => setDraftCode(code ?? '')} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.14)', background: 'transparent', color: 'rgba(250,247,240,0.72)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}>
                          Reset
                        </button>
                        {['Run', 'Test'].map((label) => (
                          <div key={label} style={{ padding: '7px 12px', borderRadius: 999, border: '1px solid rgba(250,247,240,0.08)', background: 'rgba(250,247,240,0.05)', color: 'rgba(250,247,240,0.34)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                            {label} soon
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '100%', maxWidth: 820, borderRadius: 24, border: '1px solid rgba(250,247,240,0.10)', background: dark ? 'rgba(16,13,10,0.46)' : 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', padding: narrow ? '24px 22px' : '30px 30px' }}>
                    <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 10 }}>
                      Code lives here when the lesson needs it.
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? 'rgba(250,247,240,0.78)' : t.mute, maxWidth: 620 }}>
                      For coding-heavy hands-on steps, this workspace will load starter files, let the learner edit code, and give the tutor a stable place to debug against real output.
                    </div>
                    <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {['starter files', 'run / test', 'error feedback', 'tutor-guided fixes'].map((item) => (
                        <div key={item} style={{ padding: '7px 12px', borderRadius: 999, background: dark ? 'rgba(250,247,240,0.06)' : 'rgba(26,21,16,0.06)', color: dark ? 'rgba(250,247,240,0.72)' : t.ink, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : activeTab === 'output' ? (
              hasWorkspacePractice ? (
                <div style={{ width: '100%', maxWidth: 820, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ width: '100%', borderRadius: 24, border: '1px solid rgba(250,247,240,0.10)', background: dark ? 'rgba(16,13,10,0.46)' : 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', padding: narrow ? '24px 22px' : '30px 30px' }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.56)' : t.mute, marginBottom: 10 }}>
                      Output · tutor feedback
                    </div>

                    {workspaceChecking || workspaceHintLoading ? (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 12 }}>
                          {workspaceChecking ? 'Checking your answer…' : 'Generating a useful hint…'}
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? 'rgba(250,247,240,0.78)' : t.mute }}>
                          Learnor is reading the current draft and grounding the feedback in this lesson before it replies.
                        </div>
                      </>
                    ) : workspaceResult ? (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: workspaceResult.correct ? t.green : t.red, marginBottom: 12 }}>
                          {workspaceResult.correct ? 'Nice. The solution is working.' : 'Close, but there are gaps to fix.'}
                        </div>
                        <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: workspaceResult.correct ? t.green : t.red, marginBottom: 16 }}>
                          {workspaceResult.score}/100
                        </div>
                        {workspaceResult.whatWasRight && (
                          <div style={{ padding: '12px 16px', borderRadius: 18, border: `1px solid ${dark ? 'rgba(106,174,127,0.25)' : 'rgba(45,106,63,0.18)'}`, background: dark ? 'rgba(106,174,127,0.08)' : 'rgba(45,106,63,0.05)', marginBottom: 12 }}>
                            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.green, marginBottom: 6 }}>What you got right</div>
                            <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? HC.paper : t.ink }}>{workspaceResult.whatWasRight}</div>
                          </div>
                        )}
                        {workspaceResult.whatWasMissing && (
                          <div style={{ padding: '12px 16px', borderRadius: 18, border: '1px solid rgba(196,34,27,0.22)', background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)', marginBottom: 12 }}>
                            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.red, marginBottom: 6 }}>What to fix</div>
                            <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? HC.paper : t.ink }}>{workspaceResult.whatWasMissing}</div>
                          </div>
                        )}
                        {workspaceResult.betterAnswer && (
                          <div style={{ padding: '12px 16px', borderRadius: 18, border: `1px solid ${dark ? 'rgba(250,247,240,0.10)' : t.ruleFaint}`, background: dark ? 'rgba(250,247,240,0.04)' : 'rgba(26,21,16,0.04)' }}>
                            <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.62)' : t.mute, marginBottom: 8 }}>Learnor says</div>
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: HC.mono, fontSize: 13, lineHeight: 1.7, color: dark ? HC.paper : t.ink }}>
                              {workspaceResult.betterAnswer}
                            </div>
                          </div>
                        )}
                      </>
                    ) : workspaceHint || workspaceHintError ? (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 12 }}>
                          {workspaceHint ? 'Here is the nudge you needed.' : 'Hint generation failed this time.'}
                        </div>
                        <div style={{ padding: '12px 16px', borderRadius: 18, border: `1px solid ${workspaceHint ? (dark ? 'rgba(241,236,223,0.12)' : 'rgba(26,21,16,0.10)') : 'rgba(196,34,27,0.22)'}`, background: workspaceHint ? (dark ? 'rgba(241,236,223,0.04)' : 'rgba(26,21,16,0.03)') : (dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)') }}>
                          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: workspaceHint ? t.amber : t.red, marginBottom: 6 }}>
                            {workspaceHint ? 'Hint' : 'Error'}
                          </div>
                          <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? HC.paper : t.ink }}>
                            {workspaceHint || workspaceHintError}
                          </div>
                        </div>
                      </>
                    ) : workspaceError ? (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: t.red, marginBottom: 12 }}>
                          The workspace hit a snag.
                        </div>
                        <div style={{ padding: '12px 16px', borderRadius: 18, border: '1px solid rgba(196,34,27,0.22)', background: dark ? 'rgba(232,81,74,0.08)' : 'rgba(196,34,27,0.04)', fontSize: 15, lineHeight: 1.65, color: dark ? HC.paper : t.ink }}>
                          {workspaceError}
                        </div>
                      </>
                    ) : workspaceQuestion ? (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 12 }}>
                          Check the answer or ask for a hint from Code.
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? 'rgba(250,247,240,0.78)' : t.mute }}>
                          This tab will hold tutor feedback for the current prompt after you use the workspace actions.
                        </div>
                        <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 18, background: dark ? 'rgba(250,247,240,0.04)' : 'rgba(26,21,16,0.04)', border: `1px solid ${dark ? 'rgba(250,247,240,0.08)' : t.ruleFaint}` }}>
                          <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.52)' : t.mute }}>
                            Current prompt
                          </div>
                          <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.6, color: dark ? HC.paper : t.ink }}>
                            {workspaceQuestion}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 12 }}>
                          Open Code and generate a lesson-grounded prompt.
                        </div>
                        <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? 'rgba(250,247,240,0.78)' : t.mute }}>
                          Once the coding workspace has a task, tutor feedback will show up here instead of the old placeholder copy.
                        </div>
                      </>
                    )}

                    <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setActiveTab('code')}
                        style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(250,247,240,0.12)' : t.ruleFaint}`, background: 'transparent', color: dark ? 'rgba(250,247,240,0.72)' : t.ink, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Back to code
                      </button>
                      <button
                        onClick={() => { setActiveTab('code'); handleNextWorkspacePrompt(); }}
                        disabled={workspaceLoading}
                        style={{ padding: '8px 12px', borderRadius: 999, border: `1px solid ${dark ? 'rgba(250,247,240,0.12)' : t.ruleFaint}`, background: workspaceLoading ? 'transparent' : (dark ? 'rgba(250,247,240,0.06)' : 'rgba(26,21,16,0.05)'), color: workspaceLoading ? (dark ? 'rgba(250,247,240,0.34)' : t.mute) : (dark ? 'rgba(250,247,240,0.72)' : t.ink), fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: workspaceLoading ? 'not-allowed' : 'pointer', opacity: workspaceLoading ? 0.55 : 1 }}
                      >
                        {workspaceQuestions.length > 1 ? 'Next prompt' : 'New prompt'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ width: '100%', maxWidth: 820, borderRadius: 24, border: '1px solid rgba(250,247,240,0.10)', background: dark ? 'rgba(16,13,10,0.46)' : 'rgba(255,255,255,0.45)', backdropFilter: 'blur(8px)', padding: narrow ? '24px 22px' : '30px 30px' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.56)' : t.mute, marginBottom: 10 }}>
                    Output · future runner
                  </div>
                  <div style={{ fontFamily: HC.serif, fontSize: narrow ? 28 : 36, lineHeight: 1, letterSpacing: '-0.03em', color: dark ? HC.paper : t.ink, marginBottom: 12 }}>
                    Run logs, tests, and tracebacks will land here.
                  </div>
                  <div style={{ fontSize: 15, lineHeight: 1.65, color: dark ? 'rgba(250,247,240,0.78)' : t.mute }}>
                    Once hands-on mode gets live execution, this panel becomes the place for stdout, failing tests, error stacks, and the tutor’s debugging commentary.
                  </div>
                  <div style={{ marginTop: 18, padding: '14px 16px', borderRadius: 18, background: dark ? 'rgba(250,247,240,0.04)' : 'rgba(26,21,16,0.04)', border: `1px solid ${dark ? 'rgba(250,247,240,0.08)' : t.ruleFaint}` }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.52)' : t.mute }}>
                      Current draft
                    </div>
                    <div style={{ marginTop: 8, fontFamily: HC.mono, fontSize: 12, lineHeight: 1.6, color: dark ? 'rgba(250,247,240,0.78)' : t.ink }}>
                      {code ? `${codeLineCount} lines in the workspace editor.` : 'No live code in this lesson yet.'}
                    </div>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurriculumDrawer({
  course,
  open,
  onClose,
  onSelectLesson,
  notesOpen,
  setNotesOpen,
  isPremium,
}: {
  course: Course;
  open: boolean;
  onClose: () => void;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  notesOpen: number | null;
  setNotesOpen: React.Dispatch<React.SetStateAction<number | null>>;
  isPremium: boolean;
}) {
  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(20,18,16,0.44)', display: 'flex' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(360px, 92vw)',
          height: '100%',
          background: HC.bg,
          borderRight: `1px solid ${HC.ruleFaint}`,
          padding: '22px 20px 28px',
          overflowY: 'auto',
          boxShadow: '0 16px 60px rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', color: HC.mute, textTransform: 'uppercase' }}>
              {course.subject}
            </div>
            <div style={{ fontFamily: HC.serif, fontSize: 28, lineHeight: 1.02, letterSpacing: '-0.02em', marginTop: 6 }}>
              Curriculum
            </div>
          </div>
          <button onClick={onClose} style={{ ...btn.ghost, padding: '8px 4px', fontSize: 10 }}>
            Close
          </button>
        </div>

        {course.curriculum.modules.map((m, mi) => {
          const isCurrentMod = mi === course.currentModule;
          const modDone = m.quizPassed;
          return (
            <div key={m.title} style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em',
                color: modDone ? HC.mute : isCurrentMod ? HC.ink : HC.mute,
                textDecoration: modDone ? 'line-through' : 'none', textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                {String(mi + 1).padStart(2, '0')} · {m.title}
              </div>
              {m.lessons.map((l, li) => {
                const isActive = mi === course.currentModule && li === course.currentLesson;
                const isDone = l.completed;
                const hasNotes = !!l.notes;
                const isOpen = notesOpen === mi * 100 + li;
                return (
                  <div key={l.title} style={{ marginBottom: 8 }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectLesson(mi, li)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') onSelectLesson(mi, li);
                      }}
                      style={{
                      display: 'flex', alignItems: 'start', gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      background: isActive ? 'rgba(202,38,31,0.08)' : 'transparent',
                      borderRadius: 10,
                      padding: '7px 8px',
                      fontSize: 14, color: isActive ? HC.red : isDone ? HC.mute : HC.ink,
                      fontFamily: HC.serif, fontStyle: isActive ? 'italic' : 'normal',
                      cursor: 'pointer',
                    }}>
                      <span style={{ fontFamily: HC.mono, fontSize: 10, flexShrink: 0, marginTop: 4 }}>
                        {isDone ? '✓' : isActive ? '▸' : '○'}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ textDecoration: isDone ? 'line-through' : 'none' }}>{l.title}</div>
                        <div style={{ fontSize: 12, lineHeight: 1.45, color: HC.mute, marginTop: 3 }}>{l.objective}</div>
                      </div>
                      {hasNotes && isDone && isPremium && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotesOpen(isOpen ? null : mi * 100 + li);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: HC.mono, fontSize: 9, color: HC.mute, padding: 0, flexShrink: 0 }}
                        >
                          {isOpen ? 'hide' : 'notes'}
                        </button>
                      )}
                    </div>
                    {isOpen && l.notes && isPremium && (
                      <div style={{ marginLeft: 18, marginTop: 8, padding: '8px 10px', background: HC.paper, border: `1px solid ${HC.ruleFaint}`, fontSize: 11 }}>
                        {renderMarkdown(l.notes)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LearnContent({ course }: { course: Course }) {
  const navigate = useNavigate();
  const { state, dispatch } = useStore();
  const { user } = useAuth();
  const { dark } = useTheme();
  const theme = dark ? HCDark : HC;
  const panelFill = dark ? 'rgba(241,236,223,0.06)' : 'rgba(26,21,16,0.045)';
  const panelFillStrong = dark ? 'rgba(241,236,223,0.09)' : 'rgba(26,21,16,0.07)';
  const subtleText = dark ? 'rgba(241,236,223,0.58)' : 'rgba(26,21,16,0.52)';
  const faintText = dark ? 'rgba(241,236,223,0.44)' : 'rgba(26,21,16,0.40)';
  const headerButtonBase: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 999,
    border: `1px solid ${theme.ruleFaint}`,
    background: panelFillStrong,
    color: theme.ink,
    fontFamily: HC.mono,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  };
  const headerPrimaryButton: React.CSSProperties = {
    ...headerButtonBase,
    border: `1px solid ${theme.ink}`,
    background: theme.ink,
    color: theme.bg,
  };

  const [input, setInput] = useState('');
  const [curriculumOpen, setCurriculumOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);
  const [exampleMode, setExampleMode] = useState(true);
  const [speakingTs, setSpeakingTs] = useState<number | null>(null);
  const [voiceLoadingTs, setVoiceLoadingTs] = useState<number | null>(null);
  const [voiceFeedbackTs, setVoiceFeedbackTs] = useState<number | null>(null);
  const [voiceFeedbackMessage, setVoiceFeedbackMessage] = useState('');
  const [spokenWords, setSpokenWords] = useState(0);
  const [phase, setPhase] = useState<Phase>('HOOK');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1100 : false));
  // Ref-based guard so React StrictMode's double-effect fire doesn't send two intro messages
  const introFiredKey = useRef('');
  const lessonPlanRef = useRef('');
  const lessonKey = `${course.currentModule}:${course.currentLesson}`;

  const isPremium = state.profile?.plan === 'premium';

  // Daily message count across all courses
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMsgCount = isPremium ? 0 : Object.values(
    state.courses.reduce((acc: Record<string, number>, c) => {
      Object.values(c.lessonChats ?? {}).flat().forEach((m) => {
        if (m.who === 'user' && new Date(m.ts).toISOString().slice(0, 10) === todayKey) {
          acc[todayKey] = (acc[todayKey] ?? 0) + 1;
        }
      });
      return acc;
    }, {})
  ).reduce((a, b) => a + b, 0);
  const FREE_MSG_LIMIT = 25;
  const msgLimitReached = !isPremium && todayMsgCount >= FREE_MSG_LIMIT;

  const currentChat = (course.lessonChats?.[lessonKey] ?? []).filter((msg) => !isApiErrorMessage(msg.text));

  function stopVoicePlayback() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (speechUrlRef.current) {
      URL.revokeObjectURL(speechUrlRef.current);
      speechUrlRef.current = null;
    }
    setSpeakingTs(null);
    setVoiceLoadingTs(null);
    setSpokenWords(0);
  }

  async function speakTutorReply(text: string, ts: number) {
    const speechText = stripSpeechText(text);
    if (!speechText) return;
    stopVoicePlayback();
    setVoiceFeedbackTs(null);
    setVoiceFeedbackMessage('');
    setVoiceLoadingTs(ts);
    try {
      const res = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let message = errorText;
        try {
          const parsed = JSON.parse(errorText);
          message = parsed?.error || errorText;
        } catch { /* keep text response */ }
        const lowered = message.toLowerCase();
        if (lowered.includes('env')) setVoiceFeedbackMessage('voice env missing');
        else if (lowered.includes('invalid') || lowered.includes('unauthorized') || res.status === 401) setVoiceFeedbackMessage('invalid elevenlabs key');
        else if (lowered.includes('quota') || lowered.includes('credits')) setVoiceFeedbackMessage('elevenlabs quota/credits');
        else if (lowered.includes('voice') || res.status === 404) setVoiceFeedbackMessage('voice id not found');
        else setVoiceFeedbackMessage(`voice failed (${res.status})`);
        setVoiceFeedbackTs(ts);
        setVoiceLoadingTs(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      speechUrlRef.current = url;
      setSpeakingTs(ts);
      setSpokenWords(0);

      const words = speechText.split(/\s+/).filter(Boolean);
      const sync = () => {
        if (!audioRef.current || audioRef.current !== audio) return;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Math.max(1.6, words.length * 0.32);
        const nextCount = Math.min(words.length, Math.max(0, Math.ceil((audio.currentTime / duration) * words.length)));
        setSpokenWords(nextCount);
        if (!audio.paused && !audio.ended) requestAnimationFrame(sync);
      };

      audio.onplay = () => {
        setVoiceLoadingTs(null);
        requestAnimationFrame(sync);
      };
      audio.onended = () => {
        setSpokenWords(words.length);
        window.setTimeout(() => {
          if (audioRef.current === audio) stopVoicePlayback();
        }, 350);
      };
      audio.onerror = () => {
        setVoiceFeedbackTs(ts);
        setVoiceFeedbackMessage('audio playback failed');
        if (audioRef.current === audio) stopVoicePlayback();
      };
      await audio.play();
    } catch (err) {
      setVoiceFeedbackTs(ts);
      setVoiceFeedbackMessage(err instanceof DOMException && err.name === 'NotAllowedError' ? 'click once to allow audio' : 'voice failed');
      stopVoicePlayback();
    }
  }

  function handlePlayTutorReply(text: string, ts: number) {
    if (!isPremium) {
      alert('Voice playback is a Premium feature. Upgrade to unlock.');
      return;
    }
    if (speakingTs === ts) {
      stopVoicePlayback();
      setVoiceFeedbackTs(null);
      setVoiceFeedbackMessage('');
      return;
    }
    void speakTutorReply(text, ts);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat.length]);

  useEffect(() => {
    if (!course) return;
    const dateKey = new Date().toISOString().slice(0, 10);
    dispatch({ type: 'MARK_STUDIED', id: course.id, dateKey });
  }, [course?.id]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => () => {
    stopVoicePlayback();
  }, []);

  useEffect(() => {
    setPhase('HOOK');
    lessonPlanRef.current = '';
  }, [lessonKey]);

  // Auto intro message on first load of each lesson — ask prior knowledge before teaching
  useEffect(() => {
    const key = `${course.id}-${course.currentModule}-${course.currentLesson}`;
    if (currentChat.length > 0) return;
    if (introFiredKey.current === key) return;  // StrictMode guard
    introFiredKey.current = key;
    const mod = course.curriculum.modules[course.currentModule];
    const lesson = mod?.lessons[course.currentLesson];
    if (!mod || !lesson) return;
    dispatch({
      type: 'ADD_CHAT',
      id: course.id,
      lessonKey,
      msg: {
        who: 'tutor',
        text: `Before we dive in — how familiar are you with "${lesson.title}"? Complete beginner, seen it once or twice, or used it before?`,
        ts: Date.now(),
        readyToMoveOn: false,
      },
    });
    setPhase('ASSESS');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, course.currentModule, course.currentLesson, currentChat.length]);

  const mod = course.curriculum.modules[course.currentModule];
  const lesson = mod?.lessons[course.currentLesson];
  const lastTutorMsg = [...currentChat].reverse().find((msg) => msg.who === 'tutor');
  const tutorTurnCount = currentChat.filter((m) => m.who === 'tutor').length;
  const readyToMoveOn = tutorTurnCount >= 5 && currentChat.some((msg) => msg.who === 'tutor' && !!msg.readyToMoveOn);
  const latestTutorText = lastTutorMsg?.text ?? '';
  const latestVisual = lastTutorMsg?.visual ?? '';
  const lessonHasNotes = !!lesson?.notes;
  const canGenerateNotes = currentChat.some((msg) => msg.who === 'tutor');
  const completionPercent = Math.round(course.progress * 100);
  const lessonHeading = String(lesson?.title || mod?.title || 'Current lesson').trim();
  const moduleHeading = String(mod?.title || '').trim();
  const showModuleHeading = !!moduleHeading && moduleHeading.toLowerCase() !== lessonHeading.toLowerCase();

  async function handleQuickPrompt(prompt: string, phaseOverride?: Phase, requestOptions?: { wantsVisualExample?: boolean }) {
    if (!mod || !lesson || aiLoading || generatingNotes) return;
    if (phaseOverride && phaseOverride !== phase) {
      setPhase(phaseOverride);
    }
    await sendToAI(
      [...currentChat, { who: 'user', text: prompt, ts: Date.now() }],
      course.subject,
      mod.title,
      lesson.title,
      phaseOverride ?? phase,
      requestOptions,
    );
  }

  async function handleShowExample() {
    if (!lesson) return;
    const prompt = exampleMode
      ? `Show me one concrete example for "${lesson.title}" and put the example in the canvas visual. If it is about data, tables, rows, columns, keys, or SQL, use a markdown table in visual. Keep the chat text short.`
      : `Give me one short concrete example for "${lesson.title}" only.`;
    await handleQuickPrompt(prompt, undefined, { wantsVisualExample: exampleMode });
  }

  async function sendToAI(
    messages: ChatMsg[],
    courseTitle: string,
    moduleTitle: string,
    lessonTitle: string,
    currentPhase: Phase,
    options?: { isOpening?: boolean; lessonPlan?: string; wantsVisualExample?: boolean },
  ) {
    setAiLoading(true);
    try {
      const currentModuleIndex = course.currentModule;
      const currentLessonIndex = course.currentLesson;
      const safeObjective = normalizeLessonObjective(lesson?.objective, lessonTitle);
      const openingTurn = !!options?.isOpening;
      const safeMessages = messages.filter((m) => {
        const text = String(m.text ?? '').trim();
        if (!text) return false;
        if (isApiErrorMessage(text)) return false;
        return m.who === 'user' || m.who === 'tutor';
      });
      const tutorTurnCount = currentChat.filter((m) => m.who === 'tutor').length;
      const latestUserMessage = [...safeMessages].reverse().find((m) => m.who === 'user')?.text ?? '';
      const allowQuestion = shouldAskTutorQuestion(latestUserMessage, openingTurn, tutorTurnCount);
      const wantsCanvasVisual = !!options?.wantsVisualExample || isCanvasExampleRequest(latestUserMessage);
      const futureLessonTitles = course.curriculum.modules
        .flatMap((module, moduleIndex) => module.lessons.map((l, lessonIndex) => ({
          title: l.title,
          isFuture: moduleIndex > currentModuleIndex || (moduleIndex === currentModuleIndex && lessonIndex > currentLessonIndex),
        })))
        .filter((entry) => entry.isFuture)
        .map((entry) => entry.title);

      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          messages: safeMessages,
          courseTitle, moduleTitle, lessonTitle,
          lessonObjective: safeObjective,
          lessonScope: { futureLessonTitles },
          phase: currentPhase,
          isOpening: openingTurn,
          allowQuestion,
          conceptDescription: lesson?.description ?? '',
          conceptFacts: lesson?.facts ?? [],
          materialsContext: (course as EnrolledCourse).materialsContext ?? undefined,
          lessonPlan: options?.lessonPlan ?? lessonPlanRef.current ?? undefined,
          wantsVisualExample: wantsCanvasVisual,
        }),
      });
      const data = await res.json();
      if (res.status === 429 || data.limitReached) throw new Error(data.error);
      if (data.error) throw new Error(data.error);
      const normalizedText = compactTutorDump(String(data.text ?? ''), lessonTitle, openingTurn, allowQuestion);
      const responseVisual = typeof data.visual === 'string' && data.visual.trim() ? data.visual.trim() : undefined;
      const clientVisual = wantsCanvasVisual
        ? buildCanvasExampleVisual(lessonTitle, latestUserMessage, `${normalizedText}\n${responseVisual ?? ''}`)
        : undefined;

      if (data.askedQuestion) {
        setPhase('CHECK');
      } else if (currentPhase === 'HOOK') {
        setPhase('EXPLAIN');
      }

      const tutorText = normalizedText || buildClientFallbackTutorMessage({
        lessonTitle,
        objective: safeObjective,
        description: lesson?.description ?? '',
        facts: lesson?.facts ?? [],
        currentPhase,
        isOpening: openingTurn,
        allowQuestion,
      });
      const tutorTs = Date.now();
      dispatch({
        type: 'ADD_CHAT',
        id: course.id,
        lessonKey,
        msg: {
          who: 'tutor',
          text: tutorText,
          ts: tutorTs,
          readyToMoveOn: !!data.readyToMoveOn,
          visual: clientVisual || responseVisual,
        },
      });
    } catch (e) {
      const openingTurn = !!options?.isOpening;
      const tutorTurnCount = currentChat.filter((m) => m.who === 'tutor').length;
      const latestUserMessage = [...messages].reverse().find((m) => m.who === 'user')?.text ?? '';
      const allowQuestion = shouldAskTutorQuestion(latestUserMessage, openingTurn, tutorTurnCount);
      const wantsCanvasVisual = !!options?.wantsVisualExample || isCanvasExampleRequest(latestUserMessage);
      const fallbackText = buildClientFallbackTutorMessage({
        lessonTitle,
        objective: normalizeLessonObjective(lesson?.objective, lessonTitle),
        description: lesson?.description ?? '',
        facts: lesson?.facts ?? [],
        currentPhase,
        isOpening: openingTurn,
        allowQuestion,
      });

      if (currentPhase === 'HOOK') {
        setPhase('EXPLAIN');
      }

      const tutorTs = Date.now();
      dispatch({
        type: 'ADD_CHAT',
        id: course.id,
        lessonKey,
        msg: {
          who: 'tutor',
          text: fallbackText,
          ts: tutorTs,
          readyToMoveOn: false,
          visual: wantsCanvasVisual ? buildCanvasExampleVisual(lessonTitle, latestUserMessage, fallbackText) : undefined,
        },
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function sendUserText(rawText: string) {
    const text = rawText.trim();
    if (!text || !mod || !lesson) return;
    const userMsg: ChatMsg = { who: 'user', text, ts: Date.now() };
    dispatch({ type: 'ADD_CHAT', id: course.id, lessonKey, msg: userMsg });

    if (phase === 'ASSESS') {
      setPhase('HOOK');
      setAiLoading(true);
      let plan = '';
      try {
        const planRes = await fetch(apiUrl('/api/lesson-plan'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            courseTitle: course.subject,
            moduleTitle: mod.title,
            lessonTitle: lesson.title,
            lessonObjective: normalizeLessonObjective(lesson.objective, lesson.title),
            description: lesson.description ?? '',
            facts: lesson.facts ?? [],
            priorKnowledge: text,
          }),
        });
        if (planRes.ok) {
          const planData = await planRes.json();
          plan = planData.plan || '';
          lessonPlanRef.current = plan;
        }
      } catch { /* proceed without plan */ }
      await sendToAI([...currentChat, userMsg], course.subject, mod.title, lesson.title, 'HOOK', { isOpening: true, lessonPlan: plan });
      return;
    }

    const nextPhase: Phase = phase === 'CHECK' ? (isContinueOnly(text) ? 'EXPLAIN' : 'REINFORCE') : phase;
    if (phase === 'CHECK') setPhase(nextPhase);
    await sendToAI([...currentChat, userMsg], course.subject, mod.title, lesson.title, nextPhase);
  }

  async function handleSend() {
    const text = input.trim() || 'Continue.';
    setInput('');
    await sendUserText(text);
  }

  async function handleLessonDone() {
    if (!mod || !lesson) return;
    setGeneratingNotes(true);
    try {
      await generateNotesForLesson();
    } catch (err) {
      console.error('[notes generation failed]', (err as Error).message);
    } finally {
      setGeneratingNotes(false);
    }
    navigate(`/quiz/${course.id}/${course.currentModule}/${course.currentLesson}`);
  }

  function handleSelectLesson(moduleIndex: number, lessonIndex: number) {
    dispatch({ type: 'SELECT_LESSON', id: course.id, moduleIndex, lessonIndex });
    setNotesOpen(null);
    setCurriculumOpen(false);
    setPhase('HOOK');
  }

  async function generateNotesForLesson() {
    if (!mod || !lesson) return;
    const isLastLessonOfModule = course.currentLesson === mod.lessons.length - 1;
    const res = await fetch(apiUrl('/api/notes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseTitle: course.subject,
        moduleTitle: mod.title,
        lessonTitle: isLastLessonOfModule ? `Full module: ${mod.title}` : lesson.title,
        lessonObjective: lesson.objective,
        lessonDescription: lesson.description,
        lessonFacts: lesson.facts,
        chatHistory: currentChat,
        premium: isPremium,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    dispatch({ type: 'SAVE_LESSON_NOTES', id: course.id, moduleIndex: course.currentModule, lessonIndex: course.currentLesson, notes: data.notes });
    if (isLastLessonOfModule) {
      dispatch({ type: 'SAVE_MODULE_NOTES', id: course.id, moduleIndex: course.currentModule, notes: data.notes });
    }
  }

  async function handleGenerateNotesOnly() {
    if (!canGenerateNotes || !mod || !lesson) return;
    setGeneratingNotes(true);
    try {
      await generateNotesForLesson();
    } catch {}
    finally {
      setGeneratingNotes(false);
    }
  }

  const quickActions = phase === 'ASSESS'
    ? []
    : phase === 'CHECK'
    ? [
        { label: 'Explain more', action: () => handleQuickPrompt("I'm not sure, can you explain the answer?") },
        { label: 'Okay', action: () => handleQuickPrompt('Okay, got it.') },
      ]
    : phase === 'REINFORCE'
    ? [
        { label: 'Okay', action: () => handleQuickPrompt('Okay, got it.') },
        { label: 'Stop hallucinating', action: () => handleQuickPrompt('Stop. You are repeating yourself. You have already said this. Move forward to something completely new right now.') },
      ]
    : [
        { label: 'Continue', action: () => handleQuickPrompt('Continue.') },
        { label: 'Okay', action: () => handleQuickPrompt('Okay, got it.') },
        { label: 'Example', action: handleShowExample },
        { label: 'Simpler', action: () => handleQuickPrompt('Explain more simply.') },
        { label: 'Stop hallucinating', action: () => handleQuickPrompt('Stop. You are repeating yourself. You have already said this. Move forward to something completely new right now.') },
      ];

  return (
    <div style={{ height: '100vh', background: theme.bg, color: theme.ink }}>
      <CurriculumDrawer
        course={course}
        open={curriculumOpen}
        onClose={() => setCurriculumOpen(false)}
        onSelectLesson={handleSelectLesson}
        notesOpen={notesOpen}
        setNotesOpen={setNotesOpen}
        isPremium={isPremium}
      />

      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(440px, 38vw) minmax(0, 1fr)', overflow: 'hidden' }}>
        <section style={{ background: theme.bg, color: theme.ink, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: narrow ? 'none' : `1px solid ${theme.ruleFaint}` }}>
          <div style={{ padding: '18px 18px 0', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
                padding: narrow ? '14px 14px 12px' : '16px 16px 14px',
                borderRadius: 22,
                border: `1px solid ${theme.ruleFaint}`,
                background: panelFill,
              }}
            >
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  ...btn.ghost,
                  padding: '8px 12px',
                  fontSize: 10,
                  color: theme.mute,
                  borderRadius: 999,
                  border: `1px solid ${theme.ruleFaint}`,
                  background: panelFillStrong,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}
              >
                ← dashboard
              </button>

              <div style={{ minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontFamily: HC.mono, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: faintText }}>
                  Learnor chat
                </div>
                <div style={{ marginTop: 5, fontFamily: HC.sans, fontSize: 13, lineHeight: 1.4, color: subtleText }}>
                  Ask, clarify, or get unstuck.
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 14px 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {currentChat.map((m, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: HC.mono,
                  fontSize: 8,
                  letterSpacing: '0.14em',
                  color: m.who === 'user' ? faintText : subtleText,
                  textTransform: 'uppercase',
                  marginBottom: 9,
                }}>
                  {m.who === 'user' ? 'You' : 'Learnor'}
                </div>
                {m.who === 'user' ? (
                  <div style={{
                    padding: '13px 15px',
                    borderRadius: 18,
                    background: panelFillStrong,
                    border: `1px solid ${theme.ruleFaint}`,
                    color: theme.ink,
                    fontSize: 15,
                    lineHeight: 1.55,
                  }}>
                    {m.text}
                  </div>
                ) : (
                  <div style={{ color: theme.ink, fontFamily: HC.sans, fontSize: 15.5, lineHeight: 1.72, letterSpacing: '-0.005em' }}>
                    {speakingTs === m.ts ? renderSpokenMessage(m.text, spokenWords) : renderChatMessage(m.text, theme, dark)}
                  </div>
                )}
                {m.who === 'tutor' && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handlePlayTutorReply(m.text, m.ts)}
                      disabled={voiceLoadingTs !== null && voiceLoadingTs !== m.ts}
                      aria-label={voiceLoadingTs === m.ts ? 'Preparing voice' : speakingTs === m.ts ? 'Stop voice' : 'Play voice'}
                      title={voiceLoadingTs === m.ts ? 'Preparing voice' : speakingTs === m.ts ? 'Stop voice' : 'Play voice'}
                      style={{
                        width: 34,
                        height: 34,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 999,
                        border: `1px solid ${speakingTs === m.ts ? theme.ink : theme.ruleFaint}`,
                        background: speakingTs === m.ts ? theme.ink : 'transparent',
                        color: speakingTs === m.ts ? theme.bg : theme.mute,
                        fontFamily: HC.mono,
                        fontSize: 12,
                        lineHeight: 1,
                        cursor: voiceLoadingTs !== null && voiceLoadingTs !== m.ts ? 'not-allowed' : 'pointer',
                        opacity: voiceLoadingTs !== null && voiceLoadingTs !== m.ts ? 0.45 : 1,
                      }}
                    >
                      {voiceLoadingTs === m.ts ? '…' : speakingTs === m.ts ? '■' : '▶'}
                    </button>

                    {voiceFeedbackTs === m.ts && voiceFeedbackMessage && (
                      <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.mute }}>
                        {voiceFeedbackMessage}
                      </div>
                    )}

                    {m.readyToMoveOn && tutorTurnCount >= 5 && (
                      <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7ad08b' }}>
                        lesson objective covered
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {aiLoading && (
              <div>
                <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', color: subtleText, textTransform: 'uppercase', marginBottom: 8 }}>
                  Learnor
                </div>
                <div style={{ fontFamily: HC.sans, fontSize: 15, fontStyle: 'italic', color: subtleText }}>
                  thinking…
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '10px 16px 14px', borderTop: `1px solid ${theme.ruleFaint}`, background: panelFill }}>
            {quickActions.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.action}
                    disabled={aiLoading || generatingNotes}
                    style={{
                      padding: '5px 11px',
                      borderRadius: 999,
                      border: `1px solid ${'primary' in action && action.primary ? theme.ink : theme.ruleFaint}`,
                      background: 'primary' in action && action.primary ? theme.ink : 'transparent',
                      color: 'primary' in action && action.primary ? theme.bg : theme.mute,
                      fontFamily: HC.mono,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      cursor: aiLoading || generatingNotes ? 'not-allowed' : 'pointer',
                      opacity: aiLoading || generatingNotes ? 0.4 : 1,
                      transition: 'opacity 120ms',
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {msgLimitReached && (
              <div style={{ marginBottom: 8, padding: '10px 14px', background: 'rgba(210,34,26,0.08)', border: '1px solid rgba(210,34,26,0.25)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.red }}>25 messages used today — upgrade for unlimited</span>
                <a href="/settings" style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.ink, borderBottom: `1px solid ${theme.ink}`, textDecoration: 'none', whiteSpace: 'nowrap' }}>Get Premium →</a>
              </div>
            )}
            <div
              style={{
                borderRadius: 16,
                background: panelFillStrong,
                border: `1px solid ${theme.ruleFaint}`,
                padding: 8,
              }}
            >
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={phase === 'ASSESS' ? 'Tell me about your experience with this topic…' : 'Ask for another example, or take the quiz whenever you feel ready…'}
                disabled={aiLoading || generatingNotes}
                rows={2}
                style={{
                  width: '100%',
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: theme.ink,
                  fontFamily: HC.sans,
                  fontSize: 16,
                  lineHeight: 1.55,
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <button
                  onClick={handleSend}
                  disabled={aiLoading || generatingNotes || msgLimitReached}
                  style={{
                    ...btn.primary,
                    padding: '8px 16px',
                    fontSize: 10,
                    background: theme.ink,
                    color: theme.bg,
                    opacity: aiLoading || generatingNotes || msgLimitReached ? 0.45 : 1,
                  }}
                >
                  {input.trim() ? 'Send ↵' : 'Continue ↵'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: theme.bg, color: theme.ink, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: narrow ? 18 : 22,
                padding: narrow ? '2px 2px 18px' : '4px 2px 20px',
                borderBottom: `1px solid ${theme.ruleFaint}`,
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: narrow ? '1fr' : 'minmax(0, 1.35fr) minmax(260px, 0.65fr)',
                  gap: narrow ? 18 : 20,
                  alignItems: 'start',
                }}
              >
                <div>
                  <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.red }}>
                    Chapter {String(course.currentModule + 1).padStart(2, '0')} · Lesson {String(course.currentLesson + 1).padStart(2, '0')}
                  </div>
                  <div style={{ marginTop: 8, fontFamily: HC.serif, fontSize: narrow ? 34 : 42, lineHeight: 0.98, letterSpacing: '-0.035em', color: theme.ink, maxWidth: 760 }}>
                    {lessonHeading}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                    {showModuleHeading ? (
                      <div style={{ padding: '6px 10px', borderRadius: 999, border: `1px solid ${theme.ruleFaint}`, background: panelFill, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: subtleText }}>
                        Module · {moduleHeading}
                      </div>
                    ) : null}
                    <div style={{ fontFamily: HC.sans, fontSize: 14, lineHeight: 1.5, color: subtleText }}>
                      {course.paused ? 'Course paused. Resume whenever you are ready.' : 'Tutor on the left, workspace on the right. Finish the lesson when it clicks.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <div style={{ padding: narrow ? '14px 14px 12px' : '16px 16px 14px', borderRadius: 22, border: `1px solid ${theme.ruleFaint}`, background: panelFillStrong, minWidth: 0 }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: faintText }}>
                      Progress
                    </div>
                    <div style={{ marginTop: 8, fontFamily: HC.serif, fontSize: narrow ? 28 : 34, lineHeight: 0.95, letterSpacing: '-0.03em', color: theme.ink }}>
                      {completionPercent}%
                    </div>
                    <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: dark ? 'rgba(250,247,240,0.08)' : 'rgba(26,21,16,0.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${completionPercent}%`, minWidth: completionPercent > 0 ? 10 : 0, height: '100%', borderRadius: 999, background: theme.red }} />
                    </div>
                    <div style={{ marginTop: 8, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: subtleText }}>
                      course completed
                    </div>
                  </div>

                  <div style={{ padding: narrow ? '14px 14px 12px' : '16px 16px 14px', borderRadius: 22, border: `1px solid ${theme.ruleFaint}`, background: panelFillStrong, minWidth: 0 }}>
                    <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: faintText }}>
                      Time left
                    </div>
                    <div style={{ marginTop: 10, minHeight: narrow ? 34 : 40, display: 'flex', alignItems: 'center' }}>
                      <Countdown deadline={course.deadline} paused={course.paused} size={narrow ? 26 : 30} />
                    </div>
                    <div style={{ marginTop: 8, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.10em', textTransform: 'uppercase', color: subtleText }}>
                      {course.paused ? 'clock is frozen' : 'remaining before expiry'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => setCurriculumOpen(true)} style={headerButtonBase}>
                    Curriculum
                  </button>
                  {course.paused ? (
                    <button onClick={() => dispatch({ type: 'RESUME_COURSE', id: course.id })} style={headerButtonBase}>
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => dispatch({ type: 'PAUSE_COURSE', id: course.id })}
                      disabled={course.pauseUsed}
                      style={{
                        ...headerButtonBase,
                        borderColor: course.pauseUsed ? theme.ruleFaint : 'rgba(210,34,26,0.36)',
                        background: course.pauseUsed ? 'transparent' : 'rgba(210,34,26,0.08)',
                        color: course.pauseUsed ? theme.mute : theme.red,
                        opacity: course.pauseUsed ? 0.4 : 1,
                      }}
                    >
                      Pause
                    </button>
                  )}
                </div>

                <button
                  onClick={handleLessonDone}
                  disabled={aiLoading || generatingNotes}
                  style={{
                    ...headerPrimaryButton,
                    padding: narrow ? '13px 18px' : '14px 22px',
                    minWidth: narrow ? '100%' : 220,
                    justifyContent: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: aiLoading || generatingNotes ? 0.45 : 1,
                    cursor: aiLoading || generatingNotes ? 'not-allowed' : 'pointer',
                  }}
                >
                  Mark completed →
                </button>
              </div>
            </div>

            {mod && lesson && (
              <LessonCanvas
                key={`${course.currentModule}:${course.currentLesson}`}
                course={course}
                mod={mod}
                lesson={lesson}
                latestTutorText={latestTutorText}
                latestVisual={latestVisual}
                readyToMoveOn={readyToMoveOn}
                narrow={narrow}
                chatMessages={currentChat}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function Learn() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useStore();
  const course = state.courses.find((c) => c.id === id);

  if (!course) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: HC.bg }}>
        <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 20 }}>Course not found.</div>
        <button onClick={() => navigate('/dashboard')} style={btn.outline}>← Dashboard</button>
      </div>
    );
  }

  if (course.status === 'tombstone' || course.status === 'expired') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: HC.bg }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontFamily: HC.serif, fontStyle: 'italic', fontSize: 'clamp(48px, 8vw, 96px)', color: HC.mute, letterSpacing: '-0.03em' }}>expired.</div>
          <div style={{ fontFamily: HC.mono, fontSize: 12, color: HC.mute, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            "{course.subject}" — {Math.round(course.progress * 100)}% complete · recommit from dashboard
          </div>
          <button onClick={() => navigate('/dashboard')} style={btn.outline}>← Dashboard</button>
        </div>
      </div>
    );
  }

  if (course.status === 'completed') {
    navigate(`/certificate/${course.id}`);
    return null;
  }

  return <LearnContent course={course} />;
}
