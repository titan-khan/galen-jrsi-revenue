import { useState, useRef, useCallback, useEffect, useMemo, KeyboardEvent } from 'react';
import { Send, Loader2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MentionPopover } from './MentionPopover';
import { useMetrics } from '@/contexts/MetricsContext';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { cn } from '@/lib/utils';
import type { MentionableEntity } from '@/types/assistant';

interface AssistantInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  initialValue?: string;
}

export function AssistantInput({ onSend, disabled, isLoading, initialValue }: AssistantInputProps) {
  const [value, setValue] = useState(initialValue || '');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);

  // Sync when initialValue changes (e.g. navigating from specialist deep dive)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      // Focus the textarea after prefilling
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [initialValue]);

  const { metrics } = useMetrics();
  const { specialists } = useSpecialists();

  const mentionableEntities: MentionableEntity[] = [
    ...metrics.map((m) => ({ id: m.id, name: m.name, type: 'metric' as const, domain: m.domain })),
    ...specialists.map((s) => ({ id: s.id, name: s.name, type: 'specialist' as const, domain: s.domain, description: s.description }))
  ];

  // Create lookup for highlighting — build a map of lowercase name → entity for multi-word matching
  const entityNamesLower = new Set(mentionableEntities.map((e) => e.name.toLowerCase()));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      const charBeforeAt = atIndex > 0 ? newValue[atIndex - 1] : ' ';
      // Allow spaces in query so multi-word names (e.g. "Total Revenue", "OTP Specialist") can be searched.
      // Close the popover only if there are 2+ consecutive spaces or a newline (signals user moved on).
      const hasTerminator = /\s{2,}|\n/.test(textAfterAt);
      if ((charBeforeAt === ' ' || atIndex === 0) && !hasTerminator) {
        setMentionOpen(true);
        setMentionQuery(textAfterAt);
        setMentionStartIndex(atIndex);
        return;
      }
    }
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStartIndex(null);
  };

  const handleMentionSelect = useCallback((entity: MentionableEntity) => {
    if (mentionStartIndex === null) return;

    const before = value.slice(0, mentionStartIndex);
    const cursorPos = textareaRef.current?.selectionStart ?? value.length;
    const after = value.slice(cursorPos);

    const newValue = `${before}@${entity.name} ${after}`;
    setValue(newValue);
    setMentionOpen(false);
    setMentionQuery('');
    setMentionStartIndex(null);

    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = before.length + entity.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [mentionStartIndex, value]);

  const handleSubmit = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't handle Enter/Tab if mention popover is open (let popover handle it)
    if (mentionOpen && (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape' && mentionOpen) {
      setMentionOpen(false);
    }
  };

  const triggerMention = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    
    // Add @ at cursor position
    const needsSpace = before.length > 0 && !before.endsWith(' ');
    const newValue = `${before}${needsSpace ? ' ' : ''}@${after}`;
    setValue(newValue);
    
    // Open mention popover
    const newCursorPos = before.length + (needsSpace ? 2 : 1);
    setMentionStartIndex(newCursorPos - 1);
    setMentionQuery('');
    setMentionOpen(true);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Auto-resize textarea up to 3 rows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Reset to single row to measure scrollHeight accurately
    textarea.style.height = 'auto';
    // line-height is 1.5 × 14px (text-sm) = 21px; 3 rows ≈ 63px
    const maxHeight = 63;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [value]);

  // Build a sorted list of entity names (longest first) for greedy matching
  const sortedEntityNames = useMemo(
    () => mentionableEntities.map((e) => e.name).sort((a, b) => b.length - a.length),
    [mentionableEntities]
  );

  // Parse value for display with highlighting — greedy match against known entity names
  const renderHighlightedValue = () => {
    const parts: React.ReactNode[] = [];
    let key = 0;
    let remaining = value;
    let offset = 0;

    while (remaining.length > 0) {
      const atIdx = remaining.indexOf('@');
      if (atIdx === -1) {
        parts.push(<span key={key++} className="text-transparent">{remaining}</span>);
        break;
      }

      // Push text before the @
      if (atIdx > 0) {
        parts.push(<span key={key++} className="text-transparent">{remaining.slice(0, atIdx)}</span>);
      }

      // Try to match a known entity name after the @
      const afterAt = remaining.slice(atIdx + 1);
      let matched = false;

      for (const name of sortedEntityNames) {
        if (afterAt.toLowerCase().startsWith(name.toLowerCase())) {
          // Ensure the match ends at a word boundary (space, end, @, punctuation)
          const charAfterName = afterAt[name.length];
          if (charAfterName === undefined || /[\s@.,!?;:]/.test(charAfterName)) {
            const fullMention = `@${afterAt.slice(0, name.length)}`;
            parts.push(
              <span key={key++} className={cn('rounded px-0.5', 'bg-primary/20')}>
                <span className="text-transparent">{fullMention}</span>
              </span>
            );
            remaining = remaining.slice(atIdx + 1 + name.length);
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // No entity match — output the @ as plain text and continue
        parts.push(<span key={key++} className="text-transparent">@</span>);
        remaining = afterAt;
      }
    }

    return parts;
  };

  return (
    <div className="relative">
      <span ref={anchorRef} className="absolute left-4 bottom-full" />
      <MentionPopover
        open={mentionOpen}
        onOpenChange={setMentionOpen}
        entities={mentionableEntities}
        onSelect={handleMentionSelect}
        searchQuery={mentionQuery}
        anchorRef={anchorRef}
      />

      <div className="flex items-end gap-3 px-4 py-2.5 bg-muted/60 rounded-[1.25rem] ring-1 ring-border/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {/* @ trigger button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 mb-0.5 text-muted-foreground hover:text-foreground hover:bg-transparent rounded-lg"
          onClick={triggerMention}
          disabled={disabled || isLoading}
        >
          <AtSign className="h-4 w-4" />
        </Button>

        {/* Input container with highlight overlay */}
        <div className="relative flex-1 min-w-0">
          {/* Highlight overlay */}
          <div
            className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-sm overflow-hidden"
            style={{ lineHeight: '1.5' }}
            aria-hidden="true"
          >
            {renderHighlightedValue()}
          </div>

          {/* Actual textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about operations, performance, or get recommendations..."
            className={cn(
              'w-full min-h-[24px] max-h-[63px] resize-none border-0 bg-transparent overflow-y-auto',
              'focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
              'p-0 text-sm placeholder:text-muted-foreground/60'
            )}
            style={{ lineHeight: '1.5', caretColor: 'hsl(var(--foreground))', outline: 'none' }}
            disabled={disabled || isLoading}
            rows={1}
          />
        </div>

        {/* Round send button */}
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!value.trim() || disabled || isLoading}
          className="shrink-0 h-9 w-9 mb-0.5 rounded-full"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
