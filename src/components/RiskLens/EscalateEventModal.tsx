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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface EscalateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CHANNELS = ['in_app', 'email', 'whatsapp'];

export function EscalateEventModal({ open, onOpenChange }: EscalateEventModalProps) {
  const [channels, setChannels] = useState<string[]>(DEFAULT_CHANNELS);
  const [reason, setReason] = useState(
    'Coupling event references active OJK query. Above analyst authority for external regulator engagement.',
  );

  const handleEscalate = () => {
    // TODO: wire to real escalation service
    toast.success('Escalated to Sari Hartono', {
      description: `Channels: ${channels.join(', ')}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Escalate event</DialogTitle>
          <DialogDescription>
            Ownership transfers but you remain a watcher. Original escalation chain preserved.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            escalate to
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                SH
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Sari Hartono</div>
              <div className="text-xs text-muted-foreground">
                Direktur Manajemen Risiko · default per routing_rules.escalation_path
              </div>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0">
              change
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            channels
          </div>
          <ToggleGroup
            type="multiple"
            value={channels}
            onValueChange={(v) => v.length && setChannels(v)}
            className="justify-start gap-1.5"
          >
            <ToggleGroupItem value="in_app" className="h-7 px-2.5 text-xs">
              in_app
            </ToggleGroupItem>
            <ToggleGroupItem value="email" className="h-7 px-2.5 text-xs">
              email
            </ToggleGroupItem>
            <ToggleGroupItem value="whatsapp" className="h-7 px-2.5 text-xs">
              WhatsApp
            </ToggleGroupItem>
            <ToggleGroupItem value="sms" className="h-7 px-2.5 text-xs">
              SMS
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            reason · required
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleEscalate} disabled={reason.trim().length < 5}>
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
