import { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { AssistantGreeting } from './AssistantGreeting';
import { SuggestionCarousel } from './SuggestionCarousel';
import { PromptLibrary } from './PromptLibrary';
import { AssistantInput } from './AssistantInput';
import { AssistantChat } from './AssistantChat';
import { AssistantChatSidebar } from './AssistantChatSidebar';
import { InsightPanel } from '@/components/InsightPanel';
import { Button } from '@/components/ui/button';
import { useDynamicSuggestions } from '@/hooks/useDynamicSuggestions';
import { useAssistantChat } from '@/hooks/useAssistantChat';
import { useConversations } from '@/hooks/useConversations';
import { useMetrics } from '@/contexts/MetricsContext';
import { useAgents } from '@/contexts/AgentsContext';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useTrackedRecommendations } from '@/contexts/TrackedRecommendationsContext';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { buildAssistantContext, type AssistantContext } from '@/services/assistantContext';

export function AssistantPage() {
  const { conversationId: urlConversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(urlConversationId || null);
  const [isValidatingConversation, setIsValidatingConversation] = useState(false);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('assistant-chat-sidebar-open');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { view: insightView, setActiveConversationId } = useInsightPanel();

  // Sync URL parameter with state and vice versa
  useEffect(() => {
    // If URL has conversation ID but state doesn't match, update state
    if (urlConversationId && urlConversationId !== currentConversationId) {
      setCurrentConversationId(urlConversationId);
    }
    // If state has conversation ID but URL doesn't match, update URL
    else if (currentConversationId && currentConversationId !== urlConversationId) {
      navigate(`/assistant/${currentConversationId}`, { replace: true });
    }
    // If no conversation in state but URL has one, clear URL
    else if (!currentConversationId && urlConversationId) {
      navigate('/assistant', { replace: true });
    }
  }, [urlConversationId, currentConversationId, navigate]);

  // Sync insight panel to the active conversation
  useEffect(() => {
    setActiveConversationId(currentConversationId);
  }, [currentConversationId, setActiveConversationId]);

  const location = useLocation();
  const locationState = location.state as {
    prefillMessage?: string;
    metricContext?: AssistantContext['focusMetric'];
    reportId?: string;
  } | null;
  const prefillMessage = locationState?.prefillMessage || '';
  const metricContext = locationState?.metricContext;
  const reportId = locationState?.reportId;

  const { metrics } = useMetrics();
  const { agents } = useAgents();
  const { specialists } = useSpecialists();
  const { recommendations } = useTrackedRecommendations();
  const dynamicSuggestions = useDynamicSuggestions();

  // Save chat sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('assistant-chat-sidebar-open', JSON.stringify(isChatSidebarOpen));
  }, [isChatSidebarOpen]);

  const {
    conversations,
    isLoading: isLoadingConversations,
    hasMore,
    isLoadingMore,
    loadMore,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    touchConversation,
  } = useConversations();

  // Validate conversation ID from URL
  useEffect(() => {
    if (urlConversationId && conversations.length > 0 && !isLoadingConversations) {
      const conversationExists = conversations.some(c => c.id === urlConversationId);
      if (!conversationExists) {
        // Conversation not found, redirect to assistant home
        console.warn(`Conversation ${urlConversationId} not found, redirecting to /assistant`);
        navigate('/assistant', { replace: true });
        setCurrentConversationId(null);
      }
    }
  }, [urlConversationId, conversations, isLoadingConversations, navigate]);

  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === currentConversationId),
    [conversations, currentConversationId]
  );

  const {
    messages,
    isLoading,
    isLoadingMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    setMessageEditing,
    clearMessages,
    setConversationId,
  } = useAssistantChat({
    conversationId: currentConversationId,
  });

  const handleSend = useCallback(
    async (content: string) => {
      let convId = currentConversationId;

      // First message — create conversation, then immediately send
      if (!convId) {
        const conv = await createConversation(content);
        convId = conv.id;
        setCurrentConversationId(convId);
        // Push the new id into the hook's ref so sendMessage picks it up
        setConversationId(convId);
        // Immediately sync insight panel so insights land in the right conversation
        setActiveConversationId(convId);
        // Update URL immediately
        navigate(`/assistant/${convId}`, { replace: true });
      }

      const context = buildAssistantContext(
        metrics,
        agents,
        recommendations,
        content,
        metricContext,
        specialists
      );
      await sendMessage(content, context);
      await touchConversation(convId);
    },
    [
      currentConversationId,
      metrics,
      agents,
      specialists,
      recommendations,
      metricContext,
      sendMessage,
      createConversation,
      touchConversation,
      setConversationId,
      setActiveConversationId,
      navigate,
    ]
  );

  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string) => {
      const editedContent = await editMessage(messageId, newContent);
      if (editedContent && currentConversationId) {
        const context = buildAssistantContext(
          metrics,
          agents,
          recommendations,
          editedContent,
          undefined,
          specialists
        );
        await sendMessage(editedContent, context);
      }
    },
    [editMessage, sendMessage, metrics, agents, specialists, recommendations, currentConversationId]
  );

  const handlePromptSelect = (prompt: string) => {
    handleSend(prompt);
  };

  const handleNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    clearMessages();
    navigate('/assistant', { replace: true });
    // No need to clearInsights — insights are scoped per conversation.
    // Switching conversation via setActiveConversationId (in useEffect)
    // will automatically show the correct (empty) set.
  }, [clearMessages, navigate]);

  const handleSelectConversation = useCallback((id: string) => {
    setCurrentConversationId(id);
    navigate(`/assistant/${id}`, { replace: true });
  }, [navigate]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        clearMessages();
        navigate('/assistant', { replace: true });
      }
    },
    [deleteConversation, currentConversationId, clearMessages, navigate]
  );

  const handleRenameConversation = useCallback(
    async (id: string, newTitle: string) => {
      await updateConversationTitle(id, newTitle);
    },
    [updateConversationTitle]
  );

  const hasMessages = messages.length > 0;

  // Listen to window scroll for hide/show navbar
  useEffect(() => {
    const threshold = 10;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      if (Math.abs(scrollY - lastScrollY.current) < threshold) return;
      
      if (scrollY < lastScrollY.current || scrollY < threshold) {
        setIsNavVisible(true);
      } else {
        setIsNavVisible(false);
      }
      
      lastScrollY.current = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to a specific message in the chat
  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary/30', 'rounded-lg');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary/30', 'rounded-lg'), 2000);
    }
  }, []);

  const showInsightSidebar = insightView !== 'collapsed';

  return (
    <div className="relative flex h-[calc(100vh-3.5rem)]">
      {/* Chat History Sidebar with smooth transition */}
      <div
        className={`shrink-0 transition-all duration-300 ease-in-out ${
          isChatSidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <AssistantChatSidebar
          conversations={conversations}
          currentId={currentConversationId}
          isLoading={isLoadingConversations}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onRename={handleRenameConversation}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header with toggle and actions */}
        <div
          className={`flex items-center justify-between px-4 py-2 border-b bg-background/95 backdrop-blur shrink-0 transition-all duration-200 ${
            isNavVisible ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
              size="sm"
              variant="ghost"
              title={isChatSidebarOpen ? 'Close chat history' : 'Open chat history'}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold">
              {currentConversation?.title || 'New Chat'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <PromptLibrary onSelectPrompt={handlePromptSelect} />
          </div>
        </div>

        {/* ── Main content area (grows to fill, scrollable) ── */}
        <div className="flex-1 overflow-y-auto" ref={chatScrollRef}>
          <div className="max-w-3xl mx-auto w-full px-4">
            {!hasMessages && !isLoadingMessages ? (
              /* ─ Empty state: vertically centered greeting + cards ─ */
              <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem-120px)]">
                <div className="w-full max-w-2xl">
                  <AssistantGreeting />

                  {/* Two-row scrollable suggestion cards */}
                  <SuggestionCarousel
                    suggestions={dynamicSuggestions}
                    onSelect={handleSend}
                  />
                </div>
              </div>
            ) : (
              /* ─ Chat messages ─ */
              <div className="pb-4 pt-2">
                <AssistantChat
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={deleteMessage}
                  onSetMessageEditing={setMessageEditing}
                  onSendFollowUp={handleSend}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Fixed bottom input bar ── */}
        <div className="shrink-0 border-t bg-background px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <AssistantInput
              onSend={handleSend}
              isLoading={isLoading}
              initialValue={prefillMessage}
            />
          </div>
        </div>
      </div>

      {/* ── Right: Insight Panel ── */}
      <InsightPanel
        conversationId={currentConversationId}
        conversationMessages={messages.map((m) => ({ role: m.role, content: m.content }))}
        onScrollToMessage={handleScrollToMessage}
        onExploreGap={(question) => handleSend(question)}
        reportId={reportId}
      />
    </div>
  );
}