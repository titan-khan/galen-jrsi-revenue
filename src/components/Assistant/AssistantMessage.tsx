import { useMemo, useState, useEffect } from 'react';
import { Bot, User, Loader2, Clock, Pencil, Trash2, Check, X } from 'lucide-react';
import { useMetrics } from '@/contexts/MetricsContext';
import type { AssistantMessage as AssistantMessageType } from '@/types/assistant';
import { ThinkingSteps } from './ThinkingSteps';
// SummaryCard removed per design decision
import { SourceAttribution } from './ResponseComponents/SourceAttribution';
import { DataSourceEvidence } from './ResponseComponents/DataSourceEvidence';
import { ResponseActions } from './ResponseComponents/ResponseActions';
import { FollowUpChips } from './ResponseComponents/FollowUpChips';
import { generateFollowUpQuestions, extractMentionedMetrics } from '@/utils/followUpGenerator';
import { fetchAIFollowUpQuestions } from '@/services/followUpService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  parseStreamingContent,
  parseThinkingSteps,
  hasStructuredFormat,
  hasVegaLiteBlocks,
  splitResponseContent,
} from '@/utils/streamingParser';
import InlineChart from './InlineChart';
import { AssistantMarkdown } from './AssistantMarkdown';
import { formatDistanceToNow } from 'date-fns';

interface AssistantMessageProps {
  message: AssistantMessageType;
  isLastMessage?: boolean;
  precedingUserQuestion?: string;
  onSendFollowUp?: (text: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onSetEditing?: (messageId: string, isEditing: boolean) => void;
}

// Renders interleaved text + chart segments
function SegmentRenderer({ segments, evidenceText }: { 
  segments: import('@/utils/streamingParser').ContentSegment[];
  evidenceText?: string;
}) {
  return (
    <>
      {segments.map((segment, i) => {
        if (segment.type === 'chart' && segment.block) {
          return <InlineChart key={`chart-${segment.block.id}`} block={segment.block} evidenceText={evidenceText} />;
        }
        return (
          <TextSegment key={`text-${i}`} content={segment.content || ''} />
        );
      })}
    </>
  );
}

// Renders a text segment as markdown with @mention chip support
function TextSegment({ content }: { content: string }) {
  return <AssistantMarkdown>{content}</AssistantMarkdown>;
}

export function AssistantMessage({
  message,
  isLastMessage,
  precedingUserQuestion,
  onSendFollowUp,
  onEdit,
  onDelete,
  onSetEditing,
}: AssistantMessageProps) {
  const isUser = message.role === 'user';
  const [editValue, setEditValue] = useState(message.content);
  const { metrics } = useMetrics();

  // Parse structured sections for assistant messages
  const sections = useMemo(() => {
    if (isUser) return null;
    
    // Parse if content has structured markers, is streaming, or contains chart blocks
    if (!hasStructuredFormat(message.content) && !message.isStreaming && !hasVegaLiteBlocks(message.content)) {
      return null; // No markers, no charts — use simple rendering
    }
    
    return parseStreamingContent(message.content);
  }, [message.content, isUser, message.isStreaming]);

  const thinkingSteps = useMemo(() => {
    if (!sections) return [];
    return parseThinkingSteps(sections.thinking.text);
  }, [sections]);

  // Follow-up questions: deterministic first, then AI-enhanced
  const [followUpQuestions, setFollowUpQuestions] = useState<import('@/utils/followUpGenerator').FollowUpQuestion[]>([]);
  const [isLoadingFollowUps, setIsLoadingFollowUps] = useState(false);

  useEffect(() => {
    // Guard: only fire for last, non-streaming, assistant message
    if (isUser || message.isStreaming || !isLastMessage) {
      setFollowUpQuestions([]);
      return;
    }

    const responseText = sections?.response.text || message.content;

    // 1. Show deterministic questions immediately (zero latency)
    const deterministicQuestions = generateFollowUpQuestions(responseText, null, metrics);
    setFollowUpQuestions(deterministicQuestions);

    // 2. If no user question context, skip AI call (deterministic is enough)
    if (!precedingUserQuestion) return;

    let cancelled = false;
    setIsLoadingFollowUps(true);

    const mentioned = extractMentionedMetrics(responseText, metrics);

    fetchAIFollowUpQuestions({
      userQuestion: precedingUserQuestion,
      assistantResponse: responseText,
      summary: null,
      mentionedMetrics: mentioned,
      allMetrics: metrics,
    }, { timeoutMs: 8000 })
      .then((aiQuestions) => {
        if (cancelled) return;
        if (aiQuestions && aiQuestions.length > 0) {
          // AI questions replace deterministic ones
          setFollowUpQuestions(aiQuestions);
        }
        // If null (error/timeout), deterministic questions remain
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFollowUps(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUser, message.isStreaming, isLastMessage, message.content, precedingUserQuestion]);

  // Get the main response content for rendering
  const mainContent = sections?.response.text || message.content;

  // Split content into text/chart segments if charts are present
  const contentSegments = useMemo(() => {
    if (!sections || sections.charts.length === 0) return null;
    return splitResponseContent(mainContent, sections.charts);
  }, [sections, mainContent]);

  // For text-only rendering (no charts or for fallback)
  const textForRenderer = contentSegments ? '' : mainContent;

  const handleStartEdit = () => {
    setEditValue(message.content);
    onSetEditing?.(message.id, true);
  };

  const handleCancelEdit = () => {
    setEditValue(message.content);
    onSetEditing?.(message.id, false);
  };

  const handleSaveEdit = () => {
    if (editValue.trim() && editValue !== message.content) {
      onEdit?.(message.id, editValue.trim());
    } else {
      onSetEditing?.(message.id, false);
    }
  };

  // User message
  if (isUser) {
    if (message.isEditing) {
      return (
        <div className="flex gap-3 flex-row-reverse">
          <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1 max-w-[80%] space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[60px] resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveEdit}>
                <Check className="h-3.5 w-3.5 mr-1" />
                Save & Regenerate
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex gap-3 flex-row-reverse group">
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
        <div className="w-fit max-w-[80%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground relative">
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.content}
          </div>
          
          {/* Edit/Delete buttons on hover */}
          {(onEdit || onDelete) && (
            <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleStartEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:text-destructive"
                  onClick={() => onDelete(message.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial loading state - no content yet
  if (message.isStreaming && !message.content) {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span className="text-sm">Thinking...</span>
        </div>
      </div>
    );
  }

  // Structured assistant message
  if (sections) {
    const timestamp = message.timestamp
      ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
      : null;

    return (
      <div className="flex gap-3 group">
        <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 max-w-[100%] space-y-2">
          {/* Header with timestamp and source attribution */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Coordinator</span>
            {timestamp && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timestamp}
                </span>
              </>
            )}
          </div>

          {/* Source Attribution */}
          {!message.isStreaming && mainContent && (
            <SourceAttribution content={mainContent} />
          )}

          {/* Data Source Evidence */}
          {!message.isStreaming && mainContent && (
            <DataSourceEvidence content={mainContent} />
          )}

          {/* Thinking Steps - collapsible */}
          {(thinkingSteps.length > 0 || sections.currentSection === 'thinking') && (
            <ThinkingSteps
              steps={thinkingSteps}
              isStreaming={sections.currentSection === 'thinking'}
            />
          )}

          {/* Main Response */}
          {(sections.response.text || sections.currentSection === 'response') && (
            <div className="rounded-2xl border border-border/40 bg-background px-4 py-3">
              <div className="text-sm leading-relaxed">
                {contentSegments ? (
                  <SegmentRenderer segments={contentSegments} evidenceText={mainContent} />
                ) : (
                  <AssistantMarkdown>{textForRenderer}</AssistantMarkdown>
                )}
                {(sections.currentSection === 'response' ||
                  (message.isStreaming && !sections.summary.isComplete)) && (
                  <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
                )}
              </div>

              {/* Response Actions */}
              {!message.isStreaming && (
                <ResponseActions
                  content={mainContent}
                  messageId={message.id}
                  hasChart={sections.charts.length > 0}
                />
              )}

              {/* Follow-up question suggestions */}
              {followUpQuestions.length > 0 && onSendFollowUp && (
                <FollowUpChips questions={followUpQuestions} onSelect={onSendFollowUp} isRefreshing={isLoadingFollowUps} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: Simple rendering for non-structured responses
  const timestamp = message.timestamp
    ? formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })
    : null;

  return (
    <div className="flex gap-3 group">
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 max-w-[80%] space-y-2">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Coordinator</span>
          {timestamp && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timestamp}
              </span>
            </>
          )}
        </div>

        {/* Source Attribution */}
        {!message.isStreaming && message.content && (
          <SourceAttribution content={message.content} />
        )}

        {/* Data Source Evidence */}
        {!message.isStreaming && message.content && (
          <DataSourceEvidence content={message.content} />
        )}

        <div className="rounded-2xl px-4 py-3 border border-border/40 bg-background text-foreground">
          <div className="text-sm leading-relaxed">
            <AssistantMarkdown>{message.content}</AssistantMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
            )}
          </div>
          
          {/* Response Actions */}
          {!message.isStreaming && (
            <ResponseActions content={message.content} messageId={message.id} />
          )}

          {/* Follow-up question suggestions */}
          {followUpQuestions.length > 0 && onSendFollowUp && (
            <FollowUpChips questions={followUpQuestions} onSelect={onSendFollowUp} />
          )}
        </div>
      </div>
    </div>
  );
}
