import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  ChevronRight, 
  ChevronDown,
  Check,
  X
} from "lucide-react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { CONTEXT_QUESTIONS, type ContextQuestion } from "@/types/metricSuggestion";
import { cn } from "@/lib/utils";

interface ProgressiveContextBannerProps {
  onContextUpdated?: () => void;
  className?: string;
}

export const ProgressiveContextBanner = ({ 
  onContextUpdated,
  className 
}: ProgressiveContextBannerProps) => {
  const { contextCompleteness } = useOrganization();
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isDismissed, setIsDismissed] = useState(false);

  // Filter to unanswered questions
  const unansweredQuestions = CONTEXT_QUESTIONS.filter(q => !answers[q.id]);
  const currentQuestion = unansweredQuestions[currentQuestionIndex];
  const questionsAnswered = Object.keys(answers).length;
  const totalQuestions = CONTEXT_QUESTIONS.length;

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Move to next question or close if done
    if (currentQuestionIndex < unansweredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsExpanded(false);
    }
    
    onContextUpdated?.();
  };

  const handleSkip = () => {
    if (currentQuestionIndex < unansweredQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setIsExpanded(false);
    }
  };

  if (isDismissed || contextCompleteness >= 100) {
    return null;
  }

  return (
    <Card className={cn(
      "border-primary/20 bg-gradient-to-r from-primary/5 to-transparent",
      className
    )}>
      <CardContent className="p-4">
        {/* Collapsed State */}
        {!isExpanded && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">
                  Want better metric recommendations?
                </p>
                <p className="text-xs text-muted-foreground">
                  Answer {totalQuestions - questionsAnswered} quick questions to improve suggestions
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Progress value={contextCompleteness} className="w-20 h-2" />
                <span className="text-xs text-muted-foreground">{contextCompleteness}%</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="gap-1"
              >
                Improve
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Expanded State - Show Current Question */}
        {isExpanded && currentQuestion && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  Question {questionsAnswered + 1} of {totalQuestions}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="gap-1 text-muted-foreground"
              >
                <ChevronDown className="h-3 w-3" />
                Minimize
              </Button>
            </div>

            <div>
              <p className="font-medium mb-1">{currentQuestion.question}</p>
              <p className="text-xs text-muted-foreground mb-3">
                {currentQuestion.impactDescription}
              </p>
              
              <div className="flex flex-wrap gap-2">
                {currentQuestion.options?.map(option => (
                  <Button
                    key={option.value}
                    variant="outline"
                    size="sm"
                    className="h-auto py-2 px-3 flex-col items-start text-left"
                    onClick={() => handleAnswer(currentQuestion.id, option.value)}
                  >
                    <span className="font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {option.description}
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Skip this question
              </Button>
              
              {questionsAnswered > 0 && (
                <Badge variant="secondary" className="gap-1">
                  <Check className="h-3 w-3" />
                  {questionsAnswered} answered
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* All questions answered */}
        {isExpanded && !currentQuestion && questionsAnswered > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Context complete!</p>
                <p className="text-xs text-muted-foreground">
                  Your metric recommendations are now personalized
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
