import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RiskEvent } from '@/data/riskLensData';

interface DismissEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RiskEvent;
}

const REASONS = [
  {
    id: 'taxonomy',
    title: 'Taxonomy mismatch',
    sub: "this isn't actually a claim_processing_delay",
  },
  {
    id: 'no-exposure',
    title: 'No real exposure',
    sub: 'entity mentioned but not affected',
  },
  {
    id: 'miscalibrated',
    title: 'Voice-of-reach credibility miscalibrated',
    sub: '@LBHJakarta less credible than weighted',
  },
  {
    id: 'offline',
    title: 'Already handled offline',
    sub: 'action taken outside Galen',
  },
  {
    id: 'duplicate',
    title: 'Duplicate of another event',
    sub: 'ref required',
  },
  {
    id: 'other',
    title: 'Other',
    sub: 'free-text justification required',
  },
] as const;

export function DismissEventModal({ open, onOpenChange, event }: DismissEventModalProps) {
  const [reason, setReason] = useState<string>('no-exposure');
  const [justification, setJustification] = useState('');

  const handleDismiss = () => {
    // TODO: wire to real dismiss/feedback service
    toast.success('Event dismissed', {
      description: `Reason: ${REASONS.find((r) => r.id === reason)?.title} · feeds eval baseline`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dismiss as false positive</DialogTitle>
          <DialogDescription>
            Dismissals feed back into the eval baseline. Reversible within 7 days.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            reason · pick one
          </div>
          <RadioGroup value={reason} onValueChange={setReason} className="space-y-1.5">
            {REASONS.map((r) => (
              <Label
                key={r.id}
                htmlFor={`dismiss-${r.id}`}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background p-2.5 hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-muted/40"
              >
                <RadioGroupItem id={`dismiss-${r.id}`} value={r.id} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-foreground">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.sub}</div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            justification
          </div>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder={`Why isn't ${event.eventType} the right call here?`}
            className="min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDismiss}>
            Dismiss event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
