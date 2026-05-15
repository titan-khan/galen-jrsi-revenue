import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAMResponseBadge } from './MAMResponseBadge';
import {
  APPROVERS,
  getApproval,
  submitForApproval,
  subscribeApprovals,
  type RiskEvent,
} from '@/data/riskLensData';

interface ExecuteActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: RiskEvent;
}

const REQUESTER = 'Anda · Risk Analyst';

export function ExecuteActionModal({ open, onOpenChange, event }: ExecuteActionModalProps) {
  const [signature, setSignature] = useState('');
  const [approverId, setApproverId] = useState<string>(APPROVERS[0].id);
  const [justification, setJustification] = useState('');
  const [approval, setApproval] = useState(() => getApproval(event.id));

  useEffect(() => {
    const unsub = subscribeApprovals(() => setApproval(getApproval(event.id)));
    return () => {
      unsub();
    };
  }, [event.id]);

  // Reset when reopened on a different event
  useEffect(() => {
    if (open) {
      setApproval(getApproval(event.id));
      setSignature('');
    }
  }, [open, event.id]);

  const needsApproval = event.mam.requiresApproval && approval?.state !== 'approved';

  const handleSubmitForApproval = () => {
    const approver = APPROVERS.find((a) => a.id === approverId);
    if (!approver) return;
    submitForApproval({
      eventId: event.id,
      requestedBy: REQUESTER,
      approverRole: approver.role,
      approverName: approver.name,
      justification: justification.trim(),
    });
    toast.success('Permintaan persetujuan dikirim', {
      description: `${event.mam.actionLabel} · menunggu sign-off ${approver.name}`,
    });
    onOpenChange(false);
    setJustification('');
  };

  const handleDispatch = () => {
    toast.success('Tindakan dieksekusi', {
      description: `${event.mam.actionLabel} dirutekan ke ${event.mam.executor}`,
    });
    onOpenChange(false);
    setSignature('');
  };

  // --- Render: submit-for-approval mode ---
  if (needsApproval && approval?.state !== 'pending') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajukan persetujuan tindakan</DialogTitle>
            <DialogDescription>
              Tindakan ini memerlukan sign-off dari approver yang ditunjuk sebelum dieksekusi.
              Permintaan dan keputusan tersimpan di audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-3">
              <MAMResponseBadge kind={event.mam.response} />
              <div className="flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {event.mam.actionLabel}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {event.mam.action}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  executor: {event.mam.executor} · SLA {event.mam.slaWindow}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Approver
            </label>
            <Select value={approverId} onValueChange={setApproverId}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVERS.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {a.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Justifikasi
            </label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Mengapa tindakan ini perlu dieksekusi sekarang?"
              className="min-h-[80px] bg-background text-sm"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              onClick={handleSubmitForApproval}
              disabled={justification.trim().length < 5}
            >
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              Ajukan persetujuan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Render: already pending — read-only summary ---
  if (approval?.state === 'pending') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Menunggu persetujuan</DialogTitle>
            <DialogDescription>
              Permintaan sudah dikirim ke {approval.approverName} ({approval.approverRole}).
              Begitu disetujui, tombol Sign &amp; dispatch akan tersedia di sini.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-violet-500/40 bg-violet-500/10 p-3 text-sm">
            <div className="font-semibold">{event.mam.actionLabel}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Diminta {approval.requestedAt} · oleh {approval.requestedBy}
            </div>
            <div className="mt-2 text-xs">
              <span className="font-semibold">Justifikasi: </span>
              <span className="text-foreground/85">{approval.justification || '—'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Render: approved or no approval needed → dispatch form ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Eksekusi tindakan</DialogTitle>
          <DialogDescription>
            Anda akan mengirim tindakan MAM ini ke executor. Tercatat di audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-3">
            <MAMResponseBadge kind={event.mam.response} />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                {event.mam.actionLabel}
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">
                {event.mam.action}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                executor: {event.mam.executor} · SLA {event.mam.slaWindow}
              </div>
            </div>
          </div>
        </div>

        {approval?.state === 'approved' && (
          <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Disetujui oleh {approval.approverName}
            </div>
            <p className="mt-0.5 text-muted-foreground">
              Persetujuan {approval.requestedAt}. Anda dapat dispatch sekarang.
            </p>
          </div>
        )}

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Parameter
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

        <div className="rounded-md border border-border bg-background p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700" />
            <div className="text-xs font-semibold text-foreground">
              Tanda tangan pemroses
            </div>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Ketik nama lengkap Anda untuk konfirmasi.
          </p>
          <Input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Nama lengkap"
            className="bg-background"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleDispatch} disabled={signature.trim().length < 3}>
            Tandatangani &amp; dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
