import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface RiskAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  source: string;
  potentialImpact: string;
}

interface EscalateRiskDialogProps {
  risk: RiskAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (priority: string, recipients: string[], context: string) => void;
}

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent - requires immediate attention" },
  { value: "high", label: "High - needs attention within 24 hours" },
  { value: "standard", label: "Standard - for awareness and tracking" },
];

const STAKEHOLDER_OPTIONS = [
  { value: "leadership", label: "Leadership Team" },
  { value: "finance", label: "Finance" },
  { value: "operations", label: "Operations" },
  { value: "product", label: "Product" },
  { value: "engineering", label: "Engineering" },
];

const severityColors = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
};

export function EscalateRiskDialog({
  risk,
  open,
  onOpenChange,
  onConfirm,
}: EscalateRiskDialogProps) {
  const [priority, setPriority] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [context, setContext] = useState("");

  const handleConfirm = () => {
    const recipientLabels = recipients.map(
      (r) => STAKEHOLDER_OPTIONS.find((s) => s.value === r)?.label || r
    );
    onConfirm(priority, recipientLabels, context);
    setPriority("");
    setRecipients([]);
    setContext("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPriority("");
      setRecipients([]);
      setContext("");
    }
    onOpenChange(newOpen);
  };

  const toggleRecipient = (value: string) => {
    setRecipients((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  };

  const isValid = priority && recipients.length > 0 && context.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escalate Risk Alert</DialogTitle>
          <DialogDescription>
            Flag this risk for leadership attention and provide context.
          </DialogDescription>
        </DialogHeader>

        {risk && (
          <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs capitalize ${severityColors[risk.severity]}`}
              >
                {risk.severity}
              </Badge>
              <span className="text-xs text-muted-foreground">{risk.source}</span>
            </div>
            <p className="font-medium">{risk.title}</p>
            <p className="text-muted-foreground">Impact: {risk.potentialImpact}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="escalate-priority">Priority *</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger id="escalate-priority">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Escalate to *</Label>
            <div className="grid grid-cols-2 gap-2">
              {STAKEHOLDER_OPTIONS.map((s) => (
                <div key={s.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`recipient-${s.value}`}
                    checked={recipients.includes(s.value)}
                    onCheckedChange={() => toggleRecipient(s.value)}
                  />
                  <Label
                    htmlFor={`recipient-${s.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {s.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="escalate-context">Brief context *</Label>
            <Textarea
              id="escalate-context"
              placeholder="Why is this being escalated? What action is needed?"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Escalate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
