import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X } from 'lucide-react';

interface PlanFeedbackInputProps {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PlanFeedbackInput({ onSubmit, onCancel, isSubmitting }: PlanFeedbackInputProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback.trim());
    }
  };

  return (
    <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          What would you like to change?
        </label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g., Add more focus on competitive analysis, Remove the BCG Matrix step, Include a risk assessment..."
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleSubmit} 
          disabled={!feedback.trim() || isSubmitting}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Updating...' : 'Update Plan'}
        </Button>
        <Button 
          variant="ghost" 
          onClick={onCancel}
          size="sm"
          disabled={isSubmitting}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
