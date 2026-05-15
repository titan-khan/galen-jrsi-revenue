import { Info } from 'lucide-react';
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
import {
  setPolaStatus,
  setSpawnedHandle,
  type Pola,
} from '@/data/risetData';

interface SpawnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pola: Pola;
}

export function SpawnModal({ open, onOpenChange, pola }: SpawnModalProps) {
  const handleSpawn = () => {
    setSpawnedHandle(pola.id, pola.proposedHandle);
    setPolaStatus(pola.id, 'spawned');
    toast.success('Spesialis dibuat', {
      description: `${pola.proposedName} · status: Dijeda. Aktifkan di halaman Spesialis.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-[19px]">
            Buat Spesialis untuk memantau pola ini
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-snug">
            Spesialis akan memantau pola yang sama secara terus-menerus dan memberi peringatan
            jika kondisinya memburuk.
          </DialogDescription>
        </DialogHeader>

        {/* Quote block */}
        <blockquote className="rounded-r-md border-l-[3px] border-blue-600 bg-blue-50 px-4 py-3 text-[14px] font-medium leading-snug text-foreground">
          "{pola.title}"
        </blockquote>

        {/* Config */}
        <div className="space-y-0">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Konfigurasi yang akan dipakai
          </div>

          <FieldRow label="Nama Spesialis" value={pola.proposedName} />
          <FieldRow
            label="Handle"
            value={<span className="font-mono">{pola.proposedHandle}</span>}
          />
          <FieldRow
            label="Yang dipantau"
            value={
              <div className="font-mono text-[12.5px]">
                <div>Entitas: {pola.scope.entitas.join(', ')}</div>
                <div>Wilayah: {pola.scope.wilayah}</div>
                <div>Jenis risiko: {pola.scope.jenisRisiko}</div>
              </div>
            }
          />
          <FieldRow
            label="Kapan beri peringatan"
            value={
              <div className="font-mono text-[12.5px]">
                {pola.scope.triggers.length === 0
                  ? '—'
                  : pola.scope.triggers.map((t) => <div key={t}>{t}</div>)}
              </div>
            }
          />
          {pola.notifications && pola.notifications.length > 0 && (
            <FieldRow
              label="Notifikasi (urgensi kritis)"
              value={
                <div className="font-mono text-[12.5px]">
                  {pola.notifications.map((n) => (
                    <div key={n.target}>
                      {n.channel}: {n.target}
                    </div>
                  ))}
                </div>
              }
            />
          )}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2.5 rounded-md border border-border bg-[#FAFAFA] px-4 py-3 text-[12.5px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span>
            Spesialis akan dibuat dalam status <strong className="text-foreground">Dijeda</strong>{' '}
            dulu. Anda perlu mengaktifkannya di halaman Spesialis setelah meninjau konfigurasi.
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSpawn}>Buat Spesialis</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 border-t border-border py-2.5 first:border-t-0">
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="font-mono text-[12.5px] text-foreground">{value}</span>
    </div>
  );
}
