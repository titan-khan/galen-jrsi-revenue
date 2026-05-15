import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ShieldCheck, Check, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MAMResponseBadge } from '@/components/RiskLens/MAMResponseBadge';
import {
  listApprovals,
  subscribeApprovals,
  decideApproval,
  getRiskEvent,
  type ApprovalRequest,
} from '@/data/riskLensData';

function ApprovalRow({ req }: { req: ApprovalRequest }) {
  const event = getRiskEvent(req.eventId);
  if (!event) return null;

  const handleApprove = () => {
    decideApproval(req.eventId, 'approved');
    toast.success('Persetujuan diberikan', {
      description: `${event.mam.actionLabel} siap dieksekusi oleh ${event.mam.executor}.`,
    });
  };

  const handleReject = () => {
    decideApproval(req.eventId, 'rejected');
    toast.message('Permintaan ditolak', {
      description: 'Pemohon akan menerima notifikasi.',
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to={`/research/risk-lens/${req.eventId}`}
              className="text-sm font-semibold text-foreground hover:underline"
            >
              {event.title}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span>Diminta {req.requestedAt}</span>
              <span aria-hidden>·</span>
              <span>oleh {req.requestedBy}</span>
            </div>
          </div>
          <Badge
            variant="outline"
            className={
              req.state === 'pending'
                ? 'border-violet-500/60 text-violet-700'
                : req.state === 'approved'
                ? 'border-emerald-500/60 text-emerald-700'
                : 'border-muted-foreground/40 text-muted-foreground'
            }
          >
            {req.state === 'pending'
              ? 'menunggu'
              : req.state === 'approved'
              ? 'disetujui'
              : 'ditolak'}
          </Badge>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <MAMResponseBadge kind={event.mam.response} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{event.mam.actionLabel}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{event.mam.action}</div>
          </div>
          <div className="text-right text-[11px] text-muted-foreground">
            <div>executor</div>
            <div className="text-foreground">{event.mam.executor}</div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Approver tujuan
          </div>
          <div className="text-sm text-foreground">
            {req.approverName} <span className="text-muted-foreground">· {req.approverRole}</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Justifikasi pemohon
          </div>
          <p className="text-sm text-foreground/85">{req.justification || '—'}</p>
        </div>

        {req.state === 'pending' && (
          <>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleReject}>
                <XIcon className="mr-1.5 h-3.5 w-3.5" />
                Tolak
              </Button>
              <Button size="sm" onClick={handleApprove}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Setujui
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const RiskLensApprovals = () => {
  const [items, setItems] = useState<ApprovalRequest[]>(() => listApprovals());

  useEffect(() => subscribeApprovals(() => setItems(listApprovals())), []);

  const pending = items.filter((a) => a.state === 'pending');
  const decided = items.filter((a) => a.state !== 'pending');

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center gap-2 text-xs">
          <Button asChild variant="ghost" size="sm" className="h-auto px-2 py-1 -ml-2">
            <Link to="/research/risk-lens/worklist">
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Worklist
            </Link>
          </Button>
        </div>

        <header className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Inbox persetujuan
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Persetujuan tindakan MAM</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Tindakan yang menunggu sign-off dari Head of Claims Ops / CRO / Public Affairs sebelum
            dapat dieksekusi. Setiap keputusan tersimpan di audit trail.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Menunggu <span className="text-muted-foreground">· {pending.length}</span>
          </h2>
          {pending.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada permintaan yang menunggu. Buka detail event di worklist dan ajukan
                persetujuan dari sana.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {pending.map((req) => (
                <ApprovalRow key={req.eventId} req={req} />
              ))}
            </div>
          )}
        </section>

        {decided.length > 0 && (
          <section className="space-y-3">
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Riwayat keputusan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {decided.map((req) => (
                  <ApprovalRow key={req.eventId} req={req} />
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
};

export default RiskLensApprovals;
