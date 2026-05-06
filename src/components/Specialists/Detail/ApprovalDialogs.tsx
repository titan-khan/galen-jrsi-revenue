import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, XCircle, UserCog } from 'lucide-react';
import type { RecommendationAssignee } from '@/types/specialist';

// Default actor placeholder for the PKB pilot — can be wired to auth context later.
const DEFAULT_ACTOR = 'Pak Budi (Kepala Bidang PKB)';

// ─── Approve Dialog ──────────────────────────────────────────────────

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationTitle: string;
  defaultAssignee?: RecommendationAssignee;
  onConfirm: (params: { actor: string; note?: string; assignee?: RecommendationAssignee }) => Promise<void> | void;
}

export function ApproveDialog({
  open,
  onOpenChange,
  recommendationTitle,
  defaultAssignee,
  onConfirm,
}: ApproveDialogProps) {
  const [note, setNote] = useState('');
  const [assigneeName, setAssigneeName] = useState(defaultAssignee?.name ?? '');
  const [assigneeRole, setAssigneeRole] = useState(defaultAssignee?.role ?? '');
  const [assigneeUnit, setAssigneeUnit] = useState(defaultAssignee?.unit ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setAssigneeName(defaultAssignee?.name ?? '');
      setAssigneeRole(defaultAssignee?.role ?? '');
      setAssigneeUnit(defaultAssignee?.unit ?? '');
      setSubmitting(false);
    }
  }, [open, defaultAssignee]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const assignee = assigneeName.trim()
        ? {
            name: assigneeName.trim(),
            role: assigneeRole.trim(),
            unit: assigneeUnit.trim() || undefined,
          }
        : undefined;
      await onConfirm({
        actor: DEFAULT_ACTOR,
        note: note.trim() || undefined,
        assignee,
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            Setujui Aksi
          </DialogTitle>
          <DialogDescription className="text-sm">
            {recommendationTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="approve-note" className="text-sm">
              Catatan persetujuan <span className="text-muted-foreground/60 font-normal">(opsional)</span>
            </Label>
            <Textarea
              id="approve-note"
              placeholder="Mis. Disetujui setelah verifikasi data IRSMS dengan tim BPS"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2 rounded-md border border-border/60 bg-muted/15 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">
              <UserCog className="h-3.5 w-3.5" />
              Penanggung Jawab
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="assignee-name" className="text-xs text-muted-foreground/80">Nama</Label>
                <Input
                  id="assignee-name"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="Nama PIC"
                  className="h-8 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="assignee-role" className="text-xs text-muted-foreground/80">Jabatan</Label>
                  <Input
                    id="assignee-role"
                    value={assigneeRole}
                    onChange={(e) => setAssigneeRole(e.target.value)}
                    placeholder="Mis. Kasubid Monitoring"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="assignee-unit" className="text-xs text-muted-foreground/80">Unit Kerja</Label>
                  <Input
                    id="assignee-unit"
                    value={assigneeUnit}
                    onChange={(e) => setAssigneeUnit(e.target.value)}
                    placeholder="Mis. Bapenda Kalteng"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? 'Memproses…' : 'Setujui'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ───────────────────────────────────────────────────

interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recommendationTitle: string;
  onConfirm: (params: { actor: string; note: string }) => Promise<void> | void;
}

export function RejectDialog({
  open,
  onOpenChange,
  recommendationTitle,
  onConfirm,
}: RejectDialogProps) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const trimmed = note.trim();

  useEffect(() => {
    if (open) {
      setNote('');
      setSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onConfirm({ actor: DEFAULT_ACTOR, note: trimmed });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Tolak Aksi
          </DialogTitle>
          <DialogDescription className="text-sm">
            {recommendationTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reject-note" className="text-sm">
            Alasan penolakan <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="reject-note"
            placeholder="Mis. Aksi serupa sudah dijalankan UPTD Palangka Raya pada Q1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground/60">
            Catatan ini tersimpan di audit trail untuk akuntabilitas.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !trimmed}
            className="gap-1.5"
          >
            <XCircle className="h-4 w-4" />
            {submitting ? 'Memproses…' : 'Tolak'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reassign Dialog ─────────────────────────────────────────────────

interface ReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignee?: RecommendationAssignee;
  onConfirm: (params: { actor: string; assignee: RecommendationAssignee }) => Promise<void> | void;
}

export function ReassignDialog({
  open,
  onOpenChange,
  currentAssignee,
  onConfirm,
}: ReassignDialogProps) {
  const [name, setName] = useState(currentAssignee?.name ?? '');
  const [role, setRole] = useState(currentAssignee?.role ?? '');
  const [unit, setUnit] = useState(currentAssignee?.unit ?? '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(currentAssignee?.name ?? '');
      setRole(currentAssignee?.role ?? '');
      setUnit(currentAssignee?.unit ?? '');
      setSubmitting(false);
    }
  }, [open, currentAssignee]);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm({
        actor: DEFAULT_ACTOR,
        assignee: {
          name: name.trim(),
          role: role.trim(),
          unit: unit.trim() || undefined,
        },
      });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-500" />
            Ubah Penanggung Jawab
          </DialogTitle>
          <DialogDescription className="text-sm">
            Tugaskan PIC baru. Perubahan tercatat di audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="reassign-name" className="text-sm">Nama <span className="text-red-500">*</span></Label>
            <Input
              id="reassign-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mis. Drs. Ahmad Suryadi"
              className="h-9 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="reassign-role" className="text-sm">Jabatan</Label>
              <Input
                id="reassign-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Kasubid Monitoring PKB"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reassign-unit" className="text-sm">Unit Kerja</Label>
              <Input
                id="reassign-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Bapenda Kalteng"
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting || !canSubmit} className="gap-1.5">
            <UserCog className="h-4 w-4" />
            {submitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
