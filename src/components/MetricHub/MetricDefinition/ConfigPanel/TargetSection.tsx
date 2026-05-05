import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Target } from "lucide-react";

interface TargetSectionProps {
  hasTarget: boolean;
  targetValue: string;
  targetLabel: string;
  targetPeriod: string;
  onHasTargetChange: (value: boolean) => void;
  onTargetValueChange: (value: string) => void;
  onTargetLabelChange: (value: string) => void;
  onTargetPeriodChange: (value: string) => void;
}

const TargetSection = ({
  hasTarget,
  targetValue,
  targetLabel,
  targetPeriod,
  onHasTargetChange,
  onTargetValueChange,
  onTargetLabelChange,
  onTargetPeriodChange,
}: TargetSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Target Goal</Label>
        </div>
        <Switch
          checked={hasTarget}
          onCheckedChange={onHasTargetChange}
        />
      </div>
      
      {hasTarget && (
        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Target Value</Label>
            <Input
              type="number"
              placeholder="e.g., 300000"
              value={targetValue}
              onChange={(e) => onTargetValueChange(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Label (optional)</Label>
            <Input
              placeholder="e.g., Q4 Goal, Annual Target"
              value={targetLabel}
              onChange={(e) => onTargetLabelChange(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Period (optional)</Label>
            <Select value={targetPeriod} onValueChange={onTargetPeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                <SelectItem value="Q4 2025">Q4 2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="H1 2025">H1 2025</SelectItem>
                <SelectItem value="H2 2025">H2 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default TargetSection;