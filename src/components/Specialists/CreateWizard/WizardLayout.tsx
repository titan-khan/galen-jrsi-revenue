import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WizardSidebar, WizardStep } from './WizardSidebar';

interface WizardLayoutProps {
  currentStep: string;
  steps: WizardStep[];
  onStepClick: (stepId: string) => void;
  onBack: () => void;
  onNext: () => void;
  canProceed: boolean;
  isLastStep: boolean;
  onSubmit: () => void;
  children: ReactNode;
  title?: string;
  submitLabel?: string;
}

export const WizardLayout = ({
  currentStep,
  steps,
  onStepClick,
  onBack,
  onNext,
  canProceed,
  isLastStep,
  onSubmit,
  children,
  title = 'Create New Specialist',
  submitLabel = 'Create Specialist',
}: WizardLayoutProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Header */}
      <div className="shrink-0 border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          <Badge variant="outline" className="text-muted-foreground font-normal">
            Draft
          </Badge>
        </div>
      </div>

      {/* Content Area: Sidebar + Main */}
      <div className="flex-1 flex overflow-hidden max-w-6xl mx-auto w-full">
        {/* Sidebar */}
        <div className="w-56 shrink-0 border-r bg-muted/30 py-6 px-4">
          <WizardSidebar
            steps={steps}
            currentStep={currentStep}
            onStepClick={onStepClick}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-2xl">
              {children}
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t bg-background px-8 py-4">
            <div className="max-w-2xl flex justify-between">
              <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
                Back
              </Button>
              {isLastStep ? (
                <Button onClick={onSubmit} disabled={!canProceed}>
                  {submitLabel}
                </Button>
              ) : (
                <Button onClick={onNext} disabled={!canProceed}>
                  Continue
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
