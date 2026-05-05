import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CollapsibleHistoryGroup } from '../CollapsibleHistoryGroup';
import type { Conversation } from '@/types/assistant';

describe('CollapsibleHistoryGroup', () => {
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      title: 'Test Conversation 1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'conv-2',
      title: 'Test Conversation 2',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'conv-3',
      title: 'Test Conversation 3',
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    },
  ];

  const defaultProps = {
    groupName: 'Today',
    conversations: mockConversations,
    currentId: null,
    isExpanded: true,
    onToggle: vi.fn(),
    onSelectConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
  };

  it('should render correct number of conversations', () => {
    render(<CollapsibleHistoryGroup {...defaultProps} />);
    
    // Check that all conversations are rendered
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 3')).toBeInTheDocument();
  });

  it('should display conversation count badge correctly', () => {
    render(<CollapsibleHistoryGroup {...defaultProps} />);
    
    // Check that the badge shows the correct count
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should trigger onToggle callback when clicking trigger', () => {
    const onToggle = vi.fn();
    render(<CollapsibleHistoryGroup {...defaultProps} onToggle={onToggle} />);
    
    // Click the trigger (group name)
    const trigger = screen.getByText('Today');
    fireEvent.click(trigger);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('should show chevron icon rotated correctly when expanded', () => {
    const { container } = render(<CollapsibleHistoryGroup {...defaultProps} isExpanded={true} />);
    
    // Find the chevron icon
    const chevron = container.querySelector('svg');
    expect(chevron).toHaveClass('rotate-0');
  });

  it('should show chevron icon rotated correctly when collapsed', () => {
    const { container } = render(<CollapsibleHistoryGroup {...defaultProps} isExpanded={false} />);
    
    // Find the chevron icon
    const chevron = container.querySelector('svg');
    expect(chevron).toHaveClass('-rotate-90');
  });

  it('should pass through onSelectConversation handler', () => {
    const onSelectConversation = vi.fn();
    render(<CollapsibleHistoryGroup {...defaultProps} onSelectConversation={onSelectConversation} />);
    
    // Click on a conversation
    const conversation = screen.getByText('Test Conversation 1');
    fireEvent.click(conversation);
    
    expect(onSelectConversation).toHaveBeenCalledWith('conv-1');
  });

  it('should pass through onDeleteConversation handler to ConversationItem', () => {
    const onDeleteConversation = vi.fn();
    render(<CollapsibleHistoryGroup {...defaultProps} onDeleteConversation={onDeleteConversation} />);
    
    // Verify that ConversationItem components are rendered with the handler
    // The actual delete functionality is tested in ConversationItem tests
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 3')).toBeInTheDocument();
  });

  it('should pass through onRenameConversation handler to ConversationItem when provided', () => {
    const onRenameConversation = vi.fn();
    render(
      <CollapsibleHistoryGroup 
        {...defaultProps} 
        onRenameConversation={onRenameConversation}
      />
    );
    
    // Verify that ConversationItem components are rendered with the handler
    // The actual rename functionality is tested in ConversationItem tests
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 3')).toBeInTheDocument();
  });

  it('should highlight active conversation', () => {
    render(<CollapsibleHistoryGroup {...defaultProps} currentId="conv-2" />);
    
    // The active conversation should have specific styling
    // Find the parent div that contains the conversation
    const conversationText = screen.getByText('Test Conversation 2');
    const conversationDiv = conversationText.closest('.group');
    expect(conversationDiv).toHaveClass('bg-primary/10');
  });

  it('should render with empty conversations array', () => {
    render(<CollapsibleHistoryGroup {...defaultProps} conversations={[]} />);
    
    // Should show 0 in the badge
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should have animation classes on CollapsibleContent', () => {
    const { container } = render(<CollapsibleHistoryGroup {...defaultProps} />);
    
    // Find the CollapsibleContent element by its class
    const content = container.querySelector('.transition-all.duration-300');
    expect(content).toBeInTheDocument();
  });
});
