import { useEffect, useMemo, useState } from 'react';

type UseTypingPlaceholderOptions = {
  phrases: string[];
  enabled: boolean;
  typingMs?: number;
  deletingMs?: number;
  holdMs?: number;
};

export function useTypingPlaceholder({
  phrases,
  enabled,
  typingMs = 58,
  deletingMs = 34,
  holdMs = 1400,
}: UseTypingPlaceholderOptions) {
  const safePhrases = useMemo(
    () => phrases.map((phrase) => String(phrase || '').trim()).filter(Boolean),
    [phrases],
  );

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const currentPhrase = safePhrases[phraseIndex] ?? '';
  const text = currentPhrase.slice(0, charCount);

  useEffect(() => {
    if (!enabled || safePhrases.length === 0) {
      setCharCount(0);
      setPhraseIndex(0);
      setIsDeleting(false);
      return;
    }

    const delay = !isDeleting && charCount === currentPhrase.length
      ? holdMs
      : isDeleting
        ? deletingMs
        : typingMs;

    const timeoutId = window.setTimeout(() => {
      if (!isDeleting) {
        if (charCount < currentPhrase.length) {
          setCharCount((count) => count + 1);
        } else {
          setIsDeleting(true);
        }
        return;
      }

      if (charCount > 0) {
        setCharCount((count) => count - 1);
        return;
      }

      setIsDeleting(false);
      setPhraseIndex((index) => (index + 1) % safePhrases.length);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [charCount, currentPhrase, deletingMs, enabled, holdMs, isDeleting, safePhrases, typingMs]);

  useEffect(() => {
    if (!enabled) {
      setCursorVisible(true);
      return;
    }

    const intervalId = window.setInterval(() => {
      setCursorVisible((visible) => !visible);
    }, 520);

    return () => window.clearInterval(intervalId);
  }, [enabled]);

  return {
    text,
    cursorVisible,
    show: enabled && safePhrases.length > 0,
  };
}
