import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HC, HCDark, btn, type Colors } from '../theme';
import { CountdownInline } from '../components/Countdown';
import { useStore } from '../store';
import { apiUrl } from '../api';
import type { Course, ChatMsg, EnrolledCourse } from '../types';
import { useTheme } from '../lib/theme';

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
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.45, color: 'inherit' }}>
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
                        whiteSpace: 'nowrap',
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
                        whiteSpace: 'nowrap',
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, lineHeight: 1.45 }}>
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
                      whiteSpace: 'nowrap',
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
                        whiteSpace: 'nowrap',
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

function firstStatement(text: string) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .find((sentence) => sentence && !sentence.endsWith('?')) ?? '';
}

function formatInteractiveParagraphs(explainers: string[], question: string, maxWords: number) {
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
  return trimParagraphs(paragraphs.filter(Boolean).join('\n\n'), maxWords);
}

function compactTutorDump(text: string, lessonTitle: string, isOpening: boolean, allowQuestion: boolean) {
  const raw = String(text || '');
  const hasStructuredExample = /```|^\s*\|.+\|\s*$/m.test(raw);
  const looksDumped =
    isOpening ||
    /[①②③④⑤⑥⑦⑧⑨⑩]|WHAT IT IS|WHY IT MATTERS|THE ANALOGY|WORKED EXAMPLE|CHECK-IN QUESTION/i.test(raw) ||
    raw.split(/\s+/).filter(Boolean).length > 170 ||
    raw.split(/\n/).length > 8;

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
  if (allowQuestion && question && explainers.length > 0) {
    return formatInteractiveParagraphs(explainers, question, isOpening ? 90 : 135) || cleaned;
  }
  return (
    formatInteractiveParagraphs(explainers, '', isOpening ? 90 : 135) ||
    trimParagraphs(cleaned.replace(/\?+/g, '.'), isOpening ? 90 : 135)
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
    return trimParagraphs(`${first} ${second}`, 65);
  }

  const base = [description.trim(), facts[0]?.trim() || objective.trim()]
    .filter(Boolean)
    .join(' ')
    .trim() || `Let's focus on ${lessonTitle}.`;

  if (currentPhase === 'CHECK') {
    return `Quick check: in one short sentence, what is the main job of ${lessonTitle}?`;
  }

  if (currentPhase === 'REINFORCE') {
    return trimParagraphs(base, 55);
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
  const table = extractFirstMarkdownTable(visualSource);
  const chartMode = !code && !table && /(trend|chart|graph|growth|volume|increase|decrease|over time)/i.test(latestTutorText);
  const ambientMode = !table && !code && !chartMode;
  const accent = readyToMoveOn ? t.green : t.red;
  const objective = normalizeLessonObjective(lesson.objective, lesson.title);
  const ambientPalette = getAmbientPalette(`${course.subject}:${lesson.title}`);

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
            Visual canvas
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
          {syncLoading ? '⟳ syncing…' : '⟳ sync canvas'}
        </button>
      </div>

      <div
        style={{
          position: 'relative',
          minHeight: narrow ? 380 : 'calc(100vh - 96px)',
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

        <div style={{ position: 'relative', zIndex: 1, height: '100%', padding: narrow ? '24px 24px 28px' : '32px 34px 36px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: HC.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: dark ? 'rgba(250,247,240,0.76)' : t.mute, marginBottom: 12 }}>
                {course.subject}
              </div>
              <div style={{ fontFamily: HC.serif, fontSize: narrow ? 42 : 62, lineHeight: 0.96, letterSpacing: '-0.04em', color: dark ? HC.paper : t.ink, maxWidth: 760 }}>
                {lesson.title}
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 999, background: dark ? 'rgba(250,247,240,0.10)' : 'rgba(26,21,16,0.06)', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: dark ? HC.paper : t.ink }}>
              Chapter {String(course.currentModule + 1).padStart(2, '0')} · Lesson {String(course.currentLesson + 1).padStart(2, '0')}
            </div>
          </div>

          <div style={{ marginTop: 18, maxWidth: 560, fontSize: 16, lineHeight: 1.6, color: dark ? 'rgba(250,247,240,0.82)' : t.mute }}>
            {objective}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 26 }}>
            {table ? (
              <div style={{ width: '100%', maxWidth: 760, borderRadius: 22, background: 'rgba(16,13,10,0.42)', border: '1px solid rgba(250,247,240,0.12)', backdropFilter: 'blur(10px)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.68)', borderBottom: '1px solid rgba(250,247,240,0.10)' }}>
                  live structure preview
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: HC.paper }}>
                    <thead>
                      <tr>
                        {table.header.map((cell, idx) => (
                          <th key={idx} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.62)', borderBottom: '1px solid rgba(250,247,240,0.08)' }}>
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 5).map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} style={{ padding: '14px 16px', borderBottom: '1px solid rgba(250,247,240,0.08)', fontSize: 15, whiteSpace: 'nowrap' }}>
                              {cell}
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
              /* Ambient fallback: key facts + generate button */
              <div style={{ width: '100%', maxWidth: 820, position: 'relative', borderRadius: 28, overflow: 'hidden', border: '1px solid rgba(250,247,240,0.10)', background: `linear-gradient(145deg, ${ambientPalette.base}, ${ambientPalette.mid} 60%, rgba(245,238,225,0.04) 100%)`, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 82% 14%, ${ambientPalette.glowC}, transparent 28%), radial-gradient(circle at 10% 80%, ${ambientPalette.glowA}, transparent 30%)` }} />
                <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(250,247,240,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(250,247,240,0.2) 1px, transparent 1px)', backgroundSize: '56px 56px' }} />
                <div style={{ position: 'relative', zIndex: 1, padding: narrow ? '24px 22px 26px' : '28px 28px 30px' }}>
                  <div style={{ fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(250,247,240,0.50)', marginBottom: 16 }}>
                    key facts · {lesson.title}
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
                      readyToMoveOn ? '✓ objective covered' : `Lesson ${String(course.currentLesson + 1).padStart(2, '0')}`,
                    ].map((item) => (
                      <div key={item} style={{ padding: '7px 12px', borderRadius: 999, background: 'rgba(250,247,240,0.08)', color: 'rgba(250,247,240,0.70)', fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', border: '1px solid rgba(250,247,240,0.08)' }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
}: {
  course: Course;
  open: boolean;
  onClose: () => void;
  onSelectLesson: (moduleIndex: number, lessonIndex: number) => void;
  notesOpen: number | null;
  setNotesOpen: React.Dispatch<React.SetStateAction<number | null>>;
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
                      {hasNotes && isDone && (
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
                    {isOpen && l.notes && (
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
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [listening, setListening] = useState(false);
  const [speakingTs, setSpeakingTs] = useState<number | null>(null);
  const [spokenWords, setSpokenWords] = useState(0);
  const [phase, setPhase] = useState<Phase>('HOOK');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUrlRef = useRef<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const voiceStartedAtRef = useRef(0);
  const [notesOpen, setNotesOpen] = useState<number | null>(null);
  const [narrow, setNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 1100 : false));
  // Ref-based guard so React StrictMode's double-effect fire doesn't send two intro messages
  const introFiredKey = useRef('');
  const lessonPlanRef = useRef('');
  const lessonKey = `${course.currentModule}:${course.currentLesson}`;

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
    setSpokenWords(0);
  }

  function getSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  }

  async function startVoiceInput() {
    if (!voiceMode || aiLoading || generatingNotes || listeningRef.current) return;
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setVoiceStatus('speech not supported');
      return;
    }

    stopVoicePlayback();
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    listeningRef.current = true;
    voiceTranscriptRef.current = '';
    voiceStartedAtRef.current = Date.now();
    setListening(true);
    setVoiceStatus('listening… release space to send');

    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0]?.transcript ?? '';
      }
      voiceTranscriptRef.current = transcript.trim();
      if (transcript.trim()) setInput(transcript.trim());
    };
    recognition.onerror = (event: any) => {
      setVoiceStatus(event?.error === 'not-allowed' ? 'mic permission blocked' : 'speech failed');
      listeningRef.current = false;
      setListening(false);
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
      setVoiceStatus('speech failed');
    }
  }

  async function stopVoiceInput() {
    if (!listeningRef.current && !recognitionRef.current) return;
    const recognition = recognitionRef.current;
    const elapsed = Date.now() - voiceStartedAtRef.current;
    if (elapsed < 700) {
      await new Promise((resolve) => window.setTimeout(resolve, 700 - elapsed));
    }

    let settled = false;
    const waitForFinalTranscript = new Promise<void>((resolve) => {
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      const previousOnEnd = recognition?.onend;
      if (recognition) {
        recognition.onend = (event: any) => {
          previousOnEnd?.(event);
          done();
        };
      }
      window.setTimeout(done, 900);
    });

    try { recognition?.stop?.(); } catch {}
    await waitForFinalTranscript;

    const transcript = voiceTranscriptRef.current.trim();
    recognitionRef.current = null;
    listeningRef.current = false;
    setListening(false);

    if (transcript) {
      setVoiceStatus('sending voice…');
      setInput('');
      await sendUserText(transcript);
      setVoiceStatus(voiceMode ? 'hold space to talk' : '');
    } else {
      setVoiceStatus('no speech heard');
      window.setTimeout(() => setVoiceStatus((value) => value === 'no speech heard' ? '' : value), 1200);
    }
  }

  async function unlockVoiceMode() {
    setVoiceMode((value) => {
      const next = !value;
      if (!next) {
        stopVoicePlayback();
        try { recognitionRef.current?.abort?.(); } catch {}
        recognitionRef.current = null;
        listeningRef.current = false;
        setListening(false);
        setVoiceStatus('');
      } else {
        setVoiceStatus('hold space to talk');
      }
      return next;
    });
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      await ctx.close();
    } catch { /* browser may not need explicit unlock */ }
  }

  async function speakTutorReply(text: string, ts: number) {
    const speechText = stripSpeechText(text);
    if (!speechText) return;
    stopVoicePlayback();
    setVoiceStatus('preparing voice…');
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
        if (lowered.includes('env')) setVoiceStatus('voice env missing');
        else if (lowered.includes('invalid') || lowered.includes('unauthorized') || res.status === 401) setVoiceStatus('invalid elevenlabs key');
        else if (lowered.includes('quota') || lowered.includes('credits')) setVoiceStatus('elevenlabs quota/credits');
        else if (lowered.includes('voice') || res.status === 404) setVoiceStatus('voice id not found');
        else setVoiceStatus(`voice failed (${res.status})`);
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
        setVoiceStatus('speaking…');
        requestAnimationFrame(sync);
      };
      audio.onended = () => {
        setSpokenWords(words.length);
        setVoiceStatus(voiceMode ? 'hold space to talk' : '');
        window.setTimeout(() => {
          if (audioRef.current === audio) stopVoicePlayback();
        }, 350);
      };
      audio.onerror = () => {
        setVoiceStatus('audio playback failed');
        if (audioRef.current === audio) stopVoicePlayback();
      };
      await audio.play();
    } catch (err) {
      setVoiceStatus(err instanceof DOMException && err.name === 'NotAllowedError' ? 'click once to allow audio' : 'voice failed');
      stopVoicePlayback();
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat.length]);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => () => {
    stopVoicePlayback();
    try { recognitionRef.current?.abort?.(); } catch {}
  }, []);

  useEffect(() => {
    if (!voiceMode) stopVoicePlayback();
  }, [voiceMode]);

  useEffect(() => {
    if (!voiceMode) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      if (aiLoading || generatingNotes) return;
      const target = event.target as HTMLElement | null;
      const isTypingTarget = target?.tagName === 'TEXTAREA' || target?.tagName === 'INPUT' || target?.isContentEditable;
      if (isTypingTarget && input.trim()) return;
      event.preventDefault();
      startVoiceInput();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      event.preventDefault();
      stopVoiceInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [voiceMode, aiLoading, generatingNotes, input]);

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
      if (voiceMode) speakTutorReply(tutorText, tutorTs);
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
      if (voiceMode) speakTutorReply(fallbackText, tutorTs);
    } finally {
      setAiLoading(false);
    }
  }

  async function sendUserText(rawText: string) {
    const text = rawText.trim();
    if (!text || !mod || !lesson) return;
    if (listeningRef.current) {
      await stopVoiceInput();
      return;
    }
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
    } catch {
      // Notes failed — still proceed to quiz
    } finally {
      setGeneratingNotes(false);
      navigate(`/quiz/${course.id}/${course.currentModule}/${course.currentLesson}`);
    }
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
        chatHistory: currentChat,
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
      />

      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(440px, 38vw) minmax(0, 1fr)', overflow: 'hidden' }}>
        <section style={{ background: theme.bg, color: theme.ink, display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: narrow ? 'none' : `1px solid ${theme.ruleFaint}` }}>
          <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${theme.ruleFaint}` }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ ...btn.ghost, padding: 0, fontSize: 10, color: theme.mute }}
            >
              ← dashboard
            </button>
            <div style={{ marginTop: 10, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: faintText }}>
              {course.subject}
            </div>
            <div style={{ marginTop: 6, fontFamily: HC.sans, fontSize: 23, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em', color: theme.ink }}>
              {lesson?.title}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 14px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {currentChat.map((m, i) => (
              <div key={i}>
                <div style={{
                  fontFamily: HC.mono,
                  fontSize: 9,
                  letterSpacing: '0.16em',
                  color: m.who === 'user' ? faintText : subtleText,
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}>
                  {m.who === 'user' ? state.username : 'Learnor'}
                </div>
                {m.who === 'user' ? (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 16,
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
                {m.who === 'tutor' && m.readyToMoveOn && tutorTurnCount >= 5 && (
                  <div style={{ marginTop: 10, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7ad08b' }}>
                    lesson objective covered
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

            <div
              style={{
                borderRadius: 16,
                background: listening ? 'rgba(210,34,26,0.10)' : panelFillStrong,
                border: `1px solid ${listening ? 'rgba(210,34,26,0.55)' : theme.ruleFaint}`,
                boxShadow: listening ? '0 0 0 4px rgba(210,34,26,0.10)' : 'none',
                padding: 8,
                transition: 'background 160ms ease, border-color 160ms ease, box-shadow 160ms ease',
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
                {voiceStatus && (
                  <span style={{ flex: 1, fontFamily: HC.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: listening ? theme.red : theme.mute }}>
                    {voiceStatus}
                  </span>
                )}
                <button
                  onClick={unlockVoiceMode}
                  title={voiceMode ? 'Voice on — click to toggle' : 'Voice off'}
                  style={{
                    width: 34, height: 34, borderRadius: '50%',
                    border: `1px solid ${voiceMode ? 'rgba(122,208,139,0.35)' : theme.ruleFaint}`,
                    background: voiceMode ? (dark ? 'rgba(122,208,139,0.12)' : 'rgba(45,106,63,0.08)') : 'transparent',
                    color: voiceMode ? theme.green : theme.mute,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}
                >
                  {listening ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="13" rx="3"/>
                      <path d="M5 10a7 7 0 0 0 14 0"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                      <line x1="9" y1="22" x2="15" y2="22"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleSend}
                  disabled={aiLoading || generatingNotes}
                  style={{
                    ...btn.primary,
                    padding: '8px 16px',
                    fontSize: 10,
                    background: theme.ink,
                    color: theme.bg,
                    opacity: aiLoading || generatingNotes ? 0.45 : 1,
                  }}
                >
                  {input.trim() ? 'Send ↵' : 'Continue ↵'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: theme.bg, color: theme.ink, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '18px 22px 0', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: theme.red }}>
                  Chapter {String(course.currentModule + 1).padStart(2, '0')} · Lesson {String(course.currentLesson + 1).padStart(2, '0')}
                </div>
                <div style={{ marginTop: 6, fontFamily: HC.serif, fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em', color: theme.ink }}>
                  {mod?.title}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => setCurriculumOpen(true)} style={headerButtonBase}>
                  Curriculum
                </button>
                <button
                  onClick={handleLessonDone}
                  disabled={aiLoading || generatingNotes}
                  style={{
                    ...headerPrimaryButton,
                    opacity: aiLoading || generatingNotes ? 0.45 : 1,
                    cursor: aiLoading || generatingNotes ? 'not-allowed' : 'pointer',
                  }}
                >
                  Mark completed →
                </button>
                <button
                  onClick={handleGenerateNotesOnly}
                  disabled={!canGenerateNotes || generatingNotes || aiLoading}
                  style={{
                    ...headerButtonBase,
                    opacity: !canGenerateNotes || generatingNotes || aiLoading ? 0.45 : 1,
                    cursor: !canGenerateNotes || generatingNotes || aiLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {lessonHasNotes ? 'Refresh notes' : 'Generate notes'}
                </button>
                <div style={{ padding: '10px 12px', borderRadius: 999, background: panelFillStrong, border: `1px solid ${theme.ruleFaint}`, fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.ink }}>
                  {Math.round(course.progress * 100)}% done
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 999, background: panelFillStrong, border: `1px solid ${theme.ruleFaint}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: HC.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: theme.mute }}>
                    Time
                  </span>
                  <CountdownInline deadline={course.deadline} paused={course.paused} />
                </div>
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
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px 22px' }}>
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
