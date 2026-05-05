import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RiskAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  potentialImpact: string;
}

interface DismissRiskDialogProps {
  risk: RiskAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, notes?: string) => void;
}

const DISMISS_REASONS = [
  { value: "false-positive", label: "False positive - detection was incorrect" },
  { value: "already-resolved", label: "Already resolved - issue has been fixed" },
  { value: "not-applicable", label: "Not applicable - outside our control" },
  { value: "duplicate", label: "Duplicate - covered by another alert" },
  { value: "other", label: "Other" },
];

export function DismissRiskDialog({
  risk,
  open,
  onOpenChange,
  onConfirm,
}: DismissRiskDialogProps) {
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    const reasonLabel = DISMISS_REASONS.find((r) => r.value === reason)?.label || reason;
    onConfirm(reasonLabel, notes || undefined);
    setReason("");
    setNotes("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setNotes("");
    }
    onOpenChange(newOpen);
  };

  const isValid = reason && (reason !== "other" || notes.trim());

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dismiss Risk Alert</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the alert from your active view. Please provide a reason for dismissal.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {risk && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium">{risk.title}</p>
            <p className="text-muted-foreground mt-1">Impact: {risk.potentialImpact}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dismiss-reason">Reason for dismissal *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="dismiss-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DISMISS_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dismiss-notes">
              Additional notes {reason === "other" ? "*" : "(optional)"}
            </Label>
            <Textarea
              id="dismiss-notes"
              placeholder="Provide additional context..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Dismiss Alert
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
