import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ApprovalReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "approve" | "dismiss";
  itemTitle: string;
  onConfirm: (reason: string, notes?: string) => void;
}

const APPROVE_REASONS = [
  "Aligned with strategic goals",
  "High ROI potential",
  "Low implementation risk",
  "Team capacity available",
  "Other",
];

const DISMISS_REASONS = [
  "Not aligned with current priorities",
  "Insufficient resources",
  "Low expected impact",
  "Already addressed",
  "Other",
];

export function ApprovalReasonDialog({
  open,
  onOpenChange,
  action,
  itemTitle,
  onConfirm,
}: ApprovalReasonDialogProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [notes, setNotes] = useState("");

  const reasons = action === "approve" ? APPROVE_REASONS : DISMISS_REASONS;

  const handleConfirm = () => {
    const finalReason =
      selectedReason === "Other" ? notes : selectedReason;
    onConfirm(finalReason, notes);
    setSelectedReason("");
    setNotes("");
  };

  const isValid =
    selectedReason &&
    (selectedReason !== "Other" || notes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {action === "approve" ? (
              <>
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Approve Recommendation
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                Dismiss Recommendation
              </>
            )}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {itemTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select a reason</Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {reasons.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label htmlFor={reason} className="text-sm font-normal cursor-pointer">
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="notes">Please specify</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter your reason..."
                className="resize-none"
                rows={3}
              />
            </div>
          )}

          {selectedReason && selectedReason !== "Other" && (
            <div className="space-y-2">
              <Label htmlFor="additional-notes">Additional notes (optional)</Label>
              <Textarea
                id="additional-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional context..."
                className="resize-none"
                rows={2}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            variant={action === "approve" ? "default" : "secondary"}
          >
            {action === "approve" ? "Approve" : "Dismiss"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
