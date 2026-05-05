import { CheckCircle, RefreshCw, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AnalysisApprovalPromptProps {
  onApprove: () => void;
  onRequestMore: () => void;
}

export function AnalysisApprovalPrompt({ onApprove, onRequestMore }: AnalysisApprovalPromptProps) {
  return (
    <div className="border rounded-xl bg-card p-5 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground mb-1">Analysis Complete</h4>
          <p className="text-sm text-muted-foreground mb-4">
            I've completed my root cause analysis of the selected metrics. Would you like to approve these findings, or should I dig deeper into any specific areas?
          </p>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={onApprove}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Analysis
            </Button>
            <Button 
              variant="outline" 
              onClick={onRequestMore}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Request More Analysis
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
