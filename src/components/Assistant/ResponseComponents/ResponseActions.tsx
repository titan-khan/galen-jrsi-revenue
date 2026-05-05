import { useState } from 'react';
import { Copy, Check, Share2, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useInsightPanel } from '@/contexts/InsightPanelContext';
import { classifyInsight } from '@/services/insightAiService';
import type { InsightType } from '@/types/insight';

interface ResponseActionsProps {
  content: string;
  messageId: string;
  /** Whether the response contains chart blocks */
  hasChart?: boolean;
}

export function ResponseActions({ content, messageId, hasChart }: ResponseActionsProps) {
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { addInsight } = useInsightPanel();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: 'Copied to clipboard',
        description: 'Response content has been copied.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handlePin = () => {
    // Use AI classification service
    const classification = classifyInsight(content);

    // Override type to 'chart' if we know the message has chart blocks
    const type: InsightType = hasChart ? 'chart' : classification.type;

    addInsight({
      type,
      title: classification.title,
      description: classification.description,
      sourceMessageId: messageId,
      autoDetected: false,
    });

    setPinned(true);
    toast({
      title: 'Saved to insights',
      description: 'Added to the insight panel.',
    });
    setTimeout(() => setPinned(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={handlePin}
      >
        {pinned ? (
          <Check className="h-3 w-3 mr-1" />
        ) : (
          <Pin className="h-3 w-3 mr-1" />
        )}
        {pinned ? 'Saved' : 'Save'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 mr-1" />
        ) : (
          <Copy className="h-3 w-3 mr-1" />
        )}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => {
          toast({
            title: 'Share',
            description: 'Share functionality coming soon.',
          });
        }}
      >
        <Share2 className="h-3 w-3 mr-1" />
        Share
      </Button>
    </div>
  );
}
