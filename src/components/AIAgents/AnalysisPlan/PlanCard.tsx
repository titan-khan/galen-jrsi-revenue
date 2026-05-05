import { useState } from 'react';
import { AnalysisPlan } from '@/types/agent';
import { PlanStepItem } from './PlanStepItem';
import { PlanFeedbackInput } from './PlanFeedbackInput';
import { Button } from '@/components/ui/button';
import { Clock, Pencil, Play } from 'lucide-react';

interface PlanCardProps {
  plan: AnalysisPlan;
  onApprove: () => void;
  onEditWithFeedback: (feedback: string) => void;
  onCancel: () => void;
  isUpdating?: boolean;
}

export function PlanCard({ plan, onApprove, onEditWithFeedback, onCancel, isUpdating }: PlanCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditSubmit = (feedback: string) => {
    onEditWithFeedback(feedback);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <h2 className="text-lg font-semibold text-foreground">
        {plan.title}
      </h2>

      {/* Steps */}
      <div className="space-y-0">
        {plan.proposedSteps.map((step, index) => (
          <PlanStepItem 
            key={step.id} 
            step={step} 
            isLast={index === plan.proposedSteps.length - 1}
          />
        ))}
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
        <Clock className="h-4 w-4" />
        <span>Ready in {plan.estimatedDuration.replace('~', '')}</span>
      </div>

      {/* Feedback Input - shown when editing */}
      {isEditing && (
        <PlanFeedbackInput
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          isSubmitting={isUpdating}
        />
      )}

      {/* Actions - hidden when editing */}
      {!isEditing && (
        <div className="flex items-center gap-3 pt-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit plan
          </Button>
          <Button onClick={onApprove}>
            <Play className="h-4 w-4 mr-2" />
            Start analysis
          </Button>
        </div>
      )}
    </div>
  );
}
