import { useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { AssistantMessage } from './AssistantMessage';
import type { AssistantMessage as AssistantMessageType } from '@/types/assistant';

interface AssistantChatProps {
  messages: AssistantMessageType[];
  isLoadingMessages?: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onSetMessageEditing?: (messageId: string, isEditing: boolean) => void;
  onSendFollowUp?: (text: string) => void;
}

export function AssistantChat({
  messages,
  isLoadingMessages,
  onEditMessage,
  onDeleteMessage,
  onSetMessageEditing,
  onSendFollowUp,
}: AssistantChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoadingMessages) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-7 w-7 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) return null;

  return (
    <div className="pr-4 pb-28 pt-4">
      <div>
        {messages.map((message, index) => {
          // Find the user question that preceded this assistant message
          const precedingUserQuestion =
            message.role === 'assistant' && index > 0
              ? messages
                  .slice(0, index)
                  .reverse()
                  .find((m) => m.role === 'user')?.content
              : undefined;

          // AI responses get 2× spacing (py-4 = ~2 empty lines), user messages get standard gap
          return (
            <div
              key={message.id}
              id={`msg-${message.id}`}
              className={`transition-all duration-300 ${message.role === 'assistant' ? 'py-4' : 'py-2'}`}
            >
              <AssistantMessage
                message={message}
                isLastMessage={index === messages.length - 1}
                precedingUserQuestion={precedingUserQuestion}
                onSendFollowUp={onSendFollowUp}
                onEdit={onEditMessage}
                onDelete={onDeleteMessage}
                onSetEditing={onSetMessageEditing}
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
