import { useState } from 'react';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface AnalysisFeedbackInputProps {
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
}

const SUGGESTED_PROMPTS = [
  'Go deeper on root causes',
  'Explore alternative solutions',
  'Quantify the impact',
  'Compare with benchmarks',
  'Analyze competitor responses',
];

export function AnalysisFeedbackInput({ onSubmit, onCancel }: AnalysisFeedbackInputProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (feedback.trim()) {
      onSubmit(feedback.trim());
      setFeedback('');
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setFeedback(prev => prev ? `${prev} ${prompt}` : prompt);
  };

  return (
    <div className="border rounded-xl bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">What else would you like me to analyze?</h4>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Badge
            key={prompt}
            variant="secondary"
            className="cursor-pointer hover:bg-accent transition-colors"
            onClick={() => handleSuggestedPrompt(prompt)}
          >
            {prompt}
          </Badge>
        ))}
      </div>

      <div className="flex gap-3">
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Tell me what areas you'd like me to explore further..."
          className="min-h-[80px] resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 mt-3">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!feedback.trim()} className="gap-2">
          <Send className="h-4 w-4" />
          Run more analysis
        </Button>
      </div>
    </div>
  );
}
