import { createContext, useContext, useState, ReactNode } from 'react';

interface AssistantSidebarContextType {
  currentConversationId: string | null;
  setCurrentConversationId: (id: string | null) => void;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  registerHandlers: (handlers: {
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
  }) => void;
}

const AssistantSidebarContext = createContext<AssistantSidebarContextType | undefined>(undefined);

export function AssistantSidebarProvider({ children }: { children: ReactNode }) {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [handlers, setHandlers] = useState<{
    onSelect?: (id: string) => void;
    onNew?: () => void;
    onDelete?: (id: string) => void;
    onRename?: (id: string, newTitle: string) => void;
  }>({});

  const registerHandlers = (newHandlers: {
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onRename: (id: string, newTitle: string) => void;
  }) => {
    setHandlers(newHandlers);
  };

  return (
    <AssistantSidebarContext.Provider
      value={{
        currentConversationId,
        setCurrentConversationId,
        onSelectConversation: handlers.onSelect,
        onNewConversation: handlers.onNew,
        onDeleteConversation: handlers.onDelete,
        onRenameConversation: handlers.onRename,
        registerHandlers,
      }}
    >
      {children}
    </AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar() {
  const context = useContext(AssistantSidebarContext);
  if (context === undefined) {
    throw new Error('useAssistantSidebar must be used within AssistantSidebarProvider');
  }
  return context;
}
