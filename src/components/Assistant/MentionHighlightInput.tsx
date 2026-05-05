import { useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MentionableEntity } from '@/types/assistant';

interface MentionHighlightInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  entities: MentionableEntity[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function MentionHighlightInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  disabled,
  entities,
  textareaRef
}: MentionHighlightInputProps) {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Create a set of entity names for quick lookup
  const entityNames = useMemo(() => {
    return new Set(entities.map((e) => e.name.toLowerCase()));
  }, [entities]);

  // Sync scroll between textarea and highlight overlay
  useEffect(() => {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;

    const syncScroll = () => {
      highlight.scrollTop = textarea.scrollTop;
      highlight.scrollLeft = textarea.scrollLeft;
    };

    textarea.addEventListener('scroll', syncScroll);
    return () => textarea.removeEventListener('scroll', syncScroll);
  }, [textareaRef]);

  // Build a sorted list of entity names (longest first) for greedy matching
  const sortedEntityNames = useMemo(() => {
    return entities.map((e) => e.name).sort((a, b) => b.length - a.length);
  }, [entities]);

  // Parse the value and create highlighted segments — greedy match against known names
  const highlightedContent = useMemo(() => {
    const parts: { text: string; isMention: boolean; isValid: boolean }[] = [];
    let remaining = value;

    while (remaining.length > 0) {
      const atIdx = remaining.indexOf('@');
      if (atIdx === -1) {
        parts.push({ text: remaining, isMention: false, isValid: false });
        break;
      }

      // Push text before the @
      if (atIdx > 0) {
        parts.push({ text: remaining.slice(0, atIdx), isMention: false, isValid: false });
      }

      // Try to match a known entity name after the @
      const afterAt = remaining.slice(atIdx + 1);
      let matched = false;

      for (const name of sortedEntityNames) {
        if (afterAt.toLowerCase().startsWith(name.toLowerCase())) {
          const charAfterName = afterAt[name.length];
          if (charAfterName === undefined || /[\s@.,!?;:]/.test(charAfterName)) {
            parts.push({
              text: `@${afterAt.slice(0, name.length)}`,
              isMention: true,
              isValid: true,
            });
            remaining = remaining.slice(atIdx + 1 + name.length);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        parts.push({ text: '@', isMention: false, isValid: false });
        remaining = afterAt;
      }
    }

    return parts;
  }, [value, sortedEntityNames]);

  return (
    <div className="relative flex-1">
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className="absolute inset-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words text-base text-transparent"
        style={{ 
          padding: '0',
          lineHeight: '1.5',
          fontFamily: 'inherit'
        }}
        aria-hidden="true"
      >
        {highlightedContent.map((part, index) => {
          if (part.isMention) {
            return (
              <span
                key={index}
                className={cn(
                  'rounded px-0.5 -mx-0.5',
                  part.isValid
                    ? 'bg-primary/20 text-primary'
                    : 'bg-destructive/20 text-destructive'
                )}
              >
                {part.text}
              </span>
            );
          }
          return <span key={index}>{part.text}</span>;
        })}
      </div>

      {/* Actual textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className={cn(
          'w-full min-h-[48px] max-h-[200px] resize-none border-0 bg-transparent',
          'focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-base',
          'placeholder:text-muted-foreground'
        )}
        style={{ 
          lineHeight: '1.5',
          caretColor: 'hsl(var(--foreground))'
        }}
      />
    </div>
  );
}
