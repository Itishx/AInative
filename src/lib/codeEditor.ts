import type { KeyboardEvent } from 'react';

const INDENT = '  ';

function setSelection(target: HTMLTextAreaElement, start: number, end: number) {
  requestAnimationFrame(() => {
    target.selectionStart = start;
    target.selectionEnd = end;
  });
}

export function handleCodeEditorKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  onValueChange: (nextValue: string) => void,
) {
  if (event.key !== 'Tab') return;

  event.preventDefault();

  const target = event.currentTarget;
  const { selectionStart, selectionEnd } = target;
  const hasSelection = selectionStart !== selectionEnd;
  const lineStart = value.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const lineEndIndex = value.indexOf('\n', selectionEnd);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;

  if (event.shiftKey) {
    const selectedBlock = value.slice(lineStart, lineEnd);
    const lines = selectedBlock.split('\n');
    let removedBeforeStart = 0;
    let removedWithinSelection = 0;

    const outdented = lines.map((line, index) => {
      let removeCount = 0;
      if (line.startsWith(INDENT)) removeCount = INDENT.length;
      else if (line.startsWith('\t')) removeCount = 1;
      else {
        const leadingSpaces = line.match(/^ +/)?.[0].length ?? 0;
        removeCount = Math.min(INDENT.length, leadingSpaces);
      }

      if (removeCount > 0) {
        if (index === 0) removedBeforeStart = removeCount;
        removedWithinSelection += removeCount;
      }

      return line.slice(removeCount);
    }).join('\n');

    const nextValue = value.slice(0, lineStart) + outdented + value.slice(lineEnd);
    onValueChange(nextValue);

    if (hasSelection) {
      setSelection(
        target,
        Math.max(lineStart, selectionStart - removedBeforeStart),
        Math.max(lineStart, selectionEnd - removedWithinSelection),
      );
    } else {
      const nextCaret = Math.max(lineStart, selectionStart - removedBeforeStart);
      setSelection(target, nextCaret, nextCaret);
    }
    return;
  }

  const block = value.slice(lineStart, lineEnd);
  const isMultilineSelection = hasSelection && block.includes('\n');

  if (isMultilineSelection) {
    const lines = block.split('\n');
    const indented = lines.map((line) => `${INDENT}${line}`).join('\n');
    const nextValue = value.slice(0, lineStart) + indented + value.slice(lineEnd);
    onValueChange(nextValue);
    setSelection(
      target,
      selectionStart + INDENT.length,
      selectionEnd + INDENT.length * lines.length,
    );
    return;
  }

  const nextValue = value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
  onValueChange(nextValue);
  const nextCaret = selectionStart + INDENT.length;
  setSelection(target, nextCaret, nextCaret);
}
