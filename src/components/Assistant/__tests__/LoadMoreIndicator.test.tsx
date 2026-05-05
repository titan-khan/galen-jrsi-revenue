import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LoadMoreIndicator } from '../LoadMoreIndicator';

describe('LoadMoreIndicator', () => {
  let mockObserve: any;
  let mockDisconnect: any;
  let mockUnobserve: any;
  let observerCallback: IntersectionObserverCallback;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockUnobserve = vi.fn();

    // Mock IntersectionObserver as a class constructor
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        observerCallback = callback;
      }
      observe = mockObserve;
      disconnect = mockDisconnect;
      unobserve = mockUnobserve;
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    isLoading: false,
    hasMore: true,
    onLoadMore: vi.fn(),
  };

  it('should show spinner when isLoading is true', () => {
    render(<LoadMoreIndicator {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Loading more...')).toBeInTheDocument();
    const spinner = screen.getByText('Loading more...').previousElementSibling;
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should hide when hasMore is false', () => {
    const { container } = render(<LoadMoreIndicator {...defaultProps} hasMore={false} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should setup Intersection Observer when hasMore is true and not loading', () => {
    render(<LoadMoreIndicator {...defaultProps} />);
    
    expect(mockObserve).toHaveBeenCalled();
  });

  it('should trigger onLoadMore when element becomes visible', async () => {
    const onLoadMore = vi.fn();
    render(<LoadMoreIndicator {...defaultProps} onLoadMore={onLoadMore} />);
    
    // Simulate intersection observer callback
    const mockEntry = {
      isIntersecting: true,
      target: document.createElement('div'),
    } as IntersectionObserverEntry;
    
    observerCallback([mockEntry], {} as IntersectionObserver);
    
    await waitFor(() => {
      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });
  });

  it('should not trigger onLoadMore when element is not intersecting', async () => {
    const onLoadMore = vi.fn();
    render(<LoadMoreIndicator {...defaultProps} onLoadMore={onLoadMore} />);
    
    // Simulate intersection observer callback with not intersecting
    const mockEntry = {
      isIntersecting: false,
      target: document.createElement('div'),
    } as IntersectionObserverEntry;
    
    observerCallback([mockEntry], {} as IntersectionObserver);
    
    await waitFor(() => {
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  it('should not setup observer when isLoading is true', () => {
    render(<LoadMoreIndicator {...defaultProps} isLoading={true} />);
    
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('should not setup observer when hasMore is false', () => {
    render(<LoadMoreIndicator {...defaultProps} hasMore={false} />);
    
    // Component should return null, so observer should not be created
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it('should disconnect observer on unmount', () => {
    const { unmount } = render(<LoadMoreIndicator {...defaultProps} />);
    
    unmount();
    
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should reconnect observer when dependencies change', () => {
    const { rerender } = render(<LoadMoreIndicator {...defaultProps} />);
    
    // Change a dependency
    rerender(<LoadMoreIndicator {...defaultProps} isLoading={true} />);
    
    // Should disconnect the first observer
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('should render with correct styling classes', () => {
    const { container } = render(<LoadMoreIndicator {...defaultProps} isLoading={true} />);
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'py-4', 'px-3');
  });

  it('should show loading text with muted foreground color', () => {
    render(<LoadMoreIndicator {...defaultProps} isLoading={true} />);
    
    const loadingContainer = screen.getByText('Loading more...').parentElement;
    expect(loadingContainer).toHaveClass('text-muted-foreground');
  });
});
