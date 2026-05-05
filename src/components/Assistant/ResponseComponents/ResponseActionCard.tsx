import { CheckSquare, Clock, User, TrendingUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface ActionItem {
  id: string;
  title: string;
  owner?: string;
  timing?: string;
  impact?: string;
}

interface ResponseActionCardProps {
  actions: ActionItem[];
  onApprove?: (actionId: string) => Promise<void>;
  onViewDetails?: (actionId: string) => void;
}

export function ResponseActionCard({
  actions,
  onApprove,
  onViewDetails,
}: ResponseActionCardProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const handleApprove = async (actionId: string) => {
    setApprovingId(actionId);
    try {
      await onApprove?.(actionId);
      setApprovedIds((prev) => new Set([...prev, actionId]));
      toast({
        title: 'Action approved',
        description: 'The recommendation has been marked as approved.',
      });
    } catch (error) {
      toast({
        title: 'Failed to approve',
        description: 'Could not approve the action. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApprovingId(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <Card className="p-3 mt-3 bg-muted/50 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Recommended Actions</span>
        <Badge variant="secondary" className="text-xs">
          {actions.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {actions.map((action) => {
          const isApproved = approvedIds.has(action.id);
          const isApproving = approvingId === action.id;

          return (
            <div
              key={action.id}
              className={cn(
                'p-3 rounded-lg border bg-background transition-all',
                isApproved && 'border-green-500/30 bg-green-500/5'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0',
                    isApproved
                      ? 'bg-green-500 border-green-500'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isApproved && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isApproved && 'line-through text-muted-foreground'
                    )}
                  >
                    {action.title}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {action.owner && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {action.owner}
                      </span>
                    )}
                    {action.timing && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {action.timing}
                      </span>
                    )}
                    {action.impact && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {action.impact}
                      </span>
                    )}
                  </div>

                  {!isApproved && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleApprove(action.id)}
                        disabled={isApproving}
                      >
                        {isApproving ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : null}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onViewDetails?.(action.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
