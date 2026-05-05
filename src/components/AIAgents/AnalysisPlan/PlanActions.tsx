import { Button } from '@/components/ui/button';
import { Play, Pencil, X } from 'lucide-react';

interface PlanActionsProps {
  onApprove: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function PlanActions({ onApprove, onEdit, onCancel }: PlanActionsProps) {
  return (
    <div className="flex items-center gap-3 pt-4 border-t">
      <Button onClick={onApprove} className="flex-1">
        <Play className="h-4 w-4 mr-2" />
        Approve & Start Analysis
      </Button>
      <Button variant="outline" onClick={onEdit}>
        <Pencil className="h-4 w-4 mr-2" />
        Edit Plan
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}