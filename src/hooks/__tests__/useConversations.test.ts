import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConversations } from '../useConversations';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useConversations - loadConversations pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should use INITIAL_LIMIT (15) instead of hardcoded 50', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: Array.from({ length: 15 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useConversations());

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalledWith(0, 14); // 0 to INITIAL_LIMIT - 1
    });
  });

  it('should set hasMore to true when receiving full batch (15 items)', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: Array.from({ length: 15 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });
  });

  it('should set hasMore to false when receiving partial batch (< 15 items)', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `conv-${i}`,
        title: `Conversation ${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });
  });

  it('should reset offset to 0 on initial load', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    renderHook(() => useConversations());

    await waitFor(() => {
      // Verify range is called with 0 as starting offset
      expect(mockRange).toHaveBeenCalledWith(0, 14);
    });
  });

  it('should use .range() for pagination instead of .limit()', async () => {
    const mockRange = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    const mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
    });

    (supabase.from as any) = mockFrom;

    renderHook(() => useConversations());

    await waitFor(() => {
      expect(mockRange).toHaveBeenCalled();
      expect(mockOrder).not.toHaveProperty('limit');
    });
  });
});

describe('useConversations - loadMore function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch next batch with correct offset using conversations.length', async () => {
    // Setup initial load with 15 conversations
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextBatchData = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i + 15}`,
      title: `Conversation ${i + 15}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: nextBatchData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    // Call loadMore
    await result.current.loadMore();

    await waitFor(() => {
      // Verify range was called with conversations.length (15) as offset
      expect(mockRange).toHaveBeenCalledWith(15, 24); // 15 to 15 + BATCH_SIZE - 1
    });
  });

  it('should append new conversations to existing ones without duplicates', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextBatchData = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i + 15}`,
      title: `Conversation ${i + 15}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: nextBatchData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(25);
      // Verify no duplicates
      const ids = result.current.conversations.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(25);
    });
  });

  it('should filter out duplicate conversations if returned by API', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Next batch includes some duplicates
    const nextBatchData = [
      ...Array.from({ length: 3 }, (_, i) => ({
        id: `conv-${i + 12}`, // Duplicates: conv-12, conv-13, conv-14
        title: `Conversation ${i + 12}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `conv-${i + 15}`, // New: conv-15 to conv-21
        title: `Conversation ${i + 15}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })),
    ];

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: nextBatchData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    await result.current.loadMore();

    await waitFor(() => {
      // Should only add 7 new conversations (duplicates filtered out)
      expect(result.current.conversations).toHaveLength(22);
      // Verify no duplicates
      const ids = result.current.conversations.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(22);
    });
  });

  it('should update hasMore to true when receiving full BATCH_SIZE (10)', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextBatchData = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i + 15}`,
      title: `Conversation ${i + 15}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: nextBatchData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });
  });

  it('should update hasMore to false when receiving partial batch (< 10)', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextBatchData = Array.from({ length: 5 }, (_, i) => ({
      id: `conv-${i + 15}`,
      title: `Conversation ${i + 15}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: nextBatchData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });
  });

  it('should set isLoadingMore to true during fetch and false after', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const nextBatchData = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i + 15}`,
      title: `Conversation ${i + 15}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    let resolveLoadMore: any;
    const loadMorePromise = new Promise((resolve) => {
      resolveLoadMore = resolve;
    });

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockImplementationOnce(() => loadMorePromise);

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    // Start loadMore
    const loadMoreCall = result.current.loadMore();

    // Should be loading
    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true);
    });

    // Resolve the promise
    resolveLoadMore({ data: nextBatchData, error: null });
    await loadMoreCall;

    // Should not be loading anymore
    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  it('should not fetch if isLoadingMore is true', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    let resolveLoadMore: any;
    const loadMorePromise = new Promise((resolve) => {
      resolveLoadMore = resolve;
    });

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockImplementationOnce(() => loadMorePromise);

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    // Start first loadMore
    const firstCall = result.current.loadMore();

    // Wait for isLoadingMore to become true
    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(true);
    });

    // Try to call loadMore again while first is in progress
    await result.current.loadMore();

    // Should only have been called twice total (initial + first loadMore)
    expect(mockRange).toHaveBeenCalledTimes(2);

    // Cleanup
    resolveLoadMore({ data: [], error: null });
    await firstCall;
  });

  it('should not fetch if hasMore is false', async () => {
    const initialData = Array.from({ length: 10 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.hasMore).toBe(false);
    });

    // Try to call loadMore when hasMore is false
    await result.current.loadMore();

    // Should only have been called once (initial load)
    expect(mockRange).toHaveBeenCalledTimes(1);
  });

  it('should preserve existing conversations on error', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Network error') });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    // Call loadMore which will fail
    await result.current.loadMore();

    await waitFor(() => {
      // Existing conversations should still be there
      expect(result.current.conversations).toHaveLength(15);
      expect(result.current.isLoadingMore).toBe(false);
    });
  });

  it('should set isLoadingMore to false even on error', async () => {
    const initialData = Array.from({ length: 15 }, (_, i) => ({
      id: `conv-${i}`,
      title: `Conversation ${i}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const mockRange = vi.fn()
      .mockResolvedValueOnce({ data: initialData, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('Network error') });

    const mockOrder = vi.fn().mockReturnValue({
      range: mockRange,
    });

    const mockSelect = vi.fn().mockReturnValue({
      order: mockOrder,
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    const { result } = renderHook(() => useConversations());

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(15);
    });

    await result.current.loadMore();

    await waitFor(() => {
      expect(result.current.isLoadingMore).toBe(false);
    });
  });
});
