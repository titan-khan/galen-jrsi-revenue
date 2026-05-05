import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Conversation } from "@/types/assistant";
import { toast } from "@/hooks/use-toast";

// Pagination configuration
const INITIAL_LIMIT = 15;
const BATCH_SIZE = 10;

function generateTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 50) return trimmed;
  
  // Find last word boundary before 50 chars
  const truncated = trimmed.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const loadConversations = useCallback(async () => {
    try {
      // Reset offset to 0 for initial load
      setOffset(0);
      
      const { data, error } = await supabase
        .from('assistant_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(0, INITIAL_LIMIT - 1);

      if (error) throw error;

      const mappedConversations = (data || []).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));

      setConversations(mappedConversations);
      // Set hasMore based on whether we got a full batch
      setHasMore(mappedConversations.length === INITIAL_LIMIT);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createConversation = useCallback(async (firstMessage?: string): Promise<Conversation> => {
    const title = firstMessage ? generateTitle(firstMessage) : null;

    const { data, error } = await supabase
      .from('assistant_conversations')
      .insert({ title })
      .select()
      .single();

    if (error) throw error;

    const newConv: Conversation = {
      id: data.id,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    setConversations((prev) => [newConv, ...prev]);
    return newConv;
  }, []);

  const updateConversationTitle = useCallback(async (id: string, title: string) => {
    const { error } = await supabase
      .from('assistant_conversations')
      .update({ title })
      .eq('id', id);

    if (error) throw error;

    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('assistant_conversations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setConversations((prev) => prev.filter((c) => c.id !== id));
    
    toast({
      title: "Conversation deleted",
      description: "The conversation has been removed",
    });
  }, []);

  const touchConversation = useCallback(async (id: string) => {
    // Update the updated_at timestamp to move conversation to top
    await supabase
      .from('assistant_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);
    
    setConversations((prev) => {
      const conv = prev.find((c) => c.id === id);
      if (!conv) return prev;
      return [
        { ...conv, updatedAt: new Date().toISOString() },
        ...prev.filter((c) => c.id !== id),
      ];
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const { data, error } = await supabase
        .from('assistant_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
        .range(conversations.length, conversations.length + BATCH_SIZE - 1);
      
      if (error) throw error;
      
      const newConversations = (data || []).map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }));
      
      // Append to existing conversations, filtering out duplicates
      setConversations(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const uniqueNew = newConversations.filter(c => !existingIds.has(c.id));
        return [...prev, ...uniqueNew];
      });
      
      // Update hasMore based on result length
      setHasMore(newConversations.length === BATCH_SIZE);
    } catch (error) {
      console.error('Failed to load more conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load more conversations",
        variant: "destructive",
      });
      // Don't clear existing data on error
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversations.length, hasMore, isLoadingMore]);

  return {
    conversations,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    touchConversation,
    refresh: loadConversations,
  };
}
