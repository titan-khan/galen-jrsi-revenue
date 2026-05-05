import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AssistantMessage } from "@/types/assistant";
import type { AssistantContext } from "@/services/assistantContext";
import { toast } from "@/hooks/use-toast";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`;

interface UseAssistantChatOptions {
  conversationId: string | null;
  onError?: (error: Error) => void;
}

export function useAssistantChat(options: UseAssistantChatOptions) {
  const { conversationId, onError } = options;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentConversationRef = useRef<string | null>(null);

  // Load messages when conversationId changes (skip if already sending — avoids
  // overwriting the optimistic user message added by sendMessage)
  useEffect(() => {
    if (conversationId) {
      if (!isLoading) {
        loadMessages(conversationId);
      }
    } else {
      setMessages([]);
    }
    currentConversationRef.current = conversationId;
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('assistant_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(
        (data || []).map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.created_at,
        }))
      );
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation messages",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const saveMessage = async (
    convId: string,
    message: AssistantMessage
  ): Promise<string> => {
    const { data, error } = await supabase
      .from('assistant_messages')
      .insert({
        conversation_id: convId,
        role: message.role,
        content: message.content,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  };

  const sendMessage = useCallback(
    async (content: string, context?: AssistantContext) => {
      // Use the ref to get the latest conversationId (avoids stale closure)
      const convId = currentConversationRef.current ?? conversationId;

      if (!convId) {
        toast({
          title: "Error",
          description: "No conversation selected",
          variant: "destructive",
        });
        return;
      }

      // Create user message
      const userMessage: AssistantMessage = {
        id: crypto.randomUUID(),
        conversationId: convId,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Save user message to database
      try {
        const savedId = await saveMessage(convId, userMessage);
        userMessage.id = savedId;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id || m.content === content && m.role === 'user'
              ? { ...m, id: savedId }
              : m
          )
        );
      } catch (error) {
        console.error('Failed to save user message:', error);
      }

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        // Build message history for API
        const messageHistory = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: "user" as const, content },
        ];

        const response = await fetch(CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: messageHistory,
            context,
          }),
          signal: abortControllerRef.current.signal,
        });

        // Handle error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Failed to get response";

          if (response.status === 429) {
            toast({
              title: "Rate limit exceeded",
              description: "Please wait a moment before sending another message.",
              variant: "destructive",
            });
          } else if (response.status === 402) {
            toast({
              title: "Usage limit reached",
              description: "Please add credits to continue using the assistant.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Error",
              description: errorMessage,
              variant: "destructive",
            });
          }

          setIsLoading(false);
          return;
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Stream the response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantContent = "";
        let assistantMessageId = crypto.randomUUID();
        let textBuffer = "";

        // Add initial assistant message (streaming)
        const assistantMessage: AssistantMessage = {
          id: assistantMessageId,
          conversationId: convId,
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          isStreaming: true,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          // Process line-by-line
          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                // Update assistant message with new content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: assistantContent }
                      : m
                  )
                );
              }
            } catch {
              // Incomplete JSON, put back and wait for more data
              textBuffer = line + "\n" + textBuffer;
              break;
            }
          }
        }

        // Final flush of remaining buffer
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split("\n")) {
            if (!raw) continue;
            if (raw.endsWith("\r")) raw = raw.slice(0, -1);
            if (raw.startsWith(":") || raw.trim() === "") continue;
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
              }
            } catch {
              /* ignore partial leftovers */
            }
          }
        }

        // Save assistant message to database
        try {
          const savedAssistantId = await saveMessage(convId, {
            ...assistantMessage,
            content: assistantContent,
          });

          // Mark message as complete with saved ID
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, id: savedAssistantId, content: assistantContent, isStreaming: false }
                : m
            )
          );
        } catch (error) {
          console.error('Failed to save assistant message:', error);
          // Still mark as complete even if save failed
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessageId
                ? { ...m, content: assistantContent, isStreaming: false }
                : m
            )
          );
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Request was cancelled
          return;
        }

        console.error("Assistant chat error:", error);
        onError?.(error as Error);

        toast({
          title: "Connection error",
          description: "Failed to connect to the assistant. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, conversationId, onError]
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      // Find the message and all messages after it
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return;

      const message = messages[messageIndex];
      if (message.role !== 'user') return;

      // Get IDs of messages to delete (all after this one)
      const messagesToDelete = messages.slice(messageIndex + 1);

      // Update the message in database
      const { error } = await supabase
        .from('assistant_messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update message",
          variant: "destructive",
        });
        return;
      }

      // Delete subsequent messages from database
      if (messagesToDelete.length > 0) {
        await supabase
          .from('assistant_messages')
          .delete()
          .in('id', messagesToDelete.map((m) => m.id));
      }

      // Update local state - remove messages after the edited one
      setMessages((prev) =>
        prev.slice(0, messageIndex + 1).map((m) =>
          m.id === messageId ? { ...m, content: newContent, isEditing: false } : m
        )
      );

      return newContent;
    },
    [messages]
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    const { error } = await supabase
      .from('assistant_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
      return;
    }

    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const setMessageEditing = useCallback((messageId: string, isEditing: boolean) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isEditing } : m))
    );
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /** Imperatively update the conversation ref (used by parent after creating a conversation) */
  const setConversationId = useCallback((id: string) => {
    currentConversationRef.current = id;
  }, []);

  return {
    messages,
    isLoading,
    isLoadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    setMessageEditing,
    cancelRequest,
    clearMessages,
    setConversationId,
  };
}
