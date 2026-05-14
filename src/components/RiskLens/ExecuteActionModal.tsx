import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MAMResponseBadge } from './MAMResponseBadge';
import type { RiskEvent } from '@/data/riskLensData';

interface ExecuteActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RiskEvent;
}

export function ExecuteActionModal({ open, onOpenChange, event }: ExecuteActionModalProps) {
  const [signature, setSignature] = useState('');

  const handleDispatch = () => {
    // TODO: wire to real MAM execution service
    toast.success('Action dispatched', {
      description: `${event.mam.action} routed to ${event.mam.executor}`,
    });
    onOpenChange(false);
    setSignature('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Execute action</DialogTitle>
          <DialogDescription>
            You are about to dispatch a MAM action. This is logged immutably.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <MAMResponseBadge kind={event.mam.response} />
            <div className="flex-1">
              <div className="text-sm font-semibold font-mono text-foreground">
                {event.mam.action}
              </div>
              <div className="text-xs text-muted-foreground">
                executor: {event.mam.executor} · SLA {event.mam.slaWindow}
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            parameters
          </div>
          <div className="mt-1.5 space-y-1.5">
            <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              case_id: <span className="font-mono font-semibold">{event.internalCase.caseId}</span>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              priority: <span className="font-semibold">{event.priorityScore.toFixed(2)}</span>{' '}
              · sla_override: <span className="font-semibold">fast-track 24h</span>
            </div>
            <div className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">
              notify_regional_comms: <span className="font-semibold">true</span>
            </div>
          </div>
        </div>

        {event.mam.requiresApproval && (
          <div className="rounded-md border border-amber-500/60 bg-amber-500/10 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <div className="text-xs font-semibold text-amber-700">
                Approval signature required
              </div>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              This action template requires_human_approval = true
            </p>
            <Input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name to sign"
              className="bg-background"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDispatch}
            disabled={event.mam.requiresApproval && signature.trim().length < 3}
          >
            Sign & dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
